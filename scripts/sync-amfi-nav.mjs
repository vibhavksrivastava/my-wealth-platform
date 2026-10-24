/**
 * Standalone AMFI Mutual Fund Daily NAV Synchronization Tool
 * Usage:
 *   node --env-file=.env.local scripts/sync-amfi-nav.mjs
 *   or: npm run sync:nav
 */

import { createClient } from "@supabase/supabase-js";

const AMFI_URL = "https://www.amfiindia.com/spages/NAVAll.txt";

const MONTH_MAP = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

export function parseAmfiDate(rawDate) {
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

export async function fetchAmfiRaw() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);

  try {
    const res = await fetch(AMFI_URL, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) WealthPlatform/1.0",
        Accept: "text/plain, */*",
      },
    });

    if (!res.ok) {
      throw new Error(`AMFI HTTP error: ${res.status} ${res.statusText}`);
    }

    return await res.text();
  } finally {
    clearTimeout(timeoutId);
  }
}

export function parseAmfiText(rawText) {
  const lines = rawText.split("\n");
  let currentCategory = "Open Ended Schemes";
  let currentAmc = "Mutual Fund";
  const records = new Map();

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.includes(";")) {
      const parts = line.split(";").map((p) => p.trim());
      if (parts[0] !== "Scheme Code" && !isNaN(Number(parts[0]))) {
        const amfiCode = parts[0];
        const rawIsin = parts[1];
        const isin = rawIsin && rawIsin !== "-" && rawIsin.length > 5 ? rawIsin : null;
        const schemeBase = parts[3] || "Mutual Fund Scheme";
        const planStr = parts[4] || "";
        const optionStr = parts[5] || "";

        let fullSchemeName = schemeBase;
        if (planStr && !schemeBase.toLowerCase().includes(planStr.toLowerCase())) {
          fullSchemeName += ` - ${planStr}`;
        }
        if (optionStr && !schemeBase.toLowerCase().includes(optionStr.toLowerCase())) {
          fullSchemeName += ` ${optionStr}`;
        }

        const navNum = parseFloat(parts[6]);
        const dateStr = parseAmfiDate(parts[7]);

        const planType =
          (planStr && planStr.toLowerCase().includes("direct")) ||
          fullSchemeName.toLowerCase().includes("direct")
            ? "DIRECT"
            : "REGULAR";

        if (!isNaN(navNum) && navNum > 0) {
          records.set(amfiCode, {
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
      if (line.toLowerCase().includes("schemes(") || line.toLowerCase().includes("schemes (")) {
        currentCategory = line;
      } else if (line.toLowerCase().includes("mutual fund") || line.toLowerCase().includes("asset management")) {
        currentAmc = line;
      }
    }
  }

  return Array.from(records.values());
}

export async function runSync(options = {}) {
  const startTime = Date.now();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceKey || supabaseUrl.includes("placeholder")) {
    throw new Error("Missing valid NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables.");
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  console.log(`[1/4] Fetching latest daily NAV file from AMFI official endpoint...`);
  const rawText = await fetchAmfiRaw();

  console.log(`[2/4] Parsing mutual fund schemes & NAV records...`);
  const records = parseAmfiText(rawText);
  console.log(`      ✓ Parsed ${records.length.toLocaleString("en-IN")} active schemes across all Indian AMCs.`);

  if (records.length === 0) {
    throw new Error("Zero records parsed from AMFI.");
  }

  const latestDate = records[0].navDate;
  const batchSize = options.batchSize || 500;
  let schemesUpserted = 0;
  let navsUpserted = 0;

  console.log(`[3/4] Upserting scheme catalog into 'mfd_schemes' (batches of ${batchSize})...`);
  const seenIsins = new Set();
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const rows = batch.map((r) => {
      let isin = r.isin;
      if (isin) {
        if (seenIsins.has(isin)) {
          isin = null; // AMFI has multiple option codes sharing one ISIN; avoid unique constraint violation
        } else {
          seenIsins.add(isin);
        }
      }
      return {
        amfi_code: r.amfiCode,
        isin,
        scheme_name: r.schemeName,
        amc_name: r.amcName,
        category: r.category,
        plan_type: r.planType,
        status: "ACTIVE",
      };
    });

    const { error: sErr } = await supabase.from("mfd_schemes").upsert(rows, { onConflict: "amfi_code" });
    if (sErr) {
      console.warn(`      Batch ${i}-${i + batch.length} warning: ${sErr.message}`);
    } else {
      schemesUpserted += batch.length;
    }
    const pct = Math.round((Math.min(i + batchSize, records.length) / records.length) * 100);
    process.stdout.write(`\r      Progress: ${pct}% (${Math.min(i + batchSize, records.length)} / ${records.length})`);
  }
  console.log("");

  console.log(`[4/4] Populating NAV history into 'mfd_nav_history' for date: ${latestDate}...`);
  // Build amfi_code -> scheme_id lookup via fast pagination
  const idMap = new Map();
  let fromOffset = 0;
  const PAGE_SIZE = 1000;
  while (true) {
    const { data: page, error: pErr } = await supabase
      .from("mfd_schemes")
      .select("scheme_id, amfi_code")
      .range(fromOffset, fromOffset + PAGE_SIZE - 1);
    if (pErr || !page || page.length === 0) break;
    for (const s of page) {
      idMap.set(s.amfi_code, s.scheme_id);
    }
    if (page.length < PAGE_SIZE) break;
    fromOffset += PAGE_SIZE;
  }
  console.log(`      ✓ Resolved ${idMap.size.toLocaleString("en-IN")} scheme IDs for historical linking.`);

  const navRows = [];
  for (const r of records) {
    const sId = idMap.get(r.amfiCode);
    if (sId) {
      navRows.push({
        scheme_id: sId,
        nav_date: r.navDate,
        nav_value: r.navValue,
      });
    }
  }

  // Idempotent clean: Remove existing records for this date to prevent duplicates without requiring a specific DB constraint
  await supabase.from("mfd_nav_history").delete().eq("nav_date", latestDate);

  for (let i = 0; i < navRows.length; i += batchSize) {
    const batch = navRows.slice(i, i + batchSize);
    let { error: nErr } = await supabase.from("mfd_nav_history").upsert(batch, { onConflict: "scheme_id,nav_date" });
    
    // If table doesn't have unique constraint for onConflict (Postgres 42P10), use direct insert
    if (nErr && nErr.code === "42P10") {
      const insRes = await supabase.from("mfd_nav_history").insert(batch);
      nErr = insRes.error;
    }

    if (nErr) {
      console.warn(`      NAV Batch warning: ${nErr.message}`);
    } else {
      navsUpserted += batch.length;
    }
    const pct = Math.round((Math.min(i + batchSize, navRows.length) / navRows.length) * 100);
    process.stdout.write(`\r      Progress: ${pct}% (${Math.min(i + batchSize, navRows.length)} / ${navRows.length})`);
  }
  console.log("");

  // Re-value active client holdings in investment_portfolio if applicable
  let holdingsUpdated = 0;
  try {
    const { data: holdings } = await supabase.from("investment_portfolio").select("investment_id, scheme_instrument_name, current_value, invested_amount");
    if (holdings && holdings.length > 0) {
      const nameMap = new Map();
      for (const r of records) nameMap.set(r.schemeName.toLowerCase(), r);

      for (const h of holdings) {
        const hName = (h.scheme_instrument_name || "").toLowerCase().trim();
        const matched = nameMap.get(hName);
        if (matched) {
          const cost = Number(h.invested_amount || 0);
          const current = Number(h.current_value || 0);
          const units = current > 0 ? current / matched.navValue : (cost > 0 ? cost / matched.navValue : 100);
          const newVal = Math.round(units * matched.navValue);
          if (Math.abs(newVal - current) > 1) {
            await supabase.from("investment_portfolio").update({
              current_value: newVal,
              notes: `Auto-updated via AMFI NAV ₹${matched.navValue} (${matched.navDate})`,
              updated_at: new Date().toISOString(),
            }).eq("investment_id", h.investment_id);
            holdingsUpdated++;
          }
        }
      }
    }
  } catch {}

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);

  return {
    success: true,
    latestDate,
    totalParsed: records.length,
    schemesUpserted,
    navsUpserted,
    holdingsUpdated,
    durationSec,
  };
}

