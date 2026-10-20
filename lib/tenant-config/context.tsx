"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import type { TenantPublicConfig, TenantBranding } from "./types";

interface TenantConfigContextValue {
  tenant: TenantPublicConfig | null;
  tenantId: string | null;
  subdomain: string | null;
  firmBrandName: string;
  brandColor: string;
  secondaryColor: string;
  themeMode: "light" | "dark";
  isDark: boolean;
  branding: TenantBranding;
  customDomain: string | null;
  features: Record<string, boolean>;
  hasFeature: (featureKey: string) => boolean;
  refreshConfig: () => Promise<void>;
}

const defaultBranding: TenantBranding = {
  firmBrandName: "Wealth Advisory",
  logoUrl: null,
  primaryColor: "#0284c7",
  secondaryColor: "#0f172a",
  themeMode: "light",
  disclaimerText: null,
};

const TenantConfigContext = createContext<TenantConfigContextValue>({
  tenant: null,
  tenantId: null,
  subdomain: null,
  firmBrandName: "Wealth Advisory",
  brandColor: "#0284c7",
  secondaryColor: "#0f172a",
  themeMode: "light",
  isDark: false,
  branding: defaultBranding,
  customDomain: null,
  features: {},
  hasFeature: () => true,
  refreshConfig: async () => {},
});

export function TenantConfigProvider({
  initialConfig,
  children,
}: {
  initialConfig?: TenantPublicConfig | null;
  children: React.ReactNode;
}) {
  const [config, setConfig] = useState<TenantPublicConfig | null>(initialConfig || null);

  const refreshConfig = async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
      if (!token) return;

      const res = await fetch("/api/admin/tenant-config", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.config) {
          setConfig(json.config);
          localStorage.setItem("tenant_branding", JSON.stringify(json.config.branding));
          window.dispatchEvent(new Event("tenant_branding_updated"));
        }
      }
    } catch (err) {
      console.error("Failed to refresh tenant configuration:", err);
    }
  };

  useEffect(() => {
    if (initialConfig) {
      setConfig(initialConfig);
    } else if (typeof window !== "undefined") {
      const stored = localStorage.getItem("tenant_branding");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setConfig((prev) => (prev ? { ...prev, branding: parsed } : null));
        } catch {}
      }
    }

    const handleSync = () => {
      const stored = localStorage.getItem("tenant_branding");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setConfig((prev) => (prev ? { ...prev, branding: parsed } : null));
        } catch {}
      }
    };

    window.addEventListener("storage", handleSync);
    window.addEventListener("tenant_branding_updated", handleSync);
    return () => {
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("tenant_branding_updated", handleSync);
    };
  }, [initialConfig]);

  const branding = config?.branding || defaultBranding;
  const isDark = branding.themeMode === "dark";

  const value = useMemo<TenantConfigContextValue>(() => {
    return {
      tenant: config,
      tenantId: config?.tenantId || null,
      subdomain: config?.subdomain || null,
      firmBrandName: branding.firmBrandName || config?.firmBrandName || "Wealth Advisory",
      brandColor: branding.primaryColor || "#0284c7",
      secondaryColor: branding.secondaryColor || "#0f172a",
      themeMode: branding.themeMode || "light",
      isDark,
      branding,
      customDomain: config?.customDomain || null,
      features: config?.features || {},
      hasFeature: (featureKey: string) => {
        if (!config?.features) return true;
        return config.features[featureKey] !== false;
      },
      refreshConfig,
    };
  }, [config, branding, isDark]);

  return (
    <TenantConfigContext.Provider value={value}>
      {children}
    </TenantConfigContext.Provider>
  );
}

export function useTenantConfig(): TenantConfigContextValue {
  return useContext(TenantConfigContext);
}

