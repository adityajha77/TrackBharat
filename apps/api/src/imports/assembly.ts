import path from "node:path";
import { sql } from "drizzle-orm";
import { open } from "shapefile";
import type { Database } from "../db/client";
import { download, DATA_DIR } from "./lib/download";
import { upsertSource } from "./lib/sources";
import { slugify } from "./lib/text";

/**
 * IMPORT: ~4,000 Vidhan Sabha (state assembly) constituency boundaries.
 * Source: DataMeet "India_AC" shapefile, scraped from ECI's polling-station
 * maps. Licence: CC BY 2.5 India. The source itself warns that it has
 * known problems, all handled below:
 *   1. Telangana's seats are filed under "ANDHRA PRADESH" with pre-2014 numbering.
 *   2. Some seats are split over several rows (multi-part polygons).
 *   3. 34 rows have no name/number (slivers, water bodies).
 *   4. Six states use pre-delimitation boundaries; there is "some shift" overall.
 *   5. Ladakh's seats are still under J&K, but Ladakh (a UT since 2019) has no assembly.
 */
const BASE = "https://raw.githubusercontent.com/datameet/maps/master/assembly-constituencies/India_AC";
export const AC_BOUNDARIES = { page: "https://github.com/datameet/maps/tree/master/assembly-constituencies" };

/** Source spelling → current official state name (as in our `states` table). */
const STATE_FIXES: Record<string, string> = {
  ORISSA: "Odisha",
  UTTARKHAND: "Uttarakhand",
  DELHI: "NCT of Delhi",
  "JAMMU & KASHMIR": "Jammu and Kashmir",
};
/** Whole states whose assembly map predates their latest delimitation. */
const OUTDATED = new Set(["Assam", "Jammu and Kashmir", "Jharkhand", "Manipur", "Nagaland", "Arunachal Pradesh"]);
/** Before 2014, Andhra Pradesh seats 1–119 were in what is now Telangana. */
const TELANGANA_SEATS = 119;

const titleCase = (s: string) => s.toLowerCase().replace(/\b([a-z])/g, (c) => c.toUpperCase()).replace(/\bAnd\b/g, "and");

interface Row {
  state: string;
  number: number;
  name: string;
  reservation: "GEN" | "SC" | "ST";
  outdated: boolean;
  slug: string;
  geojson: string;
}

