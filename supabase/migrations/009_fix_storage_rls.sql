-- =============================================================
-- Migration 009: Fix Storage Buckets & RLS Policies for PDFs
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/geuxjndwuqhmwnmnfczj/sql/new
-- =============================================================

-- 1. Ensure 'notes' private bucket exists in Supabase Storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'notes',
  'notes',
  FALSE,
  52428800, -- 50 MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE
  SET public = FALSE,
      file_size_limit = 52428800;

-- 2. Ensure 'public-pdfs' public bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'public-pdfs',
  'public-pdfs',
  TRUE,
  20971520, -- 20 MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE
  SET public = TRUE,
      file_size_limit = 20971520;

-- 3. Storage Policies for 'notes' bucket (Paid & Private PDFs)

-- Admin INSERT (Upload)
DROP POLICY IF EXISTS "notes: admin insert" ON storage.objects;
CREATE POLICY "notes: admin insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'notes'
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE role = 'admin'
        AND (user_id = auth.uid() OR email = auth.email())
      )
      OR auth.email() = 'vishalvasita1124@gmail.com'
    )
  );

-- Admin UPDATE (Replace)
DROP POLICY IF EXISTS "notes: admin update" ON storage.objects;
CREATE POLICY "notes: admin update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'notes'
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE role = 'admin'
        AND (user_id = auth.uid() OR email = auth.email())
      )
      OR auth.email() = 'vishalvasita1124@gmail.com'
    )
  );

-- Admin DELETE (Remove)
DROP POLICY IF EXISTS "notes: admin delete" ON storage.objects;
CREATE POLICY "notes: admin delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'notes'
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE role = 'admin'
        AND (user_id = auth.uid() OR email = auth.email())
      )
      OR auth.email() = 'vishalvasita1124@gmail.com'
    )
  );

-- Authenticated SELECT (Required for generating signed URLs for buyers)
DROP POLICY IF EXISTS "notes: authenticated select" ON storage.objects;
CREATE POLICY "notes: authenticated select"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'notes');

-- 4. Storage Policies for 'public-pdfs' bucket (Free Previews)

-- Public SELECT (Anyone can view free preview PDFs)
DROP POLICY IF EXISTS "public-pdfs: public select" ON storage.objects;
CREATE POLICY "public-pdfs: public select"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'public-pdfs');

-- Admin INSERT
DROP POLICY IF EXISTS "public-pdfs: admin insert" ON storage.objects;
CREATE POLICY "public-pdfs: admin insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'public-pdfs'
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE role = 'admin'
        AND (user_id = auth.uid() OR email = auth.email())
      )
      OR auth.email() = 'vishalvasita1124@gmail.com'
    )
  );

-- Admin UPDATE
DROP POLICY IF EXISTS "public-pdfs: admin update" ON storage.objects;
CREATE POLICY "public-pdfs: admin update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'public-pdfs'
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE role = 'admin'
        AND (user_id = auth.uid() OR email = auth.email())
      )
      OR auth.email() = 'vishalvasita1124@gmail.com'
    )
  );

-- Admin DELETE
DROP POLICY IF EXISTS "public-pdfs: admin delete" ON storage.objects;
CREATE POLICY "public-pdfs: admin delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'public-pdfs'
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE role = 'admin'
        AND (user_id = auth.uid() OR email = auth.email())
      )
      OR auth.email() = 'vishalvasita1124@gmail.com'
    )
  );

-- 5. Products table RLS — allow admin to update file_path & preview_url
DROP POLICY IF EXISTS "products: admin all" ON public.products;
CREATE POLICY "products: admin all"
  ON public.products FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE role = 'admin'
      AND (user_id = auth.uid() OR email = auth.email())
    )
    OR auth.email() = 'vishalvasita1124@gmail.com'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE role = 'admin'
      AND (user_id = auth.uid() OR email = auth.email())
    )
    OR auth.email() = 'vishalvasita1124@gmail.com'
  );
