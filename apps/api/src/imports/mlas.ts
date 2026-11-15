import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "../db/client";
import { upsertSource } from "../db/helpers";
import { constituencies, parties, representatives, states, terms } from "../db/schema";
import { parseCsvLine } from "./lib/text";

/**
 * IMPORT: MLAs from curated, source-cited CSV files in apps/api/data/mlas/.
 *
 * Why CSV instead of an API? There is no national, open, machine-readable list
 * of India's ~4,000 MLAs: each of the 31 legislatures publishes differently
 * (often PDFs), Wikidata covers ~1 in 200, and ECI's results pages are taken
 * down after a while. So MLAs are added state by state, by a person, with
 * the official source URL on EVERY row (see data/mlas/README.md).
 */
const here = path.dirname(fileURLToPath(import.meta.url));
export const MLA_DIR = process.env.MLA_DATA_DIR ?? path.resolve(here, "../../data/mlas");

export const MlaRow = z.object({
  state: z.string().min(2),
  ac_number: z.coerce.number().int().positive(),
  ac_name: z.string().min(2),
  mla_name: z.string().min(3),
  party: z.string().min(2),
  election_year: z.coerce.number().int().min(1990).max(2100),
  source_url: z.url({ protocol: /^https$/, error: "source_url must be an https:// link" }),
  source_title: z.string().min(3),
  source_publisher: z.string().min(2),
});
export type MlaRow = z.infer<typeof MlaRow>;

/** Parse one CSV file into validated rows, reporting line numbers on error. */
export function parseMlaCsv(text: string, file = "input.csv"): MlaRow[] {
  const [header, ...lines] = text.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith("#"));
  if (!header) return [];
  const cols = parseCsvLine(header).map((c) => c.trim());
  return lines.map((line, i) => {
    const values = parseCsvLine(line);
    const parsed = MlaRow.safeParse(Object.fromEntries(cols.map((c, j) => [c, values[j]?.trim()])));
    if (!parsed.success) throw new Error(`${file}, data row ${i + 1}: ${parsed.error.issues.map((x) => `${x.path.join(".")}: ${x.message}`).join("; ")}`);
    return parsed.data;
  });
}

export async function importMlas(db: Database) {
  console.log("▶ MLAs (curated CSV files)");
  const files = existsSync(MLA_DIR) ? readdirSync(MLA_DIR).filter((f) => f.endsWith(".csv")) : [];
  if (!files.length) {
    console.log(`  ↳ no CSV files in ${MLA_DIR}: nothing to import (see data/mlas/README.md)`);
    return;
  }

  let imported = 0;
  await db.transaction(async (tx) => {
    for (const file of files) {
      const rows = parseMlaCsv(readFileSync(path.join(MLA_DIR, file), "utf8"), file);
      for (const r of rows) {
        const [seat] = await tx
          .select({ id: constituencies.id })
          .from(constituencies)
          .innerJoin(states, eq(states.id, constituencies.stateId))
          .where(and(eq(constituencies.house, "VIDHAN_SABHA"), eq(states.name, r.state), eq(constituencies.number, r.ac_number)));
        if (!seat) throw new Error(`${file}: no assembly seat #${r.ac_number} (${r.ac_name}) in ${r.state}`);

        const sourceId = await upsertSource(tx, { url: r.source_url, title: r.source_title, publisher: r.source_publisher, kind: "OFFICIAL" });
        const [party] = await tx.insert(parties).values({ name: r.party }).onConflictDoUpdate({ target: parties.name, set: { name: r.party } }).returning({ id: parties.id });
        // MLAs have no stable official id across states, so a person is identified by name + seat
        const existing = await tx
          .select({ id: representatives.id })
          .from(representatives)
          .innerJoin(terms, eq(terms.representativeId, representatives.id))
          .where(and(eq(representatives.fullName, r.mla_name), eq(terms.constituencyId, seat.id)));
        const repId = existing[0]?.id ?? (await tx.insert(representatives).values({ fullName: r.mla_name }).returning({ id: representatives.id }))[0]!.id;

        const term = { representativeId: repId, constituencyId: seat.id, partyId: party!.id, legislature: r.election_year, status: "SITTING" as const, sourceId };
        await tx.insert(terms).values(term).onConflictDoUpdate({ target: [terms.representativeId, terms.constituencyId, terms.legislature], set: term });
        imported++;
      }
    }
  });
  console.log(`  ✓ ${imported} MLAs from ${files.length} file(s)`);
}
