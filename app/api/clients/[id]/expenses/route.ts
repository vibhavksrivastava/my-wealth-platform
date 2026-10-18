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
    const { category, monthly_amount, is_essential, notes, target_client_id } = body;

    const assignedClientId = target_client_id || clientId;
    const monthlyNum = Number(monthly_amount);

    if (!category || isNaN(monthlyNum) || monthlyNum < 0) {
      return NextResponse.json({ error: "Valid category and non-negative monthly amount are required." }, { status: 400 });
    }

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from("expense_items")
      .insert({
        client_id: assignedClientId,
        category: category.trim(),
        monthly_amount: monthlyNum,
        is_essential: Boolean(is_essential),
        notes: notes ? String(notes).trim() : null,
      })
      .select()
      .single();

    if (insertErr || !inserted) {
      throw insertErr || new Error("Failed to insert expense item.");
    }

    await logAuditEvent({
      tenantId: session.tenantId,
      clientId: assignedClientId,
      advisorId: session.sub,
      action: "CREATE",
      entityType: "EXPENSE",
      entityId: inserted.expense_id,
      details: inserted,
    });

    return NextResponse.json({ success: true, item: inserted });
  } catch (err: any) {
    console.error("Expense POST error:", err);
    return NextResponse.json({ error: err.message || "Failed to create expense item." }, { status: 500 });
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
    const { expense_id, category, monthly_amount, is_essential, notes } = body;

    if (!expense_id) {
      return NextResponse.json({ error: "expense_id is required for update." }, { status: 400 });
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
    if (is_essential !== undefined) updates.is_essential = Boolean(is_essential);
    if (notes !== undefined) updates.notes = notes ? String(notes).trim() : null;

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from("expense_items")
      .update(updates)
      .eq("expense_id", expense_id)
      .select()
      .single();

    if (updateErr || !updated) {
      throw updateErr || new Error("Failed to update expense item.");
    }

    await logAuditEvent({
      tenantId: session.tenantId,
      clientId,
      advisorId: session.sub,
      action: "UPDATE",
      entityType: "EXPENSE",
      entityId: expense_id,
      details: updates,
    });

    return NextResponse.json({ success: true, item: updated });
  } catch (err: any) {
    console.error("Expense PUT error:", err);
    return NextResponse.json({ error: err.message || "Failed to update expense item." }, { status: 500 });
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
    const expenseId = searchParams.get("expense_id");

    if (!expenseId) {
      return NextResponse.json({ error: "expense_id query param is required." }, { status: 400 });
    }

    const { error: delErr } = await supabaseAdmin
      .from("expense_items")
      .delete()
      .eq("expense_id", expenseId);

    if (delErr) throw delErr;

    await logAuditEvent({
      tenantId: session.tenantId,
      clientId,
      advisorId: session.sub,
      action: "DELETE",
      entityType: "EXPENSE",
      entityId: expenseId,
      details: { deleted: true },
    });

    return NextResponse.json({ success: true, message: "Expense item deleted." });
  } catch (err: any) {
    console.error("Expense DELETE error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete expense item." }, { status: 500 });
  }
}

