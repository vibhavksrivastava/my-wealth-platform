import { NextResponse, connection } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAuthHeader } from "@/lib/auth";
import { getSuggestionsForClient } from "@/lib/suggestions";


export async function GET(req: Request) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch Client Profile
    const { data: profile } = await supabaseAdmin
      .from("client_profiles")
      .select("*")
      .eq("user_id", session.sub)
      .maybeSingle();

    // Fetch User details for name/email
    const { data: userRec } = await supabaseAdmin
      .from("users")
      .select("first_name, last_name, email")
      .eq("id", session.sub)
      .maybeSingle();

    const userFullName = userRec ? `${userRec.first_name || ""} ${userRec.last_name || ""}`.trim() : "";

    // Fetch Household Client data if linked or client by user_id
    let clientRecord = null;
    let assets: any[] = [];
    let liabilities: any[] = [];
    let goals: any[] = [];
    let scorecards: any[] = [];
    let activeSuggestions: any[] = [];

    let cData = null;
    // 1. Direct match on user_id
    const { data: userMatches } = await supabaseAdmin
      .from("clients")
      .select("*")
      .eq("user_id", session.sub)
      .limit(1);

    if (userMatches && userMatches.length > 0) {
      cData = userMatches[0];
    }

    // 2. Household match if linked
    if (!cData && profile?.household_id) {
      const { data: hhClients } = await supabaseAdmin
        .from("clients")
        .select("*")
        .eq("household_id", profile.household_id);

      if (hhClients && hhClients.length > 0) {
        // Prefer matching full name or first member
        const found = hhClients.find(
          (c) =>
            (userFullName && c.full_name && c.full_name.toLowerCase().includes(userFullName.toLowerCase())) ||
            (userFullName && c.full_name && userFullName.toLowerCase().includes(c.full_name.toLowerCase()))
        );
        cData = found || hhClients[0];
        if (cData && !cData.user_id) {
          await supabaseAdmin
            .from("clients")
            .update({ user_id: session.sub })
            .eq("client_id", cData.client_id);
          cData.user_id = session.sub;
        }
      }
    }

    // 3. Name match fallback strictly within tenant
    if (!cData && userFullName && session.tenantId) {
      const { data: nameMatches } = await supabaseAdmin
        .from("clients")
        .select("*")
        .ilike("full_name", `%${userFullName}%`)
        .eq("tenant_id", session.tenantId)
        .limit(1);

      if (nameMatches && nameMatches.length > 0) {
        cData = nameMatches[0];
        if (!cData.user_id) {
          await supabaseAdmin
            .from("clients")
            .update({ user_id: session.sub })
            .eq("client_id", cData.client_id);
          cData.user_id = session.sub;
        }
      }
    }

    // 4. Create client planning record if completely new
    if (!cData) {
      const { data: newClient } = await supabaseAdmin
        .from("clients")
        .insert({
          tenant_id: session.tenantId || "00000000-0000-0000-0000-000000000000",
          user_id: session.sub,
          full_name: userFullName || session.email?.split("@")[0] || "Investor Client",
          uwp_client_code: `CL-${Math.floor(1000 + Math.random() * 9000)}`,
        })
        .select()
        .maybeSingle();
      cData = newClient;
    }

    clientRecord = cData;

    if (cData?.client_id) {
      const [aRes, lRes, gRes, scRes, suggList] = await Promise.all([
        supabaseAdmin.from("assets").select("*").eq("client_id", cData.client_id),
        supabaseAdmin.from("liabilities").select("*").eq("client_id", cData.client_id),
        supabaseAdmin.from("financial_goals").select("*").eq("client_id", cData.client_id),
        supabaseAdmin.from("cfp_scorecard_evaluations").select("*").eq("client_id", cData.client_id),
        getSuggestionsForClient(cData.client_id),
      ]);

      assets = aRes.data || [];
      liabilities = lRes.data || [];
      goals = gRes.data || [];
      scorecards = scRes.data || [];
      activeSuggestions = (suggList || []).filter((s) => s.status !== "DRAFT");
    }

    // Fetch upcoming appointments
    const { data: appointments } = await supabaseAdmin
      .from("appointments")
      .select("id, title, meeting_link, start_time, end_time, status, advisor_id")
      .eq("client_id", session.sub)
      .order("start_time", { ascending: true })
      .limit(5);

    // Fetch advisor details if assigned
    let advisor = null;
    if (profile?.assigned_advisor_id) {
      const { data: adv } = await supabaseAdmin
        .from("users")
        .select("id, first_name, last_name, email, phone_number")
        .eq("id", profile.assigned_advisor_id)
        .maybeSingle();
      advisor = adv;
    }

    // Fetch tenant white-label branding
    let tenant = null;
    const targetTenantId = session.tenantId || profile?.tenant_id || clientRecord?.tenant_id;
    if (targetTenantId) {
      const { data: t } = await supabaseAdmin
        .from("tenants")
        .select("id, subdomain, firm_legal_name, firm_brand_name, logo_url, primary_color, secondary_color, theme_mode, disclaimer_text, arn_number, ria_number")
        .eq("id", targetTenantId)
        .maybeSingle();
      tenant = t;
    }

    return NextResponse.json({
      profile: profile || {
        total_assets: 0,
        total_liabilities: 0,
        net_worth: 0,
        risk_profile_category: "Moderate",
      },
      tenant,
      clientRecord,
      advisor,
      assets,
      liabilities,
      goals,
      scorecards,
      appointments: appointments || [],
      suggestions: activeSuggestions,
    });
  } catch (error) {
    console.error("Client overview error:", error);
    return NextResponse.json(
      { error: "Failed to load client overview." },
      { status: 500 }
    );
  }
}
