import { Cron } from "croner";
import { sql } from "drizzle-orm";
import { loadConfig } from "./config";
import { createDb } from "./db/client";
import { computeWeeklyRankings } from "./jobs/weekly-rankings";
import { previousWeek, weekStartIST } from "./lib/time";

/**
 * WORKER PROCESS: runs scheduled background jobs, separately from the API.
 *
 * Why a separate process? If the API runs 3 copies behind a load balancer and
 * each scheduled the job, it would run 3 times. One worker = one run. A slow
 * job also never steals CPU from user requests.
 *
 *   pnpm worker              → long-running scheduler (docker compose "worker" service)
 *   pnpm job:weekly-rankings → run the job once, now (handy for testing/backfills)
 */
const config = loadConfig();
const { db, pool } = createDb(config.DATABASE_URL);
const log = (msg: string, extra: object = {}) => console.log(JSON.stringify({ time: new Date().toISOString(), job: "weekly-rankings", msg, ...extra }));

async function runWeekly(weekStart?: string) {
  const t0 = Date.now();
  const res = await computeWeeklyRankings(db, weekStart);
  log("done", { ...res, ms: Date.now() - t0 });
}

if (process.argv.includes("--once")) {
  const i = process.argv.indexOf("--week");
  await runWeekly(i > 0 ? process.argv[i + 1] : undefined);
  await pool.end();
} else {
  // Every Monday at 00:05 India time, rank the week that just ended.
  const job = new Cron("5 0 * * 1", { timezone: "Asia/Kolkata", protect: true }, () => runWeekly().catch((e) => log("failed", { error: String(e) })));
  log("scheduled", { next: job.nextRun()?.toISOString() });

  // CATCH-UP: if the worker was down on Monday, compute last week now.
  const last = previousWeek(weekStartIST());
  const { rows } = await db.execute(sql`SELECT 1 FROM weekly_issue_rankings WHERE week_start = ${last} LIMIT 1`);
  if (!rows.length) await runWeekly(last);

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, async () => {
      job.stop();
      await pool.end();
      process.exit(0);
    });
  }
}
