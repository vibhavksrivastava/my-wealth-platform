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

    // Check if id is a UUID (database record) or a derived cas-sip- id
    if (!id.startsWith("cas-sip-")) {
      let q = supabaseAdmin.from("sips").update(updatePayload).eq("id", id);
      if (session.role !== "SUPER_ADMIN" && session.tenantId) {
        q = q.eq("tenant_id", session.tenantId);
      }
      const { data, error } = await q.select().maybeSingle();
      if (!error && data) {
        updatedRecord = data;
      }
    } else {
      // It's a derived CAS holding SIP from investment_portfolio
      const invId = id.replace("cas-sip-", "");
      const newMonthlyAmount = status === "PAUSED" || status === "CANCELLED" ? 0 : (Number(installmentAmount) || 0);

      await supabaseAdmin
        .from("investment_portfolio")
        .update({
          monthly_sip_amount: newMonthlyAmount,
          updated_at: new Date().toISOString(),
        })
        .eq("investment_id", invId);

      updatedRecord = {
        id,
        status: status || "ACTIVE",
        installmentAmount: Number(installmentAmount) || 10000,
        frequency: frequency || "MONTHLY",
        installmentDay: Number(installmentDay) || 10,
        updatedAt: new Date().toISOString(),
      };
    }

    return NextResponse.json({
      success: true,
      message: `SIP ${id} updated successfully.`,
      sip: updatedRecord,
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
    if (!session || !["ADVISOR", "STAFF", "TENANT_ADMIN", "SUPER_ADMIN"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const { id } = await params;

    if (!id.startsWith("cas-sip-")) {
      let q = supabaseAdmin.from("sips").delete().eq("id", id);
      if (session.role !== "SUPER_ADMIN" && session.tenantId) {
        q = q.eq("tenant_id", session.tenantId);
      }
      await q;
    } else {
      const invId = id.replace("cas-sip-", "");
      await supabaseAdmin
        .from("investment_portfolio")
        .update({ monthly_sip_amount: 0 })
        .eq("investment_id", invId);
    }

    return NextResponse.json({
      success: true,
      message: "SIP cancelled and removed successfully.",
    });
  } catch (err: any) {
    console.error("DELETE /api/portfolio/sips/[id] error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to delete Systematic Investment Plan." },
      { status: 500 }
    );
  }
}

