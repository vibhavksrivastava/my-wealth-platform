-- ==============================================================================
-- Migration: Secure Tenant-Level Settings, Custom Domains & Encrypted Env Vars
-- ==============================================================================

-- 1. Enable pgcrypto extension for cryptographic utilities
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create `tenant_settings` table
CREATE TABLE IF NOT EXISTS public.tenant_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  custom_domain VARCHAR(255),
  branding JSONB DEFAULT '{}'::jsonb NOT NULL,
  encrypted_env_vars JSONB DEFAULT '{}'::jsonb NOT NULL,
  features_override JSONB DEFAULT '{}'::jsonb NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT uq_tenant_settings_tenant_id UNIQUE (tenant_id),
  CONSTRAINT uq_tenant_settings_custom_domain UNIQUE (custom_domain)
);

-- 3. Create indexes for high-speed routing and lookups
CREATE INDEX IF NOT EXISTS idx_tenant_settings_tenant_id ON public.tenant_settings (tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_settings_custom_domain ON public.tenant_settings (custom_domain) WHERE custom_domain IS NOT NULL;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- Service Role policy: unrestricted access for Next.js backend utilities
DROP POLICY IF EXISTS "Service role full access on tenant_settings" ON public.tenant_settings;
CREATE POLICY "Service role full access on tenant_settings"
  ON public.tenant_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated Users: Read their own firm's settings
DROP POLICY IF EXISTS "Tenant users can view their firm settings" ON public.tenant_settings;
CREATE POLICY "Tenant users can view their firm settings"
  ON public.tenant_settings
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Tenant Admins: Update their own firm's settings
DROP POLICY IF EXISTS "Tenant admins can update their firm settings" ON public.tenant_settings;
CREATE POLICY "Tenant admins can update their firm settings"
  ON public.tenant_settings
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE id = auth.uid() AND role IN ('TENANT_ADMIN', 'SUPER_ADMIN')
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE id = auth.uid() AND role IN ('TENANT_ADMIN', 'SUPER_ADMIN')
    )
  );

-- 6. Trigger to automatically update `updated_at`
CREATE OR REPLACE FUNCTION public.handle_tenant_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tenant_settings_updated_at ON public.tenant_settings;
CREATE TRIGGER trg_tenant_settings_updated_at
  BEFORE UPDATE ON public.tenant_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_tenant_settings_updated_at();

-- 7. Seed initial `tenant_settings` records for existing tenants
INSERT INTO public.tenant_settings (tenant_id, custom_domain, branding, encrypted_env_vars, features_override)
SELECT 
  t.id AS tenant_id,
  t.custom_domain,
  jsonb_build_object(
    'firm_brand_name', t.firm_brand_name,
    'logo_url', t.logo_url,
    'primary_color', t.primary_color,
    'secondary_color', t.secondary_color,
    'theme_mode', COALESCE(t.theme_mode, 'light'),
    'disclaimer_text', t.disclaimer_text
  ) AS branding,
  '{}'::jsonb AS encrypted_env_vars,
  '{}'::jsonb AS features_override
FROM public.tenants t
ON CONFLICT (tenant_id) DO UPDATE SET
  custom_domain = EXCLUDED.custom_domain,
  branding = EXCLUDED.branding,
  updated_at = timezone('utc'::text, now());

