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
    .select("client_id, tenant_id, user_id, household_id, full_name")
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
    const { action } = body;

    // Action 1: Create New Household & Assign
    if (action === "CREATE_HOUSEHOLD") {
      const { household_name } = body;
      if (!household_name || !household_name.trim()) {
        return NextResponse.json({ error: "Household name is required." }, { status: 400 });
      }

      const { data: newHh, error: hhErr } = await supabaseAdmin
        .from("households")
        .insert({
          household_name: household_name.trim(),
        })
        .select()
        .single();

      if (hhErr || !newHh) throw hhErr || new Error("Failed to create household.");

      // Link client to this household
      await supabaseAdmin
        .from("clients")
        .update({
          household_id: newHh.household_id,
          updated_at: new Date().toISOString(),
        })
        .eq("client_id", clientId);

      await logAuditEvent({
        tenantId: session.tenantId,
        clientId,
        advisorId: session.sub,
        action: "CREATE",
        entityType: "HOUSEHOLD",
        entityId: newHh.household_id,
        details: { newHousehold: newHh },
      });

      return NextResponse.json({
        success: true,
        message: `Created and linked to household "${newHh.household_name}".`,
        household: newHh,
      });
    }

    // Action 2: Rename Household
    if (action === "RENAME_HOUSEHOLD") {
      const { household_id, household_name } = body;
      const targetHhId = household_id || client?.household_id;
      if (!targetHhId || !household_name?.trim()) {
        return NextResponse.json({ error: "Household ID and new name are required." }, { status: 400 });
      }

      const { data: updatedHh, error: hhErr } = await supabaseAdmin
        .from("households")
        .update({
          household_name: household_name.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("household_id", targetHhId)
        .select()
        .single();

      if (hhErr || !updatedHh) throw hhErr || new Error("Failed to rename household.");

      await logAuditEvent({
        tenantId: session.tenantId,
        clientId,
        advisorId: session.sub,
        action: "UPDATE",
        entityType: "HOUSEHOLD",
        entityId: targetHhId,
        details: { updatedName: household_name },
      });

      return NextResponse.json({
        success: true,
        message: "Household name updated successfully.",
        household: updatedHh,
      });
    }

    // Action 3: Add Family Member to Household
    if (action === "ADD_FAMILY_MEMBER") {
      const {
        full_name,
        relationship,
        date_of_birth,
        marital_status,
        occupation,
        annual_gross_income,
        risk_profile,
      } = body;

      if (!full_name || !full_name.trim() || !date_of_birth) {
        return NextResponse.json({ error: "Full name and date of birth are required for new family member." }, { status: 400 });
      }

      // Ensure client has household_id, or create one automatically
      let targetHouseholdId = client?.household_id;
      if (!targetHouseholdId) {
        const { data: autoHh } = await supabaseAdmin
          .from("households")
          .insert({
            household_name: `${client?.full_name} Family Household`,
          })
          .select("household_id")
          .single();

        if (autoHh) {
          targetHouseholdId = autoHh.household_id;
          await supabaseAdmin.from("clients").update({ household_id: targetHouseholdId }).eq("client_id", clientId);
        }
      }

      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const memberCode = `UWP-FAM-${randomSuffix}`;

      const { data: newMember, error: memErr } = await supabaseAdmin
        .from("clients")
        .insert({
          tenant_id: client?.tenant_id || session.tenantId,
          household_id: targetHouseholdId,
          uwp_client_code: memberCode,
          full_name: full_name.trim(),
          date_of_birth,
          marital_status: marital_status || "Single",
          occupation: occupation ? occupation.trim() : null,
          annual_gross_income: Number(annual_gross_income || 0),
          risk_profile: risk_profile || "Moderate",
          planning_horizon_years: 5.0,
          planning_disclosures_notes: `Relationship to primary client (${client?.full_name}): ${relationship || "Family Member"}`,
          advisor_name: `${session.firstName} ${session.lastName}`,
        })
        .select()
        .single();

      if (memErr || !newMember) throw memErr || new Error("Failed to add family member to household.");

      await logAuditEvent({
        tenantId: session.tenantId,
        clientId,
        advisorId: session.sub,
        action: "CREATE",
        entityType: "CLIENT",
        entityId: newMember.client_id,
        details: { member: newMember, relationship },
      });

      return NextResponse.json({
        success: true,
        message: `Family member ${newMember.full_name} (${relationship || "Member"}) added to household.`,
        member: newMember,
      });
    }

    return NextResponse.json({ error: "Invalid action specified." }, { status: 400 });
  } catch (err: any) {
    console.error("Household API error:", err);
    return NextResponse.json({ error: err.message || "Failed to process household operation." }, { status: 500 });
  }
}

