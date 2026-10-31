-- =====================================================================================
-- Migration: 20261031_multi_tenant_sips_management.sql
-- Purpose: Dedicated multi-tenant Systematic Investment Plan (SIP) table with RLS,
--          supporting manual entries, CAS statement inference, and BSE StAR MF API sync.
-- =====================================================================================

-- 1. Create Frequency, Status, and Source Enums (with safety checks)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sip_frequency_type') THEN
        CREATE TYPE public.sip_frequency_type AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sip_status_type') THEN
        CREATE TYPE public.sip_status_type AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED', 'COMPLETED', 'REGISTERED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sip_source_type') THEN
        CREATE TYPE public.sip_source_type AS ENUM ('CAS_IMPORT', 'MANUAL', 'API_SYNC');
    END IF;
END $$;

-- 2. Create the sips table
CREATE TABLE IF NOT EXISTS public.sips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(client_id) ON DELETE CASCADE,
    arn_id VARCHAR(50) NOT NULL,
    ucc VARCHAR(50),
    sip_registration_no VARCHAR(100) UNIQUE,
    mandate_id VARCHAR(100),
    scheme_code VARCHAR(50),
    scheme_name TEXT NOT NULL,
    installment_amount NUMERIC(12, 2) NOT NULL CHECK (installment_amount > 0),
    frequency public.sip_frequency_type NOT NULL DEFAULT 'MONTHLY',
    installment_day INTEGER CHECK (installment_day BETWEEN 1 AND 31),
    start_date DATE,
    end_date DATE,
    installments_paid INTEGER NOT NULL DEFAULT 0 CHECK (installments_paid >= 0),
    status public.sip_status_type NOT NULL DEFAULT 'ACTIVE',
    source public.sip_source_type NOT NULL DEFAULT 'MANUAL',
    raw_api_response JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. High-performance indexes for tenant, client, and search lookups
CREATE INDEX IF NOT EXISTS idx_sips_tenant ON public.sips(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sips_client ON public.sips(client_id);
CREATE INDEX IF NOT EXISTS idx_sips_status ON public.sips(status);
CREATE INDEX IF NOT EXISTS idx_sips_ucc ON public.sips(ucc);
CREATE INDEX IF NOT EXISTS idx_sips_reg_no ON public.sips(sip_registration_no);

-- 4. Automatic updated_at timestamp trigger
CREATE OR REPLACE FUNCTION public.update_sips_modtime()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sips_updated_at ON public.sips;
CREATE TRIGGER trg_sips_updated_at
BEFORE UPDATE ON public.sips
FOR EACH ROW EXECUTE FUNCTION public.update_sips_modtime();

-- 5. Enable Row-Level Security (RLS)
ALTER TABLE public.sips ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for Tenant Isolation
DROP POLICY IF EXISTS "Tenant isolation policy for sips select" ON public.sips;
CREATE POLICY "Tenant isolation policy for sips select" ON public.sips
    FOR SELECT
    USING (
        tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
        OR (auth.jwt() ->> 'role') = 'SUPER_ADMIN'
        OR current_user = 'service_role'
    );

DROP POLICY IF EXISTS "Tenant isolation policy for sips insert" ON public.sips;
CREATE POLICY "Tenant isolation policy for sips insert" ON public.sips
    FOR INSERT
    WITH CHECK (
        tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
        OR (auth.jwt() ->> 'role') = 'SUPER_ADMIN'
        OR current_user = 'service_role'
    );

DROP POLICY IF EXISTS "Tenant isolation policy for sips update" ON public.sips;
CREATE POLICY "Tenant isolation policy for sips update" ON public.sips
    FOR UPDATE
    USING (
        tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
        OR (auth.jwt() ->> 'role') = 'SUPER_ADMIN'
        OR current_user = 'service_role'
    );

DROP POLICY IF EXISTS "Tenant isolation policy for sips delete" ON public.sips;
CREATE POLICY "Tenant isolation policy for sips delete" ON public.sips
    FOR DELETE
    USING (
        tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
        OR (auth.jwt() ->> 'role') = 'SUPER_ADMIN'
        OR current_user = 'service_role'
    );

