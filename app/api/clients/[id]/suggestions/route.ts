import { NextResponse, connection } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAuthHeader } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { generateClientDiagnostic } from "@/lib/analysisEngine";
import {
  getSuggestionsForClient,
  createClientSuggestion,
  updateClientSuggestion,
  appendActionLogToSuggestion,
  SuggestionStatus,
} from "@/lib/suggestions";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Helper to fetch complete client profile for diagnostic analysis
 */
async function fetchClientProfile(clientId: string) {
  const { data: client, error: clientErr } = await supabaseAdmin
    .from("clients")
    .select("*")
    .eq("client_id", clientId)
    .maybeSingle();

  if (clientErr || !client) return null;

  let memberIds = [clientId];
  if (client.household_id) {
    const { data: members } = await supabaseAdmin
      .from("clients")
      .select("client_id")
      .eq("household_id", client.household_id);
    if (members && members.length > 0) {
      memberIds = members.map((m) => m.client_id);
    }
  }

  const [incomesRes, expensesRes, assetsRes, liabilitiesRes, investmentsRes, goalsRes] = await Promise.all([
    supabaseAdmin.from("income_sources").select("*").in("client_id", memberIds),
    supabaseAdmin.from("expense_items").select("*").in("client_id", memberIds),
    supabaseAdmin.from("assets").select("*").in("client_id", memberIds),
    supabaseAdmin.from("liabilities").select("*").in("client_id", memberIds),
    supabaseAdmin.from("investment_portfolio").select("*").in("client_id", memberIds),
    supabaseAdmin.from("financial_goals").select("*").in("client_id", memberIds),
  ]);

  return {
    client,
    incomes: incomesRes.data || [],
    expenses: expensesRes.data || [],
    assets: assetsRes.data || [],
    liabilities: liabilitiesRes.data || [],
    investments: investmentsRes.data || [],
    goals: goalsRes.data || [],
  };
}

