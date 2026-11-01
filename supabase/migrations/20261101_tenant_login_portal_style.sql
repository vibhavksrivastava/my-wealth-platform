-- ==============================================================================
-- Migration: Add login_portal_style to tenants & tenant_settings
-- Migration: 20261101_tenant_login_portal_style.sql
-- ==============================================================================

-- 1. Add login_portal_style column to public.tenants table
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS login_portal_style VARCHAR(30) DEFAULT 'UNIVERSAL';

-- 2. Add constraint check for allowed login styles:
--    'UNIVERSAL'       -> Single unified login form with auto-routing based on role
--    'INVESTOR_PORTAL' -> Dedicated investor portal with subtle staff link at bottom
--    'MULTI_TAB'       -> Classic tabbed switcher (Client | Advisor / Distributor | Admin)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_tenants_login_portal_style'
  ) THEN
    ALTER TABLE public.tenants
    ADD CONSTRAINT chk_tenants_login_portal_style
    CHECK (login_portal_style IN ('UNIVERSAL', 'INVESTOR_PORTAL', 'MULTI_TAB'));
  END IF;
END $$;

-- 3. Set default 'UNIVERSAL' for all existing tenant records if null
UPDATE public.tenants 
SET login_portal_style = 'UNIVERSAL' 
WHERE login_portal_style IS NULL;

-- 4. Sync existing tenant_settings JSONB branding if present
UPDATE public.tenant_settings
SET branding = jsonb_set(
  branding,
  '{login_portal_style}',
  to_jsonb(COALESCE(
    (SELECT login_portal_style FROM public.tenants WHERE public.tenants.id = public.tenant_settings.tenant_id),
    'UNIVERSAL'
  ))
)
WHERE branding IS NOT NULL AND NOT (branding ? 'login_portal_style');

