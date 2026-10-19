import { NextResponse, connection } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAuthHeader } from "@/lib/auth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Parses CAMS / KFintech CAS data from either raw JSON or structured list
 */
function parseCasData(input: any): Array<{
  scheme: string;
  folio: string;
  units?: number;
  nav?: number;
  valuation: number;
  cost?: number;
}> {
  if (Array.isArray(input)) {
    return input.map((item) => ({
      scheme: item.scheme || item.scheme_name || item.description || "Mutual Fund Scheme",
      folio: item.folio || item.folio_number || item.folioNo || "",
      units: Number(item.units) || undefined,
      nav: Number(item.nav) || undefined,
      valuation: Number(item.valuation || item.current_market_value || item.current_value || item.value || 0),
      cost: Number(item.cost || item.purchase_cost || item.cost_value || 0),
    }));
  }

  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) return parseCasData(parsed);
      if (parsed.data && Array.isArray(parsed.data)) return parseCasData(parsed.data);
      if (parsed.folios && Array.isArray(parsed.folios)) return parseCasData(parsed.folios);
    } catch {
      // Fallback: simple line-by-line parser for text paste
      const lines = input.split("\n").filter((l) => l.trim().length > 0);
      const items: any[] = [];
      for (const line of lines) {
        const parts = line.split(/[,\t|]/).map((p) => p.trim());
        if (parts.length >= 2) {
          const val = Number(parts[parts.length - 1].replace(/[₹,]/g, ""));
          if (!isNaN(val) && val > 0) {
            items.push({
              scheme: parts[0],
              folio: parts[1] || "",
              valuation: val,
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

    const { id: clientId } = await params;

    // Verify client exists
    const { data: client, error: cErr } = await supabaseAdmin
      .from("clients")
      .select("client_id, tenant_id, full_name, household_id")
      .eq("client_id", clientId)
      .maybeSingle();

    if (cErr || !client) {
      return NextResponse.json({ error: "Client planning record not found." }, { status: 404 });
    }

    if (session.role !== "SUPER_ADMIN" && client.tenant_id && client.tenant_id !== session.tenantId) {
      return NextResponse.json({ error: "Access denied. Client belongs to another firm." }, { status: 403 });
    }

    const body = await req.json();
    const parsedHoldings = parseCasData(body.casData || body.holdings || body);

    if (parsedHoldings.length === 0) {
      return NextResponse.json({
        error: "No valid mutual fund folio holdings detected in the provided CAS statement. Please provide valid CAMS/KFintech JSON or structured CSV entries.",
      }, { status: 400 });
    }

    const recordsToInsert = parsedHoldings.map((h) => ({
      client_id: clientId,
      tenant_id: client.tenant_id || session.tenantId || "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      asset_category: "Mutual Funds",
      description: h.scheme + (h.folio ? ` (Folio: ${h.folio})` : ""),
      owner_name: client.full_name || "Self",
      current_market_value: h.valuation,
      is_liquid: true,
      notes: `Imported via CAMS/KFintech CAS. Units: ${h.units ?? "N/A"} | NAV: ${h.nav ? "₹" + h.nav : "N/A"} | Cost: ${h.cost ? "₹" + h.cost : "N/A"}`,
    }));

    const { data: insertedAssets, error: insErr } = await supabaseAdmin
      .from("assets")
      .insert(recordsToInsert)
      .select();

    if (insErr) {
      throw insErr;
    }

    // Recalculate total assets and net worth
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

    // Update client_profiles if present
    await supabaseAdmin
      .from("client_profiles")
      .update({
        total_assets: totalAssets,
        total_liabilities: totalLiab,
        net_worth: newNetWorth,
        updated_at: new Date().toISOString(),
      })
      .or(`user_id.eq.${client.client_id},household_id.eq.${client.household_id || ""}`);

    return NextResponse.json({
      success: true,
      importedCount: recordsToInsert.length,
      totalImportedValuation: parsedHoldings.reduce((sum, h) => sum + h.valuation, 0),
      message: `Successfully imported ${recordsToInsert.length} mutual fund folios into ${client.full_name}'s portfolio!`,
      insertedAssets,
    });
  } catch (error: any) {
    console.error("CAS Import Error:", error);
    return NextResponse.json({ error: error.message || "Failed to import CAS portfolio." }, { status: 500 });
  }
}

