-- ==============================================================================
-- MIGRATION: Client Multi-Factor Risk Profiling & SEBI Suitability Engine
-- Description: Enhances `clients` and `client_risk_assessments` tables with
--              psychological tolerance scoring, dynamic financial capacity factors
--              (age, dependents, savings rate, emergency cover, leverage),
--              recommended asset allocation, and audit trails.
-- ==============================================================================

-- 1. Add Risk Profiling & Asset Allocation Columns to `clients` table
ALTER TABLE IF EXISTS public.clients
  ADD COLUMN IF NOT EXISTS risk_score INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS risk_capacity_score INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS risk_tolerance_score INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS risk_assessment_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS risk_assessment_responses JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS risk_recommended_equity_pct NUMERIC(5,2) DEFAULT 55.00,
  ADD COLUMN IF NOT EXISTS risk_recommended_debt_pct NUMERIC(5,2) DEFAULT 35.00,
  ADD COLUMN IF NOT EXISTS risk_recommended_gold_pct NUMERIC(5,2) DEFAULT 10.00,
  ADD COLUMN IF NOT EXISTS risk_recommended_cash_pct NUMERIC(5,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS risk_next_review_due DATE,
  ADD COLUMN IF NOT EXISTS risk_notes TEXT;

-- 2. Ensure `client_risk_assessments` has all granular multi-factor columns
CREATE TABLE IF NOT EXISTS public.client_risk_assessments (
    assessment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(client_id) ON DELETE CASCADE,
    risk_score INT NOT NULL,
    risk_category VARCHAR(50) NOT NULL,
    risk_capacity_score INT DEFAULT 50,
    risk_tolerance_score INT DEFAULT 50,
    demographic_factors JSONB DEFAULT '{}'::jsonb,
    financial_factors JSONB DEFAULT '{}'::jsonb,
    recommended_allocation JSONB DEFAULT '{}'::jsonb,
    questionnaire_responses JSONB NOT NULL DEFAULT '{}'::jsonb,
    assessed_at TIMESTAMPTZ DEFAULT NOW(),
    next_review_due DATE NOT NULL,
    is_current BOOLEAN DEFAULT TRUE,
    assessor_name VARCHAR(150),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add any missing columns to existing client_risk_assessments table
ALTER TABLE IF EXISTS public.client_risk_assessments
  ADD COLUMN IF NOT EXISTS risk_capacity_score INT DEFAULT 50,
  ADD COLUMN IF NOT EXISTS risk_tolerance_score INT DEFAULT 50,
  ADD COLUMN IF NOT EXISTS demographic_factors JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS financial_factors JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS recommended_allocation JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS assessor_name VARCHAR(150);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_clients_risk_profile ON public.clients(risk_profile);
CREATE INDEX IF NOT EXISTS idx_clients_risk_score ON public.clients(risk_score);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_client_current ON public.client_risk_assessments(client_id, is_current);

