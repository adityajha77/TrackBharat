import { readFileSync } from "node:fs";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "../db/client";
import { constituencies, parties, representatives, states, terms } from "../db/schema";
import { FORMER_SEAT_NAMES } from "./corrections";
import { download } from "./lib/download";
import { upsertSource } from "./lib/sources";
import { looseName, normalizeName } from "./lib/text";

/**
 * IMPORT: Members of a Lok Sabha, from Parliament's own website.
 *   - 18th (current): who represents each seat now.
 *   - 17th (2019–24): the PREVIOUS MPs, for "compare with the previous MP".
 *
 * PRIVACY: the source also publishes phone numbers, home addresses, emails,
 * dates of birth and family details. The schema below parses ONLY public-role
 * fields; everything else is dropped before it ever reaches our database.
 */
export const LOK_SABHA = 18;
export const membersSource = (ls: number) => ({
  url: `https://sansad.in/api_ls/member?loksabha=${ls}&page=1&size=1000&locale=en`,
  page: "https://sansad.in/ls/members",
  file: `lok_sabha_${ls}_members.json`,
});

const Member = z.object({
  mpsno: z.number().int(),
  mpFirstLastName: z.string(),
  gender: z.string().nullable().optional(),
  partyFname: z.string().nullable().optional(),
  partySname: z.string().nullable().optional(),
  stateName: z.string(),
  constName: z.string(),
  status: z.string(),
  noOfTerms: z.number().int().nullable().optional(),
  qualification: z.string().nullable().optional(),
  profession: z.string().nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
}); // zod strips every other key: phones/addresses never leave this function
const Response = z.object({ membersDtoList: z.array(Member).min(500) });

type TermStatus = "SITTING" | "COMPLETED" | "DIED" | "RESIGNED" | "DISQUALIFIED";

/**
 * The source's "status" describes the person TODAY. For a past Lok Sabha,
 * "Sitting" means "re-elected and sitting in the current one", so their term
 * in THAT Lok Sabha simply ran its full course.
 */
function termStatus(sourceStatus: string, current: boolean): TermStatus {
  if (sourceStatus === "Died") return "DIED";
  if (sourceStatus === "Resigned") return "RESIGNED";
  if (sourceStatus === "Disqualified") return "DISQUALIFIED";
  if (sourceStatus === "Sitting" && current) return "SITTING";
  return "COMPLETED";
}

const clean = (s: string | null | undefined) => (s && s.trim() ? s.trim() : null);

export async function importMembers(db: Database, ls: number = LOK_SABHA) {
  const current = ls === LOK_SABHA;
  console.log(`▶ Members of the ${ls}th Lok Sabha (sansad.in)`);
  const src = membersSource(ls);
  const file = await download(src.url, src.file, { maxAgeDays: current ? 7 : 365 });
  const members = Response.parse(JSON.parse(readFileSync(file, "utf8"))).membersDtoList;

  const sourceId = await upsertSource(db, {
    url: `${src.page}#lok-sabha-${ls}`,
    title: `Members of the ${ls}th Lok Sabha`,
    publisher: "Lok Sabha Secretariat (sansad.in)",
    kind: "OFFICIAL",
  });

  // Index our constituencies by (state, name) with exact and loose keys, plus name-only as a last resort
  const seats = await db
    .select({ id: constituencies.id, name: constituencies.name, state: states.name })
    .from(constituencies)
    .innerJoin(states, eq(states.id, constituencies.stateId))
    .where(and(eq(constituencies.house, "LOK_SABHA"), eq(constituencies.isDemo, false)));
  const exact = new Map(seats.map((s) => [`${normalizeName(s.state)}|${normalizeName(s.name)}`, s.id]));
  const loose = new Map(seats.map((s) => [`${normalizeName(s.state)}|${looseName(s.name)}`, s.id]));
  const byNameCount = new Map<string, number>();
  for (const s of seats) byNameCount.set(normalizeName(s.name), (byNameCount.get(normalizeName(s.name)) ?? 0) + 1);
  const uniqueByName = new Map(seats.filter((s) => byNameCount.get(normalizeName(s.name)) === 1).map((s) => [normalizeName(s.name), s.id]));

  const findSeat = (state: string, name: string) => {
    const renamed = FORMER_SEAT_NAMES[`${state}|${name}`] ?? name; // seats renamed by re-delimitation
    const st = normalizeName(state);
    return (
      exact.get(`${st}|${normalizeName(renamed)}`) ??
      loose.get(`${st}|${looseName(renamed)}`) ??
      // e.g. "Ladakh" was under J&K in the 17th Lok Sabha; the name alone is unambiguous
      uniqueByName.get(normalizeName(renamed))
    );
  };

  const unmatched: string[] = [];
  let imported = 0;
  await db.transaction(async (tx) => {
    for (const m of members) {
      const constituencyId = findSeat(m.stateName, m.constName);
      if (!constituencyId) {
        unmatched.push(`${m.stateName} / ${m.constName}`);
        continue;
      }

      let partyId: number | null = null;
      const partyName = clean(m.partyFname);
      if (partyName) {
        const [p] = await tx
          .insert(parties)
          .values({ name: partyName, shortName: clean(m.partySname) })
          .onConflictDoUpdate({ target: parties.name, set: { shortName: clean(m.partySname) } })
          .returning({ id: parties.id });
        partyId = p!.id;
      }

      const person = {
        fullName: m.mpFirstLastName.trim(),
        gender: clean(m.gender),
        education: clean(m.qualification),
        profession: clean(m.profession),
        imageUrl: m.imageUrl ?? null,
        sansadMemberId: m.mpsno,
      };
      // The same person in two Lok Sabhas is ONE representative row with two terms
      const [rep] = await tx
        .insert(representatives)
        .values(person)
        .onConflictDoUpdate({ target: representatives.sansadMemberId, set: current ? person : { fullName: person.fullName } })
        .returning({ id: representatives.id });

      const term = {
        representativeId: rep!.id,
        constituencyId,
        partyId,
        legislature: ls,
        status: termStatus(m.status, current),
        // "noOfTerms" counts terms up to TODAY, so it's only meaningful for the current Lok Sabha
        termsServed: current ? (m.noOfTerms ?? null) : null,
        sourceId,
      };
      await tx
        .insert(terms)
        .values(term)
        .onConflictDoUpdate({ target: [terms.representativeId, terms.constituencyId, terms.legislature], set: term });
      imported++;
    }
    // FAIL LOUDLY: a silently-skipped MP would be a wrong answer on the website.
    if (unmatched.length) throw new Error(`Could not match ${unmatched.length} member(s) to a constituency:\n  ${unmatched.join("\n  ")}`);
  });

  const statuses = members.reduce<Record<string, number>>((acc, m) => ((acc[termStatus(m.status, current)] = (acc[termStatus(m.status, current)] ?? 0) + 1), acc), {});
  console.log(`  ✓ ${imported} members (${Object.entries(statuses).map(([k, v]) => `${v} ${k.toLowerCase()}`).join(", ")}), no personal contact data stored`);
}

export const importPreviousMembers = (db: Database) => importMembers(db, 17);
