"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import {
  getFirmTerminology,
  type FirmType,
  type UserRole,
  type FirmTerminology,
} from "@/lib/utils/firm-branding";

export type { FirmType, UserRole, FirmTerminology };

interface FirmBrandingContextType {
  firmType: FirmType;
  userRole: UserRole;
  terms: FirmTerminology;
  isMfd: boolean;
  isRia: boolean;
  isHybrid: boolean;
  setFirmType: (type: FirmType) => void;
  setUserRole: (role: UserRole) => void;
}

const defaultTerms = getFirmTerminology({ firmType: "MFD", userRole: "ADVISOR" });

const FirmBrandingContext = createContext<FirmBrandingContextType>({
  firmType: "MFD",
  userRole: "ADVISOR",
  terms: defaultTerms,
  isMfd: true,
  isRia: false,
  isHybrid: false,
  setFirmType: () => {},
  setUserRole: () => {},
});

export function FirmBrandingProvider({
  firmType: initialFirmType,
  userRole: initialUserRole,
  children,
}: {
  firmType?: FirmType;
  userRole?: UserRole;
  children: React.ReactNode;
}) {
  const [firmType, setFirmTypeState] = useState<FirmType>(initialFirmType || "MFD");
  const [userRole, setUserRoleState] = useState<UserRole>(initialUserRole || "ADVISOR");

  // Read persisted user profile or active firm branding from localStorage if not explicitly supplied
  useEffect(() => {
    if (initialFirmType) {
      setFirmTypeState(initialFirmType);
    } else {
      try {
        const storedType = localStorage.getItem("wealthos_firm_type") as FirmType;
        if (storedType && ["MFD", "RIA", "BOTH"].includes(storedType)) {
          setFirmTypeState(storedType);
        }
      } catch {}
    }

    if (initialUserRole) {
      setUserRoleState(initialUserRole);
    } else {
      try {
        const profileStr = localStorage.getItem("user_profile");
        if (profileStr) {
          const profile = JSON.parse(profileStr);
          const role = profile.professional_role || profile.role;
          if (role) setUserRoleState(role);
        }
      } catch {}
    }
  }, [initialFirmType, initialUserRole]);

  const setFirmType = (type: FirmType) => {
    setFirmTypeState(type);
    try {
      localStorage.setItem("wealthos_firm_type", type);
    } catch {}
  };

  const setUserRole = (role: UserRole) => {
    setUserRoleState(role);
  };

  const terms = useMemo(() => {
    return getFirmTerminology({ firmType, userRole });
  }, [firmType, userRole]);

  const value = useMemo(() => {
    const activeShort = terms.shortTitle;
    return {
      firmType,
      userRole,
      terms,
      isMfd: activeShort === "MFD",
      isRia: activeShort === "RIA",
      isHybrid: firmType === "BOTH",
      setFirmType,
      setUserRole,
    };
  }, [firmType, userRole, terms]);

  return (
    <FirmBrandingContext.Provider value={value}>
      {children}
    </FirmBrandingContext.Provider>
  );
}

export function useFirmBranding(): FirmBrandingContextType {
  const context = useContext(FirmBrandingContext);
  if (!context) {
    throw new Error("useFirmBranding must be used within a FirmBrandingProvider");
  }
  return context;
}