/**
 * GET: Fetch suggestions history + current diagnostic preview
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access. Please log in." }, { status: 401 });
    }

    const { id: clientId } = await params;

    const profileData = await fetchClientProfile(clientId);
    if (!profileData || !profileData.client) {
      return NextResponse.json({ error: "Client not found." }, { status: 404 });
    }

    // Tenant isolation check
    if (session.role !== "SUPER_ADMIN" && profileData.client.tenant_id && profileData.client.tenant_id !== session.tenantId) {
      return NextResponse.json({ error: "Access denied. Client belongs to another firm." }, { status: 403 });
    }

    // Role Guard for Client: Clients can only access their own profile
    if (session.role === "CLIENT" && profileData.client.user_id && profileData.client.user_id !== session.sub) {
      return NextResponse.json({ error: "Access denied to requested profile." }, { status: 403 });
    }

    // Fetch existing suggestions history
    const allSuggestions = await getSuggestionsForClient(clientId);

    // Filter for clients: Clients only see suggestions with status SUBMITTED_TO_CLIENT, ACKNOWLEDGED, or IN_PROGRESS
    const suggestions =
      session.role === "CLIENT"
        ? allSuggestions.filter((s) => s.status !== "DRAFT")
        : allSuggestions;

    // Run real-time diagnostic engine on current financial data
    const currentDiagnostic = generateClientDiagnostic({
      client: profileData.client,
      incomes: profileData.incomes,
      expenses: profileData.expenses,
      assets: profileData.assets,
      liabilities: profileData.liabilities,
      investments: profileData.investments,
      goals: profileData.goals,
    });

    return NextResponse.json({
      success: true,
      clientId,
      suggestions,
      currentDiagnostic,
    });
  } catch (error: any) {
    console.error("GET Suggestions Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to load client suggestions." },
      { status: 500 }
    );
  }
}

/**
 * POST: Generate or save a new suggestion plan
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session || !["ADVISOR", "STAFF", "TENANT_ADMIN", "SUPER_ADMIN"].includes(session.role)) {
      return NextResponse.json({ error: "Access denied. Advisor privileges required." }, { status: 403 });
    }

    const { id: clientId } = await params;
    const body = await req.json().catch(() => ({}));

    const profileData = await fetchClientProfile(clientId);
    if (!profileData || !profileData.client) {
      return NextResponse.json({ error: "Client not found." }, { status: 404 });
    }

    if (session.role !== "SUPER_ADMIN" && profileData.client.tenant_id && profileData.client.tenant_id !== session.tenantId) {
      return NextResponse.json({ error: "Access denied. Client belongs to another firm." }, { status: 403 });
    }

    // Generate or take provided system findings & recommendations
    let systemFindings = body.systemFindings;
    let recommendedInvestments = body.recommendedInvestments;

    if (!systemFindings || !recommendedInvestments) {
      const generated = generateClientDiagnostic({
        client: profileData.client,
        incomes: profileData.incomes,
        expenses: profileData.expenses,
        assets: profileData.assets,
        liabilities: profileData.liabilities,
        investments: profileData.investments,
        goals: profileData.goals,
      });
      systemFindings = systemFindings || generated.systemFindings;
      recommendedInvestments = recommendedInvestments || generated.recommendedInvestments;
    }

    const status: SuggestionStatus = body.status === "SUBMITTED_TO_CLIENT" ? "SUBMITTED_TO_CLIENT" : "DRAFT";

    const newSuggestion = await createClientSuggestion({
      tenantId: profileData.client.tenant_id || session.tenantId,
      clientId,
      advisorId: session.sub,
      systemFindings,
      advisorNotes: body.advisorNotes || "",
      recommendedInvestments,
      status,
      clientActionNotes: body.clientActionNotes || null,
    });

    // Audit log
    await logAuditEvent({
      tenantId: session.tenantId,
      clientId,
      advisorId: session.sub,
      action: "CREATE",
      entityType: "SUGGESTION",
      entityId: newSuggestion.id,
      details: {
        status,
        overallScore: systemFindings?.overallHealthScore,
        recommendationsCount: recommendedInvestments?.length,
        notesSnippet: (body.advisorNotes || "").slice(0, 100),
      },
    });

    return NextResponse.json({
      success: true,
      message: status === "SUBMITTED_TO_CLIENT" ? "Suggestion successfully submitted to client." : "Suggestion draft saved.",
      suggestion: newSuggestion,
    });
  } catch (error: any) {
    console.error("POST Suggestion Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create suggestion." },
      { status: 500 }
    );
  }
}

/**
 * PUT: Update suggestion status, advisor notes, or append an execution log
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access. Please log in." }, { status: 401 });
    }

    const { id: clientId } = await params;
    const body = await req.json();

    const { suggestionId, status, advisorNotes, actionLogText, commentText, clientActionNotes } = body;
    if (!suggestionId) {
      return NextResponse.json({ error: "suggestionId is required." }, { status: 400 });
    }

    const profileData = await fetchClientProfile(clientId);
    if (!profileData || !profileData.client) {
      return NextResponse.json({ error: "Client not found." }, { status: 404 });
    }

    if (session.role !== "SUPER_ADMIN" && profileData.client.tenant_id && profileData.client.tenant_id !== session.tenantId) {
      return NextResponse.json({ error: "Access denied. Client belongs to another firm." }, { status: 403 });
    }

    let updatedSuggestion;

    // Scenario A: Client or Advisor Adding a Discussion Comment
    if (commentText && typeof commentText === "string" && commentText.trim()) {
      const authorRole = session.role === "CLIENT" ? `Client (${profileData.client.full_name})` : `Advisor (${session.email || "Advisor"})`;
      const formattedComment = `💬 [Discussion Comment]: ${commentText.trim()}`;
      updatedSuggestion = await appendActionLogToSuggestion(
        suggestionId,
        clientId,
        formattedComment,
        authorRole
      );

      await logAuditEvent({
        tenantId: session.tenantId,
        clientId,
        advisorId: session.sub,
        action: "UPDATE",
        entityType: "SUGGESTION",
        entityId: suggestionId,
        details: { action: "ADD_COMMENT", commentSnippet: commentText.slice(0, 100) },
      });
    }
    // Scenario B: Appending an execution tracking log ("What was done")
    else if (actionLogText && typeof actionLogText === "string" && actionLogText.trim()) {
      const authorRole = session.role === "CLIENT" ? `Client (${profileData.client.full_name})` : `Advisor (${session.email || "Advisor"})`;
      const formattedAction = `✅ [Action Completed]: ${actionLogText.trim()}`;
      updatedSuggestion = await appendActionLogToSuggestion(
        suggestionId,
        clientId,
        formattedAction,
        authorRole
      );

      await logAuditEvent({
        tenantId: session.tenantId,
        clientId,
        advisorId: session.sub,
        action: "UPDATE",
        entityType: "SUGGESTION",
        entityId: suggestionId,
        details: { action: "LOG_EXECUTION", logSnippet: actionLogText.slice(0, 100) },
      });
    } else {
      // Scenario B: Updating notes or status (e.g. DRAFT -> SUBMITTED_TO_CLIENT)
      // Only Advisors/Admins can edit advisor notes or publish
      if (session.role === "CLIENT" && (status === "DRAFT" || status === "SUBMITTED_TO_CLIENT" || advisorNotes !== undefined)) {
        return NextResponse.json({ error: "Clients cannot alter advisor recommendations or publishing status." }, { status: 403 });
      }

      updatedSuggestion = await updateClientSuggestion(suggestionId, clientId, {
        advisorNotes,
        status: status as SuggestionStatus,
        clientActionNotes,
      });

      await logAuditEvent({
        tenantId: session.tenantId,
        clientId,
        advisorId: session.sub,
        action: "UPDATE",
        entityType: "SUGGESTION",
        entityId: suggestionId,
        details: { status, hasNotes: Boolean(advisorNotes) },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Suggestion updated successfully.",
      suggestion: updatedSuggestion,
    });
  } catch (error: any) {
    console.error("PUT Suggestion Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update suggestion." },
      { status: 500 }
    );
  }
}

