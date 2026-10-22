import { NextResponse, connection } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAuthHeader } from "@/lib/auth";

export async function GET(req: Request) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. If not SUPER_ADMIN, resolve household IDs strictly belonging to this tenant's clients
    let tenantHouseholdIds: string[] = [];
    if (session.role !== "SUPER_ADMIN" && session.tenantId) {
      const { data: tenantClients } = await supabaseAdmin
        .from("clients")
        .select("household_id")
        .eq("tenant_id", session.tenantId)
        .not("household_id", "is", null);

      tenantHouseholdIds = Array.from(
        new Set((tenantClients || []).map((c) => c.household_id).filter(Boolean))
      );

      // If this tenant has no registered households yet, return an empty array
      if (tenantHouseholdIds.length === 0) {
        return NextResponse.json({ households: [] });
      }
    }

    // 2. Fetch households strictly for this tenant
    let query = supabaseAdmin
      .from("households")
      .select("household_id, household_name")
      .order("household_name", { ascending: true });

    if (session.role !== "SUPER_ADMIN" && tenantHouseholdIds.length > 0) {
      query = query.in("household_id", tenantHouseholdIds);
    }

    const { data: households, error } = await query;

    if (error) {
      console.error("Error fetching households:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ households: households || [] });
  } catch (error) {
    console.error("Households API error:", error);
    return NextResponse.json(
      { error: "Internal server error fetching households." },
      { status: 500 }
    );
  }
}
