import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface AuditLogEntry {
  tenantId?: string;
  clientId: string;
  advisorId?: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  entityType: "CLIENT" | "HOUSEHOLD" | "INCOME" | "EXPENSE" | "ASSET" | "LIABILITY" | "GOAL" | "INVESTMENT" | "SUGGESTION";
  entityId?: string;
  details: Record<string, unknown>;
}

export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  const timestamp = new Date().toISOString();
  console.log(
    `[AUDIT LOG] [${timestamp}] Action: ${entry.action} | Entity: ${entry.entityType} (${entry.entityId || "N/A"}) | Client: ${entry.clientId} | Tenant: ${entry.tenantId || "N/A"}`
  );

  try {
    const { error } = await supabaseAdmin.from("audit_log").insert({
      tenant_id: entry.tenantId || null,
      client_id: entry.clientId,
      advisor_id: entry.advisorId || null,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId || null,
      details: entry.details,
      created_at: timestamp,
    });

    if (error) {
      // Graceful fallback if audit_log table does not exist or has RLS restrictions
      console.warn("Audit log notice (schema cache):", error.message);
    }
  } catch (err) {
    console.warn("Audit logging encountered an error:", err);
  }
}

