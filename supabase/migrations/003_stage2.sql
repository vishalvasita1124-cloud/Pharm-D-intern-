-- =============================================================
-- Pharm D Intern Notes — Stage 2 Database Schema
-- Orders, Payments, User Access, Site Settings
-- Run AFTER 001_schema.sql and 002_seed.sql
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. SITE SETTINGS — key/value config (UPI ID, etc.)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.site_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL DEFAULT '',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default settings (idempotent)
INSERT INTO public.site_settings (key, value) VALUES
  ('upi_id',   'pharmdinterns@upi'),
  ('upi_name', 'Pharm D Intern Notes'),
  ('upi_note', 'Add order number in remarks')
ON CONFLICT (key) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 2. ORDER NUMBER SEQUENCE
-- ─────────────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START WITH 10001;

-- ─────────────────────────────────────────────────────────────
-- 3. ORDERS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.orders (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number      TEXT        NOT NULL UNIQUE DEFAULT ('ORD-' || nextval('public.order_number_seq')),
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id        UUID        NOT NULL REFERENCES public.products(id),
  product_title     TEXT        NOT NULL,
  amount            NUMERIC(10,2) NOT NULL,
  currency          TEXT        NOT NULL DEFAULT 'INR',
  payment_method    TEXT        NOT NULL DEFAULT 'upi',
  status            TEXT        NOT NULL DEFAULT 'pending_payment'
                                CHECK (status IN (
                                  'pending_payment',
                                  'pending_verification',
                                  'approved',
                                  'rejected',
                                  'cancelled'
                                )),
  utr_number        TEXT        UNIQUE,
  rejection_reason  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent duplicate active orders for same user+product
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_user_product_active
  ON public.orders (user_id, product_id)
  WHERE status NOT IN ('rejected', 'cancelled');

CREATE INDEX IF NOT EXISTS idx_orders_user_id    ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_product_id ON public.orders(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_status      ON public.orders(status);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_updated_at ON public.orders;
CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 4. ORDER EVENTS — audit log
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.order_events (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID        NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  event      TEXT        NOT NULL,
  note       TEXT,
  actor_id   UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_events_order_id ON public.order_events(order_id);

-- ─────────────────────────────────────────────────────────────
-- 5. USER ACCESS — what users have paid-and-approved access to
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_access (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id  UUID        NOT NULL REFERENCES public.products(id),
  order_id    UUID        NOT NULL REFERENCES public.orders(id),
  granted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_user_access_user_id ON public.user_access(user_id);

-- ─────────────────────────────────────────────────────────────
-- 6. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────

-- SITE SETTINGS — public read, service role write
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "settings: public read"      ON public.site_settings;
DROP POLICY IF EXISTS "settings: service role all" ON public.site_settings;
CREATE POLICY "settings: public read"
  ON public.site_settings FOR SELECT USING (TRUE);
CREATE POLICY "settings: service role all"
  ON public.site_settings FOR ALL USING (auth.role() = 'service_role');

-- ORDERS — users see/create their own; status updates via RPC only
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "orders: user select own"    ON public.orders;
DROP POLICY IF EXISTS "orders: service role all"   ON public.orders;
CREATE POLICY "orders: user select own"
  ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "orders: service role all"
  ON public.orders FOR ALL USING (auth.role() = 'service_role');

-- ORDER EVENTS — users see events for their own orders
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "order_events: user select own" ON public.order_events;
DROP POLICY IF EXISTS "order_events: service role all" ON public.order_events;
CREATE POLICY "order_events: user select own"
  ON public.order_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.user_id = auth.uid()
    )
  );
CREATE POLICY "order_events: service role all"
  ON public.order_events FOR ALL USING (auth.role() = 'service_role');

-- USER ACCESS — users see their own access records
ALTER TABLE public.user_access ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_access: user select own"  ON public.user_access;
DROP POLICY IF EXISTS "user_access: service role all" ON public.user_access;
CREATE POLICY "user_access: user select own"
  ON public.user_access FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_access: service role all"
  ON public.user_access FOR ALL USING (auth.role() = 'service_role');

-- ─────────────────────────────────────────────────────────────
-- 7. RPC FUNCTIONS (SECURITY DEFINER — run as postgres)
-- These bypass RLS so they can update status, create access records, etc.
-- Each validates the caller's identity via auth.uid()
-- ─────────────────────────────────────────────────────────────

-- 7a. create_order — creates or returns existing pending order
CREATE OR REPLACE FUNCTION public.create_order(p_product_id UUID)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id   UUID;
  v_product   public.products%ROWTYPE;
  v_order     public.orders%ROWTYPE;
BEGIN
  -- Validate caller
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Fetch product (price must come from DB, never from client)
  SELECT * INTO v_product FROM public.products WHERE id = p_product_id AND is_published = TRUE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found or not available';
  END IF;

  -- Check if user already has access (already purchased & approved)
  IF EXISTS (
    SELECT 1 FROM public.user_access
    WHERE user_id = v_user_id AND product_id = p_product_id
  ) THEN
    RAISE EXCEPTION 'You already have access to this product';
  END IF;

  -- Return existing active order if one exists
  SELECT * INTO v_order FROM public.orders
  WHERE user_id = v_user_id
    AND product_id = p_product_id
    AND status NOT IN ('rejected', 'cancelled')
  LIMIT 1;

  IF FOUND THEN
    RETURN v_order;
  END IF;

  -- Create new order
  INSERT INTO public.orders (
    user_id, product_id, product_title, amount, currency, payment_method, status
  ) VALUES (
    v_user_id, p_product_id, v_product.title, v_product.price, 'INR', 'upi', 'pending_payment'
  )
  RETURNING * INTO v_order;

  -- Log event
  INSERT INTO public.order_events (order_id, event, actor_id)
  VALUES (v_order.id, 'order_created', v_user_id);

  RETURN v_order;
END;
$$;

-- Grant execute to authenticated users
REVOKE ALL ON FUNCTION public.create_order(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order(UUID) TO authenticated;

-- 7b. submit_utr — user submits their UPI transaction reference
CREATE OR REPLACE FUNCTION public.submit_utr(p_order_id UUID, p_utr TEXT)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_order   public.orders%ROWTYPE;
  v_utr     TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Sanitise UTR
  v_utr := trim(p_utr);
  IF length(v_utr) < 6 THEN
    RAISE EXCEPTION 'UTR number is too short';
  END IF;

  -- Check UTR not already used on another order
  IF EXISTS (
    SELECT 1 FROM public.orders
    WHERE utr_number = v_utr AND id <> p_order_id
  ) THEN
    RAISE EXCEPTION 'This UTR number has already been submitted';
  END IF;

  -- Fetch and validate order belongs to caller
  SELECT * INTO v_order FROM public.orders
  WHERE id = p_order_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.status NOT IN ('pending_payment', 'rejected') THEN
    RAISE EXCEPTION 'UTR can only be submitted for pending or rejected orders';
  END IF;

  -- Update order
  UPDATE public.orders
  SET utr_number = v_utr,
      status = 'pending_verification',
      rejection_reason = NULL
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  -- Log event
  INSERT INTO public.order_events (order_id, event, note, actor_id)
  VALUES (v_order.id, 'utr_submitted', 'UTR: ' || v_utr, v_user_id);

  RETURN v_order;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_utr(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_utr(UUID, TEXT) TO authenticated;

-- 7c. admin_approve_order — admin approves payment
CREATE OR REPLACE FUNCTION public.admin_approve_order(p_order_id UUID)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_order    public.orders%ROWTYPE;
BEGIN
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = v_admin_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  -- Fetch order
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.status <> 'pending_verification' THEN
    RAISE EXCEPTION 'Only pending_verification orders can be approved';
  END IF;

  -- Approve order
  UPDATE public.orders
  SET status = 'approved', rejection_reason = NULL
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  -- Create user_access record (idempotent)
  INSERT INTO public.user_access (user_id, product_id, order_id)
  VALUES (v_order.user_id, v_order.product_id, v_order.id)
  ON CONFLICT (user_id, product_id) DO NOTHING;

  -- Log event
  INSERT INTO public.order_events (order_id, event, actor_id)
  VALUES (v_order.id, 'approved', v_admin_id);

  RETURN v_order;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_approve_order(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_approve_order(UUID) TO authenticated;

-- 7d. admin_reject_order — admin rejects payment
CREATE OR REPLACE FUNCTION public.admin_reject_order(p_order_id UUID, p_reason TEXT)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_order    public.orders%ROWTYPE;
BEGIN
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = v_admin_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  -- Fetch order
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.status NOT IN ('pending_verification', 'pending_payment') THEN
    RAISE EXCEPTION 'Order cannot be rejected in its current state';
  END IF;

  -- Reject order
  UPDATE public.orders
  SET status = 'rejected',
      rejection_reason = trim(p_reason)
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  -- Log event
  INSERT INTO public.order_events (order_id, event, note, actor_id)
  VALUES (v_order.id, 'rejected', trim(p_reason), v_admin_id);

  RETURN v_order;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_reject_order(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_reject_order(UUID, TEXT) TO authenticated;

-- 7e. admin_get_orders — returns all orders with user email (admin only)
CREATE OR REPLACE FUNCTION public.admin_get_orders(p_status TEXT DEFAULT NULL)
RETURNS TABLE (
  id               UUID,
  order_number     TEXT,
  user_id          UUID,
  user_email       TEXT,
  user_name        TEXT,
  product_id       UUID,
  product_title    TEXT,
  amount           NUMERIC,
  currency         TEXT,
  payment_method   TEXT,
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
    o.id, o.order_number, o.user_id,
    u.email      AS user_email,
    p_prof.full_name AS user_name,
    o.product_id, o.product_title,
    o.amount, o.currency, o.payment_method,
    o.status, o.utr_number, o.rejection_reason,
    o.created_at, o.updated_at
  FROM public.orders o
  JOIN auth.users u ON u.id = o.user_id
  LEFT JOIN public.profiles p_prof ON p_prof.user_id = o.user_id
  WHERE (p_status IS NULL OR o.status = p_status)
  ORDER BY o.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_orders(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_orders(TEXT) TO authenticated;

-- 7f. admin_update_setting
CREATE OR REPLACE FUNCTION public.admin_update_setting(p_key TEXT, p_value TEXT)
RETURNS void
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

  INSERT INTO public.site_settings (key, value, updated_at)
  VALUES (p_key, p_value, NOW())
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_setting(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_setting(TEXT, TEXT) TO authenticated;
