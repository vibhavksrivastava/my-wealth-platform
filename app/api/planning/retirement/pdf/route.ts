import { NextResponse, connection } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAuthHeader } from "@/lib/auth";
import {
  generateRetirementPlanPdf,
  RetirementPdfBranding,
  RetirementPdfClient,
} from "@/lib/retirement/retirementPdfGenerator";
import {
  calculateRetirementDiagnostics,
  RetirementDiagnosticResult,
  RetirementEngineInput,
} from "@/lib/retirement/retirementEngine";

export async function POST(req: Request) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access. Please log in." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      clientId: requestedClientId,
      password,
      diagnosticResult: passedDiagnostic,
      inputOverrides,
      aiAdvisory,
      options,
    } = body;

    const isAdvisor = session.role !== "CLIENT";
    let targetClient: any = null;

    if (!isAdvisor) {
      // 1. Client Access: resolve logged-in client record
      let uQuery = supabaseAdmin
        .from("clients")
        .select("*")
        .eq("user_id", session.sub);
      if (session.tenantId && session.role !== "SUPER_ADMIN") {
        uQuery = uQuery.eq("tenant_id", session.tenantId);
      }
      const { data: uClient } = await uQuery.maybeSingle();

      if (uClient) {
        targetClient = uClient;
      } else {
        let cQuery = supabaseAdmin
          .from("clients")
          .select("*")
          .eq("client_id", session.sub);
        if (session.tenantId && session.role !== "SUPER_ADMIN") {
          cQuery = cQuery.eq("tenant_id", session.tenantId);
        }
        const { data: cClient } = await cQuery.maybeSingle();
        if (cClient) targetClient = cClient;
      }

      // Fallback by household
      if (!targetClient) {
        const { data: prof } = await supabaseAdmin
          .from("client_profiles")
          .select("household_id")
          .eq("user_id", session.sub)
          .maybeSingle();

        if (prof?.household_id) {
          const { data: hhClient } = await supabaseAdmin
            .from("clients")
            .select("*")
            .eq("household_id", prof.household_id)
            .limit(1)
            .maybeSingle();
          if (hhClient) targetClient = hhClient;
        }
      }

      if (!targetClient && session.tenantId) {
        const { data: defClient } = await supabaseAdmin
          .from("clients")
          .select("*")
          .eq("tenant_id", session.tenantId)
          .limit(1)
          .maybeSingle();
        targetClient = defClient;
      }
    } else {
      // 2. Advisor Access: target client by clientId
      if (requestedClientId && requestedClientId !== "ALL") {
        let cQuery = supabaseAdmin
          .from("clients")
          .select("*")
          .eq("client_id", requestedClientId);

        if (session.tenantId && session.role !== "SUPER_ADMIN") {
          cQuery = cQuery.eq("tenant_id", session.tenantId);
        }
        const { data: cData } = await cQuery.maybeSingle();
        targetClient = cData;
      }

      if (!targetClient && session.tenantId) {
        let listQuery = supabaseAdmin
          .from("clients")
          .select("*")
          .limit(1);
        if (session.role !== "SUPER_ADMIN") {
          listQuery = listQuery.eq("tenant_id", session.tenantId);
        }
        const { data: listData } = await listQuery;
        targetClient = listData?.[0] || null;
      }
    }

    if (!targetClient) {
      return NextResponse.json({ error: "Client record not found." }, { status: 404 });
    }

    // Resolve Diagnostic Result (use passed diagnostic or calculate fresh)
    let diagnostic: RetirementDiagnosticResult = passedDiagnostic;
    if (!diagnostic || diagnostic.currentAge === undefined) {
      if (inputOverrides) {
        diagnostic = calculateRetirementDiagnostics(inputOverrides as RetirementEngineInput);
      } else {
        return NextResponse.json(
          { error: "Diagnostic calculation parameters required to generate report." },
          { status: 400 }
        );
      }
    }

    // Resolve Tenant & Advisor Branding
    const tenantId = targetClient.tenant_id || session.tenantId;
    let tenantRow: any = null;
    let tenantSettingsRow: any = null;

    if (tenantId) {
      const [tRes, sRes] = await Promise.all([
        supabaseAdmin.from("tenants").select("*").eq("id", tenantId).maybeSingle(),
        supabaseAdmin.from("tenant_settings").select("branding, custom_domain").eq("tenant_id", tenantId).maybeSingle(),
      ]);
      tenantRow = tRes.data;
      tenantSettingsRow = sRes.data;
    }

    // Resolve Advisor info
    let advisorName = "Senior Wealth Strategist";
    let contactEmail = "advisory@unifiedwealth.com";
    let contactPhone = "+91 98200 12345";

    if (isAdvisor && session.sub) {
      const { data: userProfile } = await supabaseAdmin
        .from("users")
        .select("first_name, last_name, email, phone_number, professional_role")
        .eq("id", session.sub)
        .maybeSingle();

      if (userProfile) {
        const fullName = [userProfile.first_name, userProfile.last_name].filter(Boolean).join(" ");
        if (fullName) advisorName = fullName;
        if (userProfile.email) contactEmail = userProfile.email;
        if (userProfile.phone_number) contactPhone = userProfile.phone_number;
      }
    }

    const firmType =
      (tenantRow?.firm_type === "MFD" || tenantRow?.tenant_type === "MFD")
        ? "AMFI Registered Mutual Fund Distributor"
        : "SEBI Registered Investment Advisory (RIA)";

    const branding: RetirementPdfBranding = {
      firmName:
        tenantSettingsRow?.branding?.firmBrandName ||
        tenantRow?.firm_brand_name ||
        "Zenith Wealth Advisory",
      firmType,
      subdomain: tenantRow?.subdomain || undefined,
      arnNumber:
        (tenantRow?.firm_type === "MFD" || tenantRow?.tenant_type === "MFD")
          ? "ARN-189240"
          : undefined,
      riaNumber:
        (tenantRow?.firm_type === "RIA" || tenantRow?.tenant_type === "RIA")
          ? "INA000018429"
          : undefined,
      primaryColor: tenantSettingsRow?.branding?.primaryColor || "#059669",
      secondaryColor: tenantSettingsRow?.branding?.secondaryColor || "#047857",
      logoUrl: tenantSettingsRow?.branding?.logoUrl || undefined,
      contactEmail,
      contactPhone,
      advisorName,
    };

    const client: RetirementPdfClient = {
      fullName: targetClient.full_name || targetClient.name || "Valued Client",
      panNumber: targetClient.pan_number || targetClient.pan || undefined,
      dateOfBirth: targetClient.date_of_birth || undefined,
      currentAge: diagnostic.currentAge || 38,
      email: targetClient.email || undefined,
      phone: targetClient.phone || undefined,
    };

    // Generate PDF Buffer with native encryption if password is provided
    const pdfBuffer = await generateRetirementPlanPdf({
      client,
      branding,
      diagnostic,
      aiAdvisory,
      password: password && password.trim().length > 0 ? password.trim() : null,
      options: {
        includeAiMemo: options?.includeAiMemo ?? true,
        includeHoldingsTable: options?.includeHoldingsTable ?? true,
        includeCashFlowTable: options?.includeCashFlowTable ?? true,
      },
    });

    const safeClientName = (client.fullName || "Client").replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `Retirement_Plan_${safeClientName}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.byteLength.toString(),
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error: any) {
    console.error("Error generating retirement plan PDF:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate retirement plan PDF report." },
      { status: 500 }
    );
  }
}
