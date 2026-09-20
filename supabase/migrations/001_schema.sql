-- =============================================================
-- Pharm D Intern Notes — Stage 1 Database Schema
-- Smart migration: adds missing columns to existing profiles table
-- Safe to run even when profiles already exists
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. PROFILES — add missing columns if they don't exist
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL,
  full_name   TEXT NOT NULL DEFAULT '',
  role        TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add missing columns one by one (ALTER COLUMN IF NOT EXISTS safe pattern)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='user_id') THEN
    ALTER TABLE public.profiles ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='username') THEN
    ALTER TABLE public.profiles ADD COLUMN username TEXT UNIQUE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='mobile') THEN
    ALTER TABLE public.profiles ADD COLUMN mobile TEXT NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='updated_at') THEN
    ALTER TABLE public.profiles ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

-- Ensure NOT NULL on user_id after adding (for new rows)
-- Note: existing rows may have NULL user_id — that's OK for migration

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- ─────────────────────────────────────────────────────────────
-- 2. CATEGORIES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);

-- ─────────────────────────────────────────────────────────────
-- 3. PRODUCTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.products (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT NOT NULL,
  slug              TEXT NOT NULL UNIQUE,
  description       TEXT NOT NULL DEFAULT '',
  short_description TEXT NOT NULL DEFAULT '',
  category_id       UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  price             INTEGER NOT NULL DEFAULT 0,
  pages             INTEGER NOT NULL DEFAULT 0,
  cover_url         TEXT,
  preview_url       TEXT,
  topics            TEXT[] NOT NULL DEFAULT '{}',
  is_published      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_published ON public.products(is_published);

-- ─────────────────────────────────────────────────────────────
-- 4. TRIGGERS
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _username TEXT;
  _full_name TEXT;
  _mobile TEXT;
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- 5. ROW LEVEL SECURITY (RLS)
-- Drop existing policies before recreating (fully idempotent)
-- ─────────────────────────────────────────────────────────────

-- PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles: read own"        ON public.profiles;
DROP POLICY IF EXISTS "profiles: update own"       ON public.profiles;
DROP POLICY IF EXISTS "profiles: service role all" ON public.profiles;

CREATE POLICY "profiles: read own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "profiles: update own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND role = (SELECT role FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "profiles: service role all"
  ON public.profiles FOR ALL
  USING (auth.role() = 'service_role');

-- CATEGORIES
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories: public read"      ON public.categories;
DROP POLICY IF EXISTS "categories: service role all" ON public.categories;

CREATE POLICY "categories: public read"
  ON public.categories FOR SELECT
  USING (TRUE);

CREATE POLICY "categories: service role all"
  ON public.categories FOR ALL
  USING (auth.role() = 'service_role');

-- PRODUCTS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products: public read published" ON public.products;
DROP POLICY IF EXISTS "products: auth read published"   ON public.products;
DROP POLICY IF EXISTS "products: service role all"      ON public.products;

CREATE POLICY "products: public read published"
  ON public.products FOR SELECT
  USING (is_published = TRUE);

CREATE POLICY "products: auth read published"
  ON public.products FOR SELECT
  TO authenticated
  USING (is_published = TRUE);

CREATE POLICY "products: service role all"
  ON public.products FOR ALL
  USING (auth.role() = 'service_role');
