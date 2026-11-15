import { readFileSync } from "node:fs";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "../db/client";
import { constituencies, parties, representatives, states, terms } from "../db/schema";
import { download } from "./lib/download";
import { upsertSource } from "./lib/sources";
import { looseName, normalizeName } from "./lib/text";

/**
 * IMPORT: Members of the 18th Lok Sabha, from Parliament's own website.
 *
 * PRIVACY: the source also publishes phone numbers, home addresses, emails,
 * dates of birth and family details. The schema below parses ONLY public-role
 * fields; everything else is dropped before it ever reaches our database.
 */
export const LOK_SABHA = 18;
export const MEMBERS_SOURCE = {
  url: `https://sansad.in/api_ls/member?loksabha=${LOK_SABHA}&page=1&size=1000&locale=en`,
  page: "https://sansad.in/ls/members",
  file: `lok_sabha_${LOK_SABHA}_members.json`,
};

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

const STATUS: Record<string, "SITTING" | "DIED" | "RESIGNED" | "DISQUALIFIED"> = {
  Sitting: "SITTING",
  Died: "DIED",
  Resigned: "RESIGNED",
  Disqualified: "DISQUALIFIED",
};

const clean = (s: string | null | undefined) => (s && s.trim() ? s.trim() : null);

export async function importMembers(db: Database) {
  console.log(`▶ Members of the ${LOK_SABHA}th Lok Sabha (sansad.in)`);
  const file = await download(MEMBERS_SOURCE.url, MEMBERS_SOURCE.file, { maxAgeDays: 7 });
  const members = Response.parse(JSON.parse(readFileSync(file, "utf8"))).membersDtoList;

  const sourceId = await upsertSource(db, {
    url: MEMBERS_SOURCE.page,
    title: `Members of the ${LOK_SABHA}th Lok Sabha`,
    publisher: "Lok Sabha Secretariat (sansad.in)",
    kind: "OFFICIAL",
  });

  // Index our constituencies by (state, name) with exact and loose keys
  const seats = await db
    .select({ id: constituencies.id, name: constituencies.name, state: states.name })
    .from(constituencies)
    .innerJoin(states, eq(states.id, constituencies.stateId))
    .where(and(eq(constituencies.house, "LOK_SABHA"), eq(constituencies.isDemo, false)));
  const exact = new Map(seats.map((s) => [`${normalizeName(s.state)}|${normalizeName(s.name)}`, s.id]));
  const loose = new Map(seats.map((s) => [`${normalizeName(s.state)}|${looseName(s.name)}`, s.id]));

  const unmatched: string[] = [];
  let imported = 0;
  await db.transaction(async (tx) => {
    for (const m of members) {
      const status = STATUS[m.status] ?? ("COMPLETED" as const);
      const st = normalizeName(m.stateName);
      const constituencyId = exact.get(`${st}|${normalizeName(m.constName)}`) ?? loose.get(`${st}|${looseName(m.constName)}`);
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
      const [rep] = await tx
        .insert(representatives)
        .values(person)
        .onConflictDoUpdate({ target: representatives.sansadMemberId, set: person })
        .returning({ id: representatives.id });

      const term = {
        representativeId: rep!.id,
        constituencyId,
        partyId,
        legislature: LOK_SABHA,
        status,
        termsServed: m.noOfTerms ?? null,
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

  const sitting = members.filter((m) => m.status === "Sitting").length;
  console.log(`  ✓ ${imported} members (${sitting} sitting, ${imported - sitting} former: died/resigned), no personal contact data stored`);
}
