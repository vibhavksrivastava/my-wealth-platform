import { NextResponse, connection } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAuthHeader } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyClientAccess(clientId: string, session: any) {
  const { data: client } = await supabaseAdmin
    .from("clients")
    .select("client_id, tenant_id, user_id")
    .eq("client_id", clientId)
    .maybeSingle();

  if (!client) return { error: "Client not found", status: 404 };
  if (session.role !== "SUPER_ADMIN" && client.tenant_id && client.tenant_id !== session.tenantId) {
    return { error: "Access denied. Client belongs to another firm.", status: 403 };
  }
  return { client };
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session || !["ADVISOR", "STAFF", "TENANT_ADMIN", "SUPER_ADMIN"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const { id: clientId } = await params;
    const { client, error, status } = await verifyClientAccess(clientId, session);
    if (error) return NextResponse.json({ error }, { status: status || 400 });

    const body = await req.json();
    const {
      liability_type,
      lender_name,
      outstanding_principal,
      annual_interest_rate,
      monthly_emi,
      tenure_remaining_months,
      notes,
      target_client_id,
    } = body;

    const assignedClientId = target_client_id || clientId;
    const principalNum = Number(outstanding_principal);

    if (!liability_type || isNaN(principalNum) || principalNum < 0) {
      return NextResponse.json({ error: "Valid liability type and non-negative principal are required." }, { status: 400 });
    }

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from("liabilities")
      .insert({
        client_id: assignedClientId,
        liability_type: liability_type.trim(),
        lender_name: lender_name ? lender_name.trim() : null,
        outstanding_principal: principalNum,
        annual_interest_rate: Number(annual_interest_rate || 0),
        monthly_emi: Number(monthly_emi || 0),
        tenure_remaining_months: Number(tenure_remaining_months || 0),
        notes: notes ? String(notes).trim() : null,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertErr || !inserted) {
      throw insertErr || new Error("Failed to insert liability record.");
    }

    await logAuditEvent({
      tenantId: session.tenantId,
      clientId: assignedClientId,
      advisorId: session.sub,
      action: "CREATE",
      entityType: "LIABILITY",
      entityId: inserted.liability_id,
      details: inserted,
    });

    return NextResponse.json({ success: true, item: inserted });
  } catch (err: any) {
    console.error("Liability POST error:", err);
    return NextResponse.json({ error: err.message || "Failed to create liability record." }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session || !["ADVISOR", "STAFF", "TENANT_ADMIN", "SUPER_ADMIN"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const { id: clientId } = await params;
    const { client, error, status } = await verifyClientAccess(clientId, session);
    if (error) return NextResponse.json({ error }, { status: status || 400 });

    const body = await req.json();
    const {
      liability_id,
      liability_type,
      lender_name,
      outstanding_principal,
      annual_interest_rate,
      monthly_emi,
      tenure_remaining_months,
      notes,
    } = body;

    if (!liability_id) {
      return NextResponse.json({ error: "liability_id is required for update." }, { status: 400 });
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (liability_type) updates.liability_type = liability_type.trim();
    if (lender_name !== undefined) updates.lender_name = lender_name ? lender_name.trim() : null;
    if (outstanding_principal !== undefined) {
      const num = Number(outstanding_principal);
      if (isNaN(num) || num < 0) return NextResponse.json({ error: "Principal must be non-negative." }, { status: 400 });
      updates.outstanding_principal = num;
    }
    if (annual_interest_rate !== undefined) updates.annual_interest_rate = Number(annual_interest_rate || 0);
    if (monthly_emi !== undefined) updates.monthly_emi = Number(monthly_emi || 0);
    if (tenure_remaining_months !== undefined) updates.tenure_remaining_months = Number(tenure_remaining_months || 0);
    if (notes !== undefined) updates.notes = notes ? String(notes).trim() : null;

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from("liabilities")
      .update(updates)
      .eq("liability_id", liability_id)
      .select()
      .single();

    if (updateErr || !updated) {
      throw updateErr || new Error("Failed to update liability record.");
    }

    await logAuditEvent({
      tenantId: session.tenantId,
      clientId,
      advisorId: session.sub,
      action: "UPDATE",
      entityType: "LIABILITY",
      entityId: liability_id,
      details: updates,
    });

    return NextResponse.json({ success: true, item: updated });
  } catch (err: any) {
    console.error("Liability PUT error:", err);
    return NextResponse.json({ error: err.message || "Failed to update liability record." }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session || !["ADVISOR", "STAFF", "TENANT_ADMIN", "SUPER_ADMIN"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const { id: clientId } = await params;
    const { client, error, status } = await verifyClientAccess(clientId, session);
    if (error) return NextResponse.json({ error }, { status: status || 400 });

    const { searchParams } = new URL(req.url);
    const liabilityId = searchParams.get("liability_id");

    if (!liabilityId) {
      return NextResponse.json({ error: "liability_id query param is required." }, { status: 400 });
    }

    const { error: delErr } = await supabaseAdmin
      .from("liabilities")
      .delete()
      .eq("liability_id", liabilityId);

    if (delErr) throw delErr;

    await logAuditEvent({
      tenantId: session.tenantId,
      clientId,
      advisorId: session.sub,
      action: "DELETE",
      entityType: "LIABILITY",
      entityId: liabilityId,
      details: { deleted: true },
    });

    return NextResponse.json({ success: true, message: "Liability deleted successfully." });
  } catch (err: any) {
    console.error("Liability DELETE error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete liability record." }, { status: 500 });
  }
}

