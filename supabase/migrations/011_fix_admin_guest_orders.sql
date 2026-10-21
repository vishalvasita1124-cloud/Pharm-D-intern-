-- =============================================================
-- Migration 011: Fix Admin Panel Visibility for Guest & UPI Orders
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/geuxjndwuqhmwnmnfczj/sql/new
-- =============================================================

-- 1. Add Admin Direct RLS Policies on orders so Admin can always see & manage all orders
DROP POLICY IF EXISTS "orders: admin read all" ON public.orders;
CREATE POLICY "orders: admin read all"
  ON public.orders FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "orders: admin update all" ON public.orders;
CREATE POLICY "orders: admin update all"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (public.is_admin());

-- 2. Fix admin_get_orders: Use LEFT JOIN instead of INNER JOIN so guest orders (user_id IS NULL) are NEVER lost
CREATE OR REPLACE FUNCTION public.admin_get_orders(p_status TEXT DEFAULT NULL)
RETURNS TABLE (
  id               UUID,
  order_number     TEXT,
  user_id          UUID,
  product_id       UUID,
  product_title    TEXT,
  amount           INTEGER,
  currency         TEXT,
  payment_method   TEXT,
  status           TEXT,
  utr_number       TEXT,
  rejection_reason TEXT,
  created_at       TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ,
  user_email       TEXT,
  user_name        TEXT,
  customer_email   TEXT,
  customer_name    TEXT,
  customer_mobile  TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Insufficient permissions'; END IF;

  RETURN QUERY
  SELECT
    o.id,
    o.order_number,
    o.user_id,
    o.product_id,
    o.product_title,
    o.amount,
    o.currency,
    o.payment_method,
    o.status::TEXT,
    o.utr_number,
    o.rejection_reason,
    o.created_at,
    o.updated_at,
    coalesce(u.email, o.customer_email, 'guest') AS user_email,
    coalesce(pr.full_name, o.customer_name, 'Guest Customer') AS user_name,
    o.customer_email,
    o.customer_name,
    o.customer_mobile
  FROM public.orders o
  LEFT JOIN auth.users u ON u.id = o.user_id
  LEFT JOIN public.profiles pr ON pr.user_id = o.user_id
  WHERE (p_status IS NULL OR o.status::TEXT = p_status)
  ORDER BY o.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_orders(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_orders(TEXT) TO authenticated;

-- 3. Fix admin_approve_order to safely handle guest checkouts (where user_id IS NULL)
CREATE OR REPLACE FUNCTION public.admin_approve_order(p_order_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Insufficient permissions'; END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

  UPDATE public.orders
  SET status = 'approved',
      updated_at = NOW()
  WHERE id = p_order_id;

  -- Only insert into user_access if order has an associated user_id
  IF v_order.user_id IS NOT NULL THEN
    INSERT INTO public.user_access (user_id, product_id, order_id)
    VALUES (v_order.user_id, v_order.product_id, v_order.id)
    ON CONFLICT (user_id, product_id) DO NOTHING;
  END IF;

  INSERT INTO public.order_events (order_id, event, actor_id, note)
  VALUES (p_order_id, 'approved', auth.uid(), 'Approved manually by admin');
END;
$$;

REVOKE ALL ON FUNCTION public.admin_approve_order(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_approve_order(UUID) TO authenticated;

-- 4. Fix submit_guest_utr to allow optional UTR (doesn't throw error if user pays and notifies admin without UTR)
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
  v_clean_utr := trim(coalesce(p_utr, ''));
  IF length(v_clean_utr) = 0 THEN
    v_clean_utr := 'NOT_PROVIDED';
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
  VALUES (v_order.id, 'utr_submitted', 'Payment confirmation submitted: ' || v_clean_utr);

  RETURN v_order;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_guest_utr(UUID, TEXT) TO anon, authenticated;
