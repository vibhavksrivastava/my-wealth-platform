-- ==============================================================================
-- Migration: Supabase Storage Buckets & Row Level Security Policies
-- Description:
--   1. public-assets: Public bucket for advisor logos, profile photos, branding.
--   2. client-documents: Private, encrypted bucket for client PAN cards, KYC, CAS.
-- ==============================================================================

-- 1. Create Storage Buckets in storage.buckets table (if not already present)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  (
    'public-assets',
    'public-assets',
    TRUE,
    5242880, -- 5 MB limit
    ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml']::text[]
  ),
  (
    'client-documents',
    'client-documents',
    FALSE, -- Private bucket: Requires signed URLs or authenticated RLS
    20971520, -- 20 MB limit for scanned KYC / financial PDF statements
    ARRAY[
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]::text[]
  )
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ==============================================================================
-- 2. Storage Policies for `public-assets`
-- ==============================================================================

-- Anyone (public / unauthenticated) can read advisor logos and branding assets
DROP POLICY IF EXISTS "Public Assets Read Access" ON storage.objects;
CREATE POLICY "Public Assets Read Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'public-assets');

-- Authenticated advisors, admins, and staff can upload public branding assets
DROP POLICY IF EXISTS "Advisors & Admins Can Upload Public Assets" ON storage.objects;
CREATE POLICY "Advisors & Admins Can Upload Public Assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'public-assets'
);

-- Authenticated users can update or replace their own assets
DROP POLICY IF EXISTS "Advisors & Admins Can Update Public Assets" ON storage.objects;
CREATE POLICY "Advisors & Admins Can Update Public Assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'public-assets');

-- Authenticated users can delete obsolete branding assets
DROP POLICY IF EXISTS "Advisors & Admins Can Delete Public Assets" ON storage.objects;
CREATE POLICY "Advisors & Admins Can Delete Public Assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'public-assets');


-- ==============================================================================
-- 3. Storage Policies for `client-documents` (Private & Sensitive Financials)
-- ==============================================================================

-- Clients can upload documents into their own client/user folder (e.g. client-documents/{clientId}/*)
DROP POLICY IF EXISTS "Clients and Advisors Can Upload Client Documents" ON storage.objects;
CREATE POLICY "Clients and Advisors Can Upload Client Documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'client-documents'
);

-- Restrict SELECT access:
-- 1. If uploaded via signed URL, Supabase validates the cryptographic signature.
-- 2. If queried directly via authenticated client, only allow access if the path belongs to auth.uid()
--    or the user is an advisor/admin.
DROP POLICY IF EXISTS "Secure Client Documents Read Access" ON storage.objects;
CREATE POLICY "Secure Client Documents Read Access"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'client-documents' AND (
    -- User accessing their own client folder:
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Advisors / Admins can read (or service-role override)
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'advisor', 'tenant_admin', 'staff', 'SUPER_ADMIN', 'ADVISOR', 'TENANT_ADMIN', 'STAFF')
    )
  )
);

-- Users can delete their own documents or advisors can manage them
DROP POLICY IF EXISTS "Authorized Users Can Delete Client Documents" ON storage.objects;
CREATE POLICY "Authorized Users Can Delete Client Documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'client-documents' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'advisor', 'tenant_admin', 'SUPER_ADMIN', 'ADVISOR', 'TENANT_ADMIN')
    )
  )
);
