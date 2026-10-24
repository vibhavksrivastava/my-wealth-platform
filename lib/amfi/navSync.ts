import { supabaseAdmin } from "@/lib/supabase";

export interface AmfiParsedRecord {
  amfiCode: string;
  isin: string | null;
  schemeName: string;
  amcName: string;
  category: string;
  planType: "DIRECT" | "REGULAR";
  navValue: number;
  navDate: string; // YYYY-MM-DD
}

export interface SyncNavResult {
  success: boolean;
  totalParsed: number;
  schemesUpserted: number;
  navRecordsUpserted: number;
  holdingsUpdated: number;
  executionTimeMs: number;
  navDate?: string;
  message?: string;
  error?: string;
}

const MONTH_MAP: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

/**
 * Converts AMFI date strings (e.g., "24-Oct-2026") to ISO standard "YYYY-MM-DD"
 */
export function parseAmfiDate(rawDate: string): string {
  if (!rawDate) return new Date().toISOString().split("T")[0];
  const parts = rawDate.trim().split("-");
  if (parts.length === 3) {
    const day = parts[0].padStart(2, "0");
    const mon = MONTH_MAP[parts[1].toLowerCase()] || "01";
    const year = parts[2];
    return `${year}-${mon}-${day}`;
  }
  return new Date().toISOString().split("T")[0];
}

/**
 * Fetches raw NAV data directly from official AMFI endpoint
 */
