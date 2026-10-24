/**
 * Background Daemon: Schedules & Executes AMFI NAV Sync Monday to Friday at 10:00 PM IST
 * 
 * Usage:
 *   node --env-file=.env.local scripts/daily-nav-daemon.mjs
 *   or: npm run nav:daemon
 * 
 * Flags:
 *   --run-now : Executes an immediate sync upon startup before entering the schedule loop.
 */

import { runSync } from "./sync-amfi-nav.mjs";

const IST_TIMEZONE = "Asia/Kolkata";
const TARGET_HOUR_IST = 22; // 10:00 PM
const TARGET_MINUTE_IST = 0; // 00 minutes

/**
 * Calculates milliseconds remaining until the next Monday-Friday at 10:00 PM IST
 */
function getNextScheduledTimeIST() {
  const now = new Date();

  // Extract current time parts in IST
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: IST_TIMEZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });

  const partMap = {};
  for (const p of formatter.formatToParts(now)) {
    if (p.type !== "literal") {
      partMap[p.type] = parseInt(p.value, 10);
    }
  }

  const istYear = partMap.year;
  const istMonth = partMap.month - 1;
  const istDay = partMap.day;
  const istHour = partMap.hour;
  const istMinute = partMap.minute;

  // Day of week: 0 = Sun, 1 = Mon ... 5 = Fri, 6 = Sat
  const currentDayOfWeek = new Date(Date.UTC(istYear, istMonth, istDay)).getUTCDay();

  let daysToAdd = 0;
  const pastTonight = istHour > TARGET_HOUR_IST || (istHour === TARGET_HOUR_IST && istMinute >= TARGET_MINUTE_IST);

  if (currentDayOfWeek >= 1 && currentDayOfWeek <= 5) {
    if (pastTonight) {
      // Past 10 PM tonight: If Friday, jump 3 days to Monday; otherwise jump 1 day
      daysToAdd = currentDayOfWeek === 5 ? 3 : 1;
    } else {
      // Run tonight at 10:00 PM
      daysToAdd = 0;
    }
  } else if (currentDayOfWeek === 6) {
    // Saturday -> next is Monday (2 days)
    daysToAdd = 2;
  } else if (currentDayOfWeek === 0) {
    // Sunday -> next is Monday (1 day)
    daysToAdd = 1;
  }

  // 10:00 PM IST corresponds to 16:30:00 UTC
  const targetUTC = new Date(Date.UTC(istYear, istMonth, istDay + daysToAdd, 16, 30, 0, 0));
  const msRemaining = Math.max(1000, targetUTC.getTime() - now.getTime());

  return { targetUTC, msRemaining };
}

function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}h ${minutes}m ${seconds}s`;
}

async function triggerSync() {
  const istTimestamp = new Date().toLocaleString("en-IN", { timeZone: IST_TIMEZONE });
  console.log(`\n=======================================================`);
  console.log(`[${istTimestamp} IST] EXECUTING SCHEDULED AMFI NAV POPULATION`);
  console.log(`=======================================================`);

  try {
    const res = await runSync();
    console.log(`\n✓ [${istTimestamp} IST] Population complete for date ${res.latestDate}: ${res.navsUpserted.toLocaleString("en-IN")} NAVs updated in ${res.durationSec}s.`);
  } catch (err) {
    console.error(`\n✗ [${istTimestamp} IST] NAV Sync encountered an error:`, err.message || err);
  }
}

function scheduleNext() {
  const { targetUTC, msRemaining } = getNextScheduledTimeIST();
  const targetStrIST = targetUTC.toLocaleString("en-IN", { timeZone: IST_TIMEZONE });

  console.log(`\n-------------------------------------------------------`);
  console.log(`  NEXT SCHEDULED RUN:  ${targetStrIST} IST`);
  console.log(`  COUNTDOWN:           ${formatDuration(msRemaining)} (${Math.round(msRemaining / 1000)}s)`);
  console.log(`  SCHEDULE RULE:       Monday to Friday at 10:00 PM IST (22:00 IST)`);
  console.log(`  STATUS:              Daemon running & waiting in background...`);
  console.log(`-------------------------------------------------------\n`);

  // Max 32-bit signed int for setTimeout
  const safeMs = Math.min(msRemaining, 2147483647);

  setTimeout(async () => {
    if (msRemaining > safeMs) {
      scheduleNext();
      return;
    }

    await triggerSync();
    scheduleNext();
  }, safeMs);
}

async function startDaemon() {
  console.log("\n=======================================================");
  console.log("  AMFI MUTUAL FUND NAV SCHEDULER DAEMON INITIALIZED    ");
  console.log("=======================================================");
  console.log(`  System Time:   ${new Date().toLocaleString("en-IN", { timeZone: IST_TIMEZONE })} IST`);
  console.log(`  Frequency:     Monday to Friday at 10:00 PM IST`);
  console.log(`  Data Provider: Official AMFI Feed (https://www.amfiindia.com)`);
  console.log(`  Database:      public.mfd_schemes & public.mfd_nav_history`);
  console.log("=======================================================");

  const args = process.argv.slice(2);
  if (args.includes("--run-now")) {
    console.log("\n[--run-now flag supplied] Executing immediate sync before entering schedule loop...");
    await triggerSync();
  }

  scheduleNext();

  process.on("SIGINT", () => {
    console.log("\n[Shutdown] AMFI NAV Daemon stopped. Exiting cleanly.");
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    console.log("\n[Shutdown] AMFI NAV Daemon terminated. Exiting cleanly.");
    process.exit(0);
  });
}

startDaemon();

