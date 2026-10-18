import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type AppointmentStatus = "REQUESTED" | "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";

/**
 * Normalizes any appointment status to the Postgres enum `appointment_status_enum` values:
 * 'REQUESTED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
 */
export function toDbStatus(s?: string): "REQUESTED" | "CONFIRMED" | "COMPLETED" | "CANCELLED" {
  if (!s) return "CONFIRMED";
  const upper = s.toUpperCase();
  if (upper === "PENDING" || upper === "REQUESTED") return "REQUESTED";
  if (upper === "COMPLETED") return "COMPLETED";
  if (upper === "CANCELLED" || upper === "DECLINED") return "CANCELLED";
  return "CONFIRMED";
}

export interface AppointmentItem {
  id: string;
  tenant_id?: string | null;
  client_id: string;
  advisor_id: string;
  title: string;
  meeting_link?: string | null;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  notes?: string | null;
  scheduled_by?: "CLIENT" | "ADVISOR";
  created_at: string;
  updated_at: string;
  client_name?: string;
  advisor_name?: string;
}

const NOTE_DELIMITER = "__NOTE__";

/**
 * Encodes notes into meeting_link as a fallback if the schema does not have the 'notes' column yet.
 */
function packLinkAndNotes(link?: string | null, notes?: string | null): string {
  const cleanLink = link?.trim() || "";
  if (!notes || !notes.trim()) return cleanLink;
  const encoded = Buffer.from(notes.trim()).toString("base64");
  return `${cleanLink}${NOTE_DELIMITER}${encoded}${NOTE_DELIMITER}`;
}

/**
 * Decodes meeting_link and notes from row.
 */
function unpackLinkAndNotes(rawLink?: string | null, directNotes?: string | null): {
  cleanLink: string;
  notes: string | null;
} {
  let cleanLink = rawLink || "";
  let extractedNotes = directNotes || null;

  if (rawLink && rawLink.includes(NOTE_DELIMITER)) {
    const parts = rawLink.split(NOTE_DELIMITER);
    cleanLink = parts[0] || "";
    if (parts[1] && !extractedNotes) {
      try {
        extractedNotes = Buffer.from(parts[1], "base64").toString("utf-8");
      } catch {
        extractedNotes = parts[1];
      }
    }
  }

  return { cleanLink, notes: extractedNotes };
}

/**
 * Fetch appointments for a specific client or advisor
 */
