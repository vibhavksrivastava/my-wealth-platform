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
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Access denied. Super Administrator privileges required." }, { status: 403 });
    }

    const [tenantsRes, usersRes, clientProfilesRes] = await Promise.all([
      supabaseAdmin.from("tenants").select("id, firm_brand_name, is_active, created_at"),
      supabaseAdmin.from("users").select("id, role, is_active"),
      supabaseAdmin.from("client_profiles").select("total_assets, net_worth"),
    ]);

    const tenants = tenantsRes.data || [];
    const users = usersRes.data || [];
    const clientProfiles = clientProfilesRes.data || [];

    const activeTenants = tenants.filter((t) => t.is_active).length;
    const totalClients = users.filter((u) => u.role === "CLIENT").length;
    const totalAdvisors = users.filter((u) => u.role === "ADVISOR" || u.role === "STAFF").length;
    const totalFirmAdmins = users.filter((u) => u.role === "TENANT_ADMIN").length;

    const globalAUM = clientProfiles.reduce((sum, cp) => sum + Number(cp.total_assets || 0), 0);
    const globalNetWorth = clientProfiles.reduce((sum, cp) => sum + Number(cp.net_worth || 0), 0);

    return NextResponse.json({
      metrics: {
        totalTenants: tenants.length,
        activeTenants,
        totalClients,
        totalAdvisors,
        totalFirmAdmins,
        globalAUM,
        globalNetWorth,
      },
      recentTenants: tenants.slice(0, 5),
    });
  } catch (error) {
    console.error("Super Admin Analytics Error:", error);
    return NextResponse.json({ error: "Failed to load platform analytics." }, { status: 500 });
  }
}

