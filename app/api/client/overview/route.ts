import { NextResponse, connection } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAuthHeader } from "@/lib/auth";
import { getSuggestionsForClient } from "@/lib/suggestions";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    // Fetch Household Client data if linked or client by user_id
    let clientRecord = null;
    let assets: any[] = [];
    let liabilities: any[] = [];
    let goals: any[] = [];
    let scorecards: any[] = [];
    let activeSuggestions: any[] = [];

    let cData = null;
    if (profile?.household_id) {
      const { data } = await supabaseAdmin
        .from("clients")
        .select("*")
        .eq("household_id", profile.household_id)
        .maybeSingle();
      cData = data;
    }
    if (!cData) {
      const { data } = await supabaseAdmin
        .from("clients")
        .select("*")
        .eq("user_id", session.sub)
        .maybeSingle();
      cData = data;
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
        .select("id, subdomain, firm_legal_name, firm_brand_name, logo_url, primary_color, disclaimer_text, arn_number, ria_number")
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
