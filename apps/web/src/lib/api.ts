import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import {
  ApiErrorBody,
  ConstituencyDetail,
  ConstituencyIndexResponse,
  PincodeConstituenciesResponse,
  PincodeLookupResponse,
  Insights,
  Leaderboard,
  PromiseDetail,
  ReportCard,
  WeeklyHighlights,
  CausesResponse,
  NewsList,
  NetaResponse,
  PartiesResponse,
  PartyDetail,
  Timeline,
} from "@trackbharat/shared";
import type { z } from "zod";

/**
 * Typed API client, used ONLY on the server (the "server-only" import makes the
 * build fail if a client component ever imports it).
 *
 * Every response is validated with the shared Zod schema. If the API and the
 * web app ever disagree about a shape, we get a clear error here instead of
 * `undefined is not a function` somewhere deep in a component.
 */
const API_URL = process.env.API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

async function request<T extends z.ZodType>(path: string, schema: T): Promise<z.infer<T>> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { headers: { accept: "application/json" } });
  } catch {
    throw new ApiError(503, "API_UNREACHABLE", "The TrackBharat API is not reachable. Is it running?");
  }
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const err = ApiErrorBody.safeParse(json);
    throw new ApiError(res.status, err.success ? err.data.error.code : "UNKNOWN", err.success ? err.data.error.message : `HTTP ${res.status}`);
  }
  return schema.parse(json);
}

/**
 * ERRORS AND "use cache". An error thrown INSIDE a cached function crosses the
 * cache boundary as a plain Error: it loses its class (`instanceof ApiError` is
 * false) and its status, so a missing constituency would render a crash page
 * instead of a 404. (Found by the Playwright tests.)
 *
 * So cached functions never throw expected errors. They RETURN them as plain
 * data (capture), and the exported wrapper re-throws a real ApiError OUTSIDE the
 * cache (unwrap). Only 4xx answers are captured: they are stable facts about the
 * request ("no such seat") and fine to cache. 5xx / API-down errors still throw
 * inside the cache, so an outage is never remembered for hours.
 */
type Wrapped<T> = { ok: true; data: T } | { ok: false; status: number; code: string; message: string };

async function capture<T>(run: () => Promise<T>): Promise<Wrapped<T>> {
  try {
    return { ok: true, data: await run() };
  } catch (e) {
    if (e instanceof ApiError && e.status >= 400 && e.status < 500) return { ok: false, status: e.status, code: e.code, message: e.message };
    throw e;
  }
}

function unwrap<T>(w: Wrapped<T>): T {
  if (w.ok) return w.data;
  throw new ApiError(w.status, w.code, w.message);
}

/**
 * `"use cache"` memoises the result across requests on the Next.js server:
 * 1000 people opening /area/560034 → 1 API call per cache lifetime.
 * `cacheTag` lets us purge one PIN code later with `revalidateTag("pincode:560034")`.
 */
async function cachedGetPincode(pincode: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(`pincode:${pincode}`);
  return capture(() => request(`/v1/pincodes/${pincode}`, PincodeLookupResponse));
}
export async function getPincode(pincode: string) {
  return unwrap(await cachedGetPincode(pincode));
}

async function cachedGetPincodeConstituencies(pincode: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(`pincode:${pincode}`);
  return capture(() => request(`/v1/pincodes/${pincode}/constituencies`, PincodeConstituenciesResponse));
}
export async function getPincodeConstituencies(pincode: string) {
  return unwrap(await cachedGetPincodeConstituencies(pincode));
}

/** The 543-seat index changes only when boundaries do: cache for days. */
async function cachedGetConstituencyIndex() {
  "use cache";
  cacheLife("days");
  cacheTag("constituencies");
  return capture(() => request(`/v1/constituencies`, ConstituencyIndexResponse));
}
export async function getConstituencyIndex() {
  return unwrap(await cachedGetConstituencyIndex());
}

