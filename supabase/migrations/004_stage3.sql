-- =============================================================
-- Pharm D Intern Notes — Stage 3 Database Schema
-- Secure PDF Storage & Access Control
-- Run AFTER 001_schema.sql, 002_seed.sql, 003_stage2.sql
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Add file_path column to products
-- ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'products'
      AND column_name  = 'file_path'
  ) THEN
    ALTER TABLE public.products ADD COLUMN file_path TEXT;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 2. Add status column to user_access (for revocation)
-- ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'user_access'
      AND column_name  = 'status'
  ) THEN
    ALTER TABLE public.user_access
      ADD COLUMN status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'revoked'));
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 3. RPC: get_pdf_access — 6-check security gate
--    Returns the storage file_path only if all checks pass.
--    Frontend then creates a signed URL using the anon key
--    (storage bucket allows signed URLs for authenticated users).
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_pdf_access(p_product_id UUID)
RETURNS TABLE (file_path TEXT, product_title TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid       UUID;
  v_access    public.user_access%ROWTYPE;
  v_order     public.orders%ROWTYPE;
  v_product   public.products%ROWTYPE;
BEGIN
  -- [1] Must be authenticated
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = 'P0001';
  END IF;

  -- [2] & [3] User must own access for this product
  SELECT * INTO v_access
  FROM public.user_access ua
  WHERE ua.user_id = v_uid
    AND ua.product_id = p_product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No access record found for this product' USING ERRCODE = 'P0002';
  END IF;

  -- [4] Access must not be revoked
  IF v_access.status = 'revoked' THEN
    RAISE EXCEPTION 'Access has been revoked' USING ERRCODE = 'P0003';
  END IF;

  -- [5] Order must be approved
  SELECT * INTO v_order
  FROM public.orders o
  WHERE o.id = v_access.order_id;

  IF NOT FOUND OR v_order.status <> 'approved' THEN
    RAISE EXCEPTION 'Order is not approved' USING ERRCODE = 'P0004';
  END IF;

  -- [6] PDF must be uploaded
  SELECT * INTO v_product
  FROM public.products p
  WHERE p.id = p_product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found' USING ERRCODE = 'P0005';
  END IF;

  IF v_product.file_path IS NULL THEN
    RAISE EXCEPTION 'PDF not yet available for this product' USING ERRCODE = 'P0006';
  END IF;

  -- All checks passed — return path
  RETURN QUERY SELECT v_product.file_path, v_product.title;
END;
$$;

REVOKE ALL ON FUNCTION public.get_pdf_access(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_pdf_access(UUID) TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- 4. RPC: admin_set_product_pdf — admin sets/clears PDF path
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_set_product_pdf(
  p_product_id UUID,
  p_file_path  TEXT  -- NULL to clear
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = v_admin_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  UPDATE public.products
  SET file_path  = p_file_path,
      updated_at = NOW()
  WHERE id = p_product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_product_pdf(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_product_pdf(UUID, TEXT) TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- 5. RPC: admin_revoke_access — admin revokes user access
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_revoke_access(p_access_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = v_admin_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  UPDATE public.user_access
  SET status = 'revoked'
  WHERE id = p_access_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Access record not found';
  END IF;

  -- Log event on associated order
  INSERT INTO public.order_events (order_id, event, note, actor_id)
  SELECT order_id, 'access_revoked', 'Access revoked by admin', v_admin_id
  FROM public.user_access
  WHERE id = p_access_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_revoke_access(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_revoke_access(UUID) TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- 6. RPC: admin_restore_access — admin restores revoked access
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_restore_access(p_access_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = v_admin_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  UPDATE public.user_access
  SET status = 'active'
  WHERE id = p_access_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Access record not found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_restore_access(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_restore_access(UUID) TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- 7. RPC: admin_get_user_access — list all access records
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_get_user_access()
RETURNS TABLE (
  id            UUID,
  user_id       UUID,
  user_email    TEXT,
  user_name     TEXT,
  product_id    UUID,
  product_title TEXT,
  order_id      UUID,
  order_number  TEXT,
  status        TEXT,
  granted_at    TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = v_admin_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  RETURN QUERY
  SELECT
    ua.id,
    ua.user_id,
    u.email       AS user_email,
    pr.full_name  AS user_name,
    ua.product_id,
    p.title       AS product_title,
    ua.order_id,
    o.order_number,
    ua.status,
    ua.granted_at
  FROM public.user_access ua
  JOIN auth.users u      ON u.id  = ua.user_id
  LEFT JOIN public.profiles pr ON pr.user_id = ua.user_id
  JOIN public.products p ON p.id  = ua.product_id
  JOIN public.orders o   ON o.id  = ua.order_id
  ORDER BY ua.granted_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_user_access() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_user_access() TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- 8. RPC: admin_get_products_with_pdf — list products + PDF status
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_get_products_with_pdf()
RETURNS TABLE (
  id            UUID,
  title         TEXT,
  slug          TEXT,
  price         INTEGER,
  is_published  BOOLEAN,
  file_path     TEXT,
  updated_at    TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = v_admin_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  RETURN QUERY
  SELECT p.id, p.title, p.slug, p.price, p.is_published, p.file_path, p.updated_at
  FROM public.products p
  ORDER BY p.title;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_products_with_pdf() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_products_with_pdf() TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- 9. Storage Bucket RLS Policies for 'paid-pdfs'
--    Run these AFTER creating the bucket in Supabase Dashboard.
--
--    PASTE THIS BLOCK SEPARATELY in SQL Editor AFTER creating bucket:
-- ─────────────────────────────────────────────────────────────

-- Admin: upload/replace PDFs
-- (Run in SQL Editor after creating the 'paid-pdfs' bucket)
/*
DROP POLICY IF EXISTS "paid-pdfs: admin insert" ON storage.objects;
CREATE POLICY "paid-pdfs: admin insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'paid-pdfs'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "paid-pdfs: admin update" ON storage.objects;
CREATE POLICY "paid-pdfs: admin update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'paid-pdfs'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "paid-pdfs: admin delete" ON storage.objects;
CREATE POLICY "paid-pdfs: admin delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'paid-pdfs'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Authenticated users: select only — needed for createSignedUrl
DROP POLICY IF EXISTS "paid-pdfs: authenticated select" ON storage.objects;
CREATE POLICY "paid-pdfs: authenticated select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'paid-pdfs'
    AND auth.role() = 'authenticated'
  );
*/
