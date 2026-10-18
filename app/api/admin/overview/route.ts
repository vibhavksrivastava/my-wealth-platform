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

    if (!["TENANT_ADMIN", "SUPER_ADMIN"].includes(session.role)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Fetch tenant details
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("*")
      .eq("id", session.tenantId)
      .maybeSingle();

    // Fetch tenant users
    const { data: users } = await supabaseAdmin
      .from("users")
      .select("id, email, role, first_name, last_name, is_active, last_login_at, created_at")
      .eq("tenant_id", session.tenantId)
      .order("created_at", { ascending: false });

    // Fetch invoices
    const { data: invoices } = await supabaseAdmin
      .from("invoices")
      .select("*")
      .eq("tenant_id", session.tenantId)
      .order("created_at", { ascending: false });

    return NextResponse.json({
      tenant,
      users: users || [],
      invoices: invoices || [],
    });
  } catch (error) {
    console.error("Admin overview error:", error);
    return NextResponse.json(
      { error: "Failed to load admin overview." },
      { status: 500 }
    );
  }
}
