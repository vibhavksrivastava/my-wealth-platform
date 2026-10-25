import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

function parseDate(dStr) {
  const parts = dStr.split("-");
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

async function populateHistory() {
  const isins = [
    "INF955L01JR8", "INF090I01296", "INF769K01NG0", "INF200K01UY4",
    "INF760K01FR2", "INF336L01NY9", "INF336L01QQ8", "INF247L01411",
    "INF204KC1097", "INF966L01AA0", "INF789F01810"
  ];

  const { data: schemes } = await supabase
    .from("mfd_schemes")
    .select("scheme_id, amfi_code, isin, scheme_name")
    .in("isin", isins);

  console.log(`Populating history for ${schemes.length} schemes...`);

  for (const s of schemes) {
    try {
      const res = await fetch(`https://api.mfapi.in/mf/${s.amfi_code}`);
      if (!res.ok) continue;
      const json = await res.json();
      const points = (json.data || []).slice(0, 10); // get last 10 trading days

      const rows = points.map(pt => ({
        scheme_id: s.scheme_id,
        nav_date: parseDate(pt.date),
        nav_value: parseFloat(pt.nav)
      }));

      // Delete and re-insert to avoid duplicate errors
      for (const row of rows) {
        await supabase
          .from("mfd_nav_history")
          .delete()
          .eq("scheme_id", s.scheme_id)
          .eq("nav_date", row.nav_date);
      }

      const { error: insErr } = await supabase
        .from("mfd_nav_history")
        .insert(rows);

      if (insErr) {
        console.warn(`Error inserting for ${s.scheme_name}:`, insErr.message);
      } else {
        console.log(`✓ Inserted ${rows.length} NAV dates for ${s.scheme_name}`);
      }
    } catch (e) {
      console.warn(`Fetch error for ${s.amfi_code}:`, e.message);
    }
  }
  console.log("Historical NAV synchronization completed.");
}

populateHistory().catch(console.error);
