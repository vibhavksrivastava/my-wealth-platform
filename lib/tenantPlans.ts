import { supabaseAdmin } from "@/lib/supabase";

export interface PlanFeatures {
  white_label: boolean;
  custom_domain: boolean;
  advanced_reports: boolean;
  bse_star_mf: boolean; // Universally true across all tiers
  cas_import: boolean;
  client_portal: boolean;
  suggestions_engine: boolean;
  commission_sharing?: boolean;
  zero_subscription_fee?: boolean;
  priority_support?: boolean;
  ai_features?: boolean;
  ai_chat_agents?: boolean;
  risk_planning?: boolean;
  retirement_planning?: boolean;
  tax_planning?: boolean;
  fee_invoicing?: boolean;
}

export interface PlanRecord {
  id: string;
  name: string;
  slug:
    | "mfd_starter"
    | "mfd_pro_ai"
    | "arn_partnership"
    | "ria_practice"
    | "ria_enterprise_ai"
    | "basic"
    | "growth"
    | "enterprise"
    | string;
  category?: "MFD" | "RIA" | "HYBRID";
  price_monthly: number;
  max_seats: number;
  description?: string;
  features: PlanFeatures;
}

// Built-in standard plans for robust fallback and type guarantees
export const DEFAULT_PLANS: Record<string, PlanRecord> = {
  mfd_starter: {
    id: "plan-mfd-starter",
    name: "MFD Starter (Standard)",
    slug: "mfd_starter",
    category: "MFD",
    price_monthly: 999.0,
    max_seats: 1,
    description: "Ideal for solo Mutual Fund Distributors managing up to ₹15 Cr AUM without AI copilot.",
    features: {
      white_label: false,
      custom_domain: false,
      advanced_reports: false,
      bse_star_mf: true, // Universal access
      cas_import: true,
      client_portal: true,
      suggestions_engine: false,
      ai_features: false,
      ai_chat_agents: false,
      risk_planning: false,
      retirement_planning: true,
      priority_support: false,
    },
  },
  mfd_pro_ai: {
    id: "plan-mfd-growth-ai",
    name: "MFD Growth + AI Copilot",
    slug: "mfd_pro_ai",
    category: "MFD",
    price_monthly: 2499.0,
    max_seats: 3,
    description: "Most popular for growing MFD practices. Full 4-Agent AI Suite, White-Label Portal & Risk Planning.",
    features: {
      white_label: true,
      custom_domain: false,
      advanced_reports: true,
      bse_star_mf: true, // Universal access
      cas_import: true,
      client_portal: true,
      suggestions_engine: true,
      ai_features: true,
      ai_chat_agents: true,
      risk_planning: true,
      retirement_planning: true,
      priority_support: true,
    },
  },
  arn_partnership: {
    id: "plan-zero-fee-arn",
    name: "MFD Zero-Fee ARN Partnership",
    slug: "arn_partnership",
    category: "MFD",
    price_monthly: 0.0,
    max_seats: 3,
    description: "Zero monthly fee + 80/20 trail brokerage split. Full platform access with AI Agents and white-labeling.",
    features: {
      white_label: true,
      custom_domain: false,
      advanced_reports: true,
      bse_star_mf: true, // Universal access
      cas_import: true,
      client_portal: true,
      suggestions_engine: true,
      commission_sharing: true,
      zero_subscription_fee: true,
      ai_features: true,
      ai_chat_agents: true,
      risk_planning: true,
      retirement_planning: true,
      priority_support: true,
    },
  },
  ria_practice: {
    id: "plan-ria-practice",
    name: "RIA Practice (Standard)",
    slug: "ria_practice",
    category: "RIA",
    price_monthly: 2999.0,
    max_seats: 3,
    description: "Tailored for SEBI Registered Investment Advisors. Direct plan analytics, fee invoicing, and fiduciary planning.",
    features: {
      white_label: true,
      custom_domain: false,
      advanced_reports: true,
      bse_star_mf: true,
      cas_import: true,
      client_portal: true,
      suggestions_engine: true,
      ai_features: false,
      ai_chat_agents: false,
      risk_planning: true,
      retirement_planning: true,
      fee_invoicing: true,
      priority_support: true,
    },
  },
  ria_enterprise_ai: {
    id: "plan-ria-enterprise-ai",
    name: "RIA Enterprise AI Suite",
    slug: "ria_enterprise_ai",
    category: "RIA",
    price_monthly: 6999.0,
    max_seats: 15,
    description: "Flagship institutional plan for Multi-Family Offices and RIAs. Autonomous 4-Agent AI copilot, Custom CNAME domain, and dedicated support SLA.",
    features: {
      white_label: true,
      custom_domain: true,
      advanced_reports: true,
      bse_star_mf: true,
      cas_import: true,
      client_portal: true,
      suggestions_engine: true,
      ai_features: true,
      ai_chat_agents: true,
      risk_planning: true,
      retirement_planning: true,
      fee_invoicing: true,
      priority_support: true,
    },
  },
  // Backward compatibility aliases
  basic: {
    id: "plan-starter-basic",
    name: "Starter / Solo IFA",
    slug: "basic",
    category: "MFD",
    price_monthly: 999.0,
    max_seats: 1,
    description: "Legacy tier mapped to MFD Starter.",
    features: {
      white_label: false,
      custom_domain: false,
      advanced_reports: false,
      bse_star_mf: true,
      cas_import: true,
      client_portal: true,
      suggestions_engine: true,
      ai_features: false,
      ai_chat_agents: false,
      risk_planning: false,
      retirement_planning: true,
      priority_support: false,
    },
  },
  growth: {
    id: "plan-growth-practice",
    name: "Growth Practice",
    slug: "growth",
    category: "MFD",
    price_monthly: 2499.0,
    max_seats: 3,
    description: "Legacy tier mapped to MFD Growth + AI.",
    features: {
      white_label: true,
      custom_domain: false,
      advanced_reports: true,
      bse_star_mf: true,
      cas_import: true,
      client_portal: true,
      suggestions_engine: true,
      ai_features: true,
      ai_chat_agents: true,
      risk_planning: true,
      retirement_planning: true,
      priority_support: true,
    },
  },
  enterprise: {
    id: "plan-enterprise-wealth",
    name: "Enterprise Wealth Firm",
    slug: "enterprise",
    category: "RIA",
    price_monthly: 5999.0,
    max_seats: 20,
    description: "Legacy tier mapped to RIA Enterprise AI Suite.",
    features: {
      white_label: true,
      custom_domain: true,
      advanced_reports: true,
      bse_star_mf: true,
      cas_import: true,
      client_portal: true,
      suggestions_engine: true,
      ai_features: true,
      ai_chat_agents: true,
      risk_planning: true,
      retirement_planning: true,
      priority_support: true,
    },
  },
};

