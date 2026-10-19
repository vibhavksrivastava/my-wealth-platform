-- ==============================================================================
-- Migration: Plans, Feature Access Control, Billing, Invoices & Lifecycle
-- ==============================================================================

-- 1. Create `plans` Table
CREATE TABLE IF NOT EXISTS public.plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  price_monthly NUMERIC(10, 2) DEFAULT 0.00,
  max_seats INTEGER DEFAULT 1,
  features JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed Default Plans
INSERT INTO public.plans (slug, name, price_monthly, max_seats, features)
VALUES
  (
    'basic',
    'Starter / Solo IFA',
    999.00,
    1,
    '{"white_label": false, "custom_domain": false, "advanced_reports": false, "bse_star_mf": true, "cas_import": true, "client_portal": true, "suggestions_engine": true, "priority_support": false}'::jsonb
  ),
  (
    'growth',
    'Growth Practice',
    2499.00,
    3,
    '{"white_label": true, "custom_domain": false, "advanced_reports": true, "bse_star_mf": true, "cas_import": true, "client_portal": true, "suggestions_engine": true, "priority_support": true}'::jsonb
  ),
  (
    'enterprise',
    'Enterprise Wealth Firm',
    5999.00,
    20,
    '{"white_label": true, "custom_domain": true, "advanced_reports": true, "bse_star_mf": true, "cas_import": true, "client_portal": true, "suggestions_engine": true, "priority_support": true}'::jsonb
  ),
  (
    'arn_partnership',
    'Zero-Fee ARN Partnership',
    0.00,
    3,
    '{"white_label": true, "custom_domain": false, "advanced_reports": true, "bse_star_mf": true, "cas_import": true, "client_portal": true, "suggestions_engine": true, "commission_sharing": true, "zero_subscription_fee": true, "priority_support": true}'::jsonb
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price_monthly = EXCLUDED.price_monthly,
  max_seats = EXCLUDED.max_seats,
  features = EXCLUDED.features;

-- 2. Update `tenants` Table for Plans, ARN and Lifecycle
ALTER TABLE IF EXISTS public.tenants
  ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS arn_number TEXT,
  ADD COLUMN IF NOT EXISTS commission_sharing_active BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS billing_cycle TEXT DEFAULT 'monthly';

-- Link existing tenants to plans
-- Zenith -> Growth Plan (with active subscription)
UPDATE public.tenants
SET 
  plan_id = (SELECT id FROM public.plans WHERE slug = 'growth'),
  commission_sharing_active = FALSE,
  subscription_expires_at = timezone('utc'::text, now()) + interval '45 days'
WHERE subdomain = 'zenith9186';

-- AAS Investment -> Zero-Fee ARN Partnership (Commission sharing active, no time-based expiry lock)
UPDATE public.tenants
SET 
  plan_id = (SELECT id FROM public.plans WHERE slug = 'arn_partnership'),
  commission_sharing_active = TRUE,
  subscription_expires_at = timezone('utc'::text, now()) + interval '365 days'
WHERE subdomain = 'aasinvestment';

-- Apex -> Enterprise Plan
UPDATE public.tenants
SET 
  plan_id = (SELECT id FROM public.plans WHERE slug = 'enterprise'),
  commission_sharing_active = FALSE,
  subscription_expires_at = timezone('utc'::text, now()) + interval '120 days'
WHERE subdomain = 'apex';

-- Platform -> Enterprise
UPDATE public.tenants
SET 
  plan_id = (SELECT id FROM public.plans WHERE slug = 'enterprise'),
  commission_sharing_active = FALSE,
  subscription_expires_at = timezone('utc'::text, now()) + interval '365 days'
WHERE subdomain = 'platform';

-- Default any unassigned tenants to Growth or Basic
UPDATE public.tenants
SET 
  plan_id = (SELECT id FROM public.plans WHERE slug = 'growth'),
  subscription_expires_at = timezone('utc'::text, now()) + interval '30 days'
WHERE plan_id IS NULL;

-- 3. Create `invoices` Table
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  invoice_number TEXT NOT NULL UNIQUE,
  billing_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT DEFAULT 'INR' NOT NULL,
  status TEXT CHECK (status IN ('paid', 'pending', 'failed', 'cancelled')) DEFAULT 'paid' NOT NULL,
  pdf_url TEXT,
  invoice_type TEXT CHECK (invoice_type IN ('subscription_fee', 'commission_statement')) NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for tenant invoice lookups
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id ON public.invoices(tenant_id);

-- 4. Create `payout_records` Table for Zero-Fee ARN Partners
CREATE TABLE IF NOT EXISTS public.payout_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  statement_period TEXT NOT NULL,
  gross_aum NUMERIC(15, 2) DEFAULT 0.00,
  gross_commission NUMERIC(10, 2) NOT NULL,
  partner_share_pct NUMERIC(5, 2) DEFAULT 80.00,
  partner_share_amount NUMERIC(10, 2) NOT NULL,
  platform_share_amount NUMERIC(10, 2) NOT NULL,
  payout_status TEXT CHECK (payout_status IN ('processed', 'pending', 'in_review')) DEFAULT 'processed',
  payout_date TIMESTAMP WITH TIME ZONE,
  utr_reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payout_records_tenant_id ON public.payout_records(tenant_id);

-- 5. Create `password_reset_tokens` Table for Secure Reset Flow
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON public.password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash ON public.password_reset_tokens(token_hash);

