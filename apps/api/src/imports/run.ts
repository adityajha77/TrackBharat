import { createDb } from "../db/client";
import { importConstituencies } from "./constituencies";
import { importMembers } from "./members";
import { importPinLocations } from "./pin-locations";

/**
 * Data import pipeline. Order matters: members need constituencies; the PIN
 * spatial join needs boundaries. Every step is idempotent: re-run any time.
 *
 *   pnpm db:import                  → everything
 *   pnpm db:import members          → just refresh MPs (e.g. after a by-election)
 */
const steps = {
  constituencies: importConstituencies,
  pins: importPinLocations,
  members: importMembers,
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
  console.error("\n✗ Import failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