export async function importAssembly(db: Database) {
  console.log("▶ Assembly constituencies (Vidhan Sabha boundaries)");
  const files = await Promise.all(["shp", "dbf", "shx", "prj"].map((ext) => download(`${BASE}.${ext}`, `india_ac/India_AC.${ext}`, { maxAgeDays: 365 })));
  const sourceId = await upsertSource(db, {
    url: AC_BOUNDARIES.page,
    title: "Assembly constituency boundaries of India (from ECI polling-station maps)",
    publisher: "DataMeet",
    kind: "DATASET",
    license: "CC BY 2.5 India",
  });

  // 1. Read + clean every feature
  const reader = await open(files[0]!, path.join(DATA_DIR, "india_ac/India_AC.dbf"), { encoding: "utf-8" });
  const raw: Omit<Row, "slug">[] = [];
  let skipped = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    const p = value.properties as Record<string, string | number | null>;
    const acNo = Number(p.AC_NO);
    let name = String(p.AC_NAME ?? "").trim();
    if (!acNo || !name || !value.geometry) {
      skipped++;
      continue;
    }
    const srcState = String(p.ST_NAME);
    let state = STATE_FIXES[srcState] ?? titleCase(srcState);
    let number = acNo;
    if (srcState === "ANDHRA PRADESH") {
      if (acNo <= TELANGANA_SEATS) state = "Telangana";
      else number = acNo - TELANGANA_SEATS;
    }
    // "Bhadrachalam (ST)" → name "Bhadrachalam", reservation ST
    let reservation: Row["reservation"] = "GEN";
    const m = name.match(/\s*\((SC|ST)\)\s*$/i);
    if (m) {
      reservation = m[1]!.toUpperCase() as "SC" | "ST";
      name = name.slice(0, m.index).trim();
    }
    if (name === name.toUpperCase()) name = titleCase(name);
    raw.push({ state, number, name, reservation, outdated: /pre/i.test(String(p.STATUS ?? "")) || OUTDATED.has(state), geojson: JSON.stringify(value.geometry) });
  }

  // 2. Slugs, decided per SEAT (state + number), not per row:
  //    "<name>-vidhan-sabha", + state if the name repeats across states,
  //    + seat number if it also repeats within one state (source data errors).
  const seatName = new Map<string, string>(); // "state#number" → first name seen
  for (const r of raw) if (!seatName.has(`${r.state}#${r.number}`)) seatName.set(`${r.state}#${r.number}`, r.name);
  const statesPerName = new Map<string, Set<string>>();
  const seatsPerNameInState = new Map<string, number>();
  for (const [key, name] of seatName) {
    const state = key.split("#")[0]!;
    statesPerName.set(name, (statesPerName.get(name) ?? new Set()).add(state));
    seatsPerNameInState.set(`${state}|${name}`, (seatsPerNameInState.get(`${state}|${name}`) ?? 0) + 1);
  }
  const slugFor = (state: string, number: number) => {
    const name = seatName.get(`${state}#${number}`)!;
    const parts = [name];
    if (statesPerName.get(name)!.size > 1) parts.push(state);
    if (seatsPerNameInState.get(`${state}|${name}`)! > 1) parts.push(String(number));
    return slugify(`${parts.join(" ")} vidhan sabha`);
  };
  const rows: Row[] = raw.map((r) => ({ ...r, name: seatName.get(`${r.state}#${r.number}`)!, slug: slugFor(r.state, r.number) }));

  // Fail loudly if a state name doesn't exist yet (constituencies import must run first)
  const known = new Set((await db.execute<{ name: string }>(sql`SELECT name FROM states`)).rows.map((r) => r.name));
  const unknown = [...new Set(rows.map((r) => r.state))].filter((s) => !known.has(s));
  if (unknown.length) throw new Error(`Unknown states in assembly data (run the constituencies step first?): ${unknown.join(", ")}`);

  await db.transaction(async (tx) => {
    // 3. STAGING TABLE: load raw rows, then let SQL do the set-based work
    await tx.execute(sql`CREATE TEMP TABLE ac_stage (state text, number int, name text, reservation text, outdated bool, slug text, geom geometry) ON COMMIT DROP`);
    for (let i = 0; i < rows.length; i += 500) {
      await tx.execute(sql`
        INSERT INTO ac_stage
        SELECT r.state, r.number, r.name, r.reservation, r.outdated, r.slug, ST_SetSRID(ST_GeomFromGeoJSON(r.geojson), 4326)
        FROM json_to_recordset(${JSON.stringify(rows.slice(i, i + 500))}::json)
          AS r(state text, number int, name text, reservation text, outdated bool, slug text, geojson text)`);
    }

    // 4. Merge multi-part seats (GROUP BY + ST_Union) and upsert
    await tx.execute(sql`
      INSERT INTO constituencies (house, state_id, number, name, slug, reservation, boundary, boundary_source_id, boundary_outdated)
      SELECT 'VIDHAN_SABHA', s.id, a.number, min(a.name), min(a.slug), min(a.reservation)::reservation,
             ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_Union(a.geom)), 3)), ${sourceId}, bool_or(a.outdated)
      FROM ac_stage a JOIN states s ON s.name = a.state
      GROUP BY s.id, a.number
      ON CONFLICT (house, state_id, number) DO UPDATE SET
        name = EXCLUDED.name, slug = EXCLUDED.slug, reservation = EXCLUDED.reservation,
        boundary = EXCLUDED.boundary, boundary_source_id = EXCLUDED.boundary_source_id,
        boundary_outdated = EXCLUDED.boundary_outdated`);

    // 5. Ladakh has no legislative assembly: drop seats lying inside the Ladakh Lok Sabha seat
    await tx.execute(sql`
      DELETE FROM constituencies ac
      USING constituencies pc
      WHERE ac.house = 'VIDHAN_SABHA' AND pc.house = 'LOK_SABHA' AND pc.slug = 'ladakh'
        AND ST_Contains(pc.boundary, ST_PointOnSurface(ac.boundary))
        AND NOT EXISTS (SELECT 1 FROM terms t WHERE t.constituency_id = ac.id)`);

    // 6. Parent Lok Sabha seat = the one containing a point guaranteed to be inside the assembly seat
    await tx.execute(sql`
      UPDATE constituencies ac SET parent_id = (
        SELECT pc.id FROM constituencies pc
        WHERE pc.house = 'LOK_SABHA' AND pc.boundary IS NOT NULL
          AND ST_Contains(pc.boundary, ST_PointOnSurface(ac.boundary))
        LIMIT 1)
      WHERE ac.house = 'VIDHAN_SABHA'`);
  });

  const [stats] = (
    await db.execute<{ total: number; outdated: number; orphan: number; states: number }>(sql`
      SELECT count(*)::int AS total, count(*) FILTER (WHERE boundary_outdated)::int AS outdated,
             count(*) FILTER (WHERE parent_id IS NULL)::int AS orphan, count(DISTINCT state_id)::int AS states
      FROM constituencies WHERE house = 'VIDHAN_SABHA'`)
  ).rows;
  console.log(
    `  ✓ ${stats!.total} assembly seats in ${stats!.states} states/UTs (${skipped} unnamed rows skipped, ${stats!.outdated} flagged outdated, ${stats!.orphan} without a parent Lok Sabha seat)`,
  );
}