export async function getAppointments(filters: {
  clientId?: string;
  clientUserIds?: string[];
  advisorId?: string;
  tenantId?: string;
}): Promise<AppointmentItem[]> {
  try {
    let query = supabaseAdmin
      .from("appointments")
      .select("*")
      .order("start_time", { ascending: false });

    if (filters.clientUserIds && filters.clientUserIds.length > 0) {
      query = query.in("client_id", filters.clientUserIds);
    } else if (filters.clientId) {
      query = query.eq("client_id", filters.clientId);
    }

    if (filters.advisorId) {
      query = query.eq("advisor_id", filters.advisorId);
    }
    if (filters.tenantId) {
      query = query.eq("tenant_id", filters.tenantId);
    }

    const { data, error } = await query;
    if (error || !data) {
      console.warn("Appointments query note:", error?.message);
      return [];
    }

    // Collect unique client and advisor IDs for enrichment
    const clientIds = Array.from(new Set(data.map((r) => r.client_id).filter(Boolean)));
    const advisorIds = Array.from(new Set(data.map((r) => r.advisor_id).filter(Boolean)));

    const [clientsRes, clientUsersRes, advisorsRes] = await Promise.all([
      clientIds.length > 0
        ? supabaseAdmin
            .from("clients")
            .select("client_id, user_id, full_name")
            .or(`client_id.in.(${clientIds.join(",")}),user_id.in.(${clientIds.join(",")})`)
        : Promise.resolve({ data: [] }),
      clientIds.length > 0
        ? supabaseAdmin.from("users").select("id, first_name, last_name").in("id", clientIds)
        : Promise.resolve({ data: [] }),
      advisorIds.length > 0
        ? supabaseAdmin.from("users").select("id, first_name, last_name").in("id", advisorIds)
        : Promise.resolve({ data: [] }),
    ]);

    const clientMap = new Map<string, string>();
    (clientUsersRes.data || []).forEach((u: any) => {
      const name = `${u.first_name || ""} ${u.last_name || ""}`.trim();
      if (name) clientMap.set(u.id, name);
    });
    (clientsRes.data || []).forEach((c: any) => {
      if (c.user_id && c.full_name) clientMap.set(c.user_id, c.full_name);
      if (c.client_id && c.full_name) clientMap.set(c.client_id, c.full_name);
    });

    const advisorMap = new Map(
      (advisorsRes.data || []).map((u: any) => [u.id, `${u.first_name || ""} ${u.last_name || ""}`.trim()])
    );

    return data.map((row) => {
      const { cleanLink, notes } = unpackLinkAndNotes(row.meeting_link, row.notes);
      const rawStatus = row.status || "CONFIRMED";
      return {
        id: row.id,
        tenant_id: row.tenant_id,
        client_id: row.client_id,
        advisor_id: row.advisor_id,
        title: row.title,
        meeting_link: cleanLink,
        start_time: row.start_time,
        end_time: row.end_time,
        status: (rawStatus as AppointmentStatus),
        notes,
        scheduled_by: (row.scheduled_by as any) || (rawStatus === "REQUESTED" ? "CLIENT" : "ADVISOR"),
        created_at: row.created_at,
        updated_at: row.updated_at,
        client_name: clientMap.get(row.client_id) || "Client",
        advisor_name: advisorMap.get(row.advisor_id) || "Advisor",
      };
    });
  } catch (err) {
    console.error("Error in getAppointments:", err);
    return [];
  }
}

/**
 * Schedule a new appointment
 */
