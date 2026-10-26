-- Migration 012: Add rejection_reason column and admin_reject_order RPC
-- This fixes the "Confirm Reject" button not working because:
-- 1. orders table was missing rejection_reason column
-- 2. admin_reject_order RPC did not exist

-- 1. Add rejection_reason column to orders (if not already present)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 2. Drop and recreate admin_reject_order RPC (drop first to allow return type change)
DROP FUNCTION IF EXISTS admin_reject_order(UUID, TEXT);

CREATE OR REPLACE FUNCTION admin_reject_order(
  p_order_id UUID,
  p_reason   TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  SELECT is_admin INTO v_is_admin
  FROM profiles
  WHERE id = auth.uid();

  IF NOT COALESCE(v_is_admin, FALSE) THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  UPDATE orders
  SET
    status           = 'rejected',
    rejection_reason = p_reason,
    updated_at       = NOW()
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_reject_order(UUID, TEXT) TO authenticated;

-- 3. Drop and recreate admin_get_orders to include rejection_reason
DROP FUNCTION IF EXISTS admin_get_orders(TEXT);

CREATE OR REPLACE FUNCTION admin_get_orders(p_status TEXT DEFAULT NULL)
RETURNS TABLE (
  id               UUID,
  order_number     TEXT,
  user_id          UUID,
  user_email       TEXT,
  user_name        TEXT,
  customer_email   TEXT,
  customer_name    TEXT,
  customer_mobile  TEXT,
  product_title    TEXT,
  amount           NUMERIC,
  status           TEXT,
  utr_number       TEXT,
  rejection_reason TEXT,
  created_at       TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  SELECT is_admin INTO v_is_admin
  FROM profiles
  WHERE id = auth.uid();

  IF NOT COALESCE(v_is_admin, FALSE) THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  RETURN QUERY
  SELECT
    o.id,
    o.order_number,
    o.user_id,
    COALESCE(p.email, o.customer_email, 'guest')        AS user_email,
    COALESCE(p.full_name, o.customer_name, 'Guest')     AS user_name,
    o.customer_email,
    o.customer_name,
    o.customer_mobile,
    COALESCE(pr.title, o.product_title, 'Unknown')      AS product_title,
    o.amount,
    o.status,
    o.utr_number,
    o.rejection_reason,
    o.created_at,
    o.updated_at
  FROM orders o
  LEFT JOIN profiles  p  ON p.id  = o.user_id
  LEFT JOIN products  pr ON pr.id = o.product_id
  WHERE (p_status IS NULL OR o.status = p_status)
  ORDER BY o.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_orders(TEXT) TO authenticated;
