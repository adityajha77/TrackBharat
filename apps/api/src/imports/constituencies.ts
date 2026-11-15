import { readFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "../db/client";
import { constituencies, states } from "../db/schema";
import { CONSTITUENCY_FIXES, OUTDATED_STATES, STATE_NAME_FIXES } from "./corrections";
import { download } from "./lib/download";
import { upsertSource } from "./lib/sources";
import { slugify } from "./lib/text";

/**
 * IMPORT: Lok Sabha constituency boundaries (543 polygons).
 * Source: DataMeet / Arun Ganesh, india_pc_2019_simplified (CC0 1.0).
 */
export const PC_BOUNDARIES = {
  url: "https://raw.githubusercontent.com/datameet/maps/master/parliamentary-constituencies/india_pc_2019_simplified.geojson",
  page: "https://github.com/datameet/maps/tree/master/parliamentary-constituencies",
  file: "india_pc_2019_simplified.geojson",
};

// Validate the file's shape before trusting it (external data = untrusted input).
const Feature = z.object({
  properties: z.object({
    st_name: z.string(),
    pc_no: z.number().int(),
    pc_name: z.string(),
    pc_name_hi: z.string().nullable().optional(),
    pc_category: z.string().nullable().optional(),
    wikidata_qid: z.string().nullable().optional(),
  }),
  geometry: z.object({ type: z.enum(["Polygon", "MultiPolygon"]) }).passthrough(),
});
const FeatureCollection = z.object({ features: z.array(Feature).length(543) });

export const canonicalState = (mapName: string) => STATE_NAME_FIXES[mapName] ?? mapName.replace(/ & /g, " and ");

export async function importConstituencies(db: Database) {
  console.log("▶ Constituencies (Lok Sabha boundaries)");
  const file = await download(PC_BOUNDARIES.url, PC_BOUNDARIES.file, { maxAgeDays: 365 });
  const { features } = FeatureCollection.parse(JSON.parse(readFileSync(file, "utf8")));

  const sourceId = await upsertSource(db, {
    url: PC_BOUNDARIES.page,
    title: "Parliamentary constituency boundaries of India (simplified, 2019)",
    publisher: "DataMeet / Arun Ganesh",
    kind: "DATASET",
    license: "CC0 1.0",
  });

  // 1. Apply documented corrections
  const rows = features.map(({ properties: p, geometry }) => {
    const fix = CONSTITUENCY_FIXES.find((f) => f.state === p.st_name && f.number === p.pc_no);
    const name = fix?.name ?? p.pc_name;
    return {
      state: fix?.newState ?? canonicalState(p.st_name),
      number: fix?.newNumber ?? p.pc_no,
      name,
      // A renamed seat's Hindi name would be the OLD name, so drop it rather than show something wrong.
      nameHi: fix?.name ? null : (p.pc_name_hi ?? null),
      reservation: p.pc_category === "SC" || p.pc_category === "ST" ? p.pc_category : ("GEN" as const),
      boundaryOutdated: Boolean(fix?.boundaryOutdated || OUTDATED_STATES.has(p.st_name)),
      wikidataQid: fix?.name ? null : (p.wikidata_qid ?? null),
      geometry: JSON.stringify(geometry),
    };
  });

  // 2. Slugs: "Hamirpur" exists in both Himachal Pradesh and Uttar Pradesh → add the state when a name repeats
  const nameCount = new Map<string, number>();
  for (const r of rows) nameCount.set(r.name, (nameCount.get(r.name) ?? 0) + 1);

  // 3. Upsert states, then constituencies, in one transaction
  await db.transaction(async (tx) => {
    const stateIds = new Map<string, number>();
    for (const name of new Set(rows.map((r) => r.state))) {
      const [s] = await tx
        .insert(states)
        .values({ name })
        .onConflictDoUpdate({ target: states.name, set: { name } })
        .returning({ id: states.id });
      stateIds.set(name, s!.id);
    }

    for (const r of rows) {
      const slug = slugify(nameCount.get(r.name)! > 1 ? `${r.name} ${r.state}` : r.name);
      // ST_MakeValid fixes self-intersections that would break ST_Contains;
      // ST_CollectionExtract(…, 3) keeps only polygons; ST_Multi makes every row a MultiPolygon.
      const boundary = sql`ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(${r.geometry}), 4326)), 3))`;
      const values = {
        house: "LOK_SABHA" as const,
        stateId: stateIds.get(r.state)!,
        number: r.number,
        name: r.name,
        nameHi: r.nameHi,
        slug,
        reservation: r.reservation,
        boundary,
        boundarySourceId: sourceId,
        boundaryOutdated: r.boundaryOutdated,
        wikidataQid: r.wikidataQid,
      };
      await tx
        .insert(constituencies)
        // The geometry is a SQL expression, not a plain value, hence the cast for the column type.
        .values(values as unknown as typeof constituencies.$inferInsert)
        .onConflictDoUpdate({
          target: [constituencies.house, constituencies.stateId, constituencies.number],
          set: { ...(values as unknown as Partial<typeof constituencies.$inferInsert>) },
        });
    }
  });

  const outdated = rows.filter((r) => r.boundaryOutdated).length;
  console.log(`  ✓ ${rows.length} constituencies in ${new Set(rows.map((r) => r.state)).size} states/UTs (${outdated} flagged as outdated boundaries)`);
}
