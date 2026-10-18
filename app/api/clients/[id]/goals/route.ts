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

// Future value and required SIP formula helpers
function computeGoalMetrics(targetAmountToday: number, targetYear: number, inflationRate: number, currentCorpus: number) {
  const currentYear = new Date().getFullYear();
  const years = Math.max(1, targetYear - currentYear);
  const inflationDec = inflationRate > 1 ? inflationRate / 100 : inflationRate;

  // FV = PV * (1 + inflation)^years
  const requiredFutureValue = targetAmountToday * Math.pow(1 + inflationDec, years);

  // Growth of existing corpus at estimated 10% equity CAGR
  const corpusFutureValue = currentCorpus * Math.pow(1 + 0.10, years);
  const shortfall = Math.max(0, requiredFutureValue - corpusFutureValue);

  // SIP formula: Monthly rate r_m = (1 + 0.12)^(1/12) - 1, N = years * 12
  const rMonth = Math.pow(1 + 0.11, 1 / 12) - 1;
  const totalMonths = years * 12;
  const monthlyRequiredSIP =
    shortfall > 0 && totalMonths > 0
      ? (shortfall * rMonth) / (Math.pow(1 + rMonth, totalMonths) - 1)
      : 0;

  return {
    requiredFutureValue: Math.round(requiredFutureValue),
    monthlyRequiredSIP: Math.round(monthlyRequiredSIP),
  };
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
      goal_name,
      target_year,
      target_amount_today,
      current_corpus_allocated,
      expected_inflation_rate,
      priority,
      notes,
      target_client_id,
    } = body;

    const assignedClientId = target_client_id || clientId;
    const amountNum = Number(target_amount_today);
    const yearNum = Number(target_year);

    if (!goal_name || isNaN(amountNum) || amountNum <= 0 || isNaN(yearNum) || yearNum < new Date().getFullYear()) {
      return NextResponse.json({ error: "Valid goal name, positive target amount, and future target year are required." }, { status: 400 });
    }

    const inflationNum = Number(expected_inflation_rate || 0.06);
    const corpusNum = Number(current_corpus_allocated || 0);

    const { requiredFutureValue, monthlyRequiredSIP } = computeGoalMetrics(amountNum, yearNum, inflationNum, corpusNum);

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from("financial_goals")
      .insert({
        client_id: assignedClientId,
        goal_name: goal_name.trim(),
        target_year: yearNum,
        target_amount_today: amountNum,
        current_corpus_allocated: corpusNum,
        expected_inflation_rate: inflationNum > 1 ? inflationNum / 100 : inflationNum,
        required_future_value: requiredFutureValue,
        monthly_required_sip: monthlyRequiredSIP,
        priority: priority || "High",
        notes: notes ? String(notes).trim() : null,
      })
      .select()
      .single();

    if (insertErr || !inserted) {
      throw insertErr || new Error("Failed to insert financial goal.");
    }

    await logAuditEvent({
      tenantId: session.tenantId,
      clientId: assignedClientId,
      advisorId: session.sub,
      action: "CREATE",
      entityType: "GOAL",
      entityId: inserted.goal_id,
      details: inserted,
    });

    return NextResponse.json({ success: true, item: inserted });
  } catch (err: any) {
    console.error("Goal POST error:", err);
    return NextResponse.json({ error: err.message || "Failed to create financial goal." }, { status: 500 });
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
      goal_id,
      goal_name,
      target_year,
      target_amount_today,
      current_corpus_allocated,
      expected_inflation_rate,
      priority,
      notes,
    } = body;

    if (!goal_id) {
      return NextResponse.json({ error: "goal_id is required for update." }, { status: 400 });
    }

    // Fetch existing goal to recalculate FV if amounts change
    const { data: existingGoal } = await supabaseAdmin
      .from("financial_goals")
      .select("*")
      .eq("goal_id", goal_id)
      .maybeSingle();

    if (!existingGoal) {
      return NextResponse.json({ error: "Goal not found." }, { status: 404 });
    }

    const amountNum = target_amount_today !== undefined ? Number(target_amount_today) : Number(existingGoal.target_amount_today);
    const yearNum = target_year !== undefined ? Number(target_year) : Number(existingGoal.target_year);
    const inflationNum = expected_inflation_rate !== undefined ? Number(expected_inflation_rate) : Number(existingGoal.expected_inflation_rate);
    const corpusNum = current_corpus_allocated !== undefined ? Number(current_corpus_allocated) : Number(existingGoal.current_corpus_allocated);

    const { requiredFutureValue, monthlyRequiredSIP } = computeGoalMetrics(amountNum, yearNum, inflationNum, corpusNum);

    const updates: Record<string, any> = {
      target_amount_today: amountNum,
      target_year: yearNum,
      current_corpus_allocated: corpusNum,
      expected_inflation_rate: inflationNum > 1 ? inflationNum / 100 : inflationNum,
      required_future_value: requiredFutureValue,
      monthly_required_sip: monthlyRequiredSIP,
    };

    if (goal_name) updates.goal_name = goal_name.trim();
    if (priority) updates.priority = priority;
    if (notes !== undefined) updates.notes = notes ? String(notes).trim() : null;

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from("financial_goals")
      .update(updates)
      .eq("goal_id", goal_id)
      .select()
      .single();

    if (updateErr || !updated) {
      throw updateErr || new Error("Failed to update financial goal.");
    }

    await logAuditEvent({
      tenantId: session.tenantId,
      clientId,
      advisorId: session.sub,
      action: "UPDATE",
      entityType: "GOAL",
      entityId: goal_id,
      details: updates,
    });

    return NextResponse.json({ success: true, item: updated });
  } catch (err: any) {
    console.error("Goal PUT error:", err);
    return NextResponse.json({ error: err.message || "Failed to update financial goal." }, { status: 500 });
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
    const goalId = searchParams.get("goal_id");

    if (!goalId) {
      return NextResponse.json({ error: "goal_id query param is required." }, { status: 400 });
    }

    const { error: delErr } = await supabaseAdmin
      .from("financial_goals")
      .delete()
      .eq("goal_id", goalId);

    if (delErr) throw delErr;

    await logAuditEvent({
      tenantId: session.tenantId,
      clientId,
      advisorId: session.sub,
      action: "DELETE",
      entityType: "GOAL",
      entityId: goalId,
      details: { deleted: true },
    });

    return NextResponse.json({ success: true, message: "Financial goal deleted successfully." });
  } catch (err: any) {
    console.error("Goal DELETE error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete financial goal." }, { status: 500 });
  }
}