/** Promises change through admin edits; minutes-long cache, purgeable per seat. */
async function cachedGetConstituency(slug: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag(`constituency:${slug}`);
  return capture(() => request(`/v1/constituencies/${slug}`, ConstituencyDetail));
}
export async function getConstituency(slug: string) {
  return unwrap(await cachedGetConstituency(slug));
}

/** Last finished week's top issues: frozen by the weekly job, so cache for an hour. */
async function cachedGetHighlights(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(`highlights:${slug}`);
  return capture(() => request(`/v1/constituencies/${slug}/issues/highlights`, WeeklyHighlights));
}
export async function getHighlights(slug: string) {
  return unwrap(await cachedGetHighlights(slug));
}

async function cachedGetPromise(id: number) {
  "use cache";
  cacheLife("minutes");
  cacheTag(`promise:${id}`);
  return capture(() => request(`/v1/promises/${id}`, PromiseDetail));
}
export async function getPromise(id: number) {
  return unwrap(await cachedGetPromise(id));
}

/** Report cards change slowly (questions are imported weekly; promises by edits). */
async function cachedGetReportCard(slug: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag(`constituency:${slug}`);
  return capture(() => request(`/v1/constituencies/${slug}/report-card`, ReportCard));
}
export async function getReportCard(slug: string) {
  return unwrap(await cachedGetReportCard(slug));
}

async function cachedGetInsights() {
  "use cache";
  cacheLife("minutes");
  cacheTag("insights");
  return capture(() => request("/v1/insights", Insights));
}
export async function getInsights() {
  return unwrap(await cachedGetInsights());
}

/** The leaderboard is near-live: a one-minute cache keeps the API cheap under load. */
async function cachedGetLeaderboard(period: "day" | "week") {
  "use cache";
  cacheLife("minutes");
  cacheTag(`leaderboard:${period}`);
  return capture(() => request(`/v1/leaderboard?period=${period}`, Leaderboard));
}
export async function getLeaderboard(period: "day" | "week") {
  return unwrap(await cachedGetLeaderboard(period));
}

// ---- Phase 3b: causes, news, parties, timeline, netas ------------------------

/** Logged-out view of this week's causes (no "my vote"): cached for a minute. */
async function cachedGetCauses() {
  "use cache";
  cacheLife("minutes");
  cacheTag("causes");
  return capture(() => request(`/v1/causes/current`, CausesResponse));
}
export async function getCausesPublic() {
  return unwrap(await cachedGetCauses());
}

async function cachedGetNews(state: string | null) {
  "use cache";
  cacheLife("minutes");
  cacheTag("news");
  return capture(() => request(`/v1/news${state ? `?state=${encodeURIComponent(state)}` : ""}`, NewsList));
}
export async function getNews(state: string | null = null) {
  return unwrap(await cachedGetNews(state));
}

/** Curated party data changes when the import runs: cache for hours. */
async function cachedGetParties() {
  "use cache";
  cacheLife("hours");
  cacheTag("parties");
  return capture(() => request(`/v1/parties`, PartiesResponse));
}
export async function getParties() {
  return unwrap(await cachedGetParties());
}

async function cachedGetParty(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("parties");
  return capture(() => request(`/v1/parties/${slug}`, PartyDetail));
}
export async function getParty(slug: string) {
  return unwrap(await cachedGetParty(slug));
}

async function cachedGetTimeline() {
  "use cache";
  cacheLife("hours");
  cacheTag("parties");
  return capture(() => request(`/v1/timeline`, Timeline));
}
export async function getTimeline() {
  return unwrap(await cachedGetTimeline());
}

async function cachedGetNetas(house: "LOK_SABHA" | "VIDHAN_SABHA") {
  "use cache";
  cacheLife("hours");
  cacheTag("netas");
  return capture(() => request(`/v1/netas?house=${house}`, NetaResponse));
}
export async function getNetas(house: "LOK_SABHA" | "VIDHAN_SABHA") {
  return unwrap(await cachedGetNetas(house));
}
