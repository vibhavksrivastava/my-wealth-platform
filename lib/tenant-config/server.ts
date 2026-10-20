import { createClient } from "@supabase/supabase-js";
import { decryptEnvMap, encryptEnvMap } from "./crypto";
import type {
  TenantBranding,
  TenantPublicConfig,
  TenantServerConfig,
} from "./types";

export * from "./types";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing Supabase credentials for server-side tenant configuration resolver."
    );
  }
  return createClient(url, key);
}

interface CacheEntry {
  config: TenantServerConfig;
  expiresAt: number;
}

// In-memory cache with 60-second TTL
const configCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 1000;

export function clearTenantConfigCache(tenantIdOrSubdomain?: string) {
  if (tenantIdOrSubdomain) {
    for (const [key, entry] of configCache.entries()) {
      if (
        key === tenantIdOrSubdomain.toLowerCase() ||
        entry.config.tenantId === tenantIdOrSubdomain ||
        entry.config.subdomain === tenantIdOrSubdomain.toLowerCase()
      ) {
        configCache.delete(key);
      }
    }
  } else {
    configCache.clear();
  }
}

/**
 * Server-side helper to fetch tenant configuration and inject tenant-level environment overrides.
 * 
 * Lookup priority:
 * 1. By `tenantId` (UUID)
 * 2. By `customDomain` (e.g. `clients.zenithwealth.com`)
 * 3. By `subdomain` (e.g. `zenith9186`)
 */
