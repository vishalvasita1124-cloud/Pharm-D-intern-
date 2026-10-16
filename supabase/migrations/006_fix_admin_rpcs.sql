-- =============================================================
-- Migration 006: Fix admin functions — use email fallback
-- Run this in Supabase SQL Editor
-- =============================================================

-- Step 1: Backfill user_id on profiles missing it
UPDATE public.profiles p
SET user_id = u.id
FROM auth.users u
WHERE u.email = p.email
  AND p.user_id IS NULL;

-- Step 2: Ensure admin role
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'vishalvasita1124@gmail.com';

-- Step 3: Helper function — is_admin() — checks by uid OR email
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE role = 'admin'
      AND (user_id = auth.uid() OR email = auth.email())
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Step 4: get_my_profile — reliable profile fetch
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _p public.profiles;
BEGIN
  SELECT * INTO _p FROM public.profiles
  WHERE user_id = auth.uid() LIMIT 1;

  IF _p IS NULL THEN
    SELECT * INTO _p FROM public.profiles
    WHERE email = auth.email() LIMIT 1;
    IF _p IS NOT NULL THEN
      UPDATE public.profiles SET user_id = auth.uid() WHERE id = _p.id;
      _p.user_id := auth.uid();
    END IF;
  END IF;

  RETURN _p;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

-- Step 5: Patch admin_get_products_with_pdf
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
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Insufficient permissions'; END IF;
  RETURN QUERY
  SELECT p.id, p.title, p.slug, p.price, p.is_published, p.file_path, p.updated_at
  FROM public.products p ORDER BY p.title;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_get_products_with_pdf() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_products_with_pdf() TO authenticated;

-- Step 6: Patch admin_set_product_pdf
CREATE OR REPLACE FUNCTION public.admin_set_product_pdf(p_product_id UUID, p_file_path TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Insufficient permissions'; END IF;
  UPDATE public.products SET file_path = p_file_path, updated_at = NOW()
  WHERE id = p_product_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not found'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_set_product_pdf(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_product_pdf(UUID, TEXT) TO authenticated;

-- Step 7: Patch admin_get_orders
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
  user_name        TEXT
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
    o.id, o.order_number, o.user_id, o.product_id, o.product_title,
    o.amount, o.currency, o.payment_method, o.status::TEXT,
    o.utr_number, o.rejection_reason, o.created_at, o.updated_at,
    u.email AS user_email,
    pr.full_name AS user_name
  FROM public.orders o
  JOIN auth.users u ON u.id = o.user_id
  LEFT JOIN public.profiles pr ON pr.user_id = o.user_id
  WHERE (p_status IS NULL OR o.status::TEXT = p_status)
  ORDER BY o.created_at DESC;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_get_orders(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_orders(TEXT) TO authenticated;

-- Step 8: Patch admin_approve_order
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
  UPDATE public.orders SET status = 'approved', updated_at = NOW() WHERE id = p_order_id;
  INSERT INTO public.user_access (user_id, product_id, order_id)
  VALUES (v_order.user_id, v_order.product_id, v_order.id)
  ON CONFLICT DO NOTHING;
  INSERT INTO public.order_events (order_id, event, actor_id)
  VALUES (p_order_id, 'approved', auth.uid());
END;
$$;
REVOKE ALL ON FUNCTION public.admin_approve_order(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_approve_order(UUID) TO authenticated;

-- Step 9: Patch admin_reject_order
CREATE OR REPLACE FUNCTION public.admin_reject_order(p_order_id UUID, p_reason TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Insufficient permissions'; END IF;
  UPDATE public.orders
  SET status = 'rejected', rejection_reason = p_reason, updated_at = NOW()
  WHERE id = p_order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  INSERT INTO public.order_events (order_id, event, note, actor_id)
  VALUES (p_order_id, 'rejected', p_reason, auth.uid());
END;
$$;
REVOKE ALL ON FUNCTION public.admin_reject_order(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_reject_order(UUID, TEXT) TO authenticated;

-- Step 10: Patch admin_update_setting
CREATE OR REPLACE FUNCTION public.admin_update_setting(p_key TEXT, p_value TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Insufficient permissions'; END IF;
  INSERT INTO public.site_settings (key, value, updated_at)
  VALUES (p_key, p_value, NOW())
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
END;
$$;
REVOKE ALL ON FUNCTION public.admin_update_setting(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_setting(TEXT, TEXT) TO authenticated;

-- Step 11: Patch admin_get_user_access
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
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Insufficient permissions'; END IF;
  RETURN QUERY
  SELECT ua.id, ua.user_id, u.email, pr.full_name,
    ua.product_id, p.title, ua.order_id, o.order_number, ua.status, ua.granted_at
  FROM public.user_access ua
  JOIN auth.users u ON u.id = ua.user_id
  LEFT JOIN public.profiles pr ON pr.user_id = ua.user_id
  JOIN public.products p ON p.id = ua.product_id
  JOIN public.orders o ON o.id = ua.order_id
  ORDER BY ua.granted_at DESC;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_get_user_access() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_user_access() TO authenticated;

-- Step 12: Patch admin_revoke_access
CREATE OR REPLACE FUNCTION public.admin_revoke_access(p_access_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Insufficient permissions'; END IF;
  UPDATE public.user_access SET status = 'revoked' WHERE id = p_access_id;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_revoke_access(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_revoke_access(UUID) TO authenticated;

-- Step 13: Patch admin_restore_access
CREATE OR REPLACE FUNCTION public.admin_restore_access(p_access_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Insufficient permissions'; END IF;
  UPDATE public.user_access SET status = 'active' WHERE id = p_access_id;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_restore_access(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_restore_access(UUID) TO authenticated;

-- Verify
SELECT email, user_id, role FROM public.profiles WHERE email = 'vishalvasita1124@gmail.com';
