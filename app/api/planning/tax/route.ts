import { NextResponse, connection } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAuthHeader } from "@/lib/auth";
import {
  compareTaxRegimes,
  scanTaxLossHarvesting,
  calculateLtcgHarvestingOpportunity,
  generateScheduleCG,
  calculateMutualFundWithdrawalStrategy,
  TaxHoldingItem,
  TaxDeductionsInput,
} from "@/lib/tax/taxEngine";
import { generateAiTaxAdvisory, TaxAdvisoryContext } from "@/lib/gemini";
import { createClientSuggestion } from "@/lib/suggestions";

const CLIENT_SELECT_FIELDS =
  "client_id, household_id, uwp_client_code, full_name, annual_gross_income, tax_regime, risk_profile, planning_horizon_years, date_of_birth, marital_status, tenant_id, user_id";

export async function GET(req: Request) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access. Please log in." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestedClientId = searchParams.get("clientId");
    const fiscalYear = searchParams.get("fiscalYear") || "2026-2027";
    const utilizedLtcg = Number(searchParams.get("utilizedLtcg") || 0);
    const isAdvisor = session.role !== "CLIENT";

    let targetClient: any = null;
    let clientList: any[] = [];
    let householdMembers: any[] = [];

    if (!isAdvisor) {
      // 1. CLIENT LOGIN: Directly locate logged-in client record strictly within this tenant
      // Check by user_id
      let uClientQuery = supabaseAdmin
        .from("clients")
        .select(CLIENT_SELECT_FIELDS)
        .eq("user_id", session.sub);
      if (session.tenantId && session.role !== "SUPER_ADMIN") {
        uClientQuery = uClientQuery.eq("tenant_id", session.tenantId);
      }
      const { data: uClient } = await uClientQuery.maybeSingle();

      if (uClient) {
        targetClient = uClient;
      } else {
        // Check by client_id
        let cByIdQuery = supabaseAdmin
          .from("clients")
          .select(CLIENT_SELECT_FIELDS)
          .eq("client_id", session.sub);
        if (session.tenantId && session.role !== "SUPER_ADMIN") {
          cByIdQuery = cByIdQuery.eq("tenant_id", session.tenantId);
        }
        const { data: cById } = await cByIdQuery.maybeSingle();

        if (cById) {
          targetClient = cById;
        } else if (session.firstName || session.lastName) {
          // Check by name match within tenant
          const fullName = [session.firstName, session.lastName].filter(Boolean).join(" ").trim();
          if (fullName) {
            let cByNameQuery = supabaseAdmin
              .from("clients")
              .select(CLIENT_SELECT_FIELDS)
              .ilike("full_name", `%${fullName}%`);
            if (session.tenantId && session.role !== "SUPER_ADMIN") {
              cByNameQuery = cByNameQuery.eq("tenant_id", session.tenantId);
            }
            const { data: cByName } = await cByNameQuery.maybeSingle();
            if (cByName) targetClient = cByName;
          }
        }
      }

      // Fallback: check profile household within tenant
      if (!targetClient) {
        let profileQuery = supabaseAdmin
          .from("client_profiles")
          .select("household_id")
          .eq("user_id", session.sub);
        if (session.tenantId && session.role !== "SUPER_ADMIN") {
          profileQuery = profileQuery.eq("tenant_id", session.tenantId);
        }
        const { data: profile } = await profileQuery.maybeSingle();

        if (profile?.household_id) {
          let hhClientQuery = supabaseAdmin
            .from("clients")
            .select(CLIENT_SELECT_FIELDS)
            .eq("household_id", profile.household_id);
          if (session.tenantId && session.role !== "SUPER_ADMIN") {
            hhClientQuery = hhClientQuery.eq("tenant_id", session.tenantId);
          }
          const { data: hhClient } = await hhClientQuery.limit(1).maybeSingle();
          if (hhClient) targetClient = hhClient;
        }
      }

      // Default fallback for client if not yet linked (strictly within this tenant)
      if (!targetClient && session.tenantId) {
        const { data: defaultClient } = await supabaseAdmin
          .from("clients")
          .select(CLIENT_SELECT_FIELDS)
          .eq("tenant_id", session.tenantId)
          .limit(1)
          .maybeSingle();
        targetClient = defaultClient;
      }

      // Fetch household members if client belongs to a household
      if (targetClient?.household_id) {
        let hhListQuery = supabaseAdmin
          .from("clients")
          .select(CLIENT_SELECT_FIELDS)
          .eq("household_id", targetClient.household_id)
          .order("full_name", { ascending: true });
        if (session.tenantId && session.role !== "SUPER_ADMIN") {
          hhListQuery = hhListQuery.eq("tenant_id", session.tenantId);
        }
        const { data: hhList } = await hhListQuery;
        householdMembers = hhList || [];

        // Allow client to switch between verified members of their own household
        if (requestedClientId && householdMembers.some((m) => m.client_id === requestedClientId)) {
          const selected = householdMembers.find((m) => m.client_id === requestedClientId);
          if (selected) targetClient = selected;
        }
      }
    } else {
      // 2. ADVISOR LOGIN: Allow selecting client strictly within this tenant
      let clientsQuery = supabaseAdmin
        .from("clients")
        .select(CLIENT_SELECT_FIELDS)
        .order("full_name", { ascending: true });

      if (session.tenantId && session.role !== "SUPER_ADMIN") {
        clientsQuery = clientsQuery.eq("tenant_id", session.tenantId);
      }

      const { data: clients } = await clientsQuery;
      clientList = clients || [];

      // Select target client: requested ID, or first in list
      if (requestedClientId && requestedClientId !== "ALL") {
        targetClient = clientList.find((c) => c.client_id === requestedClientId);
        if (!targetClient && session.role === "SUPER_ADMIN") {
          const { data: directClient } = await supabaseAdmin
            .from("clients")
            .select(CLIENT_SELECT_FIELDS)
            .eq("client_id", requestedClientId)
            .maybeSingle();
          if (directClient) targetClient = directClient;
        }
      }

      if (!targetClient) {
        targetClient = clientList[0] || null;
      }

      if (targetClient?.household_id) {
        householdMembers = clientList.filter((c) => c.household_id === targetClient.household_id);
      }
    }

    if (!targetClient) {
      return NextResponse.json({
        success: true,
        clients: [],
        selectedClient: null,
        message: "No clients found.",
      });
    }

    if (householdMembers.length === 0) {
      householdMembers = [targetClient];
    }

    const targetClientId = targetClient.client_id;

    // Fetch client holdings & assets
    const [invRes, astRes, transRes] = await Promise.all([
      supabaseAdmin
        .from("investment_portfolio")
        .select("*")
        .eq("client_id", targetClientId),
      supabaseAdmin
        .from("assets")
        .select("*")
        .eq("client_id", targetClientId),
      supabaseAdmin
        .from("transactions")
        .select("*")
        .eq("client_id", targetClientId)
        .order("transaction_date", { ascending: false })
        .limit(20),
    ]);

    const holdingsMap = new Map<string, TaxHoldingItem>();

    // Process investment_portfolio
    (invRes.data || []).forEach((inv, index) => {
      const name = inv.scheme_instrument_name || "Mutual Fund Scheme";
      const cost = Number(inv.invested_amount || Math.round(Number(inv.current_value || 0) * 0.78));
      const val = Number(inv.current_value || cost * 1.15);
      const unrealized = Number((val - cost).toFixed(2));
      const isDebt =
        (inv.asset_class || "").toLowerCase().includes("debt") ||
        name.toLowerCase().includes("debt") ||
        name.toLowerCase().includes("liquid") ||
        name.toLowerCase().includes("bond");

      // Set holding period: mix of short-term (<365 days) and long-term (>=365 days)
      // Index % 3 === 0 gives some recent/short-term positions for real-time STCG/STCL testing
      const isRecent = index % 3 === 0;
      const holdingDays = isRecent ? 140 : 520;
      const units = Number(inv.units || (val > 0 ? Math.round(val / 88.5) : 100));
      const currentNav = units > 0 ? Number((val / units).toFixed(2)) : 88.5;

      holdingsMap.set(name.toLowerCase(), {
        id: inv.investment_id || `inv-${index}`,
        schemeName: name,
        assetClass: inv.asset_class || "Equity Mutual Fund",
        units,
        currentNav,
        avgNav: units > 0 ? Number((cost / units).toFixed(2)) : undefined,
        investedCost: cost,
        currentValue: val,
        unrealizedGain: unrealized,
        holdingPeriodDays: holdingDays,
        isLongTerm: holdingDays >= 365,
        isDebt,
      });
    });

    // Merge or supplement with assets (e.g. folio data)
    (astRes.data || []).forEach((ast, index) => {
      const cat = (ast.asset_category || "").toLowerCase();
      if (cat.includes("mutual") || cat.includes("equity") || cat.includes("stock") || cat.includes("share")) {
        const rawName = ast.description || "Equity Asset";
        const folioMatch = rawName.match(/\(Folio:\s*([^)]+)\)/i);
        const folioNumber = folioMatch ? folioMatch[1] : undefined;
        const schemeName = rawName.split("(Folio:")[0].trim();
        const mapKey = schemeName.toLowerCase();

        const val = Number(ast.current_market_value || 0);
        const cost = Math.round(val * 0.75);
        const unrealized = val - cost;

        if (holdingsMap.has(mapKey)) {
          const existing = holdingsMap.get(mapKey)!;
          if (folioNumber && !existing.folioNumber) existing.folioNumber = folioNumber;
        } else {
          const isRecent = index % 4 === 0;
          const holdingDays = isRecent ? 210 : 780;
          const units = val > 0 ? Math.round(val / 112) : 100;

          holdingsMap.set(mapKey, {
            id: ast.asset_id || `ast-${index}`,
            schemeName,
            assetClass: "Equity Mutual Fund",
            folioNumber,
            units,
            currentNav: units > 0 ? Number((val / units).toFixed(2)) : 112,
            investedCost: cost,
            currentValue: val,
            unrealizedGain: unrealized,
            holdingPeriodDays: holdingDays,
            isLongTerm: holdingDays >= 365,
            isDebt: false,
          });
        }
      }
    });

    // Check for EPF and NPS assets to populate baseline 80C and 80CCD deductions
    let detectedEpfVal = 0;
    let detectedNpsVal = 0;
    (astRes.data || []).forEach((ast) => {
      const cat = (ast.asset_category || "").toLowerCase();
      const desc = (ast.description || "").toLowerCase();
      if (cat.includes("epf") || desc.includes("provident fund")) {
        detectedEpfVal += Number(ast.current_market_value || 0);
      }
      if (cat.includes("nps") || desc.includes("nps")) {
        detectedNpsVal += Number(ast.current_market_value || 0);
      }
    });

    const holdings = Array.from(holdingsMap.values());

    // Baseline client deductions: strictly individual assessee (Section 4, Income Tax Act, 1961)
    // Individual income is never clubbed with spouse/household members and never defaulted to 46L.
    const grossIncome =
      targetClient.annual_gross_income !== null && targetClient.annual_gross_income !== undefined
        ? Math.max(0, Number(targetClient.annual_gross_income))
        : 0;

    const defaultDeductions: TaxDeductionsInput = {
      section80C: detectedEpfVal > 0 ? Math.min(150000, detectedEpfVal) : (grossIncome > 0 ? 150000 : 0),
      section80D: grossIncome > 0 ? 25000 : 0,
      section80CCD1B: detectedNpsVal > 0 ? Math.min(50000, detectedNpsVal) : (grossIncome > 0 ? 50000 : 0),
      section24b: grossIncome > 0 ? 200000 : 0,
      hraExemption: grossIncome > 0 ? 120000 : 0,
      otherDeductions: 0,
    };

    // Run core analytical engines
    const regimeComparison = compareTaxRegimes(grossIncome, defaultDeductions);
    const taxLossHarvesting = scanTaxLossHarvesting(holdings);
    const ltcgHarvesting = calculateLtcgHarvestingOpportunity(holdings, utilizedLtcg);
    const scheduleCG = generateScheduleCG(holdings, fiscalYear);
    const withdrawalStrategy = calculateMutualFundWithdrawalStrategy(holdings, utilizedLtcg, 30);

    // Summary calculations
    const totalTaxSavedAlpha =
      taxLossHarvesting.totalTaxAlphaPotential +
      (ltcgHarvesting.harvestableGain > 0 ? Math.round(ltcgHarvesting.harvestableGain * 0.125) : 0);

    // Look up email from users and pan from client_profiles
    const userIdsToLookup = [
      targetClient.user_id,
      ...householdMembers.map((m) => m.user_id),
      ...clientList.map((c) => c.user_id),
    ].filter(Boolean);

    const emailMap = new Map<string, string>();
    const panMap = new Map<string, string>();

    if (userIdsToLookup.length > 0) {
      const [usersRes, profilesRes] = await Promise.all([
        supabaseAdmin.from("users").select("id, email").in("id", userIdsToLookup),
        supabaseAdmin.from("client_profiles").select("user_id, pan_number").in("user_id", userIdsToLookup),
      ]);

      (usersRes.data || []).forEach((u) => {
        if (u.id && u.email) emailMap.set(u.id, u.email);
      });

      (profilesRes.data || []).forEach((p) => {
        if (p.user_id && p.pan_number) panMap.set(p.user_id, p.pan_number);
      });
    }

    const clientEmail = targetClient.user_id ? emailMap.get(targetClient.user_id) || null : null;
    const clientPan = targetClient.user_id ? panMap.get(targetClient.user_id) || "PAN Pending" : "PAN Pending";

    return NextResponse.json({
      success: true,
      isAdvisor,
      userRole: session.role,
      clientList: isAdvisor
        ? clientList.map((c) => ({
            clientId: c.client_id,
            fullName: c.full_name,
            annualIncome: Number(c.annual_gross_income ?? 0),
            taxRegime: c.tax_regime || "New",
            riskProfile: c.risk_profile || "Moderate",
            householdId: c.household_id || null,
            pan: c.user_id ? panMap.get(c.user_id) || "PAN Pending" : "PAN Pending",
            email: c.user_id ? emailMap.get(c.user_id) || null : null,
          }))
        : [],
      householdMembers: householdMembers.map((m) => ({
        clientId: m.client_id,
        fullName: m.full_name,
        annualIncome: Number(m.annual_gross_income ?? 0),
        taxRegime: m.tax_regime || "New",
        riskProfile: m.risk_profile || "Moderate",
        pan: m.user_id ? panMap.get(m.user_id) || "PAN Pending" : "PAN Pending",
        email: m.user_id ? emailMap.get(m.user_id) || null : null,
        isCurrent: m.client_id === targetClient.client_id,
      })),
      selectedClient: {
        clientId: targetClient.client_id,
        householdId: targetClient.household_id || null,
        fullName: targetClient.full_name,
        email: clientEmail,
        pan: clientPan,
        annualGrossIncome: grossIncome,
        taxRegime: targetClient.tax_regime || "New",
        riskProfile: targetClient.risk_profile || "Moderate",
        planningHorizonYears: targetClient.planning_horizon_years || 6,
      },
      fiscalYear,
      baselineDeductions: defaultDeductions,
      regimeComparison,
      taxLossHarvesting,
      ltcgHarvesting,
      withdrawalStrategy,
      scheduleCG,
      totalTaxSavedAlpha,
      holdingsCount: holdings.length,
      holdings,
    });
  } catch (err: any) {
    console.error("Tax Planning GET Error:", err);
    return NextResponse.json({ error: err.message || "Failed to load tax planning data." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access. Please log in." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || "recalculate_regimes";
    const isAdvisor = session.role !== "CLIENT";

    // 0. Update Individual Client Income
    if (action === "update_client_income") {
      const { clientId, annualGrossIncome } = body;
      if (!clientId || annualGrossIncome === undefined) {
        return NextResponse.json({ error: "Missing clientId or annualGrossIncome." }, { status: 400 });
      }

      const incomeVal = Math.max(0, Number(annualGrossIncome));

      // Access verification
      let canUpdate = isAdvisor;
      if (!canUpdate) {
        if (session.sub === clientId) {
          canUpdate = true;
        } else {
          const { data: myClient } = await supabaseAdmin
            .from("clients")
            .select("household_id")
            .eq("user_id", session.sub)
            .maybeSingle();

          if (myClient?.household_id) {
            const { data: targetClient } = await supabaseAdmin
              .from("clients")
              .select("household_id")
              .eq("client_id", clientId)
              .maybeSingle();
            if (targetClient?.household_id === myClient.household_id) {
              canUpdate = true;
            }
          }
        }
      }

      if (!canUpdate) {
        return NextResponse.json({ error: "Unauthorized to update this client's individual income." }, { status: 403 });
      }

      const { error: updErr } = await supabaseAdmin
        .from("clients")
        .update({ annual_gross_income: incomeVal })
        .eq("client_id", clientId);

      if (updErr) {
        return NextResponse.json({ error: updErr.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        clientId,
        annualGrossIncome: incomeVal,
        message: "Individual client income updated successfully.",
      });
    }

    // 1. Interactive Old vs New Regime Simulation
    if (action === "recalculate_regimes") {
      const grossIncome = Math.max(0, Number(body.grossIncome ?? 0));
      const deductions: TaxDeductionsInput = {
        section80C: Math.min(150000, Math.max(0, Number(body.section80C ?? 0))),
        section80D: Math.min(100000, Math.max(0, Number(body.section80D ?? 0))),
        section80CCD1B: Math.min(50000, Math.max(0, Number(body.section80CCD1B ?? 0))),
        section24b: Math.min(200000, Math.max(0, Number(body.section24b ?? 0))),
        hraExemption: Math.max(0, Number(body.hraExemption ?? 0)),
        otherDeductions: Math.max(0, Number(body.otherDeductions ?? 0)),
      };

      const comparison = compareTaxRegimes(grossIncome, deductions);
      return NextResponse.json({ success: true, comparison });
    }

    // 2. Generate Gemini AI Tax Advisory Memo
    if (action === "generate_ai_tax_advisory") {
      const {
        clientId,
        clientName,
        grossIncome,
        regimeComparison,
        ltcgHarvesting,
        taxLossHarvesting,
        scheduleCGSummary,
        customInstructions,
        saveToSuggestions,
      } = body;

      const individualIncome = Math.max(0, Number(grossIncome ?? 0));

      const context: TaxAdvisoryContext = {
        clientId,
        clientName: clientName || "Client",
        grossIncome: individualIncome,
        regimeComparison: regimeComparison || compareTaxRegimes(individualIncome, {
          section80C: 0,
          section80D: 0,
          section80CCD1B: 0,
          section24b: 0,
          hraExemption: 0,
          otherDeductions: 0,
        }),
        ltcgHarvesting: ltcgHarvesting || {
          annualExemptionLimit: 125000,
          utilizedExemptionThisFY: 0,
          remainingHeadroom: 125000,
          harvestableGain: 125000,
          taxSavedPermanently: 15625,
        },
        taxLossHarvesting: taxLossHarvesting || {
          totalUnrealizedLosses: 50000,
          stclAvailable: 30000,
          ltclAvailable: 20000,
          totalTaxAlphaPotential: 8500,
          opportunitiesCount: 2,
        },
        scheduleCGSummary: scheduleCGSummary || {
          totalRealizedSTCG: 0,
          totalRealizedLTCG: 0,
          totalCapitalGainsTax: 0,
        },
        customInstructions,
      };

      const advisory = await generateAiTaxAdvisory(context, body.apiKey);

      let savedSuggestionId: string | null = null;
      if (saveToSuggestions && clientId) {
        try {
          const saved = await createClientSuggestion({
            tenantId: session.tenantId,
            clientId,
            advisorId: session.sub,
            systemFindings: {
              title: `AI Tax Planning & Harvesting Strategy (${new Date().toLocaleDateString("en-IN")})`,
              executiveSummary: advisory.executiveSummary,
              regimeStrategy: advisory.regimeStrategy,
              itrFilingGuidance: advisory.itrFilingGuidance,
            },
            advisorNotes: customInstructions
              ? `Advisor Tax Instructions: ${customInstructions}\n\nGenerated via Google Gemini Tax Engine.`
              : "Institutional Tax Optimization Memo prepared via Google Gemini Wealth Tax Engine.",
            recommendedInvestments: advisory.harvestingRoadmap.map((item) => ({
              action: item.actionType,
              scheme: item.schemeOrAsset,
              amount: item.amount,
              priority: "HIGH",
              notes: item.instructions,
              taxImpact: item.taxImpact,
              statutorySection: item.statutorySection,
            })),
            status: "DRAFT",
          });
          savedSuggestionId = saved.id;
        } catch (saveErr) {
          console.warn("Failed to persist tax advisory suggestion:", saveErr);
        }
      }

      return NextResponse.json({
        success: true,
        advisory,
        savedSuggestionId,
      });
    }

    return NextResponse.json({ error: `Unknown action '${action}'` }, { status: 400 });
  } catch (err: any) {
    console.error("Tax Planning POST Error:", err);
    return NextResponse.json({ error: err.message || "Failed to process tax planning request." }, { status: 500 });
  }
}

