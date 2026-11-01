-- ==============================================================================
-- Migration: Add Plan Management & Capabilities Columns
-- ==============================================================================

-- 1. Ensure `is_active` and `description` columns exist on `plans`
ALTER TABLE IF EXISTS public.plans
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS description TEXT;

-- 2. Populate descriptive text for standard seeded plans
UPDATE public.plans
SET description = 'Designed for solo IFAs and independent wealth advisors'
WHERE slug = 'basic' AND (description IS NULL OR description = '');

UPDATE public.plans
SET description = 'Ideal for growing advisory practices with up to 3 advisors and white-labeling'
WHERE slug = 'growth' AND (description IS NULL OR description = '');

UPDATE public.plans
SET description = 'Full enterprise wealth management firm with custom domain and up to 20 advisor seats'
WHERE slug = 'enterprise' AND (description IS NULL OR description = '');

UPDATE public.plans
SET description = 'Zero monthly fixed fee with 80/20 mutual fund trail revenue sharing split'
WHERE slug = 'arn_partnership' AND (description IS NULL OR description = '');

