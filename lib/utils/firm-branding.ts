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
  advisorLabel: string;
  advisoryLabel: string;
  assignedAdvisorLabel: string;
  notesLabel: string;
  actionPlanLabel: string;
  calendarCallLabel: string;
}

export function getFirmTerminology(context: BrandingContext): FirmTerminology {
  const { firmType, userRole } = context;

  // 1. Strict Firm-level override: MFD
  // For tenant_type = MFD: always use Distributor / Distribution (SEBI regulations strictly prohibit MFDs from using Advisor/Advisory)
  if (firmType === "MFD") {
    return {
      entityTitle: "Mutual Fund Distributor",
      shortTitle: "Distributor",
      dashboardHeader: "Distributor Console & Portfolio Dashboard",
      clientHeading: "Distributor Clients",
      serviceLabel: "Distribution & Execution Services",
      complianceTerm: "AMFI / Exchange Compliance",
      regulatoryIdLabel: "ARN Number",
      regulatoryBody: "AMFI",
      roleBadge: "Mutual Fund Distributor",
      portalTitle: "Distributor Console",
      aumLabel: "Distribution AUM",
      revenueModel: "Commission & Brokerage Model",
      transactionAction: "Execute BSE StAR MF Order",
      advisorLabel: "Distributor",
      advisoryLabel: "Distribution",
      assignedAdvisorLabel: "Assigned Distributor",
      notesLabel: "Distributor Notes",
      actionPlanLabel: "Distribution Execution Plan",
      calendarCallLabel: "Distributor Call",
    };
  }

  // 2. Strict Firm-level override: RIA
  // For tenant_type = RIA: always use Advisor / Advisory (SEBI Registered Investment Advisor)
  if (firmType === "RIA") {
    return {
      entityTitle: "Registered Investment Advisor",
      shortTitle: "Advisor",
      dashboardHeader: "Advisory & Wealth Planning Dashboard",
      clientHeading: "Advisory Clients",
      serviceLabel: "Fiduciary Advisory Services",
      complianceTerm: "SEBI RIA Compliance",
      regulatoryIdLabel: "SEBI RIA Number (INA)",
      regulatoryBody: "SEBI",
      roleBadge: "SEBI Registered Investment Advisor",
      portalTitle: "Advisor Console",
      aumLabel: "Advisory Assets Under Care",
      revenueModel: "Fee-Only / Advisory Retainer",
      transactionAction: "Deliver Advisory Recommendation",
      advisorLabel: "Advisor",
      advisoryLabel: "Advisory",
      assignedAdvisorLabel: "Assigned Advisor",
      notesLabel: "Advisor Notes",
      actionPlanLabel: "Advisor Action Plan",
      calendarCallLabel: "Advisor Call",
    };
  }

  // 3. Hybrid ('BOTH') Mode - Falls back to user role
  if (userRole === "MFD" || userRole === "STAFF") {
    return {
      entityTitle: "Mutual Fund Distributor",
      shortTitle: "Distributor",
      dashboardHeader: "Distributor Execution Portal",
      clientHeading: "Execution Clients",
      serviceLabel: "Execution & Transaction Services",
      complianceTerm: "AMFI Code of Conduct",
      regulatoryIdLabel: "ARN Number",
      regulatoryBody: "AMFI",
      roleBadge: "Execution Division (Distributor)",
      portalTitle: "Distributor Execution Console",
      aumLabel: "Execution AUM",
      revenueModel: "Distribution Commission",
      transactionAction: "Execute BSE StAR MF Order",
      advisorLabel: "Distributor",
      advisoryLabel: "Distribution",
      assignedAdvisorLabel: "Assigned Distributor",
      notesLabel: "Distributor Notes",
      actionPlanLabel: "Distribution Execution Plan",
      calendarCallLabel: "Distributor Call",
    };
  }

  // Default / Advisor Role in Hybrid mode
  return {
    entityTitle: "Registered Investment Advisor",
    shortTitle: "Advisor",
    dashboardHeader: "Fiduciary Advisory & Planning Dashboard",
    clientHeading: "Advisory Clients",
    serviceLabel: "Fiduciary Advisory Services",
    complianceTerm: "SEBI RIA Regulations",
    regulatoryIdLabel: "RIA Registration Number",
    regulatoryBody: "SEBI",
    roleBadge: "Fiduciary Advisory Division (Advisor)",
    portalTitle: "Hybrid Wealth Advisory Console",
    aumLabel: "Advisory Assets Under Care",
    revenueModel: "Advisory Fee Model",
    transactionAction: "Deliver Advisory Recommendation",
    advisorLabel: "Advisor",
    advisoryLabel: "Advisory",
    assignedAdvisorLabel: "Assigned Advisor",
    notesLabel: "Advisor Notes",
    actionPlanLabel: "Advisor Action Plan",
    calendarCallLabel: "Advisor Call",
  };
}

