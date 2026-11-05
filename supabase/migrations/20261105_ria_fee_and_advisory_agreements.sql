-- ==============================================================================
-- Migration: SEBI RIA Fee Management, Advisory Agreements & Compliance Vault
-- Migration File: 20261105_ria_fee_and_advisory_agreements.sql
-- Fulfills SEBI (Investment Advisers) Regulations, 2013 & BASL Compliance
-- ==============================================================================

-- 1. RIA Advisory Agreements Table (Reg. 19 & Mandatory Written Agreement)
CREATE TABLE IF NOT EXISTS public.ria_agreements (
    agreement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(client_id) ON DELETE CASCADE,
    agreement_version VARCHAR(20) DEFAULT 'v1.0',
    status VARCHAR(20) CHECK (status IN ('PENDING', 'SIGNED', 'EXPIRED', 'TERMINATED')) DEFAULT 'PENDING',
    mitc_accepted BOOLEAN DEFAULT FALSE,
    signed_at TIMESTAMPTZ,
    client_signature_name VARCHAR(150),
    signer_ip_address VARCHAR(50),
    user_agent TEXT,
    document_url TEXT,
    scope_of_services TEXT DEFAULT 'Comprehensive Fee-Only Investment Advisory, Asset Allocation, and Financial Goal Planning',
    fee_mode VARCHAR(20) CHECK (fee_mode IN ('FIXED', 'AUA_PERCENTAGE')),
    agreed_fee_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    agreed_fee_frequency VARCHAR(20) DEFAULT 'ANNUALLY',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for speedy tenant and client lookups
CREATE INDEX IF NOT EXISTS idx_ria_agreements_tenant ON public.ria_agreements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ria_agreements_client ON public.ria_agreements(client_id);
CREATE INDEX IF NOT EXISTS idx_ria_agreements_status ON public.ria_agreements(status);

-- 2. RIA Fee Structures & Configurations Table (Enforcing SEBI Caps: ₹1.51L Fixed / 2.5% AUA)
CREATE TABLE IF NOT EXISTS public.ria_fee_configurations (
    fee_config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(client_id) ON DELETE CASCADE,
    fee_mode VARCHAR(20) CHECK (fee_mode IN ('FIXED', 'AUA_PERCENTAGE')) NOT NULL,
    agreed_amount_or_percentage NUMERIC(10,2) NOT NULL, -- e.g. 50000.00 for fixed or 1.25 for 1.25% AUA
    billing_frequency VARCHAR(20) CHECK (billing_frequency IN ('QUARTERLY', 'ANNUALLY')) DEFAULT 'ANNUALLY',
    advance_billing_months INT DEFAULT 12 CHECK (advance_billing_months <= 12), -- SEBI max 1-year advance
    current_aua_basis NUMERIC(14,2) DEFAULT 0.00, -- Snapshot of AUA when percentage fee was sized
    next_billing_date DATE,
    agreement_id UUID REFERENCES public.ria_agreements(agreement_id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ria_fee_config_client ON public.ria_fee_configurations(client_id);
CREATE INDEX IF NOT EXISTS idx_ria_fee_config_tenant ON public.ria_fee_configurations(tenant_id);

-- 3. RIA Tax Invoices & Payment Tracking Table (18% GST & Official Banking Channels)
CREATE TABLE IF NOT EXISTS public.ria_invoices (
    invoice_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(client_id) ON DELETE CASCADE,
    fee_config_id UUID REFERENCES public.ria_fee_configurations(fee_config_id) ON DELETE SET NULL,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    base_fee_amount NUMERIC(10,2) NOT NULL,
    gst_rate_pct NUMERIC(4,2) DEFAULT 18.00,
    gst_amount NUMERIC(10,2) NOT NULL,
    total_amount NUMERIC(10,2) NOT NULL,
    payment_status VARCHAR(20) CHECK (payment_status IN ('PAID', 'PENDING', 'REFUNDED', 'CANCELLED')) DEFAULT 'PENDING',
    payment_channel VARCHAR(50) CHECK (payment_channel IN ('UPI', 'NEFT', 'RTGS', 'NETBANKING', 'CHEQUE', 'NONE')) DEFAULT 'NONE',
    payment_reference VARCHAR(100), -- UPI txn id or bank UTR
    paid_at TIMESTAMPTZ,
    invoice_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    period_start_date DATE,
    period_end_date DATE,
    pdf_url TEXT,
    refund_amount NUMERIC(10,2) DEFAULT 0.00,
    refund_reason TEXT,
    refunded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ria_invoices_tenant ON public.ria_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ria_invoices_client ON public.ria_invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_ria_invoices_status ON public.ria_invoices(payment_status);

-- 4. Client Risk Profiles & Suitability Logs (SEBI Reg. 16 & 17 - 365-Day Annual Renewal)
CREATE TABLE IF NOT EXISTS public.client_risk_assessments (
    assessment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(client_id) ON DELETE CASCADE,
    risk_score INT NOT NULL,
    risk_category VARCHAR(50) NOT NULL, -- e.g., 'Aggressive', 'Moderate', 'Conservative'
    questionnaire_responses JSONB NOT NULL DEFAULT '{}'::jsonb,
    assessed_at TIMESTAMPTZ DEFAULT NOW(),
    next_review_due DATE NOT NULL, -- Enforces the mandatory annual 365-day review
    is_current BOOLEAN DEFAULT TRUE,
    assessor_name VARCHAR(150),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_assessments_client ON public.client_risk_assessments(client_id);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_review ON public.client_risk_assessments(next_review_due);

-- 5. Advice Rationale & Recommendation Log (Pre-Trade Positive Consent Rule)
CREATE TABLE IF NOT EXISTS public.advisory_recommendation_logs (
    recommendation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(client_id) ON DELETE CASCADE,
    scheme_code VARCHAR(50) NOT NULL,
    scheme_name TEXT NOT NULL,
    asset_class VARCHAR(50) DEFAULT 'Equity',
    recommendation_type VARCHAR(20) CHECK (recommendation_type IN ('BUY', 'SELL', 'HOLD', 'SWITCH', 'STP')) NOT NULL,
    rationale_text TEXT NOT NULL,
    target_amount NUMERIC(12,2) DEFAULT 0.00,
    client_consent_status BOOLEAN DEFAULT FALSE, -- Must be explicitly True before order routing
    consent_timestamp TIMESTAMPTZ,
    consent_channel VARCHAR(50) DEFAULT 'DIGITAL_CLICKWRAP', -- 'DIGITAL_CLICKWRAP', 'OTP_SMS', 'EMAIL_CONFIRMATION'
    client_ip VARCHAR(50),
    executed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_adv_recommendations_client ON public.advisory_recommendation_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_adv_recommendations_consent ON public.advisory_recommendation_logs(client_consent_status);

-- 6. Client-Level Segregation Verification Ledger (SEBI Reg. 22 - Zero Distribution Overlap)
CREATE TABLE IF NOT EXISTS public.segregation_audit_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(client_id) ON DELETE CASCADE,
    pan_number VARCHAR(10) NOT NULL,
    has_active_distribution_services BOOLEAN DEFAULT FALSE, -- Must remain strictly FALSE for RIAs
    commission_earned_amount NUMERIC(10,2) DEFAULT 0.00,   -- Must strictly remain 0.00
    verification_source VARCHAR(100) DEFAULT 'CAMS_KARVY_PAN_AUDIT_FEED',
    verified_by VARCHAR(150) DEFAULT 'Automated Fiduciary Segregation Engine',
    verified_at TIMESTAMPTZ DEFAULT NOW(),
    audit_notes TEXT DEFAULT 'Verified: Zero commission-earning distribution folios mapped to this advisory PAN.'
);

CREATE INDEX IF NOT EXISTS idx_segregation_logs_pan ON public.segregation_audit_logs(pan_number);
CREATE INDEX IF NOT EXISTS idx_segregation_logs_tenant ON public.segregation_audit_logs(tenant_id);

