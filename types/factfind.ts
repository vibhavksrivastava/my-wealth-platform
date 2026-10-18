export interface HouseholdOption {
  household_id: string;
  household_name: string;
}

export interface ClientPersonalDetails {
  full_name: string;
  date_of_birth: string;
  marital_status: "Single" | "Married" | "Divorced" | "Widowed";
  dependents_count: number;
  pan_number?: string;
  occupation: string;
  employer_business_name?: string;
  annual_gross_income: number;
  tax_regime: "New" | "Old";
  risk_profile: "Conservative" | "Moderate" | "Aggressive";
  planning_horizon_years: number;
  review_frequency: "Quarterly" | "Semi-Annual" | "Annual";
  advisor_name?: string;
  spouse_name?: string;
  spouse_dob?: string;
  household_mode: "existing" | "new";
  household_id?: string;
  new_household_name?: string;
  planning_disclosures_notes?: string;
}

export interface IncomeItemInput {
  category: string;
  monthly_amount: number;
  notes?: string;
}

export interface ExpenseItemInput {
  category: string;
  monthly_amount: number;
  is_essential: boolean;
  notes?: string;
}

export interface AssetItemInput {
  asset_category: string;
  description: string;
  owner_name?: string;
  current_market_value: number;
  is_liquid: boolean;
  notes?: string;
}

export interface LiabilityItemInput {
  liability_type: string;
  lender_name?: string;
  outstanding_principal: number;
  annual_interest_rate: number;
  monthly_emi: number;
  tenure_remaining_months: number;
  notes?: string;
}

export interface InvestmentItemInput {
  asset_class: string;
  scheme_instrument_name: string;
  owner_name?: string;
  invested_amount: number;
  current_value: number;
  monthly_sip_amount: number;
  expected_return_cagr: number;
  goal_purpose?: string;
  notes?: string;
}

export interface CompleteFactFindPayload {
  personal: ClientPersonalDetails;
  income: IncomeItemInput[];
  expenses: ExpenseItemInput[];
  assets: AssetItemInput[];
  liabilities: LiabilityItemInput[];
  investments: InvestmentItemInput[];
}