const getAdminClient = () => {
  return supabaseAdmin;
};

/**
 * Resolves tenant plan details, feature toggles, and seat allocation.
 */
export async function getTenantPlan(tenantId: string): Promise<{
  plan: PlanRecord;
  tenant: {
    id: string;
    subdomain: string;
    firm_brand_name: string;
    arn_number?: string | null;
    commission_sharing_active: boolean;
    subscription_expires_at?: string | null;
    is_active: boolean;
  };
}> {
  const supabase = getAdminClient();

  // Try fetching tenant with plan_id
  let { data: tenant, error } = await supabase
    .from("tenants")
    .select("id, subdomain, firm_brand_name, arn_number, commission_sharing_active, subscription_expires_at, is_active, plan_id")
    .eq("id", tenantId)
    .maybeSingle();

  // If column error occurred (e.g. plan_id does not exist yet), fall back to base tenant columns
  if (error) {
    const fallback = await supabase
      .from("tenants")
      .select("id, subdomain, firm_brand_name, arn_number, is_active")
      .eq("id", tenantId)
      .maybeSingle();
    tenant = fallback.data as any;
  }

  // Fallback defaults
  const fallbackTenant = {
    id: tenantId,
    subdomain: tenant?.subdomain || "unknown",
    firm_brand_name: tenant?.firm_brand_name || "Advisory Firm",
    arn_number: tenant?.arn_number || null,
    commission_sharing_active: Boolean(tenant?.commission_sharing_active),
    subscription_expires_at: tenant?.subscription_expires_at || null,
    is_active: tenant?.is_active !== false,
  };

  // Determine default plan if no plan found
  let resolvedPlan: PlanRecord = DEFAULT_PLANS.growth;

  if (tenant?.commission_sharing_active) {
    resolvedPlan = DEFAULT_PLANS.arn_partnership;
  } else if (tenant?.subdomain === "apex" || tenant?.subdomain === "platform") {
    resolvedPlan = DEFAULT_PLANS.enterprise;
  } else if (tenant?.subdomain === "zenith9186") {
    resolvedPlan = DEFAULT_PLANS.growth;
  }

  if (!error && tenant?.plan_id) {
    // Attempt to query plans table
    try {
      const { data: planData } = await supabase
        .from("plans")
        .select("id, name, slug, price_monthly, max_seats, features")
        .eq("id", tenant.plan_id)
        .maybeSingle();

      if (planData) {
        resolvedPlan = {
          id: planData.id,
          name: planData.name,
          slug: planData.slug,
          price_monthly: Number(planData.price_monthly || 0),
          max_seats: Number(planData.max_seats || 1),
          features: {
            ...DEFAULT_PLANS[planData.slug]?.features,
            ...(planData.features || {}),
            bse_star_mf: true, // BSE StAR MF universally guaranteed
          },
        };
      }
    } catch {
      // If plans table doesn't exist yet, fall back safely
    }
  }

  return {
    plan: resolvedPlan,
    tenant: fallbackTenant,
  };
}

