import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "../db/client";
import { upsertSource } from "../db/helpers";
import { constituencies, parties, representatives, states, terms } from "../db/schema";
import { looseName, normalizeName, parseCsvLine } from "./lib/text";

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
  const skipped: string[] = [];
  /** Same seat? Names differ in spelling across sources ("Mahbubnagar"/"Mahabubnagar"), so compare loosely. */
  const sameSeat = (a: string, b: string) => {
    const [x, y] = [normalizeName(a), normalizeName(b)];
    return x === y || x.startsWith(y) || y.startsWith(x) || looseName(a) === looseName(b);
  };

  await db.transaction(async (tx) => {
    for (const file of files) {
      const rows = parseMlaCsv(readFileSync(path.join(MLA_DIR, file), "utf8"), file);
      // Look up every seat first: number AND name must agree with our map.
      const checked = [];
      for (const r of rows) {
        const [seat] = await tx
          .select({ id: constituencies.id, name: constituencies.name })
          .from(constituencies)
          .innerJoin(states, eq(states.id, constituencies.stateId))
          .where(and(eq(constituencies.house, "VIDHAN_SABHA"), eq(states.name, r.state), eq(constituencies.number, r.ac_number)));
        if (!seat) skipped.push(`${file}: no seat #${r.ac_number} (${r.ac_name}) in our ${r.state} map`);
        else if (!sameSeat(seat.name, r.ac_name)) skipped.push(`${file}: #${r.ac_number} is "${seat.name}" in our map, "${r.ac_name}" in the file`);
        else checked.push({ r, seatId: seat.id });
      }
      // Many mismatches = the numbering in the file is off: load nothing from it rather than wrong MLAs.
      if (checked.length < rows.length * 0.8) {
        console.warn(`  ! ${file}: only ${checked.length}/${rows.length} seats match our map; file skipped`);
        continue;
      }
      for (const { r, seatId } of checked) {
        // Wikipedia is a secondary source (its tables cite ECI): never label it "official".
        const kind = r.source_url.includes("wikipedia.org") ? ("OTHER" as const) : ("OFFICIAL" as const);
        const sourceId = await upsertSource(tx, { url: r.source_url, title: r.source_title, publisher: r.source_publisher, kind });
        const [party] = await tx.insert(parties).values({ name: r.party }).onConflictDoUpdate({ target: parties.name, set: { name: r.party } }).returning({ id: parties.id });
        // MLAs have no stable official id across states, so a person is identified by name + seat
        const existing = await tx
          .select({ id: representatives.id })
          .from(representatives)
          .innerJoin(terms, eq(terms.representativeId, representatives.id))
          .where(and(eq(representatives.fullName, r.mla_name), eq(terms.constituencyId, seatId)));
        const repId = existing[0]?.id ?? (await tx.insert(representatives).values({ fullName: r.mla_name }).returning({ id: representatives.id }))[0]!.id;

        // A newer election replaces the previous sitting member of this seat.
        await tx.update(terms).set({ status: "COMPLETED" }).where(and(eq(terms.constituencyId, seatId), eq(terms.status, "SITTING"), sql`${terms.legislature} < ${r.election_year}`));
        const term = { representativeId: repId, constituencyId: seatId, partyId: party!.id, legislature: r.election_year, status: "SITTING" as const, sourceId };
        await tx.insert(terms).values(term).onConflictDoUpdate({ target: [terms.representativeId, terms.constituencyId, terms.legislature], set: term });
        imported++;
      }
    }
  });
  for (const s of skipped.slice(0, 15)) console.warn(`  ! skipped ${s}`);
  if (skipped.length > 15) console.warn(`  ! …and ${skipped.length - 15} more skipped rows`);
  console.log(`  ✓ ${imported} MLAs from ${files.length} file(s), ${skipped.length} rows skipped (seat not in our map or name mismatch)`);
}
