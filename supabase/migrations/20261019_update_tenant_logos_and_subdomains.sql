-- ==============================================================================
-- Migration: Update Tenant Logos & Subdomains for Multi-Tenant Login Pages
-- ==============================================================================

-- 1. Update Zenith Wealth Logo
INSERT INTO public.tenants (subdomain, firm_brand_name, firm_legal_name, primary_color, secondary_color, logo_url, disclaimer_text, is_active)
VALUES (
  'zenith9186',
  'Zenith Wealth Advisory',
  'Zenith Wealth Advisory LLP',
  '#0284c7',
  '#0f172a',
  'https://dbudnhbziywrjesmzqxb.supabase.co/storage/v1/object/public/public-assets/zenith9186/logo.png',
  'Zenith Wealth Advisory is an AMFI-registered Mutual Fund Distributor (ARN-189234). Mutual fund investments are subject to market risks. Read all scheme related documents carefully.',
  TRUE
)
ON CONFLICT (subdomain) DO UPDATE SET
  logo_url = 'https://dbudnhbziywrjesmzqxb.supabase.co/storage/v1/object/public/public-assets/zenith9186/logo.png',
  is_active = TRUE;

-- 2. Update AAS Investment Logo
INSERT INTO public.tenants (subdomain, firm_brand_name, firm_legal_name, primary_color, secondary_color, logo_url, disclaimer_text, is_active)
VALUES (
  'aasinvestment',
  'AAS Investment Services',
  'AAS Investment Services Pvt. Ltd.',
  '#10b981',
  '#064e3b',
  'https://dbudnhbziywrjesmzqxb.supabase.co/storage/v1/object/public/public-assets/aasinvestment/logo.png',
  'AAS Investment Services is a SEBI registered entity (INA00001234). Investments in securities market are subject to market risks.',
  TRUE
)
ON CONFLICT (subdomain) DO UPDATE SET
  logo_url = 'https://dbudnhbziywrjesmzqxb.supabase.co/storage/v1/object/public/public-assets/aasinvestment/logo.png',
  is_active = TRUE;

-- 3. Update Apex Wealth Partners Logo
INSERT INTO public.tenants (subdomain, firm_brand_name, firm_legal_name, primary_color, secondary_color, logo_url, disclaimer_text, is_active)
VALUES (
  'apex',
  'Apex Wealth Partners',
  'Apex Wealth Partners Capital Ltd.',
  '#8b5cf6',
  '#2e1065',
  'https://dbudnhbziywrjesmzqxb.supabase.co/storage/v1/object/public/public-assets/apex/logo.png',
  'Apex Wealth Partners provides institutional-grade family office oversight and wealth advisory services.',
  TRUE
)
ON CONFLICT (subdomain) DO UPDATE SET
  logo_url = 'https://dbudnhbziywrjesmzqxb.supabase.co/storage/v1/object/public/public-assets/apex/logo.png',
  is_active = TRUE;

-- 4. Update Platform HQ Logo
INSERT INTO public.tenants (subdomain, firm_brand_name, firm_legal_name, primary_color, secondary_color, logo_url, disclaimer_text, is_active)
VALUES (
  'platform',
  'Platform HQ • WealthOS',
  'WealthOS Technologies India Pvt. Ltd.',
  '#0ea5e9',
  '#0f172a',
  'https://dbudnhbziywrjesmzqxb.supabase.co/storage/v1/object/public/public-assets/platform/logo.png',
  'WealthOS Technologies. Centralized Multi-Tenant Wealth Infrastructure & Regulatory Reporting Engine.',
  TRUE
)
ON CONFLICT (subdomain) DO UPDATE SET
  logo_url = 'https://dbudnhbziywrjesmzqxb.supabase.co/storage/v1/object/public/public-assets/platform/logo.png',
  is_active = TRUE;

