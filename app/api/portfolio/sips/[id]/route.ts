import { NextResponse, connection } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAuthHeader } from "@/lib/auth";

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

    const { id } = await params;
    const body = await req.json();
    const {
      installmentAmount,
      frequency,
      installmentDay,
      status,
      mandateId,
      endDate,
      installmentsPaid,
    } = body;

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    // Strip prefixes: sip-, cas-sip-
    const cleanId = id.replace(/^(cas-sip-|sip-)/i, "");
    const isCleanUuid = UUID_REGEX.test(cleanId);
    const isDirectUuid = UUID_REGEX.test(id);

    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    };

    if (installmentAmount !== undefined && Number(installmentAmount) > 0) {
      updatePayload.installment_amount = Number(installmentAmount);
    }
    if (frequency !== undefined) updatePayload.frequency = frequency;
    if (installmentDay !== undefined) updatePayload.installment_day = Number(installmentDay);
    if (status !== undefined) updatePayload.status = status;
    if (mandateId !== undefined) updatePayload.mandate_id = mandateId;
    if (endDate !== undefined) updatePayload.end_date = endDate;
    if (installmentsPaid !== undefined) updatePayload.installments_paid = Number(installmentsPaid);

    let updatedRecord: any = null;

    // 1. Attempt update in public.sips table if UUID
    const targetSipId = isCleanUuid ? cleanId : (isDirectUuid ? id : null);
    if (targetSipId) {
      try {
        let q = supabaseAdmin.from("sips").update(updatePayload).eq("id", targetSipId);
        if (session.role !== "SUPER_ADMIN" && session.tenantId) {
          q = q.eq("tenant_id", session.tenantId);
        }
        const { data, error } = await q.select().maybeSingle();
        if (!error && data) {
          updatedRecord = data;
        }
      } catch (err) {
        console.warn("sips table update notice:", err);
      }
    }

    // 2. Synchronize or fallback to investment_portfolio
    let invRecord: any = null;
    if (isCleanUuid) {
      const { data: inv } = await supabaseAdmin
        .from("investment_portfolio")
        .select("*")
        .eq("investment_id", cleanId)
        .maybeSingle();
      if (inv) invRecord = inv;
    }

    if (!invRecord) {
      // Search by scheme or notes match if id was generated with a prefix
      const { data: invs } = await supabaseAdmin
        .from("investment_portfolio")
        .select("*")
        .limit(100);
      const match = (invs || []).find(
        (i) => i.investment_id.startsWith(cleanId.slice(0, 8)) || i.notes?.includes(cleanId)
      );
      if (match) invRecord = match;
    }

    if (invRecord) {
      const currentNotes = invRecord.notes || "";
      const baseNotes = currentNotes.split("__SIP_META__:")[0].trim();
      let prevMeta: any = {};
      if (currentNotes.includes("__SIP_META__:")) {
        try {
          prevMeta = JSON.parse(currentNotes.split("__SIP_META__:")[1].trim());
        } catch {}
      }

      const effectiveStatus = status || prevMeta.status || "ACTIVE";
      const resolvedAmount =
        installmentAmount !== undefined
          ? Number(installmentAmount)
          : (prevMeta.monthlyAmount || Number(invRecord.monthly_sip_amount) || 5000);
      const resolvedDay =
        installmentDay !== undefined ? Number(installmentDay) : (prevMeta.installmentDay || 10);
      const resolvedFreq = frequency || prevMeta.frequency || "MONTHLY";
      const resolvedMandate = mandateId || prevMeta.mandateId || "Registered Bank Mandate (NACH)";

      const sipMeta = {
        status: effectiveStatus,
        monthlyAmount: resolvedAmount,
        installmentDay: resolvedDay,
        frequency: resolvedFreq,
        mandateId: resolvedMandate,
        updatedAt: new Date().toISOString(),
      };

      const packedNotes = baseNotes
        ? `${baseNotes}\n__SIP_META__:${JSON.stringify(sipMeta)}`
        : `__SIP_META__:${JSON.stringify(sipMeta)}`;

      // Active: monthly_sip_amount = resolvedAmount
      // Paused / Cancelled: monthly_sip_amount = 0 (so active portfolio calculations exclude it, while metadata preserves the SIP)
      const newMonthlyAmount = effectiveStatus === "ACTIVE" ? resolvedAmount : 0;

      await supabaseAdmin
        .from("investment_portfolio")
        .update({
          monthly_sip_amount: newMonthlyAmount,
          notes: packedNotes,
          updated_at: new Date().toISOString(),
        })
        .eq("investment_id", invRecord.investment_id);

      if (!updatedRecord) {
        updatedRecord = {
          id: `sip-${invRecord.investment_id}`,
          status: effectiveStatus,
          installmentAmount: resolvedAmount,
          frequency: resolvedFreq,
          installmentDay: resolvedDay,
          mandateId: resolvedMandate,
          schemeName: invRecord.scheme_instrument_name,
          updatedAt: new Date().toISOString(),
        };
      }
    }

    return NextResponse.json({
      success: true,
      message: `SIP ${id} updated successfully.`,
      sip: updatedRecord || { id, status: status || "ACTIVE", ...body },
    });
  } catch (err: any) {
    console.error("PUT /api/portfolio/sips/[id] error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update Systematic Investment Plan." },
      { status: 500 }
    );
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

    const { id } = await params;
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const cleanId = id.replace(/^(cas-sip-|sip-)/i, "");
    const isCleanUuid = UUID_REGEX.test(cleanId);
    const isDirectUuid = UUID_REGEX.test(id);

    // 1. Attempt delete from public.sips table if UUID
    const targetSipId = isCleanUuid ? cleanId : (isDirectUuid ? id : null);
    if (targetSipId) {
      try {
        let q = supabaseAdmin.from("sips").delete().eq("id", targetSipId);
        if (session.role !== "SUPER_ADMIN" && session.tenantId) {
          q = q.eq("tenant_id", session.tenantId);
        }
        await q;
      } catch (err) {
        console.warn("sips table delete notice:", err);
      }
    }

    // 2. Clear SIP from investment_portfolio
    let invRecord: any = null;
    if (isCleanUuid) {
      const { data: inv } = await supabaseAdmin
        .from("investment_portfolio")
        .select("*")
        .eq("investment_id", cleanId)
        .maybeSingle();
      if (inv) invRecord = inv;
    }

    if (!invRecord) {
      const { data: invs } = await supabaseAdmin
        .from("investment_portfolio")
        .select("*")
        .limit(100);
      const match = (invs || []).find(
        (i) => i.investment_id.startsWith(cleanId.slice(0, 8)) || i.notes?.includes(cleanId)
      );
      if (match) invRecord = match;
    }

    if (invRecord) {
      const currentNotes = invRecord.notes || "";
      const baseNotes = currentNotes.split("__SIP_META__:")[0].trim();

      // Check if holding is purely a manual SIP holding with 0 units and 0 current value
      const isPureSipPlaceholder =
        Number(invRecord.invested_amount || 0) === 0 && Number(invRecord.current_value || 0) === 0;

      if (isPureSipPlaceholder) {
        await supabaseAdmin
          .from("investment_portfolio")
          .delete()
          .eq("investment_id", invRecord.investment_id);
      } else {
        await supabaseAdmin
          .from("investment_portfolio")
          .update({
            monthly_sip_amount: 0,
            notes: baseNotes || null,
            updated_at: new Date().toISOString(),
          })
          .eq("investment_id", invRecord.investment_id);
      }
    }

    return NextResponse.json({
      success: true,
      message: "SIP mandate deleted and removed successfully.",
    });
  } catch (err: any) {
    console.error("DELETE /api/portfolio/sips/[id] error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to delete Systematic Investment Plan." },
      { status: 500 }
    );
  }
}
