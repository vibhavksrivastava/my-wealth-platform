-- ==============================================================================
-- Migration: Tenant Plan Feature Control & Subscription Invoices
-- Migration: 20261101_tenant_control_and_billing_invoices.sql
-- ==============================================================================

-- 1. Ensure `client_id` in invoices table is nullable for B2B SaaS tenant subscription invoices
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE public.invoices ALTER COLUMN client_id DROP NOT NULL;
  END IF;
END $$;

-- 2. Add missing plan and subscription billing columns to public.invoices
ALTER TABLE IF EXISTS public.invoices
  ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invoice_type TEXT DEFAULT 'subscription_fee',
  ADD COLUMN IF NOT EXISTS billing_date TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  ADD COLUMN IF NOT EXISTS amount NUMERIC(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 3. Update existing invoices total_amount and amount sync
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'total_amount'
  ) THEN
    UPDATE public.invoices SET amount = total_amount WHERE (amount IS NULL OR amount = 0) AND total_amount IS NOT NULL;
  END IF;
END $$;

