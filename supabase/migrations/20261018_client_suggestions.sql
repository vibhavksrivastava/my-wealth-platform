-- Migration: Create client_suggestions table
-- Stores versioned financial analysis snapshots, advisor action plans, and execution tracking logs.

CREATE TABLE IF NOT EXISTS public.client_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  client_id uuid NOT NULL REFERENCES public.clients(client_id) ON DELETE CASCADE,
  advisor_id uuid,
  suggestion_date timestamptz NOT NULL DEFAULT now(),
  system_findings jsonb NOT NULL,
  advisor_notes text,
  recommended_investments jsonb NOT NULL,
  status character varying NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED_TO_CLIENT', 'ACKNOWLEDGED', 'IN_PROGRESS')),
  client_action_notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexing for fast lookups per client and reverse chronological history
CREATE INDEX IF NOT EXISTS idx_client_suggestions_client_id ON public.client_suggestions(client_id);
CREATE INDEX IF NOT EXISTS idx_client_suggestions_date ON public.client_suggestions(suggestion_date DESC);
CREATE INDEX IF NOT EXISTS idx_client_suggestions_tenant ON public.client_suggestions(tenant_id);

-- Optional trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_client_suggestions_updated_at ON public.client_suggestions;
CREATE TRIGGER set_client_suggestions_updated_at
BEFORE UPDATE ON public.client_suggestions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

