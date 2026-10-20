import { NextResponse, connection } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAuthHeader } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";


async function verifyClientAccess(clientId: string, session: any) {
  const { data: client } = await supabaseAdmin
    .from("clients")
    .select("client_id, tenant_id, user_id, full_name, household_id")
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
      asset_class,
      scheme_instrument_name,
      owner_name,
      invested_amount,
      current_value,
      monthly_sip_amount,
      expected_return_cagr,
      goal_purpose,
      notes,
      target_client_id,
    } = body;

    const assignedClientId = target_client_id || clientId;
    const currentValNum = Number(current_value);
    const investedNum = Number(invested_amount || 0);

    if (!scheme_instrument_name || isNaN(currentValNum) || currentValNum < 0) {
      return NextResponse.json({ error: "Valid instrument name and non-negative current value are required." }, { status: 400 });
    }

    const cagrRaw = Number(expected_return_cagr || 0.12);
    const cagrFormatted = cagrRaw > 1 ? cagrRaw / 100 : cagrRaw;

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from("investment_portfolio")
      .insert({
        client_id: assignedClientId,
        asset_class: asset_class || "Equity Mutual Fund",
        scheme_instrument_name: scheme_instrument_name.trim(),
        owner_name: owner_name ? owner_name.trim() : client?.full_name || "Self",
        invested_amount: investedNum,
        current_value: currentValNum,
        monthly_sip_amount: Number(monthly_sip_amount || 0),
        expected_return_cagr: cagrFormatted,
        goal_purpose: goal_purpose ? String(goal_purpose).trim() : null,
        notes: notes ? String(notes).trim() : null,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertErr || !inserted) {
      throw insertErr || new Error("Failed to insert investment record.");
    }

    await logAuditEvent({
      tenantId: session.tenantId,
      clientId: assignedClientId,
      advisorId: session.sub,
      action: "CREATE",
      entityType: "INVESTMENT",
      entityId: inserted.investment_id,
      details: inserted,
    });

    return NextResponse.json({ success: true, item: inserted });
  } catch (err: any) {
    console.error("Investment POST error:", err);
    return NextResponse.json({ error: err.message || "Failed to create investment record." }, { status: 500 });
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
      investment_id,
      asset_class,
      scheme_instrument_name,
      owner_name,
      invested_amount,
      current_value,
      monthly_sip_amount,
      expected_return_cagr,
      goal_purpose,
      notes,
    } = body;

    if (!investment_id) {
      return NextResponse.json({ error: "investment_id is required for update." }, { status: 400 });
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (asset_class) updates.asset_class = asset_class.trim();
    if (scheme_instrument_name) updates.scheme_instrument_name = scheme_instrument_name.trim();
    if (owner_name !== undefined) updates.owner_name = owner_name ? owner_name.trim() : null;
    if (invested_amount !== undefined) updates.invested_amount = Number(invested_amount || 0);
    if (current_value !== undefined) {
      const num = Number(current_value);
      if (isNaN(num) || num < 0) return NextResponse.json({ error: "Current value must be non-negative." }, { status: 400 });
      updates.current_value = num;
    }
    if (monthly_sip_amount !== undefined) updates.monthly_sip_amount = Number(monthly_sip_amount || 0);
    if (expected_return_cagr !== undefined) {
      const cagrRaw = Number(expected_return_cagr);
      updates.expected_return_cagr = cagrRaw > 1 ? cagrRaw / 100 : cagrRaw;
    }
    if (goal_purpose !== undefined) updates.goal_purpose = goal_purpose ? String(goal_purpose).trim() : null;
    if (notes !== undefined) updates.notes = notes ? String(notes).trim() : null;

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from("investment_portfolio")
      .update(updates)
      .eq("investment_id", investment_id)
      .select()
      .single();

    if (updateErr || !updated) {
      throw updateErr || new Error("Failed to update investment record.");
    }

    await logAuditEvent({
      tenantId: session.tenantId,
      clientId,
      advisorId: session.sub,
      action: "UPDATE",
      entityType: "INVESTMENT",
      entityId: investment_id,
      details: updates,
    });

    return NextResponse.json({ success: true, item: updated });
  } catch (err: any) {
    console.error("Investment PUT error:", err);
    return NextResponse.json({ error: err.message || "Failed to update investment record." }, { status: 500 });
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
    const investmentId = searchParams.get("investment_id");

    if (!investmentId) {
      return NextResponse.json({ error: "investment_id query param is required." }, { status: 400 });
    }

    const { error: delErr } = await supabaseAdmin
      .from("investment_portfolio")
      .delete()
      .eq("investment_id", investmentId);

    if (delErr) throw delErr;

    await logAuditEvent({
      tenantId: session.tenantId,
      clientId,
      advisorId: session.sub,
      action: "DELETE",
      entityType: "INVESTMENT",
      entityId: investmentId,
      details: { deleted: true },
    });

    return NextResponse.json({ success: true, message: "Investment holding deleted successfully." });
  } catch (err: any) {
    console.error("Investment DELETE error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete investment holding." }, { status: 500 });
  }
}

