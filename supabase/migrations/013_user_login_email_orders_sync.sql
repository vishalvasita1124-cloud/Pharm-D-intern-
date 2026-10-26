-- =============================================================
-- Migration 013: User Login System & Email-to-Orders Sync
-- Automatically links orders placed with customer_email to user accounts
-- and grants instant access to approved notes & PDFs when user logs in.
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/geuxjndwuqhmwnmnfczj/sql/new
-- =============================================================

-- 1. Function: sync_my_orders_and_access (called automatically when user logs in)
CREATE OR REPLACE FUNCTION public.sync_my_orders_and_access()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid            UUID;
  v_email          TEXT;
  v_claimed_orders INT := 0;
  v_granted_access INT := 0;
  rec              RECORD;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Determine user's email
  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  IF v_email IS NULL THEN
    v_email := auth.jwt() ->> 'email';
  END IF;

  IF v_email IS NOT NULL AND length(trim(v_email)) > 0 THEN
    -- 1. Claim all unlinked orders placed with this email
    WITH updated AS (
      UPDATE public.orders
      SET user_id = v_uid,
          updated_at = NOW()
      WHERE (user_id IS NULL OR user_id <> v_uid)
        AND lower(trim(customer_email)) = lower(trim(v_email))
      RETURNING id
    )
    SELECT count(*) INTO v_claimed_orders FROM updated;

    -- 2. For all approved orders belonging to this user or email, grant user_access if missing
    FOR rec IN
      SELECT DISTINCT product_id, id AS order_id
      FROM public.orders
      WHERE (user_id = v_uid OR lower(trim(customer_email)) = lower(trim(v_email)))
        AND status = 'approved'
    LOOP
      INSERT INTO public.user_access (user_id, product_id, order_id, granted_at)
      VALUES (v_uid, rec.product_id, rec.order_id, NOW())
      ON CONFLICT (user_id, product_id) DO NOTHING;

      IF FOUND THEN
        v_granted_access := v_granted_access + 1;
      END IF;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'claimed_orders', v_claimed_orders,
    'granted_access', v_granted_access
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_my_orders_and_access() TO authenticated;

-- 2. Auto-claim on user signup: update handle_new_user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _username TEXT;
  _full_name TEXT;
  _mobile TEXT;
  rec RECORD;
BEGIN
  _full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  _mobile    := COALESCE(NEW.raw_user_meta_data->>'mobile', '');
  _username  := COALESCE(
    NEW.raw_user_meta_data->>'username',
    LOWER(REPLACE(split_part(NEW.email, '@', 1), '.', '_'))
  );

  INSERT INTO public.profiles (user_id, full_name, username, email, mobile, role)
  VALUES (
    NEW.id,
    _full_name,
    _username,
    NEW.email,
    _mobile,
    'user'
  )
  ON CONFLICT (username) DO UPDATE
    SET username = _username || '_' || floor(random() * 9999)::TEXT;

  -- Automatically claim all guest orders matching this email
  IF NEW.email IS NOT NULL AND length(trim(NEW.email)) > 0 THEN
    UPDATE public.orders
    SET user_id = NEW.id
    WHERE user_id IS NULL AND lower(trim(customer_email)) = lower(trim(NEW.email));

    -- Grant user_access for any approved orders
    FOR rec IN
      SELECT DISTINCT product_id, id AS order_id
      FROM public.orders
      WHERE (user_id = NEW.id OR lower(trim(customer_email)) = lower(trim(NEW.email)))
        AND status = 'approved'
    LOOP
      INSERT INTO public.user_access (user_id, product_id, order_id, granted_at)
      VALUES (NEW.id, rec.product_id, rec.order_id, NOW())
      ON CONFLICT (user_id, product_id) DO NOTHING;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update admin_approve_order to link user by customer_email and grant access
CREATE OR REPLACE FUNCTION public.admin_approve_order(p_order_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order   public.orders%ROWTYPE;
  v_user_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Insufficient permissions'; END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

  v_user_id := v_order.user_id;

  -- If user_id is null, find user in auth.users by customer_email
  IF v_user_id IS NULL AND v_order.customer_email IS NOT NULL THEN
    SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = lower(trim(v_order.customer_email)) LIMIT 1;
  END IF;

  UPDATE public.orders
  SET status = 'approved',
      user_id = COALESCE(v_user_id, user_id),
      updated_at = NOW()
  WHERE id = p_order_id;

  -- If order has an associated user_id, grant access
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.user_access (user_id, product_id, order_id)
    VALUES (v_user_id, v_order.product_id, v_order.id)
    ON CONFLICT (user_id, product_id) DO NOTHING;
  END IF;

  INSERT INTO public.order_events (order_id, event, actor_id, note)
  VALUES (p_order_id, 'approved', auth.uid(), 'Approved manually by admin');
END;
$$;

-- 4. Update get_pdf_access to fallback to approved order by email if user_access was not yet granted
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

  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  IF v_email IS NULL THEN
    v_email := auth.jwt() ->> 'email';
  END IF;

  -- [2] Check user_access
  SELECT * INTO v_access
  FROM public.user_access ua
  WHERE ua.user_id = v_uid
    AND ua.product_id = p_product_id;

  -- If no record found, check if there is an approved order matching user_id or email
  IF NOT FOUND THEN
    SELECT * INTO v_order
    FROM public.orders o
    WHERE o.product_id = p_product_id
      AND o.status = 'approved'
      AND (o.user_id = v_uid OR (v_email IS NOT NULL AND lower(trim(o.customer_email)) = lower(trim(v_email))))
    ORDER BY o.created_at DESC
    LIMIT 1;

    IF FOUND THEN
      -- Link order to this user if not already linked
      UPDATE public.orders SET user_id = v_uid WHERE id = v_order.id AND user_id IS NULL;

      -- Create access record
      INSERT INTO public.user_access (user_id, product_id, order_id, granted_at)
      VALUES (v_uid, p_product_id, v_order.id, NOW())
      ON CONFLICT (user_id, product_id) DO NOTHING;

      SELECT * INTO v_access
      FROM public.user_access ua
      WHERE ua.user_id = v_uid AND ua.product_id = p_product_id;
    ELSE
      RAISE EXCEPTION 'No access record found for this product' USING ERRCODE = 'P0002';
    END IF;
  END IF;

  -- [3] Access must not be revoked
  IF v_access.status = 'revoked' THEN
    RAISE EXCEPTION 'Access has been revoked' USING ERRCODE = 'P0003';
  END IF;

  -- [4] Fetch product
  SELECT * INTO v_product
  FROM public.products p
  WHERE p.id = p_product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found' USING ERRCODE = 'P0005';
  END IF;

  IF v_product.file_path IS NULL THEN
    RAISE EXCEPTION 'PDF not yet available for this product' USING ERRCODE = 'P0006';
  END IF;

  RETURN QUERY SELECT v_product.file_path, v_product.title;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pdf_access(UUID) TO authenticated;

-- 5. Update RLS on orders so authenticated users can see their own orders AND guest orders with their email
DROP POLICY IF EXISTS "orders: user select own" ON public.orders;
CREATE POLICY "orders: user select own"
  ON public.orders FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR (
      customer_email IS NOT NULL
      AND lower(trim(customer_email)) = lower(trim(coalesce(auth.jwt()->>'email', '')))
    )
  );
