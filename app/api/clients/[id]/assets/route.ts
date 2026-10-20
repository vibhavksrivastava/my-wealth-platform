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
    const { asset_category, description, owner_name, current_market_value, is_liquid, notes, target_client_id } = body;

    const assignedClientId = target_client_id || clientId;
    const valueNum = Number(current_market_value);

    if (!asset_category || isNaN(valueNum) || valueNum < 0) {
      return NextResponse.json({ error: "Valid asset category and non-negative market value are required." }, { status: 400 });
    }

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from("assets")
      .insert({
        client_id: assignedClientId,
        asset_category: asset_category.trim(),
        description: description ? description.trim() : asset_category.trim(),
        owner_name: owner_name ? owner_name.trim() : client?.full_name || "Self",
        current_market_value: valueNum,
        is_liquid: Boolean(is_liquid),
        notes: notes ? String(notes).trim() : null,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertErr || !inserted) {
      throw insertErr || new Error("Failed to insert asset record.");
    }

    await logAuditEvent({
      tenantId: session.tenantId,
      clientId: assignedClientId,
      advisorId: session.sub,
      action: "CREATE",
      entityType: "ASSET",
      entityId: inserted.asset_id,
      details: inserted,
    });

    return NextResponse.json({ success: true, item: inserted });
  } catch (err: any) {
    console.error("Asset POST error:", err);
    return NextResponse.json({ error: err.message || "Failed to create asset record." }, { status: 500 });
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
    const { asset_id, asset_category, description, owner_name, current_market_value, is_liquid, notes } = body;

    if (!asset_id) {
      return NextResponse.json({ error: "asset_id is required for update." }, { status: 400 });
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (asset_category) updates.asset_category = asset_category.trim();
    if (description !== undefined) updates.description = description ? description.trim() : null;
    if (owner_name !== undefined) updates.owner_name = owner_name ? owner_name.trim() : null;
    if (current_market_value !== undefined) {
      const num = Number(current_market_value);
      if (isNaN(num) || num < 0) {
        return NextResponse.json({ error: "Market value must be a non-negative number." }, { status: 400 });
      }
      updates.current_market_value = num;
    }
    if (is_liquid !== undefined) updates.is_liquid = Boolean(is_liquid);
    if (notes !== undefined) updates.notes = notes ? String(notes).trim() : null;

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from("assets")
      .update(updates)
      .eq("asset_id", asset_id)
      .select()
      .single();

    if (updateErr || !updated) {
      throw updateErr || new Error("Failed to update asset record.");
    }

    await logAuditEvent({
      tenantId: session.tenantId,
      clientId,
      advisorId: session.sub,
      action: "UPDATE",
      entityType: "ASSET",
      entityId: asset_id,
      details: updates,
    });

    return NextResponse.json({ success: true, item: updated });
  } catch (err: any) {
    console.error("Asset PUT error:", err);
    return NextResponse.json({ error: err.message || "Failed to update asset record." }, { status: 500 });
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
    const assetId = searchParams.get("asset_id");

    if (!assetId) {
      return NextResponse.json({ error: "asset_id query param is required." }, { status: 400 });
    }

    const { error: delErr } = await supabaseAdmin
      .from("assets")
      .delete()
      .eq("asset_id", assetId);

    if (delErr) throw delErr;

    await logAuditEvent({
      tenantId: session.tenantId,
      clientId,
      advisorId: session.sub,
      action: "DELETE",
      entityType: "ASSET",
      entityId: assetId,
      details: { deleted: true },
    });

    return NextResponse.json({ success: true, message: "Asset deleted successfully." });
  } catch (err: any) {
    console.error("Asset DELETE error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete asset record." }, { status: 500 });
  }
}