export async function createAppointment(params: {
  clientId: string;
  advisorId: string;
  tenantId?: string | null;
  title: string;
  startTime: string;
  endTime?: string;
  meetingLink?: string;
  notes?: string;
  scheduledBy: "CLIENT" | "ADVISOR";
  status?: AppointmentStatus;
}): Promise<AppointmentItem> {
  const start = new Date(params.startTime);
  const end = params.endTime ? new Date(params.endTime) : new Date(start.getTime() + 45 * 60 * 1000);
  const now = new Date().toISOString();

  // If status is not provided:
  // If scheduled by client -> REQUESTED (requires advisor confirmation)
  // If scheduled by advisor -> CONFIRMED
  const status = toDbStatus(params.status || (params.scheduledBy === "CLIENT" ? "REQUESTED" : "CONFIRMED"));

  // Fallback meeting link if none provided
  const meetingLink = params.meetingLink?.trim() || `https://meet.google.com/uwp-session-${Math.random().toString(36).substring(2, 8)}`;

  // Attempt 1: Direct insert with notes and scheduled_by
  try {
    const { data, error } = await supabaseAdmin
      .from("appointments")
      .insert({
        tenant_id: params.tenantId || null,
        client_id: params.clientId,
        advisor_id: params.advisorId,
        title: params.title.trim(),
        meeting_link: meetingLink,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        status,
        notes: params.notes?.trim() || null,
        scheduled_by: params.scheduledBy,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (!error && data) {
      return {
        id: data.id,
        tenant_id: data.tenant_id,
        client_id: data.client_id,
        advisor_id: data.advisor_id,
        title: data.title,
        meeting_link: data.meeting_link,
        start_time: data.start_time,
        end_time: data.end_time,
        status: data.status,
        notes: data.notes || params.notes || null,
        scheduled_by: params.scheduledBy,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    }
  } catch (err) {
    console.warn("Direct appointment insert notice, using packed link adapter:", err);
  }

  // Attempt 2: Fallback encoding notes in meeting_link if columns do not exist in schema cache
  const packedLink = packLinkAndNotes(meetingLink, params.notes);
  const { data: fallbackData, error: fallbackErr } = await supabaseAdmin
    .from("appointments")
    .insert({
      tenant_id: params.tenantId || null,
      client_id: params.clientId,
      advisor_id: params.advisorId,
      title: params.title.trim(),
      meeting_link: packedLink,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      status,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (fallbackErr || !fallbackData) {
    throw new Error(fallbackErr?.message || "Failed to schedule appointment.");
  }

  return {
    id: fallbackData.id,
    tenant_id: fallbackData.tenant_id,
    client_id: fallbackData.client_id,
    advisor_id: fallbackData.advisor_id,
    title: fallbackData.title,
    meeting_link: meetingLink,
    start_time: fallbackData.start_time,
    end_time: fallbackData.end_time,
    status: fallbackData.status,
    notes: params.notes || null,
    scheduled_by: params.scheduledBy,
    created_at: fallbackData.created_at,
    updated_at: fallbackData.updated_at,
  };
}

/**
 * Update an appointment (Accept call, change status, or record/append call notes)
 */
export async function updateAppointment(
  appointmentId: string,
  updates: {
    status?: AppointmentStatus;
    notes?: string;
    meetingLink?: string;
    startTime?: string;
    endTime?: string;
    noteAuthor?: string;
  }
): Promise<AppointmentItem> {
  const now = new Date().toISOString();

  // 1. Fetch current appointment
  const { data: existing, error: findErr } = await supabaseAdmin
    .from("appointments")
    .select("*")
    .eq("id", appointmentId)
    .maybeSingle();

  if (findErr || !existing) {
    throw new Error("Appointment not found.");
  }

  const { cleanLink: currentLink, notes: currentNotes } = unpackLinkAndNotes(existing.meeting_link, existing.notes);

  let newNotes = currentNotes;
  if (updates.notes && updates.notes.trim()) {
    const timestamp = new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
    const authorTag = updates.noteAuthor || "User";
    const logEntry = `[${timestamp} - ${authorTag}]: ${updates.notes.trim()}`;
    newNotes = currentNotes ? `${currentNotes}\n\n${logEntry}` : logEntry;
  }

  const newStatus = toDbStatus(updates.status || existing.status);
  const newLink = updates.meetingLink?.trim() || currentLink;

  // Attempt 1: Direct update with notes column
  try {
    const { data, error } = await supabaseAdmin
      .from("appointments")
      .update({
        status: newStatus,
        notes: newNotes,
        meeting_link: newLink,
        updated_at: now,
      })
      .eq("id", appointmentId)
      .select()
      .maybeSingle();

    if (!error && data) {
      return {
        id: data.id,
        tenant_id: data.tenant_id,
        client_id: data.client_id,
        advisor_id: data.advisor_id,
        title: data.title,
        meeting_link: data.meeting_link,
        start_time: data.start_time,
        end_time: data.end_time,
        status: data.status,
        notes: data.notes || newNotes,
        scheduled_by: data.scheduled_by || existing.scheduled_by,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    }
  } catch (err) {
    console.warn("Direct appointment update notice, using packed link adapter:", err);
  }

  // Attempt 2: Fallback encoding notes in meeting_link
  const packedLink = packLinkAndNotes(newLink, newNotes);
  const { data: fallbackData, error: fallbackErr } = await supabaseAdmin
    .from("appointments")
    .update({
      status: newStatus,
      meeting_link: packedLink,
      updated_at: now,
    })
    .eq("id", appointmentId)
    .select()
    .single();

  if (fallbackErr || !fallbackData) {
    throw new Error(fallbackErr?.message || "Failed to update appointment.");
  }

  return {
    id: fallbackData.id,
    tenant_id: fallbackData.tenant_id,
    client_id: fallbackData.client_id,
    advisor_id: fallbackData.advisor_id,
    title: fallbackData.title,
    meeting_link: newLink,
    start_time: fallbackData.start_time,
    end_time: fallbackData.end_time,
    status: fallbackData.status,
    notes: newNotes,
    scheduled_by: existing.scheduled_by,
    created_at: fallbackData.created_at,
    updated_at: fallbackData.updated_at,
  };
}
