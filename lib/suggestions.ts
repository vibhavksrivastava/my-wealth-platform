import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type SuggestionStatus = "DRAFT" | "SUBMITTED_TO_CLIENT" | "ACKNOWLEDGED" | "IN_PROGRESS";

export interface ClientSuggestion {
  id: string;
  tenant_id?: string | null;
  client_id: string;
  advisor_id?: string | null;
  suggestion_date: string;
  system_findings: any;
  advisor_notes?: string | null;
  recommended_investments: any[];
  status: SuggestionStatus;
  client_action_notes?: string | null;
  updated_at: string;
}

/**
 * Fetch all suggestions for a given client, sorted reverse chronologically.
 * Supports primary client_suggestions table with seamless fallback to planning_recommendations.
 */
export async function getSuggestionsForClient(clientId: string): Promise<ClientSuggestion[]> {
  try {
    // 1. Try primary client_suggestions table
    const { data: primaryData, error: primaryErr } = await supabaseAdmin
      .from("client_suggestions")
      .select("*")
      .eq("client_id", clientId)
      .order("suggestion_date", { ascending: false });

    if (!primaryErr && primaryData) {
      return primaryData.map((row) => ({
        id: row.id,
        tenant_id: row.tenant_id,
        client_id: row.client_id,
        advisor_id: row.advisor_id,
        suggestion_date: row.suggestion_date,
        system_findings: typeof row.system_findings === "string" ? JSON.parse(row.system_findings) : row.system_findings,
        advisor_notes: row.advisor_notes,
        recommended_investments:
          typeof row.recommended_investments === "string" ? JSON.parse(row.recommended_investments) : row.recommended_investments || [],
        status: row.status as SuggestionStatus,
        client_action_notes: row.client_action_notes,
        updated_at: row.updated_at,
      }));
    }
  } catch (err) {
    console.warn("Primary client_suggestions lookup notice, checking fallback adapter:", err);
  }

  // 2. Fallback adapter using planning_recommendations
  try {
    const { data: fallbackData, error: fallbackErr } = await supabaseAdmin
      .from("planning_recommendations")
      .select("*")
      .eq("client_id", clientId)
      .eq("action_category", "SUGGESTION_PLAN")
      .order("created_at", { ascending: false });

    if (fallbackErr || !fallbackData) {
      return [];
    }

    const suggestions: ClientSuggestion[] = [];
    for (const row of fallbackData) {
      try {
        const parsed = JSON.parse(row.action_text || "{}");
        suggestions.push({
          id: row.recommendation_id, // Map database PK
          tenant_id: parsed.tenant_id || null,
          client_id: row.client_id,
          advisor_id: parsed.advisor_id || null,
          suggestion_date: parsed.suggestion_date || row.created_at,
          system_findings: parsed.system_findings || {},
          advisor_notes: parsed.advisor_notes || null,
          recommended_investments: parsed.recommended_investments || [],
          status: (parsed.status as SuggestionStatus) || "DRAFT",
          client_action_notes: parsed.client_action_notes || null,
          updated_at: parsed.updated_at || row.created_at,
        });
      } catch (e) {
        console.error("Failed to parse fallback suggestion JSON:", e);
      }
    }

    return suggestions;
  } catch (fallbackError) {
    console.error("Error in getSuggestionsForClient fallback:", fallbackError);
    return [];
  }
}

/**
 * Create a new suggestion record
 */
export async function createClientSuggestion(params: {
  tenantId?: string | null;
  clientId: string;
  advisorId?: string | null;
  systemFindings: any;
  advisorNotes?: string | null;
  recommendedInvestments: any[];
  status?: SuggestionStatus;
  clientActionNotes?: string | null;
}): Promise<ClientSuggestion> {
  const suggestionDate = new Date().toISOString();
  const status = params.status || "DRAFT";

  // 1. Try primary client_suggestions table
  try {
    const { data, error } = await supabaseAdmin
      .from("client_suggestions")
      .insert({
        tenant_id: params.tenantId || null,
        client_id: params.clientId,
        advisor_id: params.advisorId || null,
        suggestion_date: suggestionDate,
        system_findings: params.systemFindings,
        advisor_notes: params.advisorNotes || null,
        recommended_investments: params.recommendedInvestments,
        status,
        client_action_notes: params.clientActionNotes || null,
        updated_at: suggestionDate,
      })
      .select()
      .single();

    if (!error && data) {
      return {
        id: data.id,
        tenant_id: data.tenant_id,
        client_id: data.client_id,
        advisor_id: data.advisor_id,
        suggestion_date: data.suggestion_date,
        system_findings: typeof data.system_findings === "string" ? JSON.parse(data.system_findings) : data.system_findings,
        advisor_notes: data.advisor_notes,
        recommended_investments:
          typeof data.recommended_investments === "string" ? JSON.parse(data.recommended_investments) : data.recommended_investments,
        status: data.status,
        client_action_notes: data.client_action_notes,
        updated_at: data.updated_at,
      };
    }
  } catch (err) {
    console.warn("Primary client_suggestions insert notice, routing to fallback adapter:", err);
  }

  // 2. Fallback to planning_recommendations
  const payload = {
    tenant_id: params.tenantId || null,
    advisor_id: params.advisorId || null,
    suggestion_date: suggestionDate,
    system_findings: params.systemFindings,
    advisor_notes: params.advisorNotes || null,
    recommended_investments: params.recommendedInvestments,
    status,
    client_action_notes: params.clientActionNotes || null,
    updated_at: suggestionDate,
  };

  const { data: fallbackRecord, error: fallbackErr } = await supabaseAdmin
    .from("planning_recommendations")
    .insert({
      client_id: params.clientId,
      action_category: "SUGGESTION_PLAN",
      action_text: JSON.stringify(payload),
      priority: status === "SUBMITTED_TO_CLIENT" ? "HIGH" : "MEDIUM",
    })
    .select()
    .single();

  if (fallbackErr || !fallbackRecord) {
    throw new Error(fallbackErr?.message || "Failed to persist suggestion record.");
  }

  return {
    id: fallbackRecord.recommendation_id,
    tenant_id: params.tenantId || null,
    client_id: params.clientId,
    advisor_id: params.advisorId || null,
    suggestion_date: suggestionDate,
    system_findings: params.systemFindings,
    advisor_notes: params.advisorNotes || null,
    recommended_investments: params.recommendedInvestments,
    status,
    client_action_notes: params.clientActionNotes || null,
    updated_at: suggestionDate,
  };
}

