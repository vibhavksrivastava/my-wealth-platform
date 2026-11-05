-- ==============================================================================
-- MIGRATION: Fix Security Definer Views (Supabase Linter: 0010_security_definer_view)
-- Description: Sets security_invoker = on for all reporting and analytics views.
--              This ensures Postgres enforces permissions and Row Level Security
--              (RLS) policies of the querying user (invoker), rather than
--              bypassing RLS with the view creator's elevated permissions.
--
-- Official Supabase Remediation Guide:
-- https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view
-- ==============================================================================

-- 1. View: Emergency Fund Analysis
ALTER VIEW IF EXISTS public.view_emergency_fund_analysis 
  SET (security_invoker = on);

-- 2. View: Client Financial Ratios
ALTER VIEW IF EXISTS public.view_client_financial_ratios 
  SET (security_invoker = on);

-- 3. View: CFP Dashboard
ALTER VIEW IF EXISTS public.view_cfp_dashboard 
  SET (security_invoker = on);

-- 4. View: Live Portfolio Valuation
ALTER VIEW IF EXISTS public.view_live_portfolio_valuation 
  SET (security_invoker = on);

