import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { ManifestoStatus, PromiseCategory } from "@trackbharat/shared";
import type { Database } from "../db/client";
import { manifestoPromises, manifestos, parties, partyLeaders, partyProfiles, timelineEvents } from "../db/schema";
import { createPhotoStore } from "../modules/issues/photo-store";

/**
 * IMPORT: party profiles, leaders, timeline events and manifesto promises from
 * the curated JSON in apps/api/data/parties/.
 *
 * Rules enforced here (the import FAILS rather than loading bad data):
 *  - every event, mission statement, quote and manifesto has an https source;
 *  - a manifesto verdict (fulfilled / partly / in progress / broken) needs evidence;
 *  - promises of a party that did not form the government are "didn't form
 *    government", never "broken";
 *  - leader photos come from Wikimedia Commons ONLY under a free licence (public
 *    domain / CC0 / CC BY / CC BY-SA), and the licence + author are stored for the credit.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const DIR = process.env.PARTY_DATA_DIR ?? path.resolve(here, "../../data/parties");
const https = z.url({ protocol: /^https$/, error: "must be an https:// link" });
const Day = z.iso.date();

const Event = z.object({ date: Day, precision: z.enum(["DAY", "MONTH", "YEAR"]), title: z.string().min(3), body: z.string().min(5), source: https });
const Leader = z
  .object({ name: z.string().min(2), role: z.string().min(2), years: z.string().min(2), wikipedia: z.string().optional(), quote: z.string().optional(), quoteSource: https.optional() })
  .refine((l) => !l.quote || l.quoteSource, "a quote needs quoteSource");
const Promise_ = z.object({
  category: PromiseCategory,
  text: z.string().min(10),
  page: z.number().int().positive().optional(),
  status: ManifestoStatus.optional(),
  note: z.string().optional(),
  evidence: https.optional(),
});
const Manifesto = z.object({
  year: z.number().int().min(1951).max(2100),
  /** Omit for a Lok Sabha manifesto; the state's name for an assembly election. */
  state: z.string().min(3).optional(),
  title: z.string().min(3),
  source: https,
  formedGovernment: z.boolean(),
  promises: z.array(Promise_),
});
export const PartyFile = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(2),
  shortName: z.string().min(1),
  founded: Day,
  founders: z.string().min(3),
  mission: z.string().min(10),
  missionSource: https,
  symbol: z.string().min(2),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  sortOrder: z.number().int(),
  leaders: z.array(Leader),
  events: z.array(Event),
  manifestos: z.array(Manifesto).default([]),
  /** Why there is nothing to rate (e.g. the party publishes no manifesto). Needs a source. */
  manifestoNote: z.object({ text: z.string().min(10), source: https }).optional(),
});
export type PartyFile = z.infer<typeof PartyFile>;

/** Status rules, as a pure function so they're unit-tested. */
export function promiseStatus(p: z.infer<typeof Promise_>, formedGovernment: boolean): z.infer<typeof ManifestoStatus> {
  if (!formedGovernment) {
    if (p.status && p.status !== "NOT_IN_POWER") throw new Error(`"${p.text}": a party that didn't form the government can't be rated ${p.status}`);
    return "NOT_IN_POWER";
  }
  const status = p.status ?? "NOT_RATED";
  if (!["NOT_RATED", "NOT_IN_POWER"].includes(status) && !p.evidence) throw new Error(`"${p.text}": status ${status} needs an evidence link`);
  return status;
}

export function loadPartyFiles(dir = DIR) {
  const read = (f: string) => JSON.parse(readFileSync(path.join(dir, f), "utf8")) as unknown;
  const list = [read("inc.json"), read("bjp.json"), ...(read("others.json") as unknown[])];
  const parties = list.map((p, i) => {
    const r = PartyFile.safeParse(p);
    if (!r.success) throw new Error(`party #${i + 1}: ${r.error.issues.map((x) => `${x.path.join(".")}: ${x.message}`).join("; ")}`);
    return r.data;
  });
  const national = z.array(Event).parse(read("_national.json"));
  return { parties, national };
}

// ---- Leader photos from Wikimedia Commons -----------------------------------
const UA = "TrackBharat-data-import/0.1 (+https://github.com/adityajha77/TrackBharat)";
// Free licences only. GODL-India = Government Open Data License (free reuse with attribution).
const FREE = /^(public domain|pd|cc0|cc[ -]by(-sa)?([ -]\d|$)|gfdl|attribution|godl)/i;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getJson(url: string): Promise<unknown> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(30_000) });
    if (res.status === 429) {
      await sleep(2000 * (attempt + 1)); // polite backoff on rate limits
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.json();
  }
  throw new Error(`rate limited: ${url}`);
}

const strip = (s: string) => s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

