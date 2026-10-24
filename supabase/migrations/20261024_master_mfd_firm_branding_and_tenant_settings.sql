-- =========================================================================
-- MASTER MIGRATION SCRIPT: Firm Branding, Tenant Config, & MFD Execution
-- Migration: 20261024_master_mfd_firm_branding_and_tenant_settings.sql
-- =========================================================================

-- 1. Tenant Firm Type & User Professional Role Enhancements
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS firm_type VARCHAR(20) DEFAULT 'MFD';

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS professional_role VARCHAR(30) DEFAULT 'ADVISOR';

-- Safely sync legacy tenant_type if the enum exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tenant_type_enum') THEN
    UPDATE public.tenants 
    SET tenant_type = firm_type::tenant_type_enum 
    WHERE firm_type IS NOT NULL AND tenant_type IS NULL;
  END IF;
END $$;


-- 2. Tenant Settings & Encrypted Integration Keys Table
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.tenant_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  custom_domain VARCHAR(255),
  branding JSONB DEFAULT '{}'::jsonb NOT NULL,
  encrypted_env_vars JSONB DEFAULT '{}'::jsonb NOT NULL,
  features_override JSONB DEFAULT '{}'::jsonb NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT uq_tenant_settings_tenant_id UNIQUE (tenant_id),
  CONSTRAINT uq_tenant_settings_custom_domain UNIQUE (custom_domain)
);

CREATE INDEX IF NOT EXISTS idx_tenant_settings_tenant_id ON public.tenant_settings (tenant_id);


-- 3. Institutional MFD Master & Reconciliation Tables
CREATE TABLE IF NOT EXISTS public.mfd_schemes (
  scheme_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  amfi_code VARCHAR(50) UNIQUE NOT NULL,
  isin VARCHAR(20) UNIQUE,
  scheme_name VARCHAR(255) NOT NULL,
  amc_name VARCHAR(150) NOT NULL,
  category VARCHAR(100),
  plan_type VARCHAR(20) CHECK (plan_type IN ('DIRECT', 'REGULAR')),
  status VARCHAR(20) DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.mfd_folios (
  folio_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(client_id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  amc_name VARCHAR(150) NOT NULL,
  folio_number VARCHAR(100) NOT NULL,
  holding_nature VARCHAR(50) DEFAULT 'SINGLE',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_client_amc_folio UNIQUE (client_id, amc_name, folio_number)
);

-- Safe creation of mfd_nav_history table and unique constraint
CREATE TABLE IF NOT EXISTS public.mfd_nav_history (
  nav_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scheme_id UUID NOT NULL REFERENCES public.mfd_schemes(scheme_id) ON DELETE CASCADE,
  nav_date DATE NOT NULL
);

-- Safely add the unique constraint if it doesn't already exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_scheme_nav_date'
  ) THEN
    ALTER TABLE public.mfd_nav_history 
    ADD CONSTRAINT uq_scheme_nav_date UNIQUE (scheme_id, nav_date);
  END IF;
END $$;

-- Ensure nav_value column exists if table was already there
ALTER TABLE public.mfd_nav_history 
ADD COLUMN IF NOT EXISTS nav_value NUMERIC(12,4) NOT NULL;


CREATE TABLE IF NOT EXISTS public.mfd_brokerage_ledger (
  brokerage_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(client_id) ON DELETE SET NULL,
  scheme_id UUID REFERENCES public.mfd_schemes(scheme_id) ON DELETE SET NULL,
  folio_number VARCHAR(100),
  statement_month VARCHAR(20) NOT NULL,
  brokerage_amount NUMERIC(12,2) NOT NULL,
  commission_rate_bps NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- 4. Enable Row Level Security (RLS) & Base Policies
ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mfd_folios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mfd_brokerage_ledger ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running to prevent errors
DROP POLICY IF EXISTS "Service role full access tenant_settings" ON public.tenant_settings;
DROP POLICY IF EXISTS "Service role full access mfd_folios" ON public.mfd_folios;
DROP POLICY IF EXISTS "Service role full access mfd_brokerage" ON public.mfd_brokerage_ledger;

CREATE POLICY "Service role full access tenant_settings" ON public.tenant_settings FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access mfd_folios" ON public.mfd_folios FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access mfd_brokerage" ON public.mfd_brokerage_ledger FOR ALL TO service_role USING (true) WITH CHECK (true);

