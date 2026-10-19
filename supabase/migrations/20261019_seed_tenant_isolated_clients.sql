-- ==============================================================================
-- Migration: Seed Tenant-Isolated Clients & Households for Zenith and AAS
-- Ensures Zenith Wealth and AAS Investment have their own dedicated client portfolios
-- ==============================================================================

DO $$
DECLARE
  zenith_tenant_id UUID := '058c3bb7-d79e-4cc8-ae8f-e2f0af851f30';
  aas_tenant_id UUID := '40c131d6-e88c-4b37-ab67-3c81ec35ee52';
  
  zenith_hh1 UUID := '11111111-1111-4111-a111-111111111111';
  zenith_hh2 UUID := '22222222-2222-4222-a222-222222222222';
  aas_hh1 UUID := '33333333-3333-4333-a333-333333333333';

  c_kabir UUID := 'a1111111-0000-4000-a000-000000000001';
  c_ananya UUID := 'a1111111-0000-4000-a000-000000000002';
  c_rohan UUID := 'a1111111-0000-4000-a000-000000000003';
  c_vikram UUID := 'b2222222-0000-4000-b000-000000000001';
  c_pooja UUID := 'b2222222-0000-4000-b000-000000000002';
BEGIN
  -- 1. Zenith Households
  INSERT INTO public.households (household_id, household_name, state_jurisdiction, country, created_at, updated_at)
  VALUES 
    (zenith_hh1, 'Singhania Family Household', 'Maharashtra', 'India', now(), now()),
    (zenith_hh2, 'Verma Family Household', 'Karnataka', 'India', now(), now())
  ON CONFLICT (household_id) DO NOTHING;

  -- 2. AAS Household
  INSERT INTO public.households (household_id, household_name, state_jurisdiction, country, created_at, updated_at)
  VALUES 
    (aas_hh1, 'Roy Family Household', 'Delhi', 'India', now(), now())
  ON CONFLICT (household_id) DO NOTHING;

  -- 3. Zenith Clients
  INSERT INTO public.clients (
    client_id, tenant_id, household_id, uwp_client_code, full_name,
    date_of_birth, marital_status, dependents_count, occupation,
    annual_gross_income, risk_profile, planning_horizon_years, advisor_name,
    review_frequency, created_at, updated_at
  )
  VALUES
    (
      c_kabir, zenith_tenant_id, zenith_hh1, 'UWP-ZEN-1001', 'Kabir Singhania',
      '1983-04-12', 'Married', 2, 'Managing Director',
      4800000, 'Aggressive', 10, 'Aditya Roy',
      'Quarterly', now(), now()
    ),
    (
      c_ananya, zenith_tenant_id, zenith_hh1, 'UWP-ZEN-1002', 'Ananya Singhania',
      '1986-09-24', 'Married', 2, 'Senior Legal Counsel',
      2400000, 'Moderate', 10, 'Aditya Roy',
      'Quarterly', now(), now()
    ),
    (
      c_rohan, zenith_tenant_id, zenith_hh2, 'UWP-ZEN-1003', 'Rohan Verma',
      '1990-11-05', 'Single', 0, 'Tech Founder & Angel Investor',
      3200000, 'Growth', 15, 'Aditya Roy',
      'Semi-Annual', now(), now()
    )
  ON CONFLICT (client_id) DO UPDATE SET
    tenant_id = EXCLUDED.tenant_id,
    full_name = EXCLUDED.full_name;

  -- 4. AAS Clients
  INSERT INTO public.clients (
    client_id, tenant_id, household_id, uwp_client_code, full_name,
    date_of_birth, marital_status, dependents_count, occupation,
    annual_gross_income, risk_profile, planning_horizon_years, advisor_name,
    review_frequency, created_at, updated_at
  )
  VALUES
    (
      c_vikram, aas_tenant_id, aas_hh1, 'UWP-AAS-2001', 'Vikramaditya Roy',
      '1979-02-18', 'Married', 1, 'VP Global Operations',
      3600000, 'Moderate', 8, 'Manmohan Pandey',
      'Annual', now(), now()
    ),
    (
      c_pooja, aas_tenant_id, aas_hh1, 'UWP-AAS-2002', 'Pooja Roy',
      '1982-08-30', 'Married', 1, 'Architecture Principal',
      1800000, 'Conservative', 8, 'Manmohan Pandey',
      'Annual', now(), now()
    )
  ON CONFLICT (client_id) DO UPDATE SET
    tenant_id = EXCLUDED.tenant_id,
    full_name = EXCLUDED.full_name;

  -- 5. Seed Client Profiles for Zenith
  INSERT INTO public.client_profiles (
    id, tenant_id, household_id, risk_profile_category,
    total_assets, total_liabilities, net_worth, created_at, updated_at
  )
  VALUES
    (
      gen_random_uuid(), zenith_tenant_id, zenith_hh1, 'Aggressive',
      24000000, 4500000, 19500000, now(), now()
    ),
    (
      gen_random_uuid(), zenith_tenant_id, zenith_hh2, 'Growth',
      11000000, 2000000, 9000000, now(), now()
    ),
    (
      gen_random_uuid(), aas_tenant_id, aas_hh1, 'Moderate',
      18500000, 3500000, 15000000, now(), now()
    )
  ON CONFLICT DO NOTHING;

END $$;

