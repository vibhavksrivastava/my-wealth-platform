/**
 * Hierarchical Feature Flag & Capability Engine
 * 
 * Manages two-tier feature access:
 * 1. Super Admin: Master tenant-level entitlement based on subscription or custom contract.
 * 2. Tenant Admin: Role-level delegation (Client, Advisor, Staff).
 * 
 * Rule: Super Admin has strict veto authority. If a feature is disabled by Super Admin
 * at the tenant level, it CANNOT be enabled or accessed by any role in that tenant.
 */

export interface FeatureDefinition {
  key: string;
  label: string;
  description: string;
  category: "PORTFOLIO" | "ADVISORY" | "PLANNING" | "OPERATIONS" | "ADMIN" | "UPCOMING";
  defaultEnabled: boolean;
  isUpcoming?: boolean;
}

export const MASTER_FEATURE_CATALOG: FeatureDefinition[] = [
  {
    key: "mutual_funds",
    label: "Mutual Fund Portfolio",
    description: "Consolidated MF valuation, day change, XIRR, portfolio journey, holdings, transactions, SIPs and rebalancing.",
    category: "PORTFOLIO",
    defaultEnabled: true,
  },
  {
    key: "mf_transactions",
    label: "Holdings & Transactions Ledger",
    description: "Detailed folio transaction history, filtering by purchase, SIP, redemption, switch, STP, and SWP.",
    category: "PORTFOLIO",
    defaultEnabled: true,
  },
  {
    key: "mf_sips",
    label: "SIP Management Engine",
    description: "Oversight and management of all active, paused, and completed SIP mandates and deduction dates.",
    category: "PORTFOLIO",
    defaultEnabled: true,
  },
  {
    key: "rebalancing",
    label: "Portfolio Rebalancing & Allocation",
    description: "Target asset allocation models with exact rebalancing shift recommendations.",
    category: "ADVISORY",
    defaultEnabled: true,
  },
  {
    key: "investment_planning",
    label: "Investment Planning Suite",
    description: "Comprehensive financial goals, cashflow surplus, net worth tracking, and physical asset liquidation.",
    category: "PLANNING",
    defaultEnabled: true,
  },
  {
    key: "run_diagnostic",
    label: "Run Financial Diagnostics",
    description: "Algorithmic feasibility diagnostics, goal shortfall checks, and automated AI advisory recommendations.",
    category: "ADVISORY",
    defaultEnabled: true,
  },
  {
    key: "cas_import",
    label: "CAMS / KFintech CAS Import",
    description: "Automated ingestion of consolidated mutual fund account statements (CAMS & KFintech).",
    category: "OPERATIONS",
    defaultEnabled: true,
  },
  {
    key: "client_portal",
    label: "Client Investor Portal",
    description: "Direct self-service portal access for end clients and family household members.",
    category: "OPERATIONS",
    defaultEnabled: true,
  },
  {
    key: "retirement_planning",
    label: "Retirement Planning",
    description: "Future retirement corpus, inflation-adjusted expense projection, and annuity planning.",
    category: "UPCOMING",
    defaultEnabled: true,
    isUpcoming: true,
  },
  {
    key: "estate_planning",
    label: "Estate Planning",
    description: "Will preparation, succession planning, nominee mapping, and private trust structuring.",
    category: "UPCOMING",
    defaultEnabled: true,
    isUpcoming: true,
  },
  {
    key: "tax_planning",
    label: "Tax Planning & Harvesting",
    description: "Capital gains tax harvesting (LTCG / STCG), 80C optimization, and new tax regime calculator.",
    category: "UPCOMING",
    defaultEnabled: true,
    isUpcoming: true,
  },
  {
    key: "billing_invoicing",
    label: "Practice Billing & Subscription Invoicing",
    description: "Tenant billing, invoice generation, payment reminders, and seat license management.",
    category: "ADMIN",
    defaultEnabled: true,
  },
];

export type RoleType = "SUPER_ADMIN" | "TENANT_ADMIN" | "ADVISOR" | "STAFF" | "CLIENT" | string;

export interface RolePermissionsMap {
  [role: string]: Record<string, boolean>; // e.g. CLIENT: { mutual_funds: true, run_diagnostic: false }
}

/**
 * Default role permissions when a tenant hasn't customized their role permissions matrix
 */
