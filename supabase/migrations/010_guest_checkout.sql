-- =============================================================
-- Migration 010: Enable Direct Buy / Guest Checkout (No Login Required)
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/geuxjndwuqhmwnmnfczj/sql/new
-- =============================================================

-- 1. Make user_id nullable in orders so guests can buy without an account
ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;

-- 2. Add customer contact details to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_email TEXT,
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS customer_mobile TEXT,
  ADD COLUMN IF NOT EXISTS download_token UUID DEFAULT gen_random_uuid();

-- 3. Relax user_product_active index for guest checkouts
DROP INDEX IF EXISTS public.idx_orders_user_product_active;
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_user_product_active
  ON public.orders (user_id, product_id)
  WHERE user_id IS NOT NULL AND status NOT IN ('rejected', 'cancelled');

-- 4. RPC: create_guest_order
CREATE OR REPLACE FUNCTION public.create_guest_order(
  p_product_id UUID,
  p_email      TEXT,
  p_name       TEXT,
  p_mobile     TEXT
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product public.products%ROWTYPE;
  v_order   public.orders%ROWTYPE;
  v_user_id UUID;
BEGIN
  -- Use logged-in user if available
  v_user_id := auth.uid();

  -- If not logged in, check if user exists by email
  IF v_user_id IS NULL AND p_email IS NOT NULL AND length(trim(p_email)) > 0 THEN
    SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = lower(trim(p_email)) LIMIT 1;
  END IF;

  -- Fetch product
  SELECT * INTO v_product FROM public.products
  WHERE id = p_product_id AND is_published = TRUE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found or not published';
  END IF;

  -- Create order
  INSERT INTO public.orders (
    user_id,
    customer_email,
    customer_name,
    customer_mobile,
    product_id,
    product_title,
    amount,
    currency,
    payment_method,
    status
  ) VALUES (
    v_user_id,
    lower(trim(p_email)),
    trim(p_name),
    trim(p_mobile),
    p_product_id,
    v_product.title,
    v_product.price,
    'INR',
    'upi',
    'pending_payment'
  )
  RETURNING * INTO v_order;

  -- Log audit event
  INSERT INTO public.order_events (order_id, event, note, actor_id)
  VALUES (
    v_order.id,
    'order_created',
    'Order created for ' || coalesce(p_name, '') || ' (' || coalesce(p_email, 'guest') || ')',
    v_user_id
  );

  RETURN v_order;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_guest_order(UUID, TEXT, TEXT, TEXT) TO anon, authenticated;

-- 5. RPC: get_guest_order
CREATE OR REPLACE FUNCTION public.get_guest_order(p_order_id UUID)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  RETURN v_order;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_guest_order(UUID) TO anon, authenticated;

-- 6. RPC: submit_guest_utr
CREATE OR REPLACE FUNCTION public.submit_guest_utr(p_order_id UUID, p_utr TEXT)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_clean_utr TEXT;
BEGIN
  v_clean_utr := trim(p_utr);
  IF length(v_clean_utr) < 6 THEN
    RAISE EXCEPTION 'UTR number must be at least 6 characters';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.status NOT IN ('pending_payment', 'rejected') THEN
    RAISE EXCEPTION 'UTR can only be submitted for pending or rejected orders';
  END IF;

  UPDATE public.orders
  SET utr_number = v_clean_utr,
      status = 'pending_verification',
      rejection_reason = NULL,
      updated_at = NOW()
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  INSERT INTO public.order_events (order_id, event, note)
  VALUES (v_order.id, 'utr_submitted', 'UTR submitted: ' || v_clean_utr);

  RETURN v_order;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_guest_utr(UUID, TEXT) TO anon, authenticated;

-- 7. Update complete_razorpay_payment to support guest orders
CREATE OR REPLACE FUNCTION public.complete_razorpay_payment(
  p_order_id UUID,
  p_payment_id TEXT
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order            public.orders%ROWTYPE;
  v_clean_payment_id TEXT;
BEGIN
  v_clean_payment_id := trim(p_payment_id);
  IF length(v_clean_payment_id) < 5 THEN
    RAISE EXCEPTION 'Invalid payment reference ID';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.status = 'approved' THEN
    RETURN v_order;
  END IF;

  UPDATE public.orders
  SET status = 'approved',
      payment_method = 'razorpay',
      utr_number = v_clean_payment_id,
      rejection_reason = NULL,
      updated_at = NOW()
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  -- If user_id exists, grant user_access record
  IF v_order.user_id IS NOT NULL THEN
    INSERT INTO public.user_access (user_id, product_id, order_id)
    VALUES (v_order.user_id, v_order.product_id, v_order.id)
    ON CONFLICT (user_id, product_id) DO NOTHING;
  END IF;

  INSERT INTO public.order_events (order_id, event, note)
  VALUES (v_order.id, 'approved', 'Instant online payment via Razorpay: ' || v_clean_payment_id);

  RETURN v_order;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_razorpay_payment(UUID, TEXT) TO anon, authenticated;

-- 8. RPC: get_guest_pdf_download
CREATE OR REPLACE FUNCTION public.get_guest_pdf_download(p_order_id UUID)
RETURNS TABLE (
  file_path TEXT,
  product_title TEXT,
  order_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order   public.orders%ROWTYPE;
  v_product public.products%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.status <> 'approved' THEN
    RAISE EXCEPTION 'Order is not approved yet';
  END IF;

  SELECT * INTO v_product FROM public.products WHERE id = v_order.product_id;
  IF NOT FOUND OR v_product.file_path IS NULL THEN
    RAISE EXCEPTION 'PDF file not available yet';
  END IF;

  RETURN QUERY SELECT v_product.file_path, v_product.title, v_order.status;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_guest_pdf_download(UUID) TO anon, authenticated;
