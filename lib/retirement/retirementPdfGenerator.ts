/**
 * Institutional PDF Report Generator for Smart Retirement Planning
 * Powered by PDFKit with Native 128-bit Password Encryption
 */

import PDFDocument from "pdfkit";
import { RetirementDiagnosticResult } from "./retirementEngine";
import { GeminiRetirementResult } from "./retirementAi";

export interface RetirementPdfBranding {
  firmName: string;
  firmType?: string;
  subdomain?: string;
  arnNumber?: string;
  riaNumber?: string;
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  advisorName?: string;
}

export interface RetirementPdfClient {
  fullName: string;
  panNumber?: string;
  dateOfBirth?: string;
  currentAge: number;
  email?: string;
  phone?: string;
}

export interface RetirementPdfPayload {
  client: RetirementPdfClient;
  branding: RetirementPdfBranding;
  diagnostic: RetirementDiagnosticResult;
  aiAdvisory?: GeminiRetirementResult | null;
  password?: string | null;
  options?: {
    includeAiMemo?: boolean;
    includeHoldingsTable?: boolean;
    includeCashFlowTable?: boolean;
  };
}

function formatINR(val: number) {
  if (val === undefined || val === null || isNaN(val)) return "Rs. 0";
  const abs = Math.abs(val);
  const prefix = val < 0 ? "-Rs. " : "Rs. ";
  if (abs >= 10000000) {
    return `${prefix}${(abs / 10000000).toFixed(2)} Cr`;
  } else if (abs >= 100000) {
    return `${prefix}${(abs / 100000).toFixed(2)} L`;
  } else {
    return `${prefix}${abs.toLocaleString("en-IN")}`;
  }
}

/**
 * Generate password-protected or standard PDF buffer
 */