export const DEFAULT_ROLE_PERMISSIONS: RolePermissionsMap = {
  SUPER_ADMIN: {
    mutual_funds: true,
    mf_transactions: true,
    mf_sips: true,
    rebalancing: true,
    investment_planning: true,
    run_diagnostic: true,
    cas_import: true,
    client_portal: true,
    retirement_planning: true,
    estate_planning: true,
    tax_planning: true,
    billing_invoicing: true,
  },
  TENANT_ADMIN: {
    mutual_funds: true,
    mf_transactions: true,
    mf_sips: true,
    rebalancing: true,
    investment_planning: true,
    run_diagnostic: true,
    cas_import: true,
    client_portal: true,
    retirement_planning: true,
    estate_planning: true,
    tax_planning: true,
    billing_invoicing: true,
  },
  ADVISOR: {
    mutual_funds: true,
    mf_transactions: true,
    mf_sips: true,
    rebalancing: true,
    investment_planning: true,
    run_diagnostic: true,
    cas_import: true,
    client_portal: true,
    retirement_planning: true,
    estate_planning: true,
    tax_planning: true,
    billing_invoicing: false,
  },
  STAFF: {
    mutual_funds: true,
    mf_transactions: true,
    mf_sips: true,
    rebalancing: false,
    investment_planning: true,
    run_diagnostic: false,
    cas_import: true,
    client_portal: false,
    retirement_planning: false,
    estate_planning: false,
    tax_planning: false,
    billing_invoicing: false,
  },
  CLIENT: {
    mutual_funds: true,
    mf_transactions: true,
    mf_sips: true,
    rebalancing: false,
    investment_planning: true,
    run_diagnostic: false,
    cas_import: false,
    client_portal: true,
    retirement_planning: true,
    estate_planning: false,
    tax_planning: true,
    billing_invoicing: false,
  },
};

/**
 * Evaluates whether a feature is accessible by a user in a tenant.
 * 
 * Strict Evaluation Rules:
 * 1. SUPER_ADMIN role always has access.
 * 2. Super Admin Tenant Master Veto: If the tenant has the feature disabled in Super Admin
 *    (`tenantMasterFeatures[featureKey] === false`), access is immediately DENIED for all roles.
 * 3. Tenant Admin Role Delegation: If permitted at tenant level, check role permissions for that user.
 */
export function isFeatureAccessible({
  featureKey,
  userRole,
  tenantMasterFeatures = {},
  rolePermissions = {},
}: {
  featureKey: string;
  userRole?: string;
  tenantMasterFeatures?: Record<string, boolean>;
  rolePermissions?: RolePermissionsMap;
}): {
  allowed: boolean;
  blockedBySuperAdmin: boolean;
  blockedByTenantAdmin: boolean;
  reason?: string;
} {
  // SUPER_ADMIN has global root access
  if (userRole === "SUPER_ADMIN") {
    return { allowed: true, blockedBySuperAdmin: false, blockedByTenantAdmin: false };
  }

  // Check 1: Super Admin Tenant-Level Master Check
  const masterSetting = tenantMasterFeatures[featureKey];
  // If explicitly set to false, Super Admin has turned it off for this tenant
  if (masterSetting === false) {
    return {
      allowed: false,
      blockedBySuperAdmin: true,
      blockedByTenantAdmin: false,
      reason: "This feature is not enabled for your firm's platform subscription. Contact your Platform Super Administrator to enable it.",
    };
  }

  // TENANT_ADMIN has access to all features enabled by Super Admin
  if (userRole === "TENANT_ADMIN") {
    return { allowed: true, blockedBySuperAdmin: false, blockedByTenantAdmin: false };
  }

  // Check 2: Tenant Admin Role-Level Delegation Check
  const normalizedRole = userRole || "CLIENT";
  const roleRules = rolePermissions[normalizedRole] || DEFAULT_ROLE_PERMISSIONS[normalizedRole] || {};
  const isRoleAllowed = roleRules[featureKey] !== false;

  if (!isRoleAllowed) {
    return {
      allowed: false,
      blockedBySuperAdmin: false,
      blockedByTenantAdmin: true,
      reason: `Access to this feature has been restricted for ${normalizedRole} accounts by your Firm Administrator.`,
    };
  }

  return { allowed: true, blockedBySuperAdmin: false, blockedByTenantAdmin: false };
}
