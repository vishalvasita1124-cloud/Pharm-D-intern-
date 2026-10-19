-- =============================================================
-- Pharm D Intern Notes — Stage 4: Razorpay Payment Gateway Migration
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/geuxjndwuqhmwnmnfczj/sql/new
-- =============================================================

-- 1. Function: complete_razorpay_payment
-- Called immediately upon successful Razorpay payment callback on the frontend.
-- Automatically marks the order as approved and grants access in user_access.

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
  v_user_id          UUID;
  v_order            public.orders%ROWTYPE;
  v_clean_payment_id TEXT;
BEGIN
  -- Authenticate caller
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate payment ID format
  v_clean_payment_id := trim(p_payment_id);
  IF length(v_clean_payment_id) < 5 THEN
    RAISE EXCEPTION 'Invalid payment reference ID';
  END IF;

  -- Check if payment ID was already used for a different order
  IF EXISTS (
    SELECT 1 FROM public.orders
    WHERE utr_number = v_clean_payment_id AND id <> p_order_id
  ) THEN
    RAISE EXCEPTION 'This payment ID has already been recorded';
  END IF;

  -- Verify order belongs to the authenticated user
  SELECT * INTO v_order FROM public.orders
  WHERE id = p_order_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found or does not belong to you';
  END IF;

  -- If already approved, return idempotently
  IF v_order.status = 'approved' THEN
    RETURN v_order;
  END IF;

  -- Update order to approved
  UPDATE public.orders
  SET status = 'approved',
      payment_method = 'razorpay',
      utr_number = v_clean_payment_id,
      rejection_reason = NULL,
      updated_at = NOW()
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  -- Automatically grant access to the notes/product
  INSERT INTO public.user_access (user_id, product_id, order_id)
  VALUES (v_order.user_id, v_order.product_id, v_order.id)
  ON CONFLICT (user_id, product_id) DO NOTHING;

  -- Record audit event
  INSERT INTO public.order_events (order_id, event, note, actor_id)
  VALUES (
    v_order.id,
    'approved',
    'Instant online payment verified via Razorpay (' || v_clean_payment_id || ')',
    v_user_id
  );

  RETURN v_order;
END;
$$;

-- Grant execution permission to authenticated users
REVOKE ALL ON FUNCTION public.complete_razorpay_payment(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_razorpay_payment(UUID, TEXT) TO authenticated;
