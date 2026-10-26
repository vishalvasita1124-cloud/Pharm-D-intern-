-- =============================================================
-- Migration 016: Fix user_access missing 'status' column
-- The get_pdf_access RPC references v_access.status but the
-- user_access table never had that column — causing the error:
--   "record v_access has no field status"
-- This adds the status column and fixes the RPC.
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/geuxjndwuqhmwnmnfczj/sql/new
-- =============================================================

-- 1. Add 'status' column to user_access if it doesn't exist
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

-- 2. Replace get_pdf_access with the corrected version
CREATE OR REPLACE FUNCTION public.get_pdf_access(p_product_id UUID)
RETURNS TABLE (
  file_path     TEXT,
  product_title TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid     UUID;
  v_email   TEXT;
  v_access  public.user_access%ROWTYPE;
  v_order   public.orders%ROWTYPE;
  v_product public.products%ROWTYPE;
BEGIN
  -- [1] Must be authenticated
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = 'P0001';
  END IF;

  -- [2] Determine user email from JWT or fallback sources
  v_email := auth.jwt() ->> 'email';
  IF v_email IS NULL THEN
    SELECT email INTO v_email FROM public.profiles WHERE user_id = v_uid LIMIT 1;
  END IF;
  IF v_email IS NULL THEN
    SELECT email INTO v_email FROM auth.users WHERE id = v_uid LIMIT 1;
  END IF;

  -- [3] Look for an existing user_access record
  SELECT * INTO v_access
  FROM public.user_access ua
  WHERE ua.user_id    = v_uid
    AND ua.product_id = p_product_id;

  -- [4] If not found, search for an approved order and auto-grant access
  IF NOT FOUND THEN
    SELECT * INTO v_order
    FROM public.orders o
    WHERE o.product_id = p_product_id
      AND o.status     = 'approved'
      AND (
        o.user_id = v_uid
        OR (
          v_email IS NOT NULL
          AND LOWER(TRIM(o.customer_email)) = LOWER(TRIM(v_email))
        )
      )
    ORDER BY o.created_at DESC
    LIMIT 1;

    IF FOUND THEN
      -- Link the order to the authenticated user if it was a guest order
      UPDATE public.orders
         SET user_id    = v_uid,
             updated_at = NOW()
       WHERE id      = v_order.id
         AND user_id IS NULL;

      -- Grant access
      INSERT INTO public.user_access (user_id, product_id, order_id, granted_at, status)
      VALUES (v_uid, p_product_id, v_order.id, NOW(), 'active')
      ON CONFLICT (user_id, product_id) DO NOTHING;

      -- Re-fetch so v_access is populated (needed for the status check below)
      SELECT * INTO v_access
      FROM public.user_access ua
      WHERE ua.user_id    = v_uid
        AND ua.product_id = p_product_id;

    ELSE
      -- Provide a useful error based on whether an order even exists
      IF EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.product_id = p_product_id
          AND o.status IN ('pending_payment', 'pending_verification')
          AND (
            o.user_id = v_uid
            OR (v_email IS NOT NULL AND LOWER(TRIM(o.customer_email)) = LOWER(TRIM(v_email)))
          )
      ) THEN
        RAISE EXCEPTION 'Payment is pending verification' USING ERRCODE = 'P0004';
      ELSE
        RAISE EXCEPTION 'No access record found for this product' USING ERRCODE = 'P0002';
      END IF;
    END IF;
  END IF;

  -- [5] Check access is not revoked
  IF v_access.status = 'revoked' THEN
    RAISE EXCEPTION 'Access has been revoked' USING ERRCODE = 'P0003';
  END IF;

  -- [6] Fetch the product
  SELECT * INTO v_product
  FROM public.products p
  WHERE p.id = p_product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found' USING ERRCODE = 'P0005';
  END IF;

  -- [7] Ensure PDF has been uploaded
  IF v_product.file_path IS NULL OR length(trim(v_product.file_path)) = 0 THEN
    RAISE EXCEPTION 'PDF not yet available for this product' USING ERRCODE = 'P0006';
  END IF;

  RETURN QUERY SELECT v_product.file_path, v_product.title;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pdf_access(UUID) TO authenticated;
