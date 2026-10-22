"use client";

import { useEffect, useState } from "react";
import { isFeatureAccessible } from "./featureFlags";

/**
 * Client-side React hook to check feature access with automatic cache reading
 */
export function useFeatureAccess(featureKey: string): {
  allowed: boolean;
  blockedBySuperAdmin: boolean;
  blockedByTenantAdmin: boolean;
  isLoading: boolean;
  reason?: string;
} {
  const [access, setAccess] = useState<{
    allowed: boolean;
    blockedBySuperAdmin: boolean;
    blockedByTenantAdmin: boolean;
    isLoading: boolean;
    reason?: string;
  }>({
    allowed: true,
    blockedBySuperAdmin: false,
    blockedByTenantAdmin: false,
    isLoading: true,
  });

  useEffect(() => {
    try {
      const profileStr = typeof window !== "undefined" ? localStorage.getItem("user_profile") : null;
      const user = profileStr ? JSON.parse(profileStr) : null;
      const role = user?.role || "CLIENT";

      const tenantStr = typeof window !== "undefined" ? localStorage.getItem("tenant_branding") : null;
      const tenant = tenantStr ? JSON.parse(tenantStr) : null;
      const masterFeatures = tenant?.enabled_features || tenant?.features || {};
      const rolePermissions = tenant?.role_permissions || {};

      const result = isFeatureAccessible({
        featureKey,
        userRole: role,
        tenantMasterFeatures: masterFeatures,
        rolePermissions,
      });

      setAccess({
        ...result,
        isLoading: false,
      });
    } catch {
      setAccess({
        allowed: true,
        blockedBySuperAdmin: false,
        blockedByTenantAdmin: false,
        isLoading: false,
      });
    }
  }, [featureKey]);

  return access;
}

