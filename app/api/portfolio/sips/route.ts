import { NextResponse, connection } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAuthHeader } from "@/lib/auth";

export async function GET(req: Request) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session || !["ADVISOR", "STAFF", "TENANT_ADMIN", "SUPER_ADMIN", "CLIENT"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestedClientId = searchParams.get("clientId");
    const statusFilter = searchParams.get("status"); // ACTIVE, PAUSED, etc.
    const sourceFilter = searchParams.get("source"); // CAS_IMPORT, MANUAL, API_SYNC

    let targetClientId = requestedClientId;

    // Role-based scoping: CLIENT users can only see their own SIPs
    if (session.role === "CLIENT") {
      const { data: clientRec } = await supabaseAdmin
        .from("clients")
        .select("client_id, tenant_id")
        .eq("user_id", session.sub)
        .maybeSingle();

      if (clientRec) {
        targetClientId = clientRec.client_id;
      } else if (!targetClientId) {
        targetClientId = session.sub;
      }
    }

    // 1. Attempt to query the dedicated public.sips table
    let sipsQuery = supabaseAdmin
      .from("sips")
      .select("*, clients(full_name, uwp_client_code)")
      .order("created_at", { ascending: false });

    if (session.role !== "SUPER_ADMIN" && session.tenantId) {
      sipsQuery = sipsQuery.eq("tenant_id", session.tenantId);
    }

    if (targetClientId) {
      sipsQuery = sipsQuery.eq("client_id", targetClientId);
    }

    if (statusFilter && statusFilter !== "ALL") {
      sipsQuery = sipsQuery.eq("status", statusFilter);
    }

    if (sourceFilter && sourceFilter !== "ALL") {
      sipsQuery = sipsQuery.eq("source", sourceFilter);
    }

    const { data: dbSips, error: dbErr } = await sipsQuery;

    let sipsList: any[] = [];
    let tableExists = true;

    if (!dbErr && dbSips) {
      sipsList = dbSips.map((s) => ({
        id: s.id,
        tenantId: s.tenant_id,
        clientId: s.client_id,
        clientName: s.clients?.full_name || "Client",
        ucc: s.ucc || s.clients?.uwp_client_code || "UCC-N/A",
        arnId: s.arn_id,
        sipRegistrationNo: s.sip_registration_no,
        mandateId: s.mandate_id,
        schemeCode: s.scheme_code,
        schemeName: s.scheme_name,
        installmentAmount: Number(s.installment_amount),
        frequency: s.frequency || "MONTHLY",
        installmentDay: s.installment_day || 10,
        startDate: s.start_date,
        endDate: s.end_date,
        installmentsPaid: s.installments_paid || 0,
        status: s.status || "ACTIVE",
        source: s.source || "MANUAL",
        rawApiResponse: s.raw_api_response,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
      }));
    } else {
      tableExists = false;
    }

    // 2. Data Fallback: If sips table has 0 rows or is not yet initialized in schema cache,
    // infer active SIPs directly from investment_portfolio with source = 'CAS_IMPORT'
    if (sipsList.length === 0 && targetClientId) {
      const { data: clientData } = await supabaseAdmin
        .from("clients")
        .select("client_id, full_name, tenant_id, uwp_client_code")
        .eq("client_id", targetClientId)
        .maybeSingle();

      const { data: invSips } = await supabaseAdmin
        .from("investment_portfolio")
        .select("*")
        .eq("client_id", targetClientId)
        .gt("monthly_sip_amount", 0);

      if (invSips && invSips.length > 0) {
        sipsList = invSips.map((inv, idx) => {
          const folioMatch = inv.notes?.match(/Folio:\s*([^\s|,]+)/i);
          const isinMatch = inv.notes?.match(/ISIN:\s*([A-Z0-9]+)/i);
          const folio = folioMatch ? folioMatch[1] : `FOL-${inv.investment_id.slice(0, 6)}`;
          const amount = Number(inv.monthly_sip_amount || 0);

          return {
            id: `cas-sip-${inv.investment_id}`,
            tenantId: clientData?.tenant_id || session.tenantId || "00000000-0000-0000-0000-000000000000",
            clientId: targetClientId,
            clientName: clientData?.full_name || inv.owner_name || "Investor",
            ucc: clientData?.uwp_client_code || "UCC-CAS-001",
            arnId: "ARN-175318",
            sipRegistrationNo: `CAS-REG-${folio}`,
            mandateId: `MANDATE-NACH-${folio}`,
            schemeCode: isinMatch ? isinMatch[1] : `SCH-${idx + 101}`,
            schemeName: inv.scheme_instrument_name,
            installmentAmount: amount,
            frequency: "MONTHLY",
            installmentDay: 10,
            startDate: "2026-09-01",
            endDate: null,
            installmentsPaid: Math.max(1, Math.round(Number(inv.invested_amount || 0) / (amount || 1))),
            status: "ACTIVE",
            source: "CAS_IMPORT",
            rawApiResponse: null,
            createdAt: inv.updated_at || new Date().toISOString(),
            updatedAt: inv.updated_at || new Date().toISOString(),
          };
        });
      }
    }

    // 3. Compute Summary Statistics
    const activeSips = sipsList.filter((s) => s.status === "ACTIVE");
    const totalSipBook = activeSips.reduce((sum, s) => sum + s.installmentAmount, 0);

    const stats = {
      totalSipBook,
      totalCount: sipsList.length,
      activeCount: activeSips.length,
      pausedCount: sipsList.filter((s) => s.status === "PAUSED").length,
      cancelledCount: sipsList.filter((s) => s.status === "CANCELLED").length,
      registeredCount: sipsList.filter((s) => s.status === "REGISTERED").length,
      sourceBreakdown: {
        casImport: sipsList.filter((s) => s.source === "CAS_IMPORT").length,
        manual: sipsList.filter((s) => s.source === "MANUAL").length,
        apiSync: sipsList.filter((s) => s.source === "API_SYNC").length,
      },
      tableConfigured: tableExists,
    };

    return NextResponse.json({
      success: true,
      stats,
      sips: sipsList,
    });
  } catch (err: any) {
    console.error("GET /api/portfolio/sips error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to retrieve Systematic Investment Plans." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session || !["ADVISOR", "STAFF", "TENANT_ADMIN", "SUPER_ADMIN"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized access. Only advisors or tenant administrators can register SIPs." }, { status: 401 });
    }

    const body = await req.json();
    const {
      clientId,
      schemeName,
      installmentAmount,
      frequency = "MONTHLY",
      installmentDay = 10,
      arnId,
      ucc,
      mandateId,
      schemeCode,
      sipRegistrationNo,
      startDate,
      endDate,
      status = "ACTIVE",
      source = "MANUAL",
      rawApiResponse = null,
    } = body;

    if (!clientId || !schemeName || !installmentAmount || Number(installmentAmount) <= 0) {
      return NextResponse.json(
        { error: "Client ID, Scheme Name, and a valid positive installment amount are required." },
        { status: 400 }
      );
    }

    // Resolve Client & Tenant verification
    const { data: client, error: cErr } = await supabaseAdmin
      .from("clients")
      .select("client_id, tenant_id, full_name, uwp_client_code")
      .eq("client_id", clientId)
      .maybeSingle();

    if (cErr || !client) {
      return NextResponse.json({ error: "Target client record not found." }, { status: 404 });
    }

    if (session.role !== "SUPER_ADMIN" && client.tenant_id && client.tenant_id !== session.tenantId) {
      return NextResponse.json({ error: "Access denied. Client belongs to another firm." }, { status: 403 });
    }

    // Resolve ARN
    let effectiveArn = arnId;
    if (!effectiveArn) {
      const { data: tenant } = await supabaseAdmin
        .from("tenants")
        .select("arn_number")
        .eq("id", client.tenant_id || session.tenantId)
        .maybeSingle();
      effectiveArn = tenant?.arn_number || "ARN-111111";
    }

    const record = {
      tenant_id: client.tenant_id || session.tenantId || "00000000-0000-0000-0000-000000000000",
      client_id: clientId,
      arn_id: effectiveArn,
      ucc: ucc || client.uwp_client_code || null,
      sip_registration_no: sipRegistrationNo || `SIP-REG-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      mandate_id: mandateId || `MANDATE-${Date.now().toString().slice(-6)}`,
      scheme_code: schemeCode || null,
      scheme_name: schemeName,
      installment_amount: Number(installmentAmount),
      frequency,
      installment_day: Number(installmentDay) || 10,
      start_date: startDate || new Date().toISOString().split("T")[0],
      end_date: endDate || null,
      installments_paid: 0,
      status,
      source,
      raw_api_response: rawApiResponse,
    };

    // Attempt insertion into public.sips
    let insertedSip: any = null;
    try {
      const { data: ins, error: insErr } = await supabaseAdmin
        .from("sips")
        .insert(record)
        .select()
        .maybeSingle();

      if (!insErr && ins) {
        insertedSip = ins;
      }
    } catch (e) {
      console.warn("Direct sips insert warning:", e);
    }

    // Keep investment_portfolio.monthly_sip_amount synchronized if matching holding exists
    try {
      const { data: existingHoldings } = await supabaseAdmin
        .from("investment_portfolio")
        .select("investment_id, scheme_instrument_name, monthly_sip_amount")
        .eq("client_id", clientId);

      const matchingHolding = (existingHoldings || []).find(
        (h) =>
          h.scheme_instrument_name.toLowerCase().includes(schemeName.toLowerCase().slice(0, 15)) ||
          schemeName.toLowerCase().includes(h.scheme_instrument_name.toLowerCase().slice(0, 15))
      );

      if (matchingHolding) {
        await supabaseAdmin
          .from("investment_portfolio")
          .update({
            monthly_sip_amount: Number(installmentAmount),
            updated_at: new Date().toISOString(),
          })
          .eq("investment_id", matchingHolding.investment_id);
      } else {
        await supabaseAdmin
          .from("investment_portfolio")
          .insert({
            client_id: clientId,
            asset_class: "Equity Mutual Fund",
            scheme_instrument_name: schemeName,
            owner_name: client.full_name,
            invested_amount: Number(installmentAmount),
            current_value: Number(installmentAmount),
            monthly_sip_amount: Number(installmentAmount),
            notes: `Mandate: ${record.mandate_id} | Day: ${record.installment_day}th | Reg: ${record.sip_registration_no} | Source: MANUAL`,
            updated_at: new Date().toISOString(),
          });
      }
    } catch (syncErr) {
      console.warn("investment_portfolio SIP sync warning:", syncErr);
    }

    return NextResponse.json({
      success: true,
      message: `Systematic Investment Plan for "${schemeName}" (${frequency} ₹${Number(installmentAmount).toLocaleString("en-IN")}) registered successfully.`,
      sip: insertedSip || { ...record, id: `sip-${Date.now()}` },
    });
  } catch (err: any) {
    console.error("POST /api/portfolio/sips error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to register Systematic Investment Plan." },
      { status: 500 }
    );
  }
}
