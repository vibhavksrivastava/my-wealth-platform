import { NextResponse, connection } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import bcrypt from "bcryptjs";
import { verifyAuthHeader } from "@/lib/auth";


export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session || !["TENANT_ADMIN", "SUPER_ADMIN"].includes(session.role)) {
      return NextResponse.json(
        { error: "Access denied. Firm Administrator privileges required." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { isActive, newPassword, role, firstName, lastName, phoneNumber } = body;

    // Verify user belongs to this tenant
    const { data: existingUser, error: findErr } = await supabaseAdmin
      .from("users")
      .select("id, tenant_id, role, email")
      .eq("id", id)
      .maybeSingle();

    if (findErr || !existingUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (session.role !== "SUPER_ADMIN" && existingUser.tenant_id !== session.tenantId) {
      return NextResponse.json(
        { error: "Access denied. You can only manage users within your own firm." },
        { status: 403 }
      );
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof isActive === "boolean") {
      updates.is_active = isActive;
    }

    if (role && ["ADVISOR", "STAFF", "TENANT_ADMIN"].includes(role)) {
      updates.role = role;
    }

    if (firstName) updates.first_name = firstName.trim();
    if (lastName) updates.last_name = lastName.trim();
    if (phoneNumber !== undefined) updates.phone_number = phoneNumber ? phoneNumber.trim() : null;

    if (newPassword) {
      updates.password_hash = await bcrypt.hash(newPassword.trim(), 10);
    }

    const { data: updatedUser, error: updateErr } = await supabaseAdmin
      .from("users")
      .update(updates)
      .eq("id", id)
      .select("id, tenant_id, email, role, first_name, last_name, phone_number, is_active, updated_at")
      .single();

    if (updateErr) {
      throw updateErr;
    }

    return NextResponse.json({
      success: true,
      message: "User account updated successfully.",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Tenant Admin User PATCH Error:", error);
    return NextResponse.json(
      { error: "Failed to update user account." },
      { status: 500 }
    );
  }
}