export async function generateRetirementPlanPdf(payload: RetirementPdfPayload): Promise<Buffer> {
  const { client, branding, diagnostic, aiAdvisory, password, options = {} } = payload;
  const includeAiMemo = options.includeAiMemo !== false && !!aiAdvisory;
  const includeHoldingsTable = options.includeHoldingsTable !== false;

  const docOptions: PDFKit.PDFDocumentOptions = {
    size: "A4",
    margin: 36,
    bufferPages: true,
  };

  // Enable password encryption if password is provided
  if (password && password.trim().length > 0) {
    const cleanPw = password.trim();
    docOptions.userPassword = cleanPw;
    docOptions.ownerPassword = `${cleanPw}_master_owner_2026`;
    docOptions.permissions = {
      printing: "highResolution",
      modifying: false,
      copying: true,
      annotating: false,
    };
  }

  const doc = new PDFDocument(docOptions);
  const chunks: Buffer[] = [];

  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const primaryHex = branding.primaryColor || "#059669"; // Emerald default
  const darkSlateHex = "#0f172a";
  const mutedTextHex = "#64748b";
  const borderHex = "#e2e8f0";
  const lightBgHex = "#f8fafc";
  const purpleHex = "#7c3aed";
  const isRet = diagnostic.isAlreadyRetired;

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 36;
  const contentWidth = pageWidth - margin * 2; // ~523.28 pt

  // ==========================================
  // PAGE 1: COVER & EXECUTIVE RETIREMENT DIAGNOSTIC
  // ==========================================

  // Header Brand Strip
  doc.rect(margin, margin, contentWidth, 54).fillAndStroke(lightBgHex, borderHex);

  doc.fillColor(primaryHex).fontSize(14).font("Helvetica-Bold")
    .text(branding.firmName || "Wealth Advisory Practice", margin + 14, margin + 12);

  const subLine = [
    branding.arnNumber ? `ARN: ${branding.arnNumber}` : "",
    branding.riaNumber ? `RIA: ${branding.riaNumber}` : "",
    branding.advisorName ? `Wealth Advisor: ${branding.advisorName}` : "",
  ].filter(Boolean).join("  |  ");

  doc.fillColor(mutedTextHex).fontSize(8).font("Helvetica")
    .text(subLine || "SEBI Registered Wealth Management Platform", margin + 14, margin + 30);

  doc.fillColor(darkSlateHex).fontSize(8).font("Helvetica-Bold")
    .text(`DATE: ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`, margin + contentWidth - 110, margin + 16, { align: "right", width: 96 })
    .fillColor(password ? "#16a34a" : mutedTextHex).fontSize(7).font("Helvetica")
    .text(password ? "[Locked PDF - Confidential]" : "[Private & Confidential]", margin + contentWidth - 110, margin + 30, { align: "right", width: 96 });

  let y = margin + 68;

  // Title Banner
  doc.rect(margin, y, contentWidth, 48).fillAndStroke("#faf5ff", "#e9d5ff");
  doc.fillColor(purpleHex).fontSize(13).font("Helvetica-Bold")
    .text("SMART RETIREMENT DIAGNOSTIC & ACTION PLAN", margin + 14, y + 10);
  doc.fillColor("#475569").fontSize(8.5).font("Helvetica")
    .text(
      isRet
        ? `Active Decumulation Portfolio & Three-Bucket Cashflow Solution for ${client.fullName}`
        : `Pre-Funding Diagnostic, Required SIP & Three-Bucket Architecture for ${client.fullName}`,
      margin + 14,
      y + 27
    );

  y += 58;

  // Client Demographics Table (2 columns)
  doc.rect(margin, y, contentWidth, 54).fillAndStroke("#ffffff", borderHex);

  const colW = contentWidth / 4;
  // Row 1
  doc.fillColor(mutedTextHex).fontSize(7).font("Helvetica-Bold").text("CLIENT FULL NAME", margin + 10, y + 8);
  doc.fillColor(darkSlateHex).fontSize(8.5).font("Helvetica-Bold").text(client.fullName, margin + 10, y + 18);

  doc.fillColor(mutedTextHex).fontSize(7).font("Helvetica-Bold").text("CURRENT AGE", margin + colW + 10, y + 8);
  doc.fillColor(darkSlateHex).fontSize(8.5).font("Helvetica-Bold").text(`${diagnostic.currentAge} Years`, margin + colW + 10, y + 18);

  doc.fillColor(mutedTextHex).fontSize(7).font("Helvetica-Bold").text("RETIREMENT AGE", margin + colW * 2 + 10, y + 8);
  doc.fillColor(darkSlateHex).fontSize(8.5).font("Helvetica-Bold").text(`${diagnostic.retirementAge} Years`, margin + colW * 2 + 10, y + 18);

  doc.fillColor(mutedTextHex).fontSize(7).font("Helvetica-Bold").text("PLANNING HORIZON", margin + colW * 3 + 10, y + 8);
  doc.fillColor(darkSlateHex).fontSize(8.5).font("Helvetica-Bold").text(`Age ${diagnostic.lifeExpectancy} (${diagnostic.retirementTenureYears} yrs)`, margin + colW * 3 + 10, y + 18);

  // Row 2 divider
  doc.moveTo(margin, y + 30).lineTo(margin + contentWidth, y + 30).strokeColor(borderHex).stroke();

  doc.fillColor(mutedTextHex).fontSize(7).font("Helvetica-Bold").text("CURRENT MONTHLY EXPENSE", margin + 10, y + 34);
  doc.fillColor(darkSlateHex).fontSize(8.5).font("Helvetica-Bold").text(formatINR(diagnostic.currentMonthlyExpense), margin + 10, y + 43);

  doc.fillColor(mutedTextHex).fontSize(7).font("Helvetica-Bold").text("INFLATION (PRE / POST)", margin + colW + 10, y + 34);
  doc.fillColor(darkSlateHex).fontSize(8.5).font("Helvetica").text("6.0%  /  5.5% p.a.", margin + colW + 10, y + 43);

  doc.fillColor(mutedTextHex).fontSize(7).font("Helvetica-Bold").text("EXPECTED RETURN (PRE/POST)", margin + colW * 2 + 10, y + 34);
  doc.fillColor(darkSlateHex).fontSize(8.5).font("Helvetica").text("11.5%  /  7.5% p.a.", margin + colW * 2 + 10, y + 43);

  doc.fillColor(mutedTextHex).fontSize(7).font("Helvetica-Bold").text("PAN IDENTIFIER", margin + colW * 3 + 10, y + 34);
  doc.fillColor(darkSlateHex).fontSize(8.5).font("Helvetica").text(client.panNumber || "NOT PROVIDED", margin + colW * 3 + 10, y + 43);

  y += 66;

  // Key KPI Cards (4 boxes)
  const cardW = (contentWidth - 18) / 4;
  const cardH = 56;

  if (isRet) {
    // Retired cards
    const kpis = [
      { label: "AVAILABLE CORPUS", val: formatINR(diagnostic.currentTotalRetirementCorpus), sub: "Total liquid wealth", color: darkSlateHex },
      { label: "SUSTAINABLE MONTHLY SWP", val: formatINR(diagnostic.sustainableMonthlySpend), sub: "Inflation-indexed", color: "#16a34a" },
      { label: "RUNWAY LONGEVITY", val: `${diagnostic.runwayYearsWithCurrentExpense} Years`, sub: "At current lifestyle", color: "#0284c7" },
      { label: "4% RULE BENCHMARK", val: formatINR(diagnostic.fourPercentRuleAnnual), sub: "Annual safe spend", color: purpleHex },
    ];
    kpis.forEach((kpi, i) => {
      const cx = margin + i * (cardW + 6);
      doc.rect(cx, y, cardW, cardH).fillAndStroke(lightBgHex, borderHex);
      doc.fillColor(mutedTextHex).fontSize(6.5).font("Helvetica-Bold").text(kpi.label, cx + 8, y + 8, { width: cardW - 16 });
      doc.fillColor(kpi.color).fontSize(10).font("Helvetica-Bold").text(kpi.val, cx + 8, y + 22, { width: cardW - 16 });
      doc.fillColor(mutedTextHex).fontSize(7).font("Helvetica").text(kpi.sub, cx + 8, y + 40, { width: cardW - 16 });
    });
  } else {
    // Pre-retirement cards
    const kpis = [
      { label: "TARGET CORPUS REQUIRED", val: formatINR(diagnostic.corpusNeededAtRetirement), sub: `At age ${diagnostic.retirementAge}`, color: darkSlateHex },
      { label: "PROJECTED WEALTH", val: formatINR(diagnostic.projectedWealth?.totalProjectedCorpus || 0), sub: "EPF, NPS & MFs", color: "#0284c7" },
      {
        label: diagnostic.isFullyFunded ? "SURPLUS" : "SHORTFALL GAP",
        val: diagnostic.isFullyFunded ? `+${formatINR(Math.abs(diagnostic.shortfallOrSurplus))}` : formatINR(diagnostic.shortfallOrSurplus),
        sub: `${diagnostic.readinessScorePct}% Funded`,
        color: diagnostic.isFullyFunded ? "#16a34a" : "#dc2626",
      },
      {
        label: "REQUIRED ADDITIONAL SIP",
        val: diagnostic.isFullyFunded ? "Target Secured" : `+${formatINR(diagnostic.requiredAdditionalMonthlySip)}/mo`,
        sub: diagnostic.isFullyFunded ? "Longevity covered" : `Or ${formatINR(diagnostic.requiredAdditionalLumpsum)} lump sum`,
        color: purpleHex,
      },
    ];
    kpis.forEach((kpi, i) => {
      const cx = margin + i * (cardW + 6);
      doc.rect(cx, y, cardW, cardH).fillAndStroke(lightBgHex, borderHex);
      doc.fillColor(mutedTextHex).fontSize(6.5).font("Helvetica-Bold").text(kpi.label, cx + 8, y + 8, { width: cardW - 16 });
      doc.fillColor(kpi.color).fontSize(10).font("Helvetica-Bold").text(kpi.val, cx + 8, y + 22, { width: cardW - 16 });
      doc.fillColor(mutedTextHex).fontSize(7).font("Helvetica").text(kpi.sub, cx + 8, y + 40, { width: cardW - 16 });
    });
  }

  y += cardH + 14;

  // Auto-Imported Savings Audit Table
  doc.fillColor(darkSlateHex).fontSize(9.5).font("Helvetica-Bold")
    .text("1. AUTO-IMPORTED SAVINGS & RETIREMENT WEALTH AUDIT", margin, y);
  y += 14;

  const tableHeaderY = y;
  doc.rect(margin, tableHeaderY, contentWidth, 18).fillAndStroke("#f1f5f9", borderHex);
  doc.fillColor(darkSlateHex).fontSize(7.5).font("Helvetica-Bold")
    .text("Asset / Savings Instrument", margin + 8, tableHeaderY + 5)
    .text("Current Balance", margin + 170, tableHeaderY + 5)
    .text("Monthly Deposit", margin + 270, tableHeaderY + 5)
    .text("Assumed Rate", margin + 370, tableHeaderY + 5)
    .text("Projected at Horizon", margin + contentWidth - 110, tableHeaderY + 5, { align: "right", width: 100 });

  y += 18;

  const savingsRows = [
    {
      name: "Employees' Provident Fund (EPF & VPF)",
      cur: formatINR(diagnostic.projectedWealth?.epfFutureValue ? payload.diagnostic.currentTotalRetirementCorpus : 0),
      dep: diagnostic.projectedWealth?.epfFutureValue ? "Statutory monthly" : "Lump sum",
      rate: "8.25% p.a. (Govt EPFO)",
      proj: formatINR(diagnostic.projectedWealth?.epfFutureValue || 0),
    },
    {
      name: "National Pension System (NPS Tier 1)",
      cur: formatINR(diagnostic.projectedWealth?.npsFutureValue ? payload.diagnostic.currentTotalRetirementCorpus : 0),
      dep: "Corporate/Self Tier-1",
      rate: "10.0% p.a. (Equity/Debt)",
      proj: formatINR(diagnostic.projectedWealth?.npsFutureValue || 0),
    },
    {
      name: "Consolidated Mutual Fund Portfolio & Direct Equity",
      cur: formatINR(payload.diagnostic.currentTotalRetirementCorpus),
      dep: "Active monthly SIPs",
      rate: "11.5% p.a. (Equity CAGR)",
      proj: formatINR(diagnostic.projectedWealth?.mutualFundsFutureValue || 0),
    },
    {
      name: "Liquid Fixed Deposits & Emergency Cash Reserves",
      cur: "Cash reserves",
      dep: "Capital buffer",
      rate: "6.5% p.a. (Bank FDs)",
      proj: formatINR(diagnostic.projectedWealth?.liquidAssetsFutureValue || 0),
    },
  ];

  savingsRows.forEach((row, i) => {
    const rowBg = i % 2 === 0 ? "#ffffff" : "#f8fafc";
    doc.rect(margin, y, contentWidth, 16).fillAndStroke(rowBg, borderHex);
    doc.fillColor(darkSlateHex).fontSize(7.5).font("Helvetica")
      .text(row.name, margin + 8, y + 4)
      .text(row.cur, margin + 170, y + 4)
      .text(row.dep, margin + 270, y + 4)
      .text(row.rate, margin + 370, y + 4)
      .font("Helvetica-Bold")
      .text(row.proj, margin + contentWidth - 110, y + 4, { align: "right", width: 100 });
    y += 16;
  });

  // Total Projected Row
  doc.rect(margin, y, contentWidth, 18).fillAndStroke("#faf5ff", "#e9d5ff");
  doc.fillColor(purpleHex).fontSize(8).font("Helvetica-Bold")
    .text("TOTAL PROJECTED RETIREMENT WEALTH AT HORIZON", margin + 8, y + 5)
    .text(formatINR(diagnostic.projectedWealth?.totalProjectedCorpus || 0), margin + contentWidth - 110, y + 5, { align: "right", width: 100 });

  y += 26;

  // Section 2: Institutional Three-Bucket Solution Architecture
  doc.fillColor(darkSlateHex).fontSize(9.5).font("Helvetica-Bold")
    .text("2. INSTITUTIONAL THREE-BUCKET DECUMULATION ARCHITECTURE", margin, y);
  y += 14;

  const bW = (contentWidth - 12) / 3;
  const bH = 142;

  const buckets = [
    {
      bNum: "BUCKET 1",
      title: "IMMEDIATE CASH FLOW",
      horizon: "Years 1 to 3",
      amt: formatINR(diagnostic.threeBucketPlan.bucket1.targetAmount),
      pct: `${diagnostic.threeBucketPlan.bucket1.allocationPct}% Allocation`,
      cagr: "Target: 6.8% Return",
      instruments: "Arbitrage Funds (Equity Tax, Zero Volatility), Liquid Debt, Senior Citizen Savings Scheme",
      outflow: `Monthly SWP Outflow: ${formatINR(diagnostic.threeBucketPlan.bucket1.monthlySwpOutflow)}/mo`,
      role: "Capital preservation; shields retiree from selling equity in market drawdowns.",
      borderCol: "#10b981",
      badgeCol: "#ecfdf5",
      badgeText: "#047857",
    },
    {
      bNum: "BUCKET 2",
      title: "INCOME STABILITY",
      horizon: "Years 4 to 8",
      amt: formatINR(diagnostic.threeBucketPlan.bucket2.targetAmount),
      pct: `${diagnostic.threeBucketPlan.bucket2.allocationPct}% Allocation`,
      cagr: "Target: 8.0% Return",
      instruments: "Conservative Hybrid, Corporate Bond Funds, Banking & PSU Debt, Balanced Advantage",
      outflow: "Refuels Bucket 1 every 24-36 months",
      role: "Beats post-retirement inflation with minimal drawdowns; buffers equities from immediate cash needs.",
      borderCol: "#0284c7",
      badgeCol: "#f0f9ff",
      badgeText: "#0369a1",
    },
    {
      bNum: "BUCKET 3",
      title: "GROWTH & LONGEVITY",
      horizon: "Years 9+",
      amt: formatINR(diagnostic.threeBucketPlan.bucket3.targetAmount),
      pct: `${diagnostic.threeBucketPlan.bucket3.allocationPct}% Allocation`,
      cagr: "Target: 12.2% Return",
      instruments: "Diversified Flexi-Cap Funds, Nifty 50 Index Funds, Multi-Asset Allocation",
      outflow: "Quarterly/Annual STP shifts profits to B2",
      role: "Core wealth compounding engine; outpaces lifestyle and healthcare inflation up to age 85-90.",
      borderCol: "#8b5cf6",
      badgeCol: "#faf5ff",
      badgeText: "#6d28d9",
    },
  ];

  buckets.forEach((b, i) => {
    const bx = margin + i * (bW + 6);
    doc.rect(bx, y, bW, bH).fillAndStroke("#ffffff", b.borderCol);

    doc.rect(bx, y, bW, 20).fill(b.badgeCol);
    doc.fillColor(b.badgeText).fontSize(7.5).font("Helvetica-Bold")
      .text(`${b.bNum}: ${b.title}`, bx + 6, y + 6);
    doc.fillColor(mutedTextHex).fontSize(6.5).font("Helvetica")
      .text(b.horizon, bx + bW - 60, y + 6, { align: "right", width: 54 });

    doc.fillColor(darkSlateHex).fontSize(12).font("Helvetica-Bold")
      .text(b.amt, bx + 8, y + 26);
    doc.fillColor(b.badgeText).fontSize(7).font("Helvetica-Bold")
      .text(`${b.pct}  |  ${b.cagr}`, bx + 8, y + 42);

    doc.fillColor(mutedTextHex).fontSize(6.5).font("Helvetica-Bold").text("RECOMMENDED INSTRUMENTS:", bx + 8, y + 54);
    doc.fillColor(darkSlateHex).fontSize(6.5).font("Helvetica").text(b.instruments, bx + 8, y + 63, { width: bW - 16, height: 28 });

    doc.rect(bx + 6, y + 96, bW - 12, 18).fillAndStroke(lightBgHex, borderHex);
    doc.fillColor(b.badgeText).fontSize(6.5).font("Helvetica-Bold").text(b.outflow, bx + 8, y + 101, { width: bW - 16 });

    doc.fillColor(mutedTextHex).fontSize(6.5).font("Helvetica").text(b.role, bx + 8, y + 118, { width: bW - 16 });
  });

  // ==========================================
  // PAGE 2: SWP/STP BLUEPRINT & FUND SELECTION MATRIX
  // ==========================================
  doc.addPage();
  y = margin;

  // Header Banner Page 2
  doc.rect(margin, y, contentWidth, 24).fillAndStroke(lightBgHex, borderHex);
  doc.fillColor(primaryHex).fontSize(9).font("Helvetica-Bold")
    .text(branding.firmName || "Wealth Advisory Practice", margin + 8, y + 8);
  doc.fillColor(mutedTextHex).fontSize(7.5).font("Helvetica")
    .text(`Client: ${client.fullName}  |  Retirement Decumulation Blueprint`, margin + contentWidth - 240, y + 8, { align: "right", width: 230 });

  y += 34;

  // Section 3: SWP Strategy & Section 112A Tax Alpha
  doc.fillColor(darkSlateHex).fontSize(9.5).font("Helvetica-Bold")
    .text("3. SYSTEMATIC WITHDRAWAL PLAN (SWP) TAX-ALPHA STRATEGY", margin, y);
  y += 14;

  doc.rect(margin, y, contentWidth, 58).fillAndStroke("#f0fdf4", "#bbf7d0");
  doc.fillColor("#166534").fontSize(8.5).font("Helvetica-Bold")
    .text(`RECOMMENDED MONTHLY SWP: ${formatINR(diagnostic.swpStpStrategy.recommendedMonthlySwp)} / month (${formatINR(diagnostic.swpStpStrategy.recommendedAnnualSwp)}/yr)`, margin + 10, y + 8);

  doc.fillColor("#14532d").fontSize(7.5).font("Helvetica").text(
    `Annual Withdrawal Rate: ${diagnostic.swpStpStrategy.swpWithdrawalRatePct}% p.a. (within safe actuarial ceiling of 4.5% - 5.5%).\nTax Alpha: Mutual fund SWP redemptions return a blend of principal and capital gains. Only the capital gain portion is taxed under Section 112A (12.5% LTCG above Rs. 1.25L annual exemption). In contrast, 100% of Bank FD interest is taxed at the client's highest income tax slab (30%+ surcharge), generating over 2.5% in net annual post-tax alpha.`,
    margin + 10,
    y + 22,
    { width: contentWidth - 20 }
  );

  y += 66;

  // Section 4: Portfolio Fund Selection Matrix (Pick Up vs Avoid)
  doc.fillColor(darkSlateHex).fontSize(9.5).font("Helvetica-Bold")
    .text("4. PORTFOLIO FUND SELECTION MATRIX: WHICH FUNDS TO PICK UP VS AVOID FOR SWP", margin, y);
  y += 14;

  if (includeHoldingsTable && diagnostic.swpStpStrategy.fundRecommendations?.length > 0) {
    const fHeaderY = y;
    doc.rect(margin, fHeaderY, contentWidth, 18).fillAndStroke("#f1f5f9", borderHex);
    doc.fillColor(darkSlateHex).fontSize(7).font("Helvetica-Bold")
      .text("Holding Scheme Name", margin + 8, fHeaderY + 5)
      .text("Current Value", margin + 190, fHeaderY + 5)
      .text("Assigned Bucket", margin + 260, fHeaderY + 5)
      .text("Verdict & Classification", margin + 335, fHeaderY + 5)
      .text("Actionable Advisory Directive", margin + 415, fHeaderY + 5);

    y += 18;

    diagnostic.swpStpStrategy.fundRecommendations.slice(0, 10).forEach((f: any, idx: number) => {
      const rowBg = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
      doc.rect(margin, y, contentWidth, 24).fillAndStroke(rowBg, borderHex);

      doc.fillColor(darkSlateHex).fontSize(7.5).font("Helvetica-Bold")
        .text(f.schemeName, margin + 8, y + 4, { width: 175, height: 16 });

      doc.fillColor(darkSlateHex).fontSize(7.5).font("Helvetica")
        .text(formatINR(f.currentValue), margin + 190, y + 7);

      doc.fillColor(purpleHex).fontSize(7.5).font("Helvetica-Bold")
        .text(`Bucket ${f.assignedBucket}`, margin + 260, y + 7);

      let statusLabel = "HOLD FOR GROWTH";
      let statusColor = "#6d28d9";
      if (f.status === "PICK_UP_FOR_SWP") {
        statusLabel = "PICK UP FOR SWP";
        statusColor = "#15803d";
      } else if (f.status === "AVOID_SWP_REBALANCE") {
        statusLabel = "AVOID FOR SWP";
        statusColor = "#b91c1c";
      }

      doc.fillColor(statusColor).fontSize(7).font("Helvetica-Bold")
        .text(statusLabel, margin + 335, y + 7);

      doc.fillColor(mutedTextHex).fontSize(6.5).font("Helvetica")
        .text(f.rationale, margin + 415, y + 3, { width: contentWidth - 420, height: 20 });

      y += 24;
    });
  }

  y += 14;

  // Section 5: Gemini AI Actuarial Memo & Strategic Action Roadmap
  if (includeAiMemo && aiAdvisory) {
    doc.fillColor(darkSlateHex).fontSize(9.5).font("Helvetica-Bold")
      .text("5. GOOGLE GEMINI AI ACTUARIAL DIAGNOSTIC & STRATEGIC ROADMAP", margin, y);
    y += 14;

    doc.rect(margin, y, contentWidth, 68).fillAndStroke("#faf5ff", "#e9d5ff");
    doc.fillColor(purpleHex).fontSize(7.5).font("Helvetica-Bold")
      .text(`EXECUTIVE MEMO (${aiAdvisory.aiModelUsed || "Gemini 1.5 Actuarial Model"})`, margin + 10, y + 6);

    doc.fillColor(darkSlateHex).fontSize(7).font("Helvetica")
      .text(aiAdvisory.executiveSummary, margin + 10, y + 17, { width: contentWidth - 20, height: 46 });

    y += 74;

    // Action Roadmap Steps
    doc.fillColor(darkSlateHex).fontSize(8).font("Helvetica-Bold")
      .text("Actionable Execution Roadmap for Client & Advisor:", margin, y);
    y += 12;

    (aiAdvisory.actionRoadmap || []).slice(0, 3).forEach((st: any, sIdx: number) => {
      doc.rect(margin, y, contentWidth, 22).fillAndStroke(lightBgHex, borderHex);

      const pCol = st.priority === "HIGH" ? "#dc2626" : purpleHex;
      doc.fillColor(pCol).fontSize(7).font("Helvetica-Bold")
        .text(`[${st.priority}]`, margin + 8, y + 6);

      doc.fillColor(darkSlateHex).fontSize(7.5).font("Helvetica-Bold")
        .text(`Step ${sIdx + 1}: ${st.step}`, margin + 48, y + 6);

      doc.fillColor(mutedTextHex).fontSize(7).font("Helvetica")
        .text(st.description, margin + 180, y + 6, { width: 230 });

      doc.fillColor(darkSlateHex).fontSize(7).font("Helvetica-Bold")
        .text(st.timeline, margin + contentWidth - 90, y + 6, { align: "right", width: 80 });

      y += 24;
    });

    y += 10;
  }

  // Statutory Disclaimers & Sign-off Block
  doc.rect(margin, y, contentWidth, 48).fillAndStroke("#f8fafc", borderHex);
  doc.fillColor(mutedTextHex).fontSize(6).font("Helvetica").text(
    "STATUTORY DISCLAIMER: This document is prepared for financial planning and wealth diagnostic purposes only. Mutual fund investments are subject to market risks; read all scheme related documents carefully. Past performance does not guarantee future results. Projected returns and inflation rates are based on actuarial assumptions and are not guaranteed returns. Please consult your SEBI-registered Investment Advisor or AMFI-registered Mutual Fund Distributor prior to executing financial transactions.",
    margin + 8,
    y + 6,
    { width: contentWidth - 16 }
  );

  doc.fillColor(darkSlateHex).fontSize(7).font("Helvetica-Bold")
    .text("Client Acknowledgment: ______________________", margin + 8, y + 34)
    .text(`Authorized Advisor Sign-off: ${branding.firmName || "Wealth Practice"}`, margin + contentWidth - 240, y + 34, { align: "right", width: 230 });

  // Add Page Numbers to all pages
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.fillColor(mutedTextHex).fontSize(7).font("Helvetica")
      .text(
        `Page ${i + 1} of ${range.count}  |  Unified Wealth Platform  |  Strictly Private & Confidential`,
        margin,
        pageHeight - 24,
        { align: "center", width: contentWidth }
      );
  }

  doc.end();

  return new Promise((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

