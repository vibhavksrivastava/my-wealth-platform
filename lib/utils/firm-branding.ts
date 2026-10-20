export type FirmType = "MFD" | "RIA" | "BOTH";
export type UserRole = "MFD" | "ADVISOR" | "ADMIN" | "STAFF" | "CLIENT" | "SUPER_ADMIN" | string;

export interface BrandingContext {
  firmType: FirmType;
  userRole?: UserRole;
}

export interface FirmTerminology {
  entityTitle: string;
  shortTitle: string;
  dashboardHeader: string;
  clientHeading: string;
  serviceLabel: string;
  complianceTerm: string;
  regulatoryIdLabel: string;
  regulatoryBody: string;
  roleBadge: string;
  portalTitle: string;
  aumLabel: string;
  revenueModel: string;
  transactionAction: string;
}

export function getFirmTerminology(context: BrandingContext): FirmTerminology {
  const { firmType, userRole } = context;

  // 1. Strict Firm-level override: MFD
  if (firmType === "MFD") {
    return {
      entityTitle: "Mutual Fund Distributor",
      shortTitle: "MFD",
      dashboardHeader: "MFD Execution & Portfolio Dashboard",
      clientHeading: "Distributor Clients",
      serviceLabel: "Distribution & Execution Services",
      complianceTerm: "AMFI / Exchange Compliance",
      regulatoryIdLabel: "ARN Number",
      regulatoryBody: "AMFI",
      roleBadge: "Mutual Fund Distributor",
      portalTitle: "MFD Distributor Console",
      aumLabel: "Distribution AUM",
      revenueModel: "Commission & Brokerage Model",
      transactionAction: "Execute BSE StAR MF Order",
    };
  }

  // 2. Strict Firm-level override: RIA
  if (firmType === "RIA") {
    return {
      entityTitle: "Registered Investment Advisor",
      shortTitle: "RIA",
      dashboardHeader: "Advisory & Wealth Planning Dashboard",
      clientHeading: "Advisory Clients",
      serviceLabel: "Fiduciary Advisory Services",
      complianceTerm: "SEBI RIA Compliance",
      regulatoryIdLabel: "SEBI RIA Number (INA)",
      regulatoryBody: "SEBI",
      roleBadge: "SEBI Registered Investment Advisor",
      portalTitle: "RIA Advisory Console",
      aumLabel: "Advisory Assets Under Care",
      revenueModel: "Fee-Only / Advisory Retainer",
      transactionAction: "Deliver Advisory Recommendation",
    };
  }

  // 3. Hybrid ('BOTH') Mode - Falls back to user role
  if (userRole === "MFD" || userRole === "STAFF") {
    return {
      entityTitle: "Mutual Fund Distributor",
      shortTitle: "MFD",
      dashboardHeader: "MFD Execution Portal",
      clientHeading: "Execution Clients",
      serviceLabel: "Execution & Transaction Services",
      complianceTerm: "AMFI Code of Conduct",
      regulatoryIdLabel: "ARN Number",
      regulatoryBody: "AMFI",
      roleBadge: "Execution Division (MFD)",
      portalTitle: "MFD Execution Console",
      aumLabel: "Execution AUM",
      revenueModel: "Distribution Commission",
      transactionAction: "Execute BSE StAR MF Order",
    };
  }

  // Default / Advisor Role in Hybrid mode
  return {
    entityTitle: "Registered Investment Advisor",
    shortTitle: "RIA",
    dashboardHeader: "Fiduciary Advisory & Planning Dashboard",
    clientHeading: "Advisory Clients",
    serviceLabel: "Fiduciary Advisory Services",
    complianceTerm: "SEBI RIA Regulations",
    regulatoryIdLabel: "RIA Registration Number",
    regulatoryBody: "SEBI",
    roleBadge: "Fiduciary Advisory Division (RIA)",
    portalTitle: "Hybrid Wealth Advisory Console",
    aumLabel: "Advisory Assets Under Care",
    revenueModel: "Advisory Fee Model",
    transactionAction: "Deliver Advisory Recommendation",
  };
}

