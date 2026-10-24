/**
 * Institutional MFD (Mutual Fund Distributor) & Tenant Settings Types
 * Corresponds to migration: 20261024_master_mfd_firm_branding_and_tenant_settings.sql
 */

export type FirmType = "MFD" | "RIA" | "HYBRID" | "WEALTH_DESK";
export type ProfessionalRole = "ADVISOR" | "DISTRIBUTOR" | "STAFF" | "RESEARCH_ANALYST";

export interface TenantSettings {
  id: string;
  tenant_id: string;
  custom_domain?: string | null;
  branding: {
    firm_brand_name?: string;
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
    theme_mode?: "light" | "dark";
    disclaimer_text?: string;
    support_email?: string;
    contact_phone?: string;
    amfi_arn?: string;
    sebi_ria_number?: string;
  };
  encrypted_env_vars: Record<string, string>;
  features_override: Record<string, boolean>;
  role_permissions?: Record<string, Record<string, boolean>>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MfdScheme {
  scheme_id: string;
  amfi_code: string;
  isin?: string | null;
  scheme_name: string;
  amc_name: string;
  category?: string | null;
  plan_type?: "DIRECT" | "REGULAR";
  status: "ACTIVE" | "INACTIVE" | "MERGED";
  created_at: string;
}

export interface MfdFolio {
  folio_id: string;
  client_id: string;
  tenant_id: string;
  amc_name: string;
  folio_number: string;
  holding_nature: "SINGLE" | "JOINT" | "ANYONE_OR_SURVIVOR";
  created_at: string;
}

export interface MfdNavHistory {
  nav_id: string;
  scheme_id: string;
  nav_date: string;
  nav_value: number;
}

export interface MfdBrokerageLedger {
  brokerage_id: string;
  tenant_id: string;
  client_id?: string | null;
  scheme_id?: string | null;
  folio_number?: string | null;
  statement_month: string; // e.g. "2026-09"
  brokerage_amount: number;
  commission_rate_bps?: number | null;
  created_at: string;
}

