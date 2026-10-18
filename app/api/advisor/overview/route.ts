import { NextResponse, connection } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAuthHeader } from "@/lib/auth";

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

    if (!["ADVISOR", "STAFF", "TENANT_ADMIN", "SUPER_ADMIN"].includes(session.role)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Fetch assigned client profiles
    const { data: clientProfiles } = await supabaseAdmin
      .from("client_profiles")
      .select("id, user_id, household_id, risk_profile_category, total_assets, total_liabilities, net_worth")
      .eq("tenant_id", session.tenantId);

    // Fetch clients table records
    const { data: clientsList } = await supabaseAdmin
      .from("clients")
      .select("client_id, uwp_client_code, full_name, annual_gross_income, risk_profile, planning_horizon_years, advisor_name");

    // Fetch upcoming appointments for advisor
    const { data: appointments } = await supabaseAdmin
      .from("appointments")
      .select("id, title, meeting_link, start_time, end_time, status, client_id")
      .eq("advisor_id", session.sub)
      .order("start_time", { ascending: true });

    // Calculate aggregated AUM from profiles
    const totalAssets = (clientProfiles || []).reduce((acc, curr) => acc + Number(curr.total_assets || 0), 0);
    const totalNetWorth = (clientProfiles || []).reduce((acc, curr) => acc + Number(curr.net_worth || 0), 0);

    return NextResponse.json({
      metrics: {
        totalAUM: totalAssets,
        totalNetWorth,
        activeHouseholds: (clientsList || []).length,
        appointmentsCount: (appointments || []).length,
      },
      clients: clientsList || [],
      clientProfiles: clientProfiles || [],
      appointments: appointments || [],
    });
  } catch (error) {
    console.error("Advisor overview error:", error);
    return NextResponse.json(
      { error: "Failed to load advisor overview." },
      { status: 500 }
    );
  }
}