// Direct CLI invocation
if (process.argv[1] && process.argv[1].endsWith("sync-amfi-nav.mjs")) {
  console.log("\n=======================================================");
  console.log("   AMFI DAILY MUTUAL FUND NAV SYNCHRONIZATION TOOL     ");
  console.log("=======================================================");
  console.log(`[${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST] Starting sync...\n`);

  runSync()
    .then((res) => {
      console.log("\n-------------------------------------------------------");
      console.log("  SYNC COMPLETED SUCCESSFULLY");
      console.log("-------------------------------------------------------");
      console.log(`  NAV Date:             ${res.latestDate}`);
      console.log(`  Schemes Parsed:       ${res.totalParsed.toLocaleString("en-IN")}`);
      console.log(`  Schemes Upserted:     ${res.schemesUpserted.toLocaleString("en-IN")}`);
      console.log(`  NAV Records Saved:    ${res.navsUpserted.toLocaleString("en-IN")}`);
      console.log(`  Holdings Re-valued:   ${res.holdingsUpdated.toLocaleString("en-IN")}`);
      console.log(`  Time Elapsed:         ${res.durationSec}s`);
      console.log("-------------------------------------------------------\n");
      process.exit(0);
    })
    .catch((err) => {
      console.error("\n[SYNC FAILED]", err.message || err);
      process.exit(1);
    });
}