export async function fetchAmfiRawText(): Promise<string> {
  const url = "https://www.amfiindia.com/spages/NAVAll.txt";
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) WealthPlatform/1.0",
        Accept: "text/plain, */*",
      },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      throw new Error(`AMFI server responded with HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Parses raw AMFI text data into structured, validated records
 */
export function parseAmfiRawText(rawText: string): AmfiParsedRecord[] {
  const lines = rawText.split("\n");
  let currentCategory = "Open Ended Schemes";
  let currentAmc = "Mutual Fund";
  const map = new Map<string, AmfiParsedRecord>();

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.includes(";")) {
      const parts = line.split(";").map((p) => p.trim());
      // Validate line is a scheme data row (Field 0 must be numeric AMFI Scheme Code)
      if (parts[0] !== "Scheme Code" && !isNaN(Number(parts[0]))) {
        const amfiCode = parts[0];
        const rawIsin = parts[1];
        const isin = rawIsin && rawIsin !== "-" && rawIsin.length > 5 ? rawIsin : null;
        const schemeBase = parts[3] || "Mutual Fund Scheme";
        const planStr = parts[4] || "";
        const optionStr = parts[5] || "";

        // Combine scheme title cleanly
        let fullSchemeName = schemeBase;
        if (planStr && !schemeBase.toLowerCase().includes(planStr.toLowerCase())) {
          fullSchemeName += ` - ${planStr}`;
        }
        if (optionStr && !schemeBase.toLowerCase().includes(optionStr.toLowerCase())) {
          fullSchemeName += ` ${optionStr}`;
        }

        const navNum = parseFloat(parts[6]);
        const dateStr = parseAmfiDate(parts[7]);

        const planType: "DIRECT" | "REGULAR" =
          (planStr && planStr.toLowerCase().includes("direct")) ||
          fullSchemeName.toLowerCase().includes("direct")
            ? "DIRECT"
            : "REGULAR";

        if (!isNaN(navNum) && navNum > 0) {
          map.set(amfiCode, {
            amfiCode,
            isin,
            schemeName: fullSchemeName.slice(0, 255),
            amcName: currentAmc.slice(0, 150),
            category: currentCategory.slice(0, 100),
            planType,
            navValue: navNum,
            navDate: dateStr,
          });
        }
      }
    } else {
      // Header classification line
      if (line.toLowerCase().includes("schemes(") || line.toLowerCase().includes("schemes (")) {
        currentCategory = line;
      } else if (line.toLowerCase().includes("mutual fund") || line.toLowerCase().includes("asset management")) {
        currentAmc = line;
      }
    }
  }

  return Array.from(map.values());
}

/**
 * Main execution function:
 * 1. Fetches AMFI feed
 * 2. Parses all records
 * 3. Upserts schemes into `mfd_schemes` in batches
 * 4. Upserts daily NAVs into `mfd_nav_history`
 * 5. Syncs active client portfolio holdings with current valuations
 */
export async function syncAmfiNavToDatabase(options?: {
  batchSize?: number;
  filterAmfiCodes?: string[];
  onProgress?: (progress: { stage: string; current: number; total: number }) => void;
}): Promise<SyncNavResult> {
  const startTime = Date.now();
  const batchSize = options?.batchSize || 500;

  try {
    // 1. Fetch raw AMFI feed
    const rawText = await fetchAmfiRawText();
    let records = parseAmfiRawText(rawText);

    if (records.length === 0) {
      throw new Error("AMFI feed returned 0 valid mutual fund records.");
    }

    // Optional filtering for targeted updates
    if (options?.filterAmfiCodes && options.filterAmfiCodes.length > 0) {
      const codeSet = new Set(options.filterAmfiCodes);
      records = records.filter((r) => codeSet.has(r.amfiCode));
    }

    const latestNavDate = records[0]?.navDate || new Date().toISOString().split("T")[0];
    let schemesUpsertedCount = 0;
    let navRecordsUpsertedCount = 0;

    // 2. Upsert schemes into `mfd_schemes` in batches
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const schemeRows = batch.map((r) => ({
        amfi_code: r.amfiCode,
        isin: r.isin,
        scheme_name: r.schemeName,
        amc_name: r.amcName,
        category: r.category,
        plan_type: r.planType,
        status: "ACTIVE",
      }));

      const { error: schemeErr } = await supabaseAdmin
        .from("mfd_schemes")
        .upsert(schemeRows, { onConflict: "amfi_code" });

      if (schemeErr) {
        console.error(`Error upserting mfd_schemes batch ${i}-${i + batch.length}:`, schemeErr.message);
      } else {
        schemesUpsertedCount += batch.length;
      }

      if (options?.onProgress) {
        options.onProgress({
          stage: "mfd_schemes",
          current: Math.min(i + batchSize, records.length),
          total: records.length,
        });
      }
    }

    // 3. Resolve scheme_ids for NAV History mapping
    // Fetch amfi_code -> scheme_id lookup map
    const amfiCodeToIdMap = new Map<string, string>();
    for (let i = 0; i < records.length; i += 1000) {
      const codesBatch = records.slice(i, i + 1000).map((r) => r.amfiCode);
      const { data: idRows } = await supabaseAdmin
        .from("mfd_schemes")
        .select("scheme_id, amfi_code")
        .in("amfi_code", codesBatch);

      if (idRows) {
        for (const row of idRows) {
          amfiCodeToIdMap.set(row.amfi_code, row.scheme_id);
        }
      }
    }

    // 4. Upsert into `mfd_nav_history`
    const navRowsToInsert: Array<{
      scheme_id: string;
      nav_date: string;
      nav_value: number;
    }> = [];

    for (const r of records) {
      const schemeId = amfiCodeToIdMap.get(r.amfiCode);
      if (schemeId) {
        navRowsToInsert.push({
          scheme_id: schemeId,
          nav_date: r.navDate,
          nav_value: r.navValue,
        });
      }
    }

    for (let i = 0; i < navRowsToInsert.length; i += batchSize) {
      const batch = navRowsToInsert.slice(i, i + batchSize);
      const { error: navErr } = await supabaseAdmin
        .from("mfd_nav_history")
        .upsert(batch, { onConflict: "scheme_id,nav_date" });

      if (navErr) {
        console.error(`Error upserting mfd_nav_history batch ${i}-${i + batch.length}:`, navErr.message);
      } else {
        navRecordsUpsertedCount += batch.length;
      }

      if (options?.onProgress) {
        options.onProgress({
          stage: "mfd_nav_history",
          current: Math.min(i + batchSize, navRowsToInsert.length),
          total: navRowsToInsert.length,
        });
      }
    }

    // 5. Sync active holdings in `investment_portfolio`
    let holdingsUpdatedCount = 0;
    try {
      const { data: holdings } = await supabaseAdmin
        .from("investment_portfolio")
        .select("investment_id, scheme_instrument_name, current_value, invested_amount");

      if (holdings && holdings.length > 0) {
        // Fast map by normalized scheme name
        const nameToRecordMap = new Map<string, AmfiParsedRecord>();
        for (const r of records) {
          nameToRecordMap.set(r.schemeName.toLowerCase(), r);
        }

        for (const h of holdings) {
          const hName = (h.scheme_instrument_name || "").toLowerCase().trim();
          let matchedRecord = nameToRecordMap.get(hName);

          // Partial fuzzy match fallback if exact match not found
          if (!matchedRecord && hName.length > 8) {
            for (const r of records) {
              const rName = r.schemeName.toLowerCase();
              if (rName.includes(hName) || hName.includes(rName.split(" - ")[0])) {
                matchedRecord = r;
                break;
              }
            }
          }

          if (matchedRecord) {
            const cost = Number(h.invested_amount || 0);
            const currentVal = Number(h.current_value || 0);
            // Derive units if not explicitly stored
            const estUnits = currentVal > 0 ? currentVal / matchedRecord.navValue : (cost > 0 ? cost / matchedRecord.navValue : 100);
            const updatedValue = Math.round(estUnits * matchedRecord.navValue);

            if (Math.abs(updatedValue - currentVal) > 1) {
              await supabaseAdmin
                .from("investment_portfolio")
                .update({
                  current_value: updatedValue,
                  notes: `Auto-synced with AMFI NAV ₹${matchedRecord.navValue.toFixed(4)} as of ${matchedRecord.navDate}.`,
                  updated_at: new Date().toISOString(),
                })
                .eq("investment_id", h.investment_id);
              holdingsUpdatedCount++;
            }
          }
        }
      }
    } catch (syncErr: any) {
      console.warn("Portfolio holding sync warning:", syncErr?.message);
    }

    return {
      success: true,
      totalParsed: records.length,
      schemesUpserted: schemesUpsertedCount,
      navRecordsUpserted: navRecordsUpsertedCount,
      holdingsUpdated: holdingsUpdatedCount,
      executionTimeMs: Date.now() - startTime,
      navDate: latestNavDate,
      message: `Successfully synchronized ${navRecordsUpsertedCount} mutual fund NAV values for date ${latestNavDate}.`,
    };
  } catch (err: any) {
    return {
      success: false,
      totalParsed: 0,
      schemesUpserted: 0,
      navRecordsUpserted: 0,
      holdingsUpdated: 0,
      executionTimeMs: Date.now() - startTime,
      error: err?.message || String(err),
    };
  }
}

