export interface TenantBranding {
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  themeMode: "light" | "dark";
  disclaimerText: string | null;
  firmBrandName: string;
}

export interface TenantPublicConfig {
  tenantId: string;
  subdomain: string;
  firmBrandName: string;
  firmLegalName: string | null;
  customDomain: string | null;
  branding: TenantBranding;
  features: Record<string, boolean>;
  planSlug?: string;
  commissionSharingActive: boolean;
  isActive: boolean;
}

export interface TenantServerConfig extends TenantPublicConfig {
  env: Record<string, string>; // Decrypted secrets (only available in server-side contexts)
  encryptedEnvVars: Record<string, string>;
}

