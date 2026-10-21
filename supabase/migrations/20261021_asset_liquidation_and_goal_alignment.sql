-- Migration: Asset Liquidation Planning & Goal Alignment
-- Enables defining target liquidation dates, expected CAGR, and liquidation values for Physical Assets (Real Estate, FDs, Gold)
-- Enables linking physical assets and market investment portfolios directly to financial goals.

-- 1. Add liquidation planning columns to assets
ALTER TABLE public.assets 
  ADD COLUMN IF NOT EXISTS target_liquidation_date DATE,
  ADD COLUMN IF NOT EXISTS expected_cagr NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expected_liquidation_value NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS linked_goal_id UUID;

-- 2. Add goal alignment to investment_portfolio
ALTER TABLE public.investment_portfolio 
  ADD COLUMN IF NOT EXISTS linked_goal_id UUID;

-- 3. Add linked assets & investments tracking to financial_goals
ALTER TABLE public.financial_goals 
  ADD COLUMN IF NOT EXISTS linked_asset_ids JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS linked_investment_ids JSONB DEFAULT '[]'::jsonb;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_assets_linked_goal ON public.assets(linked_goal_id);
CREATE INDEX IF NOT EXISTS idx_investments_linked_goal ON public.investment_portfolio(linked_goal_id);
