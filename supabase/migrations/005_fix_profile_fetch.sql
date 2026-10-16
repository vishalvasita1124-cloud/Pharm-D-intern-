-- =============================================================
-- Stage 5: Fix profile fetch — handles NULL user_id rows
-- Creates a SECURITY DEFINER function to get own profile
-- Also backfills user_id on profiles where it is NULL
-- =============================================================

-- Backfill user_id for any profiles missing it (matches by email)
UPDATE public.profiles p
SET user_id = u.id
FROM auth.users u
WHERE u.email = p.email
  AND p.user_id IS NULL;

-- Also ensure role='admin' for the site owner
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'vishalvasita1124@gmail.com';

-- Create a SECURITY DEFINER function to get the current user's profile
-- This bypasses RLS and works even if user_id was previously NULL
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _profile public.profiles;
BEGIN
  -- Try by user_id first (normal case)
  SELECT * INTO _profile
  FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1;

  -- Fallback: try by email (handles legacy rows with NULL user_id)
  IF _profile IS NULL THEN
    SELECT * INTO _profile
    FROM public.profiles
    WHERE email = auth.email()
    LIMIT 1;

    -- Backfill user_id on the found row so future queries work
    IF _profile IS NOT NULL THEN
      UPDATE public.profiles
      SET user_id = auth.uid()
      WHERE id = _profile.id;

      _profile.user_id := auth.uid();
    END IF;
  END IF;

  RETURN _profile;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;