/** Returns the photo + licence, or null when the page has no FREELY licensed image. */
export async function commonsPhoto(title: string) {
  const summary = (await getJson(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`)) as { originalimage?: { source: string } };
  const src = summary.originalimage?.source;
  if (!src) return null;
  const file = decodeURIComponent(src.split("?")[0]!.split("/").pop()!); // drop ?utm_… tracking parameters
  const info = (await getJson(
    `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=480&titles=${encodeURIComponent(`File:${file}`)}`,
  )) as { query?: { pages?: Record<string, { missing?: string; imageinfo?: { thumburl?: string; descriptionurl: string; extmetadata?: Record<string, { value: string }> }[] }> } };
  const page = Object.values(info.query?.pages ?? {})[0];
  const ii = page?.imageinfo?.[0];
  if (!page || page.missing !== undefined || !ii) return null; // a local, non-Commons (often fair-use) file: skip it
  const license = strip(ii.extmetadata?.LicenseShortName?.value ?? "");
  if (!FREE.test(license)) return null;
  return { url: ii.thumburl ?? src, license, author: strip(ii.extmetadata?.Artist?.value ?? "Wikimedia Commons").slice(0, 120), sourceUrl: ii.descriptionurl };
}

export async function importParties(db: Database, opts: { photos?: boolean } = {}) {
  console.log("▶ Parties: profiles, leaders, timeline, manifestos (curated JSON)");
  const { parties: files, national } = loadPartyFiles();
  const photoStore = createPhotoStore(process.env.LEADER_PHOTOS_DIR ?? path.join(process.env.UPLOADS_DIR ?? "./.uploads", "leaders"));
  let promisesN = 0;
  let photosN = 0;

  for (const f of files) {
    const [party] = await db
      .insert(parties)
      .values({ name: f.name, shortName: f.shortName })
      .onConflictDoUpdate({ target: parties.name, set: { shortName: sql`coalesce(${parties.shortName}, ${f.shortName})` } })
      .returning({ id: parties.id });
    const partyId = party!.id;
    const profile = {
      partyId,
      slug: f.slug,
      founded: f.founded,
      founders: f.founders,
      ideologyQuote: f.mission,
      ideologySourceUrl: f.missionSource,
      symbol: f.symbol,
      color: f.color,
      sortOrder: f.sortOrder,
      manifestoNote: f.manifestoNote?.text ?? null,
      manifestoNoteSourceUrl: f.manifestoNote?.source ?? null,
    };
    await db.insert(partyProfiles).values(profile).onConflictDoUpdate({ target: partyProfiles.partyId, set: profile });

    // Events and manifestos: the files are the source of truth, so replace this party's rows.
    await db.delete(timelineEvents).where(eq(timelineEvents.partyId, partyId));
    if (f.events.length)
      await db.insert(timelineEvents).values(f.events.map((e) => ({ partyId, date: e.date, precision: e.precision, title: e.title, body: e.body, sourceUrl: e.source })));

    for (const m of f.manifestos) {
      const [row] = await db
        .insert(manifestos)
        .values({ partyId, electionYear: m.year, state: m.state ?? null, title: m.title, sourceUrl: m.source, formedGovernment: m.formedGovernment })
        .onConflictDoUpdate({ target: [manifestos.partyId, manifestos.electionYear, manifestos.state], set: { title: m.title, sourceUrl: m.source, formedGovernment: m.formedGovernment } })
        .returning({ id: manifestos.id });
      await db.delete(manifestoPromises).where(eq(manifestoPromises.manifestoId, row!.id));
      if (m.promises.length)
        await db.insert(manifestoPromises).values(
          m.promises.map((p) => ({
            manifestoId: row!.id,
            category: p.category,
            text: p.text,
            page: p.page ?? null,
            status: promiseStatus(p, m.formedGovernment),
            statusNote: p.note ?? null,
            evidenceUrl: p.evidence ?? null,
          })),
        );
      promisesN += m.promises.length;
    }

    for (const [i, l] of f.leaders.entries()) {
      const [existing] = await db.select({ photoKey: partyLeaders.photoKey }).from(partyLeaders).where(and(eq(partyLeaders.partyId, partyId), eq(partyLeaders.name, l.name)));
      let photo: { photoKey: string | null; photoLicense: string | null; photoAuthor: string | null; photoSourceUrl: string | null } | null = null;
      if (opts.photos !== false && l.wikipedia && !existing?.photoKey) {
        try {
          const p = await commonsPhoto(l.wikipedia);
          if (p) {
            const res = await fetch(p.url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(60_000) });
            if (res.ok) {
              const key = await photoStore.save(Buffer.from(await res.arrayBuffer())); // re-encoded, metadata stripped
              photo = { photoKey: key, photoLicense: p.license, photoAuthor: p.author, photoSourceUrl: p.sourceUrl };
              photosN++;
            }
          }
          await sleep(400);
        } catch (err) {
          console.warn(`  ! no photo for ${l.name}: ${String(err).slice(0, 120)}`);
        }
      }
      const values = {
        partyId,
        name: l.name,
        role: l.role,
        years: l.years,
        quote: l.quote ?? null,
        quoteSourceUrl: l.quoteSource ?? null,
        sortOrder: i,
        ...(photo ?? {}),
      };
      await db.insert(partyLeaders).values(values).onConflictDoUpdate({ target: [partyLeaders.partyId, partyLeaders.name], set: values });
    }
  }

  await db.execute(sql`DELETE FROM timeline_events WHERE party_id IS NULL`);
  await db.insert(timelineEvents).values(national.map((e) => ({ partyId: null, date: e.date, precision: e.precision, title: e.title, body: e.body, sourceUrl: e.source })));
  console.log(`  ✓ ${files.length} parties, ${promisesN} manifesto promises, ${national.length} national events, ${photosN} new photos`);
}
