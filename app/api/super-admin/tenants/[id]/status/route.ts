import { NextResponse, connection } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAuthHeader } from "@/lib/auth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Access denied. Super Administrator privileges required." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { isActive } = body;

    if (typeof isActive !== "boolean") {
      return NextResponse.json(
        { error: "The 'isActive' boolean parameter is required." },
        { status: 400 }
      );
    }

    // Update tenant active status
    const { data: updatedTenant, error: tenantErr } = await supabaseAdmin
      .from("tenants")
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (tenantErr || !updatedTenant) {
      return NextResponse.json(
        { error: tenantErr?.message || "Tenant not found or update failed." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Tenant status updated to ${isActive ? "Active" : "Suspended"}.`,
      tenant: updatedTenant,
    });
  } catch (error) {
    console.error("Super Admin Tenant Status PATCH Error:", error);
    return NextResponse.json(
      { error: "Failed to update tenant status." },
      { status: 500 }
    );
  }
}

