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
    const { category, monthly_amount, notes, target_client_id } = body;

    const assignedClientId = target_client_id || clientId;
    const monthlyNum = Number(monthly_amount);

    if (!category || isNaN(monthlyNum) || monthlyNum < 0) {
      return NextResponse.json({ error: "Valid category and non-negative monthly amount are required." }, { status: 400 });
    }

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from("income_sources")
      .insert({
        client_id: assignedClientId,
        category: category.trim(),
        monthly_amount: monthlyNum,
        notes: notes ? String(notes).trim() : null,
      })
      .select()
      .single();

    if (insertErr || !inserted) {
      throw insertErr || new Error("Failed to insert income record.");
    }

    await logAuditEvent({
      tenantId: session.tenantId,
      clientId: assignedClientId,
      advisorId: session.sub,
      action: "CREATE",
      entityType: "INCOME",
      entityId: inserted.income_id,
      details: inserted,
    });

    return NextResponse.json({ success: true, item: inserted });
  } catch (err: any) {
    console.error("Income POST error:", err);
    return NextResponse.json({ error: err.message || "Failed to create income source." }, { status: 500 });
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
    const { income_id, category, monthly_amount, notes } = body;

    if (!income_id) {
      return NextResponse.json({ error: "income_id is required for update." }, { status: 400 });
    }

    const updates: Record<string, any> = {};
    if (category) updates.category = category.trim();
    if (monthly_amount !== undefined) {
      const num = Number(monthly_amount);
      if (isNaN(num) || num < 0) {
        return NextResponse.json({ error: "Monthly amount must be a non-negative number." }, { status: 400 });
      }
      updates.monthly_amount = num;
    }
    if (notes !== undefined) updates.notes = notes ? String(notes).trim() : null;

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from("income_sources")
      .update(updates)
      .eq("income_id", income_id)
      .select()
      .single();

    if (updateErr || !updated) {
      throw updateErr || new Error("Failed to update income record.");
    }

    await logAuditEvent({
      tenantId: session.tenantId,
      clientId,
      advisorId: session.sub,
      action: "UPDATE",
      entityType: "INCOME",
      entityId: income_id,
      details: updates,
    });

    return NextResponse.json({ success: true, item: updated });
  } catch (err: any) {
    console.error("Income PUT error:", err);
    return NextResponse.json({ error: err.message || "Failed to update income source." }, { status: 500 });
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
    const incomeId = searchParams.get("income_id");

    if (!incomeId) {
      return NextResponse.json({ error: "income_id query param is required." }, { status: 400 });
    }

    const { error: delErr } = await supabaseAdmin
      .from("income_sources")
      .delete()
      .eq("income_id", incomeId);

    if (delErr) throw delErr;

    await logAuditEvent({
      tenantId: session.tenantId,
      clientId,
      advisorId: session.sub,
      action: "DELETE",
      entityType: "INCOME",
      entityId: incomeId,
      details: { deleted: true },
    });

    return NextResponse.json({ success: true, message: "Income source deleted." });
  } catch (err: any) {
    console.error("Income DELETE error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete income source." }, { status: 500 });
  }
}

