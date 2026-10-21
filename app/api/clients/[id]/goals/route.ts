import { NextResponse, connection } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAuthHeader } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { unpackGoal, packGoalNotes } from "@/lib/goalAssetAlignment";


async function verifyClientAccess(clientId: string, session: any) {
  const { data: client } = await supabaseAdmin
    .from("clients")
    .select("client_id, tenant_id, user_id, household_id")
    .eq("client_id", clientId)
    .maybeSingle();

  if (!client) return { error: "Client not found", status: 404 };
  if (session.role !== "SUPER_ADMIN" && client.tenant_id && client.tenant_id !== session.tenantId) {
    return { error: "Access denied. Client belongs to another firm.", status: 403 };
  }
  if (session.role === "CLIENT") {
    const isOwner = client.user_id === session.sub || client.client_id === session.sub;
    if (!isOwner) {
      const { data: prof } = await supabaseAdmin
        .from("client_profiles")
        .select("household_id")
        .eq("user_id", session.sub)
        .maybeSingle();
      if (!prof || prof.household_id !== client.household_id) {
        return { error: "Access denied. You can only modify your own records.", status: 403 };
      }
    }
  }
  return { client };
}

// Future value and required SIP formula helpers with earmarked asset & investment support
function computeGoalMetrics(
  targetAmountToday: number,
  targetYear: number,
  inflationRate: number,
  currentCorpus: number,
  earmarkedProceeds: number = 0
) {
  const currentYear = new Date().getFullYear();
  const years = Math.max(1, targetYear - currentYear);
  const inflationDec = inflationRate > 1 ? inflationRate / 100 : inflationRate;

  // FV = PV * (1 + inflation)^years
  const requiredFutureValue = targetAmountToday * Math.pow(1 + inflationDec, years);

  // Growth of existing corpus at estimated 10% equity CAGR
  const corpusFutureValue = currentCorpus * Math.pow(1 + 0.10, years);
  const totalCovered = corpusFutureValue + (earmarkedProceeds || 0);
  const shortfall = Math.max(0, requiredFutureValue - totalCovered);

  // SIP formula: Monthly rate r_m = (1 + 0.11)^(1/12) - 1, N = years * 12
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
    if (!session || !["ADVISOR", "STAFF", "TENANT_ADMIN", "SUPER_ADMIN", "CLIENT"].includes(session.role)) {
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
      linked_asset_ids = [],
      linked_investment_ids = [],
      earmarked_proceeds = 0,
    } = body;

    const assignedClientId = target_client_id || clientId;
    const amountNum = Number(target_amount_today);
    const yearNum = Number(target_year);

    if (!goal_name || isNaN(amountNum) || amountNum <= 0 || isNaN(yearNum) || yearNum < new Date().getFullYear()) {
      return NextResponse.json({ error: "Valid goal name, positive target amount, and future target year are required." }, { status: 400 });
    }

    const inflationNum = Number(expected_inflation_rate || 0.06);
    const corpusNum = Number(current_corpus_allocated || 0);
    const earmarkedNum = Number(earmarked_proceeds || 0);

    const { requiredFutureValue, monthlyRequiredSIP } = computeGoalMetrics(
      amountNum,
      yearNum,
      inflationNum,
      corpusNum,
      earmarkedNum
    );

    let inserted: any = null;
    let insertErr: any = null;

    const res1 = await supabaseAdmin
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
        linked_asset_ids: Array.isArray(linked_asset_ids) ? linked_asset_ids : [],
        linked_investment_ids: Array.isArray(linked_investment_ids) ? linked_investment_ids : [],
        notes: notes ? String(notes).trim() : null,
      })
      .select()
      .single();

    if (res1.error && res1.error.code === "PGRST204") {
      const packedNotes = packGoalNotes(notes, {
        linked_asset_ids: Array.isArray(linked_asset_ids) ? linked_asset_ids : [],
        linked_investment_ids: Array.isArray(linked_investment_ids) ? linked_investment_ids : [],
      });
      const res2 = await supabaseAdmin
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
          notes: packedNotes,
        })
        .select()
        .single();
      inserted = res2.data;
      insertErr = res2.error;
    } else {
      inserted = res1.data;
      insertErr = res1.error;
    }

    if (insertErr || !inserted) {
      throw insertErr || new Error("Failed to insert financial goal.");
    }

    // Two-way sync: update linked assets and investments to have this goal_id
    if (Array.isArray(linked_asset_ids) && linked_asset_ids.length > 0) {
      try {
        await supabaseAdmin
          .from("assets")
          .update({ linked_goal_id: inserted.goal_id })
          .in("asset_id", linked_asset_ids);
      } catch (aSyncErr) {
        console.warn("Linked assets goal_id sync notice:", aSyncErr);
      }
    }

    if (Array.isArray(linked_investment_ids) && linked_investment_ids.length > 0) {
      try {
        await supabaseAdmin
          .from("investment_portfolio")
          .update({ linked_goal_id: inserted.goal_id })
          .in("investment_id", linked_investment_ids);
      } catch (iSyncErr) {
        console.warn("Linked investments goal_id sync notice:", iSyncErr);
      }
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

    return NextResponse.json({ success: true, item: unpackGoal(inserted) });
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
    if (!session || !["ADVISOR", "STAFF", "TENANT_ADMIN", "SUPER_ADMIN", "CLIENT"].includes(session.role)) {
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
      linked_asset_ids,
      linked_investment_ids,
      earmarked_proceeds,
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
    const earmarkedNum = earmarked_proceeds !== undefined ? Number(earmarked_proceeds) : 0;

    const { requiredFutureValue, monthlyRequiredSIP } = computeGoalMetrics(
      amountNum,
      yearNum,
      inflationNum,
      corpusNum,
      earmarkedNum
    );

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
    if (linked_asset_ids !== undefined) updates.linked_asset_ids = Array.isArray(linked_asset_ids) ? linked_asset_ids : [];
    if (linked_investment_ids !== undefined) updates.linked_investment_ids = Array.isArray(linked_investment_ids) ? linked_investment_ids : [];
    if (notes !== undefined) updates.notes = notes ? String(notes).trim() : null;

    let updated: any = null;
    let updateErr: any = null;

    const res1 = await supabaseAdmin
      .from("financial_goals")
      .update(updates)
      .eq("goal_id", goal_id)
      .select()
      .single();

    if (res1.error && res1.error.code === "PGRST204") {
      const cleanUpdates = { ...updates };
      delete cleanUpdates.linked_asset_ids;
      delete cleanUpdates.linked_investment_ids;

      cleanUpdates.notes = packGoalNotes(notes, {
        linked_asset_ids: Array.isArray(linked_asset_ids) ? linked_asset_ids : [],
        linked_investment_ids: Array.isArray(linked_investment_ids) ? linked_investment_ids : [],
      });

      const res2 = await supabaseAdmin
        .from("financial_goals")
        .update(cleanUpdates)
        .eq("goal_id", goal_id)
        .select()
        .single();
      updated = res2.data;
      updateErr = res2.error;
    } else {
      updated = res1.data;
      updateErr = res1.error;
    }

    if (updateErr || !updated) {
      throw updateErr || new Error("Failed to update financial goal.");
    }

    // Sync two-way links
    if (Array.isArray(linked_asset_ids)) {
      try {
        await supabaseAdmin
          .from("assets")
          .update({ linked_goal_id: goal_id })
          .in("asset_id", linked_asset_ids);
      } catch (aSyncErr) {
        console.warn("Linked assets goal_id update sync notice:", aSyncErr);
      }
    }

    if (Array.isArray(linked_investment_ids)) {
      try {
        await supabaseAdmin
          .from("investment_portfolio")
          .update({ linked_goal_id: goal_id })
          .in("investment_id", linked_investment_ids);
      } catch (iSyncErr) {
        console.warn("Linked investments goal_id update sync notice:", iSyncErr);
      }
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

    return NextResponse.json({ success: true, item: unpackGoal(updated) });
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
    if (!session || !["ADVISOR", "STAFF", "TENANT_ADMIN", "SUPER_ADMIN", "CLIENT"].includes(session.role)) {
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

