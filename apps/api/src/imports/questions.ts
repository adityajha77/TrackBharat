import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "../db/client";
import { representatives, terms } from "../db/schema";
import { DATA_DIR } from "./lib/download";
import { upsertSource } from "./lib/sources";

/**
 * IMPORT: every question each MP asked in the 17th and 18th Lok Sabha
 * (sansad.in questions API, filtered per member).
 *
 * This is a small CRAWLER, so it has to be a polite one:
 *  - at most 4 requests in flight, with a pause between batches;
 *  - retries with exponential backoff when the server hiccups;
 *  - identifies itself with a User-Agent;
 *  - caches the result on disk, so re-running the import doesn't hit the
 *    server again (delete apps/api/.data/questions-ls*.json to refresh).
 */
const API = "https://sansad.in/api_ls/question/qetFilteredQuestionsAns"; // ("qet" is the real, misspelt endpoint)
const LEGISLATURES = [18, 17];
const CONCURRENCY = 4;
const PAGE_SIZE = 1000;
const USER_AGENT = "TrackBharat-data-import/0.1 (+https://github.com/adityajha77/TrackBharat)";

const Question = z.object({
  quesNo: z.coerce.number().int(),
  date: z.string().regex(/^\d{2}\.\d{2}\.\d{4}$/), // "12.08.2026" (dd.mm.yyyy)
  ministry: z.string().nullable(),
  type: z.string().nullable(),
  subjects: z.string().nullable(),
});
const Page = z.array(z.object({ totalRecordSize: z.number().int(), listOfQuestions: z.array(Question) })).min(1);

type Row = { mpsno: number; q: number; d: string; m: string; t: string; s: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const toIsoDate = (ddmmyyyy: string) => ddmmyyyy.split(".").reverse().join("-");

async function fetchJson(url: string, attempt = 1): Promise<unknown> {
  try {
    const res = await fetch(url, { headers: { "user-agent": USER_AGENT, accept: "application/json" }, signal: AbortSignal.timeout(60_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    if (attempt >= 4) throw new Error(`Giving up on ${url}: ${e instanceof Error ? e.message : e}`);
    await sleep(1000 * 2 ** attempt); // 2s, 4s, 8s: back off so we don't hammer a struggling server
    return fetchJson(url, attempt + 1);
  }
}

async function questionsFor(ls: number, mpsno: number): Promise<Row[]> {
  const rows: Row[] = [];
  for (let page = 1; ; page++) {
    const [data] = Page.parse(await fetchJson(`${API}?loksabhaNo=${ls}&memberCode=${mpsno}&pageNo=${page}&pageSize=${PAGE_SIZE}&locale=en`));
    for (const q of data!.listOfQuestions) {
      rows.push({ mpsno, q: q.quesNo, d: toIsoDate(q.date), m: (q.ministry ?? "UNKNOWN").trim(), t: (q.type ?? "").trim() || "UNKNOWN", s: (q.subjects ?? "").trim() });
    }
    if (rows.length >= data!.totalRecordSize || data!.listOfQuestions.length < PAGE_SIZE) return rows;
  }
}

/**
 * RESUMABLE crawl. Progress is saved to a "partial" file as we go, keyed by
 * member. If the run dies (network blip, laptop sleeps), the next run skips the
 * members already fetched. A member that still fails after retries is skipped
 * and reported, so one bad request can't throw away 20 minutes of work.
 */
async function crawl(ls: number, mpsnos: number[]): Promise<Row[]> {
  const cache = path.join(DATA_DIR, `questions-ls${ls}.json`);
  const partial = path.join(DATA_DIR, `questions-ls${ls}.partial.json`);
  const maxAgeDays = ls === 18 ? 7 : 3650; // the 17th Lok Sabha is finished: its record never changes
  if (existsSync(cache) && (Date.now() - statSync(cache).mtimeMs) / 86_400_000 < maxAgeDays) {
    console.log(`  ↳ using cached ${path.basename(cache)}`);
    return JSON.parse(readFileSync(cache, "utf8")) as Row[];
  }
  const byMember: Record<string, Row[]> = existsSync(partial) ? JSON.parse(readFileSync(partial, "utf8")) : {};
  const todo = mpsnos.filter((id) => !(id in byMember));
  if (todo.length < mpsnos.length) console.log(`  ↳ resuming LS${ls}: ${mpsnos.length - todo.length} members already fetched`);
  const failed: number[] = [];

  for (let i = 0; i < todo.length; i += CONCURRENCY) {
    const ids = todo.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(ids.map((id) => questionsFor(ls, id)));
    results.forEach((r, j) => (r.status === "fulfilled" ? (byMember[ids[j]!] = r.value) : failed.push(ids[j]!)));
    const done = Object.keys(byMember).length;
    if ((i / CONCURRENCY) % 10 === 9) {
      writeFileSync(partial, JSON.stringify(byMember)); // checkpoint
      console.log(`  ↳ LS${ls}: ${done}/${mpsnos.length} members`);
    }
    await sleep(250);
  }
  writeFileSync(partial, JSON.stringify(byMember));
  if (failed.length) {
    console.log(`  ! ${failed.length} member(s) failed (${failed.slice(0, 5).join(", ")}…). Re-run the import to retry just those.`);
    return Object.values(byMember).flat(); // use what we have; the cache file is NOT written, so a re-run resumes
  }
  const all = Object.values(byMember).flat();
  writeFileSync(cache, JSON.stringify(all));
  return all;
}

export async function importQuestions(db: Database) {
  console.log("▶ Parliamentary questions (sansad.in)");
  await upsertSource(db, {
    url: "https://sansad.in/ls/questions/questions-and-answers",
    title: "Lok Sabha questions and answers",
    publisher: "Lok Sabha Secretariat (sansad.in)",
    kind: "OFFICIAL",
  });

  for (const ls of LEGISLATURES) {
    // Everyone who held a seat in that Lok Sabha and has an official member id
    const members = await db
      .selectDistinct({ id: representatives.id, mpsno: representatives.sansadMemberId })
      .from(terms)
      .innerJoin(representatives, eq(representatives.id, terms.representativeId))
      .where(and(eq(terms.legislature, ls), isNotNull(representatives.sansadMemberId)));
    if (!members.length) {
      console.log(`  ↳ no members of the ${ls}th Lok Sabha imported yet: run "members" / "previous-members" first`);
      continue;
    }
    const repByMpsno = new Map(members.map((m) => [m.mpsno!, m.id]));
    const rows = await crawl(ls, [...repByMpsno.keys()]);

    await db.transaction(async (tx) => {
      await tx.execute(sql`DELETE FROM parliament_questions WHERE legislature = ${ls}`);
      for (let i = 0; i < rows.length; i += 5000) {
        const batch = rows.slice(i, i + 5000).map((r) => ({ ...r, rep: repByMpsno.get(r.mpsno) }));
        await tx.execute(sql`
          INSERT INTO parliament_questions (representative_id, legislature, question_no, asked_on, ministry, type, subject)
          SELECT r.rep, ${ls}, r.q, r.d::date, r.m, r.t, r.s
          FROM json_to_recordset(${JSON.stringify(batch)}::json) AS r(rep int, q int, d text, m text, t text, s text)
          ON CONFLICT DO NOTHING`);
      }
    });
    const [n] = (await db.execute<{ n: number; mps: number }>(sql`SELECT count(*)::int AS n, count(DISTINCT representative_id)::int AS mps FROM parliament_questions WHERE legislature = ${ls}`)).rows;
    console.log(`  ✓ ${ls}th Lok Sabha: ${n!.n} question records from ${n!.mps} MPs`);
  }
}
