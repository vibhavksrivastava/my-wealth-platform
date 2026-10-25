import { NextResponse, connection } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAuthHeader } from "@/lib/auth";


/**
 * Parses CAMS / KFintech CAS data from either raw JSON or structured list
 */
function parseCasData(input: any): Array<{
  scheme: string;
  folio: string;
  isin?: string;
  units?: number;
  nav?: number;
  valuation: number;
  cost?: number;
}> {
  if (Array.isArray(input)) {
    return input
      .filter((item) => item && typeof item === "object")
      .map((item) => {
        const val = Number(
          String(
            item.valuation ??
            item.current_market_value ??
            item.current_value ??
            item.currentValue ??
            item.value ??
            item.amount ??
            0
          ).replace(/[₹,RsINR\s]/gi, "")
        );
        const costVal = Number(
          String(
            item.cost ??
            item.purchase_cost ??
            item.invested_amount ??
            item.cost_value ??
            item.investedCost ??
            0
          ).replace(/[₹,RsINR\s]/gi, "")
        );
        const unitsVal = Number(
          String(item.units ?? item.balance_units ?? item.quantity ?? 0).replace(/[,\s]/g, "")
        );
        const navVal = Number(
          String(item.nav ?? item.current_nav ?? item.nav_value ?? item.price ?? 0).replace(/[₹,RsINR\s]/gi, "")
        );

        return {
          scheme: item.scheme || item.scheme_name || item.schemeName || item.fund_name || item.description || "Mutual Fund Scheme",
          folio: String(item.folio || item.folio_number || item.folioNumber || item.folioNo || "").replace(/folio:?/i, "").trim(),
          isin: item.isin || item.isin_number || item.isinCode || undefined,
          units: !isNaN(unitsVal) && unitsVal > 0 ? unitsVal : undefined,
          nav: !isNaN(navVal) && navVal > 0 ? navVal : undefined,
          valuation: !isNaN(val) ? val : 0,
          cost: !isNaN(costVal) && costVal > 0 ? costVal : undefined,
        };
      })
      .filter((h) => h.valuation > 0 || (h.units && h.units > 0));
  }

  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parseCasData(parsed);
      if (parsed.data && Array.isArray(parsed.data)) return parseCasData(parsed.data);
      if (parsed.folios && Array.isArray(parsed.folios)) return parseCasData(parsed.folios);
      if (parsed.holdings && Array.isArray(parsed.holdings)) return parseCasData(parsed.holdings);
      if (parsed.schemes && Array.isArray(parsed.schemes)) return parseCasData(parsed.schemes);
    } catch {
      // Fallback: structured line-by-line parser for text paste or CSV
      const lines = trimmed.split("\n").filter((l) => l.trim().length > 0);
      const items: any[] = [];
      for (const line of lines) {
        // Skip header lines
        if (/^(scheme|fund|folio|sr|s\.no|date|amc)/i.test(line.trim())) continue;

        const parts = line.split(/[,\t|]/).map((p) => p.trim().replace(/^["']|["']$/g, ""));
        if (parts.length >= 2) {
          // Look for valuation number in parts
          const lastVal = Number(parts[parts.length - 1].replace(/[₹,RsINR\s]/gi, ""));
          if (!isNaN(lastVal) && lastVal > 0) {
            const costCandidate = parts.length >= 3 ? Number(parts[parts.length - 2].replace(/[₹,RsINR\s]/gi, "")) : NaN;
            items.push({
              scheme: parts[0],
              folio: (parts[1] || "").replace(/folio:?/i, "").trim(),
              valuation: lastVal,
              cost: !isNaN(costCandidate) && costCandidate > 0 ? costCandidate : undefined,
            });
          }
        }
      }
      return items;
    }
  }

  return [];
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

    const { id: rawId } = await params;
    let client: any = null;

    if (rawId === "me" || rawId === "self") {
      const { data: byUser } = await supabaseAdmin
        .from("clients")
        .select("client_id, tenant_id, full_name, household_id, user_id")
        .eq("user_id", session.sub)
        .maybeSingle();

      if (byUser) {
        client = byUser;
      } else {
        const { data: prof } = await supabaseAdmin
          .from("client_profiles")
          .select("household_id, tenant_id")
          .eq("user_id", session.sub)
          .maybeSingle();

        if (prof?.household_id) {
          const { data: hhClients } = await supabaseAdmin
            .from("clients")
            .select("client_id, tenant_id, full_name, household_id, user_id")
            .eq("household_id", prof.household_id);

          if (hhClients && hhClients.length > 0) {
            client = hhClients[0];
          }
        }
      }
    } else {
      const { data: byId } = await supabaseAdmin
        .from("clients")
        .select("client_id, tenant_id, full_name, household_id, user_id")
        .eq("client_id", rawId)
        .maybeSingle();

      if (byId) {
        client = byId;
      } else if (session.role === "CLIENT") {
        const { data: byUser } = await supabaseAdmin
          .from("clients")
          .select("client_id, tenant_id, full_name, household_id, user_id")
          .eq("user_id", rawId)
          .maybeSingle();
        if (byUser) {
          client = byUser;
        }
      }
    }

    // If client record not found for a CLIENT user, auto-create one
    if (!client && session.role === "CLIENT") {
      const { data: userRec } = await supabaseAdmin
        .from("users")
        .select("first_name, last_name, email")
        .eq("id", session.sub)
        .maybeSingle();

      const userFullName = userRec ? `${userRec.first_name || ""} ${userRec.last_name || ""}`.trim() : "Investor Client";
      const { data: newClient } = await supabaseAdmin
        .from("clients")
        .insert({
          tenant_id: session.tenantId || "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
          user_id: session.sub,
          full_name: userFullName,
          uwp_client_code: `CL-${Math.floor(1000 + Math.random() * 9000)}`,
        })
        .select()
        .maybeSingle();

      client = newClient;
    }

    if (!client) {
      return NextResponse.json({ error: "Client planning record not found." }, { status: 404 });
    }

    const clientId = client.client_id;

    // Tenant check
    if (session.role !== "SUPER_ADMIN" && client.tenant_id && client.tenant_id !== session.tenantId) {
      return NextResponse.json({ error: "Access denied. Client belongs to another firm." }, { status: 403 });
    }

    // Role-specific check: if caller is CLIENT, verify ownership
    if (session.role === "CLIENT") {
      const isDirectOwner = client.user_id === session.sub || client.client_id === session.sub;
      if (!isDirectOwner) {
        const { data: clientProf } = await supabaseAdmin
          .from("client_profiles")
          .select("household_id")
          .eq("user_id", session.sub)
          .maybeSingle();

        const sameHousehold = Boolean(clientProf?.household_id && clientProf.household_id === client.household_id);

        if (!sameHousehold) {
          return NextResponse.json({
            error: "Access denied. You can only import CAS statements for your own investor account.",
          }, { status: 403 });
        }
      }

      if (!client.user_id) {
        await supabaseAdmin.from("clients").update({ user_id: session.sub }).eq("client_id", clientId);
        client.user_id = session.sub;
      }
    }

    const body = await req.json();
    const parsedHoldings = parseCasData(body.casData || body.holdings || body);

    if (parsedHoldings.length === 0) {
      return NextResponse.json({
        error: "No valid mutual fund folio holdings detected in the provided CAS statement. Please provide valid CAMS/KFintech JSON, CSV, or formatted entries.",
      }, { status: 400 });
    }

    // Clean up any previously imported CAS holdings to prevent duplicate accumulation
    await supabaseAdmin
      .from("assets")
      .delete()
      .eq("client_id", clientId)
      .ilike("notes", "%Imported via CAMS/KFintech CAS%");

    await supabaseAdmin
      .from("investment_portfolio")
      .delete()
      .eq("client_id", clientId)
      .ilike("notes", "%Imported via CAMS/KFintech CAS%");

    // 1. Prepare and insert assets records
    const recordsToInsert = parsedHoldings.map((h) => ({
      client_id: clientId,
      asset_category: "Mutual Funds",
      description: h.scheme + (h.folio ? ` (Folio: ${h.folio})` : ""),
      owner_name: client.full_name || "Self",
      current_market_value: h.valuation,
      is_liquid: true,
      notes: (h.isin ? `ISIN: ${h.isin} | ` : "") + `Imported via CAMS/KFintech CAS. Units: ${h.units ?? "N/A"} | NAV: ${h.nav ? "₹" + h.nav : "N/A"} | Cost: ${h.cost ? "₹" + h.cost : "N/A"}`,
    }));

    const { data: insertedAssets, error: insErr } = await supabaseAdmin
      .from("assets")
      .insert(recordsToInsert)
      .select();

    if (insErr) {
      throw insErr;
    }

    // 2. Also insert into investment_portfolio so it appears in Mutual Fund Portfolio console
    try {
      const portfolioRecords = parsedHoldings.map((h) => ({
        client_id: clientId,
        asset_class: "Equity Mutual Fund",
        scheme_instrument_name: h.scheme,
        owner_name: client.full_name || "Self",
        invested_amount: h.cost || Math.round(h.valuation * 0.75),
        current_value: h.valuation,
        monthly_sip_amount: 0,
        notes: (h.isin ? `ISIN: ${h.isin} | ` : "") + (h.folio ? `Folio: ${h.folio} | ` : "") + `Imported via CAMS/KFintech CAS. Units: ${h.units ?? "N/A"} | NAV: ${h.nav ? "₹" + h.nav : "N/A"}`,
        updated_at: new Date().toISOString(),
      }));

      await supabaseAdmin
        .from("investment_portfolio")
        .insert(portfolioRecords);
    } catch (invErr) {
      console.warn("investment_portfolio insert warning:", invErr);
    }

    // 3. Upsert into mfd_folios if folios present
    try {
      const folioRecords = parsedHoldings
        .filter((h) => Boolean(h.folio))
        .map((h) => ({
          client_id: clientId,
          tenant_id: client.tenant_id || session.tenantId || "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
          amc_name: h.scheme.split(" ")[0] || "Mutual Fund AMC",
          folio_number: h.folio,
          holding_nature: "SINGLE",
        }));

      if (folioRecords.length > 0) {
        await supabaseAdmin
          .from("mfd_folios")
          .upsert(folioRecords, { onConflict: "client_id,amc_name,folio_number", ignoreDuplicates: true });
      }
    } catch (folioErr) {
      console.warn("mfd_folios upsert warning:", folioErr);
    }

    // 3b. Ingest Transactions if provided
    const parsedTransactions = body.transactions || [];
    if (parsedTransactions.length > 0) {
      try {
        const userId = client.user_id || session.sub;
        let portfolioId = null;
        const { data: pList } = await supabaseAdmin
          .from("portfolios")
          .select("id")
          .eq("client_id", userId)
          .limit(1);

        if (pList && pList.length > 0) {
          portfolioId = pList[0].id;
        } else {
          const { data: newP } = await supabaseAdmin
            .from("portfolios")
            .insert({
              tenant_id: client.tenant_id || session.tenantId || "00000000-0000-0000-0000-000000000000",
              client_id: userId,
              portfolio_name: "Main Portfolio",
            })
            .select()
            .maybeSingle();
          portfolioId = newP?.id;
        }

        if (portfolioId) {
          await supabaseAdmin
            .from("transactions")
            .delete()
            .eq("client_id", userId);

          for (const tx of parsedTransactions) {
            let instrumentId = null;
            if (tx.isin) {
              const { data: exInst } = await supabaseAdmin
                .from("instruments")
                .select("id")
                .eq("isin", tx.isin)
                .limit(1);
              if (exInst && exInst.length > 0) instrumentId = exInst[0].id;
            }

            if (!instrumentId) {
              const { data: insInst } = await supabaseAdmin
                .from("instruments")
                .insert({
                  scheme_name: tx.schemeName || "Mutual Fund Scheme",
                  isin: tx.isin || null,
                  asset_class: "EQUITY",
                  fund_house: tx.amc || (tx.schemeName ? tx.schemeName.split(" ")[0] : "Mutual Fund"),
                  current_nav: tx.nav || 10,
                  nav_date: tx.date || new Date().toISOString().split("T")[0],
                  is_active: true,
                })
                .select()
                .maybeSingle();
              instrumentId = insInst?.id;
            }

            if (instrumentId) {
              await supabaseAdmin.from("transactions").insert({
                tenant_id: client.tenant_id || session.tenantId || "00000000-0000-0000-0000-000000000000",
                portfolio_id: portfolioId,
                client_id: userId,
                instrument_id: instrumentId,
                transaction_type: tx.type === "SIP" ? "BUY" : tx.type || "BUY",
                transaction_date: tx.date || new Date().toISOString().split("T")[0],
                units: tx.units || 1,
                nav: tx.nav || 10,
                total_amount: tx.amount || 1000,
                external_order_id: tx.folioNumber || null,
              });
            }
          }
        }
      } catch (txErr) {
        console.warn("Transactions ingestion warning:", txErr);
      }
    }

    // 4. Recalculate total assets, liabilities, and net worth
    const { data: allAssets } = await supabaseAdmin
      .from("assets")
      .select("current_market_value")
      .eq("client_id", clientId);

    const { data: allLiabilities } = await supabaseAdmin
      .from("liabilities")
      .select("outstanding_balance")
      .eq("client_id", clientId);

    const totalAssets = (allAssets || []).reduce((acc, a) => acc + Number(a.current_market_value || 0), 0);
    const totalLiab = (allLiabilities || []).reduce((acc, l) => acc + Number(l.outstanding_balance || 0), 0);
    const newNetWorth = totalAssets - totalLiab;

    // 5. Update client_profiles if present
    const orFilters: string[] = [];
    if (client.user_id) orFilters.push(`user_id.eq.${client.user_id}`);
    if (client.household_id) orFilters.push(`household_id.eq.${client.household_id}`);
    if (session.sub && session.sub !== client.user_id) orFilters.push(`user_id.eq.${session.sub}`);

    if (orFilters.length > 0) {
      await supabaseAdmin
        .from("client_profiles")
        .update({
          total_assets: totalAssets,
          total_liabilities: totalLiab,
          net_worth: newNetWorth,
          updated_at: new Date().toISOString(),
        })
        .or(orFilters.join(","));
    }

    return NextResponse.json({
      success: true,
      importedCount: recordsToInsert.length,
      totalImportedValuation: parsedHoldings.reduce((sum, h) => sum + h.valuation, 0),
      newNetWorth,
      message: `Successfully imported ${recordsToInsert.length} mutual fund folios into ${client.full_name}'s portfolio!`,
      insertedAssets,
    });
  } catch (error: any) {
    console.error("CAS Import Error:", error);
    return NextResponse.json({ error: error.message || "Failed to import CAS portfolio." }, { status: 500 });
  }
}

