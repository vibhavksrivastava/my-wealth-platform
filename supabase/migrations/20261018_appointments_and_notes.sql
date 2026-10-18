-- Migration: Add notes and scheduled_by to appointments table
-- Enables client and advisor meeting scheduling, status confirmations, and persistent call notes.

ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS scheduled_by character varying DEFAULT 'ADVISOR';

-- Ensure status check constraint includes PENDING, CONFIRMED, COMPLETED, CANCELLED
DO $$
BEGIN
  ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
  ALTER TABLE public.appointments ADD CONSTRAINT appointments_status_check 
    CHECK (status IN ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'));
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Indexing for fast lookups by client, advisor, and date
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON public.appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_advisor_id ON public.appointments(advisor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON public.appointments(start_time DESC);

