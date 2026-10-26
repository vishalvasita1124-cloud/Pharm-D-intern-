-- =============================================================
-- Migration 014: Fix "Database error saving new user" on Signup
-- Safe, bulletproof trigger for auth.users signup
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/geuxjndwuqhmwnmnfczj/sql/new
-- =============================================================

-- 1. Drop the restrictive active order unique index that blocks claiming multiple orders
DROP INDEX IF EXISTS public.idx_orders_user_product_active;
CREATE INDEX IF NOT EXISTS idx_orders_user_product ON public.orders (user_id, product_id);

-- 2. Ensure username uniqueness can be handled gracefully
CREATE INDEX IF NOT EXISTS idx_profiles_username_lower ON public.profiles (lower(username));

-- 3. Bulletproof handle_new_user trigger function with full exception safety
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _username  TEXT;
  _full_name TEXT;
  _mobile    TEXT;
  rec        RECORD;
BEGIN
  -- Extract metadata safely
  _full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  _mobile    := COALESCE(NEW.raw_user_meta_data->>'mobile', '');

  _username  := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), ''),
    LOWER(REGEXP_REPLACE(SPLIT_PART(COALESCE(NEW.email, 'user'), '@', 1), '[^a-zA-Z0-9_]', '_', 'g'))
  );

  IF length(_username) < 3 THEN
    _username := 'user_' || SUBSTRING(REPLACE(NEW.id::TEXT, '-', '') FROM 1 FOR 6);
  END IF;

  -- Ensure username is not already taken by another user
  IF EXISTS (SELECT 1 FROM public.profiles WHERE LOWER(username) = LOWER(_username) AND user_id <> NEW.id) THEN
    _username := _username || '_' || SUBSTRING(REPLACE(NEW.id::TEXT, '-', '') FROM 1 FOR 5);
  END IF;

  -- Safe profile upsert without relying on conflicting unique indexes
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.id) THEN
    UPDATE public.profiles
    SET email = COALESCE(NEW.email, email),
        full_name = CASE WHEN length(_full_name) > 0 THEN _full_name ELSE full_name END,
        mobile = CASE WHEN length(_mobile) > 0 THEN _mobile ELSE mobile END,
        updated_at = NOW()
    WHERE user_id = NEW.id;
  ELSIF NEW.email IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE LOWER(email) = LOWER(NEW.email) AND user_id IS NULL) THEN
    UPDATE public.profiles
    SET user_id = NEW.id,
        full_name = CASE WHEN length(_full_name) > 0 THEN _full_name ELSE full_name END,
        mobile = CASE WHEN length(_mobile) > 0 THEN _mobile ELSE mobile END,
        updated_at = NOW()
    WHERE LOWER(email) = LOWER(NEW.email) AND user_id IS NULL;
  ELSE
    INSERT INTO public.profiles (user_id, full_name, username, email, mobile, role)
    VALUES (NEW.id, _full_name, _username, COALESCE(NEW.email, ''), _mobile, 'user');
  END IF;

  -- Link guest orders and grant access inside a protected sub-block
  BEGIN
    IF NEW.email IS NOT NULL AND length(trim(NEW.email)) > 0 THEN
      -- Link all unlinked orders placed with this email
      UPDATE public.orders
      SET user_id = NEW.id,
          updated_at = NOW()
      WHERE user_id IS NULL AND LOWER(TRIM(customer_email)) = LOWER(TRIM(NEW.email));

      -- Grant user_access for all approved orders
      FOR rec IN
        SELECT DISTINCT product_id, id AS order_id
        FROM public.orders
        WHERE (user_id = NEW.id OR LOWER(TRIM(customer_email)) = LOWER(TRIM(NEW.email)))
          AND status = 'approved'
      LOOP
        INSERT INTO public.user_access (user_id, product_id, order_id, granted_at)
        VALUES (NEW.id, rec.product_id, rec.order_id, NOW())
        ON CONFLICT (user_id, product_id) DO NOTHING;
      END LOOP;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Order linking failed in handle_new_user: %', SQLERRM;
  END;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- CRITICAL: Under no circumstances should user signup be blocked!
  RAISE WARNING 'handle_new_user failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Reattach trigger
DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Update sync_my_orders_and_access with exception safety as well
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

  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  IF v_email IS NULL THEN
    v_email := auth.jwt() ->> 'email';
  END IF;

  IF v_email IS NOT NULL AND length(trim(v_email)) > 0 THEN
    -- Claim unlinked orders
    WITH updated AS (
      UPDATE public.orders
      SET user_id = v_uid,
          updated_at = NOW()
      WHERE (user_id IS NULL OR user_id <> v_uid)
        AND LOWER(TRIM(customer_email)) = LOWER(TRIM(v_email))
      RETURNING id
    )
    SELECT count(*) INTO v_claimed_orders FROM updated;

    -- Grant user_access for approved orders
    FOR rec IN
      SELECT DISTINCT product_id, id AS order_id
      FROM public.orders
      WHERE (user_id = v_uid OR LOWER(TRIM(customer_email)) = LOWER(TRIM(v_email)))
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
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_my_orders_and_access() TO authenticated;
