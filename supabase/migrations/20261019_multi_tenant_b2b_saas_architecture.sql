-- ==============================================================================
-- MIGRATION: Multi-Tenant B2B SaaS Architecture & White-Label Isolation
-- Description: Supports first-party MFD practice, B2B resale to other advisory
--              firms, and direct self-service independent retail investors.
-- ==============================================================================

-- 1. Ensure `tenants` (advisory firms) has all white-label & subscription columns
ALTER TABLE IF EXISTS public.tenants
  ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'growth',
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS max_clients INTEGER DEFAULT 500,
  ADD COLUMN IF NOT EXISTS custom_domain TEXT,
  ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#0284c7',
  ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#0f172a',
  ADD COLUMN IF NOT EXISTS disclaimer_text TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- 2. Client Portfolios JSONB snapshot cache table
CREATE TABLE IF NOT EXISTS public.client_portfolios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  advisor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  assets JSONB DEFAULT '[]'::jsonb,
  liabilities JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for instant tenant and client lookups
CREATE INDEX IF NOT EXISTS idx_client_portfolios_tenant_client 
  ON public.client_portfolios(tenant_id, client_id);

-- 3. Compatibility Views (Mapping to User's Conceptual Schema)
-- Advisory Firms View
CREATE OR REPLACE VIEW public.advisory_firms AS
  SELECT 
    id,
    COALESCE(firm_brand_name, firm_legal_name, 'Advisory Firm') AS firm_name,
    subdomain,
    COALESCE(subscription_plan, 'growth') AS subscription_plan,
    is_active,
    created_at
  FROM public.tenants;

-- Profiles View
CREATE OR REPLACE VIEW public.profiles AS
  SELECT
    id,
    tenant_id AS firm_id,
    TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) AS full_name,
    LOWER(role) AS role,
    email,
    is_active,
    created_at
  FROM public.users;

-- 4. Row-Level Security (RLS) Policies for Multi-Tenant Isolation
-- Enable RLS across core tables
ALTER TABLE IF EXISTS public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.client_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.client_portfolios ENABLE ROW LEVEL SECURITY;

-- Helper function to extract user's tenant_id from JWT
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::jsonb ->> 'tenantId', '')::UUID;
$$ LANGUAGE SQL STABLE;

-- Helper function to extract user's role from JWT
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
  SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'role';
$$ LANGUAGE SQL STABLE;

-- RLS Policy: Tenants isolation
DROP POLICY IF EXISTS "Super admins have full tenant access" ON public.tenants;
CREATE POLICY "Super admins have full tenant access"
  ON public.tenants FOR ALL
  USING (public.current_user_role() = 'SUPER_ADMIN');

DROP POLICY IF EXISTS "Advisors and clients read own tenant" ON public.tenants;
CREATE POLICY "Advisors and clients read own tenant"
  ON public.tenants FOR SELECT
  USING (id = public.current_tenant_id());

-- RLS Policy: Client Portfolios isolation
DROP POLICY IF EXISTS "Platform admin full access to portfolios" ON public.client_portfolios;
CREATE POLICY "Platform admin full access to portfolios"
  ON public.client_portfolios FOR ALL
  USING (public.current_user_role() = 'SUPER_ADMIN');

DROP POLICY IF EXISTS "Advisors read and manage tenant portfolios" ON public.client_portfolios;
CREATE POLICY "Advisors read and manage tenant portfolios"
  ON public.client_portfolios FOR ALL
  USING (
    tenant_id = public.current_tenant_id() 
    AND public.current_user_role() IN ('TENANT_ADMIN', 'ADVISOR', 'STAFF')
  );

DROP POLICY IF EXISTS "Clients read and update own portfolio" ON public.client_portfolios;
CREATE POLICY "Clients read and update own portfolio"
  ON public.client_portfolios FOR ALL
  USING (client_id = auth.uid());
