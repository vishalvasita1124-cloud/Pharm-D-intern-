-- ═══════════════════════════════════════════════════════════════════════════
-- Pharm D Intern Notes — Stage 4 SQL Migration
-- Run this in: https://supabase.com/dashboard/project/geuxjndwuqhmwnmnfczj/sql/new
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Add preview_url column to products (free sample PDF link)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS preview_url TEXT;

-- 2. Create the resources table (standalone study materials)
CREATE TABLE IF NOT EXISTS public.resources (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  file_url    TEXT NOT NULL DEFAULT '',
  is_free     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on resources
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

-- 3. RLS policies for resources
-- Anyone can read free resources
DROP POLICY IF EXISTS "resources: public read free" ON public.resources;
CREATE POLICY "resources: public read free"
ON public.resources FOR SELECT TO anon, authenticated
USING (is_free = TRUE);

-- Admin can do everything
DROP POLICY IF EXISTS "resources: admin all" ON public.resources;
CREATE POLICY "resources: admin all"
ON public.resources FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE role = 'admin'
    AND (user_id = auth.uid() OR email = auth.email())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE role = 'admin'
    AND (user_id = auth.uid() OR email = auth.email())
  )
);

-- 4. RLS policy for products — admin can INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "products: admin all" ON public.products;
CREATE POLICY "products: admin all"
ON public.products FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE role = 'admin'
    AND (user_id = auth.uid() OR email = auth.email())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE role = 'admin'
    AND (user_id = auth.uid() OR email = auth.email())
  )
);

-- 5. Create public-pdfs storage bucket (for preview PDFs and resources)
-- Note: Run this ONLY if the bucket doesn't already exist.
-- You can check in Storage → Buckets in your Supabase dashboard.
INSERT INTO storage.buckets (id, name, public)
VALUES ('public-pdfs', 'public-pdfs', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 6. Storage policy for public-pdfs bucket — allow public reads
DROP POLICY IF EXISTS "public-pdfs: public read" ON storage.objects;
CREATE POLICY "public-pdfs: public read"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'public-pdfs');

-- Allow admin to upload/delete in public-pdfs
DROP POLICY IF EXISTS "public-pdfs: admin write" ON storage.objects;
CREATE POLICY "public-pdfs: admin write"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'public-pdfs'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE role = 'admin'
    AND (user_id = auth.uid() OR email = auth.email())
  )
)
WITH CHECK (
  bucket_id = 'public-pdfs'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE role = 'admin'
    AND (user_id = auth.uid() OR email = auth.email())
  )
);

-- Done! ✅