export async function getTenantConfig(
  identifier: {
    tenantId?: string;
    subdomain?: string;
    customDomain?: string;
    host?: string;
  },
  options: { includeDecryptedEnv?: boolean } = {}
): Promise<TenantPublicConfig | TenantServerConfig | null> {
  const cacheKey = (
    identifier.tenantId ||
    identifier.customDomain ||
    identifier.subdomain ||
    identifier.host ||
    ""
  ).toLowerCase().trim();

  // Check in-memory cache
  if (cacheKey && configCache.has(cacheKey)) {
    const cached = configCache.get(cacheKey)!;
    if (Date.now() < cached.expiresAt) {
      if (options.includeDecryptedEnv) {
        return cached.config;
      }
      // Return safe public config copy (omits decrypted secrets)
      const { env, encryptedEnvVars, ...publicOnly } = cached.config;
      return publicOnly;
    } else {
      configCache.delete(cacheKey);
    }
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();

    // 1. Resolve Tenant record
    let tenantQuery = supabaseAdmin
      .from("tenants")
      .select(`
        id,
        subdomain,
        firm_brand_name,
        firm_legal_name,
        custom_domain,
        logo_url,
        primary_color,
        secondary_color,
        theme_mode,
        disclaimer_text,
        is_active
      `);

    if (identifier.tenantId) {
      tenantQuery = tenantQuery.eq("id", identifier.tenantId);
    } else if (identifier.customDomain) {
      tenantQuery = tenantQuery.eq("custom_domain", identifier.customDomain.toLowerCase());
    } else if (identifier.subdomain) {
      tenantQuery = tenantQuery.eq("subdomain", identifier.subdomain.toLowerCase());
    } else if (identifier.host) {
      const cleanHost = identifier.host.split(":")[0].toLowerCase();
      // Try custom domain first, then fallback to subdomain
      tenantQuery = tenantQuery.or(`custom_domain.eq.${cleanHost},subdomain.eq.${cleanHost.split(".")[0]}`);
    } else {
      return null;
    }

    const { data: tenant, error: tenantError } = await tenantQuery.maybeSingle();
    if (tenantError || !tenant) {
      return null;
    }

    // 2. Fetch associated `tenant_settings` row (with resilience if table is still pending migration)
    let settingsRow: any = null;
    try {
      const { data: settings, error: settingsError } = await supabaseAdmin
        .from("tenant_settings")
        .select("*")
        .eq("tenant_id", tenant.id)
        .maybeSingle();

      if (!settingsError && settings) {
        settingsRow = settings;
      }
    } catch {
      // Gracefully handle if tenant_settings table is in the middle of being migrated
      settingsRow = null;
    }

    // 3. Merge branding overrides
    const brandingSettings = settingsRow?.branding || {};
    const branding: TenantBranding = {
      firmBrandName: brandingSettings.firm_brand_name || tenant.firm_brand_name || "Wealth Advisory",
      logoUrl: brandingSettings.logo_url ?? tenant.logo_url ?? null,
      primaryColor: brandingSettings.primary_color || tenant.primary_color || "#0284c7",
      secondaryColor: brandingSettings.secondary_color || tenant.secondary_color || "#0f172a",
      themeMode: (brandingSettings.theme_mode || tenant.theme_mode || "light") === "dark" ? "dark" : "light",
      disclaimerText: brandingSettings.disclaimer_text ?? tenant.disclaimer_text ?? null,
    };

    // 4. Merge feature flags (tenant specific overrides over default SaaS features)
    const defaultFeatures: Record<string, boolean> = {
      white_label: true,
      custom_domain: true,
      advanced_reports: true,
      bse_star_mf: true,
      cas_import: true,
      client_portal: true,
      suggestions_engine: true,
    };
    const featuresOverride: Record<string, boolean> = settingsRow?.features_override || {};
    const mergedFeatures: Record<string, boolean> = {
      ...defaultFeatures,
      ...featuresOverride,
    };

    // 5. Decrypt environment variables
    const rawEncryptedEnv: Record<string, string> = settingsRow?.encrypted_env_vars || {};
    const decryptedEnv: Record<string, string> = decryptEnvMap(rawEncryptedEnv);

    const fullConfig: TenantServerConfig = {
      tenantId: tenant.id,
      subdomain: tenant.subdomain,
      firmBrandName: branding.firmBrandName,
      firmLegalName: tenant.firm_legal_name,
      customDomain: settingsRow?.custom_domain || tenant.custom_domain || null,
      branding,
      features: mergedFeatures,
      planSlug: "growth",
      commissionSharingActive: false,
      isActive: Boolean(tenant.is_active),
      env: decryptedEnv,
      encryptedEnvVars: rawEncryptedEnv,
    };

    // Store in cache
    configCache.set(cacheKey, {
      config: fullConfig,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    // Also cache by tenantId and subdomain for fast lookup
    if (fullConfig.tenantId && fullConfig.tenantId !== cacheKey) {
      configCache.set(fullConfig.tenantId, {
        config: fullConfig,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
    }
    if (fullConfig.subdomain && fullConfig.subdomain !== cacheKey) {
      configCache.set(fullConfig.subdomain, {
        config: fullConfig,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
    }

    if (options.includeDecryptedEnv) {
      return fullConfig;
    }

    const { env, encryptedEnvVars, ...publicOnly } = fullConfig;
    return publicOnly;
  } catch (err) {
    console.error("Error in getTenantConfig:", err);
    return null;
  }
}

/**
 * Server-side helper to update tenant environment variables and configuration securely.
 */
export async function updateTenantConfig(
  tenantId: string,
  params: {
    customDomain?: string | null;
    branding?: Partial<TenantBranding>;
    envVars?: Record<string, string | null | undefined>;
    featuresOverride?: Record<string, boolean>;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    // 1. Fetch current encrypted vars to allow partial updates
    const { data: existingSettings } = await supabaseAdmin
      .from("tenant_settings")
      .select("encrypted_env_vars, branding, features_override")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    let updatedEncryptedVars = existingSettings?.encrypted_env_vars || {};

    if (params.envVars) {
      const newEncryptedMap = encryptEnvMap(params.envVars);
      // Merge: if a key has empty string or null, remove it
      for (const [key, value] of Object.entries(params.envVars)) {
        if (value === "" || value === null) {
          delete updatedEncryptedVars[key];
        } else if (newEncryptedMap[key]) {
          updatedEncryptedVars[key] = newEncryptedMap[key];
        }
      }
    }

    const payload: Record<string, any> = {
      tenant_id: tenantId,
      updated_at: new Date().toISOString(),
    };

    if (params.customDomain !== undefined) {
      payload.custom_domain = params.customDomain ? params.customDomain.toLowerCase().trim() : null;
    }

    if (params.branding) {
      payload.branding = {
        ...(existingSettings?.branding || {}),
        ...params.branding,
      };
    }

    if (params.envVars) {
      payload.encrypted_env_vars = updatedEncryptedVars;
    }

    if (params.featuresOverride) {
      payload.features_override = {
        ...(existingSettings?.features_override || {}),
        ...params.featuresOverride,
      };
    }

    // Upsert into tenant_settings
    const { error: upsertError } = await supabaseAdmin
      .from("tenant_settings")
      .upsert(payload, { onConflict: "tenant_id" });

    if (upsertError) {
      throw upsertError;
    }

    // Also sync custom_domain and branding back to main tenants table for backward compatibility
    const tenantUpdates: Record<string, any> = {};
    if (params.customDomain !== undefined) {
      tenantUpdates.custom_domain = payload.custom_domain;
    }
    if (params.branding?.primaryColor) {
      tenantUpdates.primary_color = params.branding.primaryColor;
    }
    if (params.branding?.secondaryColor) {
      tenantUpdates.secondary_color = params.branding.secondaryColor;
    }
    if (params.branding?.themeMode) {
      tenantUpdates.theme_mode = params.branding.themeMode;
    }
    if (params.branding?.logoUrl !== undefined) {
      tenantUpdates.logo_url = params.branding.logoUrl;
    }

    if (Object.keys(tenantUpdates).length > 0) {
      await supabaseAdmin.from("tenants").update(tenantUpdates).eq("id", tenantId);
    }

    // Clear cache so changes reflect instantly
    clearTenantConfigCache(tenantId);

    return { success: true };
  } catch (err: any) {
    console.error("updateTenantConfig error:", err);
    return { success: false, error: err.message || "Failed to save tenant configuration." };
  }
}
