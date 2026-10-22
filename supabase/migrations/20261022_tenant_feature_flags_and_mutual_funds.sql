-- =====================================================================================
-- Migration: 20261022_tenant_feature_flags_and_mutual_funds.sql
-- Purpose:
-- 1. Add Super Admin master feature flags and Tenant Admin role permissions support.
-- 2. Create Mutual Fund transactions and SIP mandates tables for deep folio ledger tracking.
-- =====================================================================================

-- 1. Add master feature flags to tenants table
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS enabled_features JSONB DEFAULT '{
    "mutual_funds": true,
    "mf_transactions": true,
    "mf_sips": true,
    "rebalancing": true,
    "investment_planning": true,
    "run_diagnostic": true,
    "cas_import": true,
    "client_portal": true,
    "retirement_planning": true,
    "estate_planning": true,
    "tax_planning": true,
    "billing_invoicing": true
  }'::jsonb;

-- 2. Add role-level feature permissions to tenant_settings table
ALTER TABLE public.tenant_settings
  ADD COLUMN IF NOT EXISTS role_permissions JSONB DEFAULT '{
    "ADVISOR": {
      "mutual_funds": true,
      "mf_transactions": true,
      "mf_sips": true,
      "rebalancing": true,
      "investment_planning": true,
      "run_diagnostic": true,
      "cas_import": true,
      "client_portal": true,
      "retirement_planning": true,
      "estate_planning": true,
      "tax_planning": true,
      "billing_invoicing": false
    },
    "STAFF": {
      "mutual_funds": true,
      "mf_transactions": true,
      "mf_sips": true,
      "rebalancing": false,
      "investment_planning": true,
      "run_diagnostic": false,
      "cas_import": true,
      "client_portal": false,
      "retirement_planning": false,
      "estate_planning": false,
      "tax_planning": false,
      "billing_invoicing": false
    },
    "CLIENT": {
      "mutual_funds": true,
      "mf_transactions": true,
      "mf_sips": true,
      "rebalancing": false,
      "investment_planning": true,
      "run_diagnostic": false,
      "cas_import": false,
      "client_portal": true,
      "retirement_planning": true,
      "estate_planning": false,
      "tax_planning": true,
      "billing_invoicing": false
    }
  }'::jsonb;

-- 3. Mutual Fund Transactions Ledger Table
CREATE TABLE IF NOT EXISTS public.mf_transactions (
  transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  tenant_id UUID,
  folio_number VARCHAR(100),
  scheme_name VARCHAR(255) NOT NULL,
  asset_class VARCHAR(50) DEFAULT 'Equity',
  transaction_type VARCHAR(50) NOT NULL, -- PURCHASE, SIP, REDEMPTION, SWITCH_IN, SWITCH_OUT, STP, SWP, DIVIDEND
  transaction_date DATE NOT NULL,
  units NUMERIC(15, 4) NOT NULL,
  nav NUMERIC(15, 4) NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  order_reference VARCHAR(100),
  status VARCHAR(30) DEFAULT 'COMPLETED',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mf_transactions_client ON public.mf_transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_mf_transactions_folio ON public.mf_transactions(folio_number);
CREATE INDEX IF NOT EXISTS idx_mf_transactions_date ON public.mf_transactions(transaction_date);

-- 4. Mutual Fund SIP Mandates Table
CREATE TABLE IF NOT EXISTS public.mf_sips (
  sip_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  tenant_id UUID,
  folio_number VARCHAR(100),
  scheme_name VARCHAR(255) NOT NULL,
  asset_class VARCHAR(50) DEFAULT 'Equity',
  sip_amount NUMERIC(15, 2) NOT NULL,
  sip_day_of_month INT DEFAULT 5,
  frequency VARCHAR(30) DEFAULT 'MONTHLY',
  mandate_bank VARCHAR(100) DEFAULT 'HDFC Bank Auto-Debit',
  status VARCHAR(30) DEFAULT 'ACTIVE', -- ACTIVE, PAUSED, COMPLETED, CANCELLED
  start_date DATE NOT NULL,
  end_date DATE,
  next_due_date DATE,
  total_installments_paid INT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mf_sips_client ON public.mf_sips(client_id);
CREATE INDEX IF NOT EXISTS idx_mf_sips_status ON public.mf_sips(status);
