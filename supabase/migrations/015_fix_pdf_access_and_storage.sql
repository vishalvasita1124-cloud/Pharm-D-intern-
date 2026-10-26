-- =============================================================
-- Migration 015: Fix PDF Access & Storage Permissions
-- Ensures approved notes always open and PDFs can be rendered
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/geuxjndwuqhmwnmnfczj/sql/new
-- =============================================================

-- 1. Ensure 'notes' storage bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'notes',
  'notes',
  FALSE,
  52428800, -- 50 MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE
  SET file_size_limit = 52428800;

-- 2. Storage RLS policies for 'notes' bucket
-- Authenticated users: allow SELECT so createSignedUrl and downloads succeed
DROP POLICY IF EXISTS "notes: authenticated select" ON storage.objects;
CREATE POLICY "notes: authenticated select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'notes');

-- Anon users: allow SELECT for signed URLs
DROP POLICY IF EXISTS "notes: anon select" ON storage.objects;
CREATE POLICY "notes: anon select"
  ON storage.objects FOR SELECT
  TO anon
  USING (bucket_id = 'notes');

-- 3. Bulletproof get_pdf_access RPC with comprehensive email & order matching
CREATE OR REPLACE FUNCTION public.get_pdf_access(p_product_id UUID)
RETURNS TABLE (
  file_path TEXT,
  product_title TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid       UUID;
  v_email     TEXT;
  v_access    public.user_access%ROWTYPE;
  v_order     public.orders%ROWTYPE;
  v_product   public.products%ROWTYPE;
BEGIN
  -- [1] User must be authenticated
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = 'P0001';
  END IF;

  -- Determine user email from all available sources
  v_email := auth.jwt() ->> 'email';
  IF v_email IS NULL THEN
    SELECT email INTO v_email FROM public.profiles WHERE user_id = v_uid LIMIT 1;
  END IF;
  IF v_email IS NULL THEN
    SELECT email INTO v_email FROM auth.users WHERE id = v_uid LIMIT 1;
  END IF;

  -- [2] Check if user already has an active access record
  SELECT * INTO v_access
  FROM public.user_access ua
  WHERE ua.user_id = v_uid
    AND ua.product_id = p_product_id;

  -- [3] If not found, check for ANY approved order by user_id OR payment email
  IF NOT FOUND THEN
    SELECT * INTO v_order
    FROM public.orders o
    WHERE o.product_id = p_product_id
      AND o.status = 'approved'
      AND (
        o.user_id = v_uid
        OR (v_email IS NOT NULL AND LOWER(TRIM(o.customer_email)) = LOWER(TRIM(v_email)))
      )
    ORDER BY o.created_at DESC
    LIMIT 1;

    IF FOUND THEN
      -- Link order to user if not linked
      UPDATE public.orders
      SET user_id = v_uid, updated_at = NOW()
      WHERE id = v_order.id AND user_id IS NULL;

      -- Grant user_access
      INSERT INTO public.user_access (user_id, product_id, order_id, granted_at)
      VALUES (v_uid, p_product_id, v_order.id, NOW())
      ON CONFLICT (user_id, product_id) DO NOTHING;

      SELECT * INTO v_access
      FROM public.user_access ua
      WHERE ua.user_id = v_uid AND ua.product_id = p_product_id;
    ELSE
      -- Check if there is an unapproved (pending) order to provide a helpful message
      IF EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.product_id = p_product_id
          AND o.status IN ('pending_payment', 'pending_verification')
          AND (o.user_id = v_uid OR (v_email IS NOT NULL AND LOWER(TRIM(o.customer_email)) = LOWER(TRIM(v_email))))
      ) THEN
        RAISE EXCEPTION 'Payment is pending verification' USING ERRCODE = 'P0004';
      ELSE
        RAISE EXCEPTION 'No access record found for this product' USING ERRCODE = 'P0002';
      END IF;
    END IF;
  END IF;

  -- [4] Access must not be revoked
  IF v_access.status = 'revoked' THEN
    RAISE EXCEPTION 'Access has been revoked' USING ERRCODE = 'P0003';
  END IF;

  -- [5] Fetch product
  SELECT * INTO v_product
  FROM public.products p
  WHERE p.id = p_product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found' USING ERRCODE = 'P0005';
  END IF;

  -- [6] Check if PDF file has been uploaded
  IF v_product.file_path IS NULL OR length(trim(v_product.file_path)) = 0 THEN
    RAISE EXCEPTION 'PDF not yet available for this product' USING ERRCODE = 'P0006';
  END IF;

  RETURN QUERY SELECT v_product.file_path, v_product.title;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pdf_access(UUID) TO authenticated;