/**
 * Update an existing suggestion record
 */
export async function updateClientSuggestion(
  suggestionId: string,
  clientId: string,
  updates: {
    advisorNotes?: string | null;
    status?: SuggestionStatus;
    clientActionNotes?: string | null;
    recommendedInvestments?: any[];
  }
): Promise<ClientSuggestion> {
  const now = new Date().toISOString();

  // 1. Try primary client_suggestions table
  try {
    const updatePayload: Record<string, any> = { updated_at: now };
    if (updates.advisorNotes !== undefined) updatePayload.advisor_notes = updates.advisorNotes;
    if (updates.status !== undefined) updatePayload.status = updates.status;
    if (updates.clientActionNotes !== undefined) updatePayload.client_action_notes = updates.clientActionNotes;
    if (updates.recommendedInvestments !== undefined) updatePayload.recommended_investments = updates.recommendedInvestments;

    const { data, error } = await supabaseAdmin
      .from("client_suggestions")
      .update(updatePayload)
      .eq("id", suggestionId)
      .select()
      .maybeSingle();

    if (!error && data) {
      return {
        id: data.id,
        tenant_id: data.tenant_id,
        client_id: data.client_id,
        advisor_id: data.advisor_id,
        suggestion_date: data.suggestion_date,
        system_findings: typeof data.system_findings === "string" ? JSON.parse(data.system_findings) : data.system_findings,
        advisor_notes: data.advisor_notes,
        recommended_investments:
          typeof data.recommended_investments === "string" ? JSON.parse(data.recommended_investments) : data.recommended_investments,
        status: data.status,
        client_action_notes: data.client_action_notes,
        updated_at: data.updated_at,
      };
    }
  } catch (err) {
    console.warn("Primary client_suggestions update notice, checking fallback adapter:", err);
  }

  // 2. Fallback to planning_recommendations
  const { data: existing, error: fetchErr } = await supabaseAdmin
    .from("planning_recommendations")
    .select("*")
    .eq("recommendation_id", suggestionId)
    .maybeSingle();

  if (fetchErr || !existing) {
    throw new Error("Suggestion record not found.");
  }

  let parsed: any = {};
  try {
    parsed = JSON.parse(existing.action_text || "{}");
  } catch {
    parsed = {};
  }

  if (updates.advisorNotes !== undefined) parsed.advisor_notes = updates.advisorNotes;
  if (updates.status !== undefined) parsed.status = updates.status;
  if (updates.clientActionNotes !== undefined) parsed.client_action_notes = updates.clientActionNotes;
  if (updates.recommendedInvestments !== undefined) parsed.recommended_investments = updates.recommendedInvestments;
  parsed.updated_at = now;

  const { error: updErr } = await supabaseAdmin
    .from("planning_recommendations")
    .update({
      action_text: JSON.stringify(parsed),
      priority: parsed.status === "SUBMITTED_TO_CLIENT" ? "HIGH" : "MEDIUM",
    })
    .eq("recommendation_id", suggestionId);

  if (updErr) {
    throw new Error(updErr.message || "Failed to update suggestion.");
  }

  return {
    id: existing.recommendation_id,
    tenant_id: parsed.tenant_id || null,
    client_id: existing.client_id,
    advisor_id: parsed.advisor_id || null,
    suggestion_date: parsed.suggestion_date || existing.created_at,
    system_findings: parsed.system_findings || {},
    advisor_notes: parsed.advisor_notes || null,
    recommended_investments: parsed.recommended_investments || [],
    status: (parsed.status as SuggestionStatus) || "DRAFT",
    client_action_notes: parsed.client_action_notes || null,
    updated_at: now,
  };
}

/**
 * Append an execution log entry to client_action_notes
 */
export async function appendActionLogToSuggestion(
  suggestionId: string,
  clientId: string,
  logText: string,
  actorRole: string
): Promise<ClientSuggestion> {
  const current = (await getSuggestionsForClient(clientId)).find((s) => s.id === suggestionId);
  if (!current) {
    throw new Error("Suggestion not found for client.");
  }

  const timestamp = new Date().toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const newEntry = `[${timestamp} - ${actorRole}]: ${logText.trim()}`;
  const updatedActionNotes = current.client_action_notes
    ? `${current.client_action_notes}\n\n${newEntry}`
    : newEntry;

  return updateClientSuggestion(suggestionId, clientId, {
    clientActionNotes: updatedActionNotes,
    // Automatically transition to IN_PROGRESS if client or advisor logs execution
    status: current.status === "SUBMITTED_TO_CLIENT" ? "IN_PROGRESS" : current.status,
  });
}

