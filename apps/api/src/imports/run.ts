import { createDb } from "../db/client";
import { importAssembly } from "./assembly";
import { importConstituencies } from "./constituencies";
import { importMembers, importPreviousMembers } from "./members";
import { importQuestions } from "./questions";
import { importMlas } from "./mlas";
import { importPinLocations } from "./pin-locations";
import { importParties } from "./parties";
import { importNewsFeeds } from "./news-feeds";

/**
 * Data import pipeline. Order matters: members need constituencies; the PIN
 * spatial join needs boundaries. Every step is idempotent: re-run any time.
 *
 *   pnpm db:import                  → everything
 *   pnpm db:import members          → just refresh MPs (e.g. after a by-election)
 */
const steps = {
  constituencies: importConstituencies,
  assembly: importAssembly,
  pins: importPinLocations, // after all boundaries: rebuilds the PIN → seat mapping
  members: (db: Parameters<typeof importMembers>[0]) => importMembers(db),
  "previous-members": importPreviousMembers, // 17th Lok Sabha, for comparisons
  questions: importQuestions, // slow (~10 min first run, then cached): parliamentary questions per MP
  mlas: importMlas,
  parties: (db: Parameters<typeof importParties>[0]) => importParties(db, { photos: process.env.SKIP_PHOTOS !== "1" }), // curated: profiles, leaders (+ free-licence photos), timeline, manifestos
  "news-feeds": importNewsFeeds,
} as const;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set. See apps/api/.env.example");
  process.exit(1);
}

const requested = process.argv.slice(2);
const unknown = requested.filter((s) => !(s in steps));
if (unknown.length) {
  console.error(`Unknown step(s): ${unknown.join(", ")}. Available: ${Object.keys(steps).join(", ")}`);
  process.exit(1);
}
const toRun = (requested.length ? requested : Object.keys(steps)) as (keyof typeof steps)[];

const { db, pool } = createDb(databaseUrl);
const t0 = Date.now();
try {
  for (const step of toRun) await steps[step](db);
  console.log(`\nDone in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
} catch (err) {
  // Drizzle wraps Postgres errors ("Failed query: <huge SQL>"); the useful part is in `cause`.
  const cause = err instanceof Error && err.cause instanceof Error ? err.cause : null;
  const message = err instanceof Error ? err.message.split("\nparams:")[0]!.slice(0, 500) : String(err);
  console.error("\n✗ Import failed:", cause ? `${cause.message}\n  (while running: ${message.slice(0, 200)}…)` : message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