/**
 * Checks if a specific feature is enabled for the tenant.
 */
export async function checkTenantFeature(
  tenantId: string,
  featureName: keyof PlanFeatures
): Promise<boolean> {
  // BSE StAR MF is universally accessible across all plans
  if (featureName === "bse_star_mf") {
    return true;
  }

  try {
    const { plan } = await getTenantPlan(tenantId);
    return Boolean(plan.features[featureName]);
  } catch (err) {
    console.error(`Error checking feature ${featureName} for tenant ${tenantId}:`, err);
    return false;
  }
}

/**
 * Validates whether the tenant has remaining seat capacity to add a new team member.
 */
export async function checkTenantSeatCapacity(tenantId: string): Promise<{
  canAddSeat: boolean;
  currentSeats: number;
  maxSeats: number;
  planName: string;
  planSlug: string;
}> {
  const supabase = getAdminClient();
  const { plan } = await getTenantPlan(tenantId);

  // Count active team users (TENANT_ADMIN, ADVISOR, STAFF)
  const { count, error } = await supabase
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .in("role", ["TENANT_ADMIN", "ADVISOR", "STAFF"])
    .eq("is_active", true);

  const currentSeats = error ? 1 : count || 0;
  const maxSeats = plan.max_seats || 1;
  const canAddSeat = currentSeats < maxSeats;

  return {
    canAddSeat,
    currentSeats,
    maxSeats,
    planName: plan.name,
    planSlug: plan.slug,
  };
}

/**
 * Fetches all active plans from the database, falling back to DEFAULT_PLANS.
 */
export async function getAllPlans(): Promise<PlanRecord[]> {
  try {
    const supabase = getAdminClient();
    const { data: dbPlans, error } = await supabase
      .from("plans")
      .select("id, name, slug, price_monthly, max_seats, features")
      .order("price_monthly", { ascending: true });

    if (!error && dbPlans && dbPlans.length > 0) {
      return dbPlans.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price_monthly: Number(p.price_monthly || 0),
        max_seats: Number(p.max_seats || 1),
        features: {
          ...DEFAULT_PLANS[p.slug]?.features,
          ...(p.features || {}),
          bse_star_mf: true,
        },
      }));
    }
  } catch (err) {
    console.warn("Could not fetch plans from database, using defaults:", err);
  }

  return Object.values(DEFAULT_PLANS);
}


