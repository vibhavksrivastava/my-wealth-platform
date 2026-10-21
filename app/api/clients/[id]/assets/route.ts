import { NextResponse, connection } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAuthHeader } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { unpackAsset, packAssetNotes, getDefaultAssetCagr } from "@/lib/goalAssetAlignment";


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
      asset_category,
      description,
      owner_name,
      current_market_value,
      is_liquid,
      notes,
      target_client_id,
      target_liquidation_date,
      expected_cagr,
      expected_liquidation_value,
      linked_goal_id,
    } = body;

    const assignedClientId = target_client_id || clientId;
    const valueNum = Number(current_market_value);

    if (!asset_category || isNaN(valueNum) || valueNum < 0) {
      return NextResponse.json({ error: "Valid asset category and non-negative market value are required." }, { status: 400 });
    }

    const cagrNum = expected_cagr !== undefined && expected_cagr !== null && expected_cagr !== ""
      ? Number(expected_cagr)
      : getDefaultAssetCagr(asset_category);

    let liquidationValNum = Number(expected_liquidation_value || 0);
    if ((!liquidationValNum || liquidationValNum <= 0) && target_liquidation_date) {
      const currentYear = new Date().getFullYear();
      const liqYear = new Date(target_liquidation_date).getFullYear() || (currentYear + 5);
      const years = Math.max(0, liqYear - currentYear);
      liquidationValNum = Math.round(valueNum * Math.pow(1 + cagrNum / 100, years));
    } else if (!liquidationValNum) {
      liquidationValNum = valueNum;
    }

    let inserted: any = null;
    let insertErr: any = null;

    // First attempt: try with native liquidation columns
    const nativePayload: any = {
      client_id: assignedClientId,
      asset_category: asset_category.trim(),
      description: description ? description.trim() : asset_category.trim(),
      owner_name: owner_name ? owner_name.trim() : client?.full_name || "Self",
      current_market_value: valueNum,
      is_liquid: Boolean(is_liquid),
      notes: notes ? String(notes).trim() : null,
      target_liquidation_date: target_liquidation_date ? String(target_liquidation_date).trim() : null,
      expected_cagr: cagrNum,
      expected_liquidation_value: liquidationValNum,
      linked_goal_id: linked_goal_id && linked_goal_id !== "none" ? linked_goal_id : null,
      updated_at: new Date().toISOString(),
    };

    const res1 = await supabaseAdmin.from("assets").insert(nativePayload).select().single();
    if (res1.error && res1.error.code === "PGRST204") {
      // Column does not exist yet in schema cache -> fallback to pack in notes
      const packedNotes = packAssetNotes(notes, {
        target_liquidation_date,
        expected_cagr: cagrNum,
        expected_liquidation_value: liquidationValNum,
        linked_goal_id: linked_goal_id && linked_goal_id !== "none" ? linked_goal_id : null,
      });

      const fallbackPayload = {
        client_id: assignedClientId,
        asset_category: asset_category.trim(),
        description: description ? description.trim() : asset_category.trim(),
        owner_name: owner_name ? owner_name.trim() : client?.full_name || "Self",
        current_market_value: valueNum,
        is_liquid: Boolean(is_liquid),
        notes: packedNotes,
        updated_at: new Date().toISOString(),
      };
      const res2 = await supabaseAdmin.from("assets").insert(fallbackPayload).select().single();
      inserted = res2.data;
      insertErr = res2.error;
    } else {
      inserted = res1.data;
      insertErr = res1.error;
    }

    if (insertErr || !inserted) {
      throw insertErr || new Error("Failed to insert asset record.");
    }

    // Sync linked goal if specified
    if (linked_goal_id && linked_goal_id !== "none") {
      try {
        const { data: targetGoal } = await supabaseAdmin
          .from("financial_goals")
          .select("goal_id, notes, linked_asset_ids")
          .eq("goal_id", linked_goal_id)
          .maybeSingle();

        if (targetGoal) {
          const currentAssetIds = Array.isArray(targetGoal.linked_asset_ids) ? targetGoal.linked_asset_ids : [];
          if (!currentAssetIds.includes(inserted.asset_id)) {
            const updatedIds = [...currentAssetIds, inserted.asset_id];
            const gRes = await supabaseAdmin
              .from("financial_goals")
              .update({ linked_asset_ids: updatedIds })
              .eq("goal_id", linked_goal_id);

            if (gRes.error && gRes.error.code === "PGRST204") {
              const { packGoalNotes, unpackGoal } = await import("@/lib/goalAssetAlignment");
              const unpacked = unpackGoal(targetGoal);
              const newIds = Array.from(new Set([...unpacked.linked_asset_ids || [], inserted.asset_id]));
              const packedGNotes = packGoalNotes(unpacked.clean_notes, {
                linked_asset_ids: newIds,
                linked_investment_ids: unpacked.linked_investment_ids,
              });
              await supabaseAdmin.from("financial_goals").update({ notes: packedGNotes }).eq("goal_id", linked_goal_id);
            }
          }
        }
      } catch (syncErr) {
        console.warn("Asset linked_goal_id sync notice:", syncErr);
      }
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

    return NextResponse.json({ success: true, item: unpackAsset(inserted) });
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
    const {
      asset_id,
      asset_category,
      description,
      owner_name,
      current_market_value,
      is_liquid,
      notes,
      target_liquidation_date,
      expected_cagr,
      expected_liquidation_value,
      linked_goal_id,
    } = body;

    if (!asset_id) {
      return NextResponse.json({ error: "asset_id is required for update." }, { status: 400 });
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (asset_category) updates.asset_category = asset_category.trim();
    if (description !== undefined) updates.description = description ? description.trim() : null;
    if (owner_name !== undefined) updates.owner_name = owner_name ? owner_name.trim() : null;
    let numVal: number | undefined;
    if (current_market_value !== undefined) {
      numVal = Number(current_market_value);
      if (isNaN(numVal) || numVal < 0) {
        return NextResponse.json({ error: "Market value must be a non-negative number." }, { status: 400 });
      }
      updates.current_market_value = numVal;
    }
    if (is_liquid !== undefined) updates.is_liquid = Boolean(is_liquid);

    const cagrNum = expected_cagr !== undefined && expected_cagr !== null && expected_cagr !== ""
      ? Number(expected_cagr)
      : undefined;

    let liqValNum: number | undefined;
    if (expected_liquidation_value !== undefined && expected_liquidation_value !== null && expected_liquidation_value !== "") {
      liqValNum = Number(expected_liquidation_value);
    } else if (target_liquidation_date && numVal !== undefined && cagrNum !== undefined) {
      const currentYear = new Date().getFullYear();
      const liqYear = new Date(target_liquidation_date).getFullYear() || (currentYear + 5);
      const years = Math.max(0, liqYear - currentYear);
      liqValNum = Math.round(numVal * Math.pow(1 + cagrNum / 100, years));
    }

    if (target_liquidation_date !== undefined) updates.target_liquidation_date = target_liquidation_date || null;
    if (cagrNum !== undefined) updates.expected_cagr = cagrNum;
    if (liqValNum !== undefined) updates.expected_liquidation_value = liqValNum;
    if (linked_goal_id !== undefined) updates.linked_goal_id = linked_goal_id && linked_goal_id !== "none" ? linked_goal_id : null;
    if (notes !== undefined) updates.notes = notes ? String(notes).trim() : null;

    let updated: any = null;
    let updateErr: any = null;

    const res1 = await supabaseAdmin
      .from("assets")
      .update(updates)
      .eq("asset_id", asset_id)
      .select()
      .single();

    if (res1.error && res1.error.code === "PGRST204") {
      // Fallback: remove native liquidation columns from updates and pack into notes
      const cleanUpdates: Record<string, any> = { ...updates };
      delete cleanUpdates.target_liquidation_date;
      delete cleanUpdates.expected_cagr;
      delete cleanUpdates.expected_liquidation_value;
      delete cleanUpdates.linked_goal_id;

      cleanUpdates.notes = packAssetNotes(notes, {
        target_liquidation_date,
        expected_cagr: cagrNum,
        expected_liquidation_value: liqValNum,
        linked_goal_id: linked_goal_id && linked_goal_id !== "none" ? linked_goal_id : null,
      });

      const res2 = await supabaseAdmin
        .from("assets")
        .update(cleanUpdates)
        .eq("asset_id", asset_id)
        .select()
        .single();
      updated = res2.data;
      updateErr = res2.error;
    } else {
      updated = res1.data;
      updateErr = res1.error;
    }

    if (updateErr || !updated) {
      throw updateErr || new Error("Failed to update asset record.");
    }

    // Sync goal mapping if changed
    if (linked_goal_id && linked_goal_id !== "none") {
      try {
        const { data: targetGoal } = await supabaseAdmin
          .from("financial_goals")
          .select("goal_id, notes, linked_asset_ids")
          .eq("goal_id", linked_goal_id)
          .maybeSingle();

        if (targetGoal) {
          const currentAssetIds = Array.isArray(targetGoal.linked_asset_ids) ? targetGoal.linked_asset_ids : [];
          if (!currentAssetIds.includes(asset_id)) {
            const updatedIds = [...currentAssetIds, asset_id];
            const gRes = await supabaseAdmin
              .from("financial_goals")
              .update({ linked_asset_ids: updatedIds })
              .eq("goal_id", linked_goal_id);

            if (gRes.error && gRes.error.code === "PGRST204") {
              const { packGoalNotes, unpackGoal } = await import("@/lib/goalAssetAlignment");
              const unpacked = unpackGoal(targetGoal);
              const newIds = Array.from(new Set([...unpacked.linked_asset_ids || [], asset_id]));
              const packedGNotes = packGoalNotes(unpacked.clean_notes, {
                linked_asset_ids: newIds,
                linked_investment_ids: unpacked.linked_investment_ids,
              });
              await supabaseAdmin.from("financial_goals").update({ notes: packedGNotes }).eq("goal_id", linked_goal_id);
            }
          }
        }
      } catch (syncErr) {
        console.warn("Asset update goal sync notice:", syncErr);
      }
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

    return NextResponse.json({ success: true, item: unpackAsset(updated) });
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

