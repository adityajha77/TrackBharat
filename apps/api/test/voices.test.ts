import { afterEach, describe, expect, it, vi } from "vitest";
import { CausesResponse, NewsList, VoteResponse } from "@trackbharat/shared";
import { buildApp } from "../src/app";
import { parseFeed } from "../src/modules/news/rss";
import { promiseStatus, loadPartyFiles } from "../src/imports/parties";
import { parseMlaCsv } from "../src/imports/mlas";
import { bearer, deps } from "./helpers";

/** Phase 3b: votes up/down, causes, news, manifestos. Unit + HTTP tests (no database). */

describe("RSS / Atom parsing", () => {
  const rss = `<?xml version="1.0"?><rss version="2.0"><channel><title>Feed</title>
    <item><title><![CDATA[Village in <b>Odisha</b> waits for a bridge &#8217;s repair]]></title><link>https://example.in/a</link>
      <guid isPermaLink="false">abc-1</guid><pubDate>Mon, 10 Nov 2031 08:00:00 +0530</pubDate>
      <description>THE FULL FIRST PARAGRAPH OF THE ARTICLE</description></item>
    <item><title>No link, skipped</title></item>
    <item><title>Bad scheme</title><link>javascript:alert(1)</link></item>
  </channel></rss>`;

  it("keeps headline, link, id and date, and never the description", () => {
    const [e, ...rest] = parseFeed(rss);
    expect(rest).toHaveLength(0); // the link-less and javascript: items are dropped
    expect(e).toMatchObject({ guid: "abc-1", headline: "Village in Odisha waits for a bridge ’s repair", url: "https://example.in/a" });
    expect(e!.publishedAt?.toISOString()).toBe("2031-11-10T02:30:00.000Z");
    expect(JSON.stringify(e)).not.toContain("FIRST PARAGRAPH");
  });

  it("reads Atom feeds", () => {
    const atom = `<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Atom story</title><id>tag:x,1</id>
      <link rel="alternate" href="https://example.in/atom"/><updated>2031-11-10T00:00:00Z</updated></entry></feed>`;
    expect(parseFeed(atom)).toEqual([{ guid: "tag:x,1", headline: "Atom story", url: "https://example.in/atom", publishedAt: new Date("2031-11-10T00:00:00Z") }]);
  });

  it("returns nothing (no crash) for junk", () => {
    expect(parseFeed("<html>not a feed</html>")).toEqual([]);
  });
});

describe("manifesto status rules", () => {
  const p = { category: "HEALTH" as const, text: "A promise about health" };
  it("a party out of power is 'didn't form government', never 'broken'", () => {
    expect(promiseStatus(p, false)).toBe("NOT_IN_POWER");
    expect(() => promiseStatus({ ...p, status: "BROKEN", evidence: "https://x.in" }, false)).toThrow(/didn't form/);
  });
  it("a verdict needs evidence; no verdict means 'not yet rated'", () => {
    expect(promiseStatus(p, true)).toBe("NOT_RATED");
    expect(() => promiseStatus({ ...p, status: "FULFILLED" }, true)).toThrow(/evidence/);
    expect(promiseStatus({ ...p, status: "FULFILLED", evidence: "https://x.in" }, true)).toBe("FULFILLED");
  });
  it("every curated party file is valid and evenly structured", () => {
    const { parties, national } = loadPartyFiles();
    expect(parties.length).toBeGreaterThanOrEqual(6);
    expect(national.length).toBeGreaterThan(5);
    for (const party of parties) {
      expect(party.events.length, party.slug).toBeGreaterThanOrEqual(2);
      expect(party.leaders.length, party.slug).toBeGreaterThanOrEqual(1);
      for (const m of party.manifestos) for (const pr of m.promises) promiseStatus(pr, m.formedGovernment); // throws on a bad verdict
    }
  });
});

describe("MLA CSV", () => {
  it("rejects a row without an https source", () => {
    const csv = "state,ac_number,ac_name,mla_name,party,election_year,source_url,source_title,source_publisher\nX,1,Seat,Some Name,Party,2024,http://insecure,Title,Pub";
    expect(() => parseMlaCsv(csv)).toThrow(/https/);
  });
  it("ignores # comment lines", () => {
    const csv = "state,ac_number,ac_name,mla_name,party,election_year,source_url,source_title,source_publisher\n# generated\nXland,1,Seat,Some Name,Party,2024,https://a.in,Title,Pub";
    expect(parseMlaCsv(csv)).toHaveLength(1);
  });
});

describe("HTTP: votes, causes, news", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  afterEach(() => app?.close());

  it("POST /issues/:id/vote takes { value: -1 } and defaults to +1", async () => {
    const vote = vi.fn().mockResolvedValue({ myVote: -1, up: 3, down: 1, counted: true });
    app = await buildApp(deps({ issueService: { ...deps().issueService, vote } }));
    const down = await app.inject({ method: "POST", url: "/v1/issues/7/vote", headers: bearer("CITIZEN"), payload: { value: -1 } });
    expect(down.statusCode).toBe(200);
    expect(VoteResponse.parse(down.json()).myVote).toBe(-1);
    expect(vote).toHaveBeenLastCalledWith(expect.objectContaining({ id: 1 }), 7, -1);
    await app.inject({ method: "POST", url: "/v1/issues/7/vote", headers: bearer("CITIZEN") });
    expect(vote).toHaveBeenLastCalledWith(expect.anything(), 7, 1);
    const bad = await app.inject({ method: "POST", url: "/v1/issues/7/vote", headers: bearer("CITIZEN"), payload: { value: 5 } });
    expect(bad.statusCode).toBe(400);
  });

  it("voting needs an account", async () => {
    app = await buildApp(deps());
    expect((await app.inject({ method: "POST", url: "/v1/causes/1/vote", payload: { value: 1 } })).statusCode).toBe(401);
  });

  it("GET /causes/current is public and cacheable when logged out", async () => {
    const current = vi.fn().mockResolvedValue({ weekStart: "2031-11-10", causes: [] });
    app = await buildApp(deps({ causesService: { ...deps().causesService, current } }));
    const res = await app.inject({ url: "/v1/causes/current" });
    expect(CausesResponse.parse(res.json()).weekStart).toBe("2031-11-10");
    expect(res.headers["cache-control"]).toContain("public");
  });

  it("only moderators can edit a cause", async () => {
    const update = vi.fn();
    app = await buildApp(deps({ causesService: { ...deps().causesService, update } }));
    const citizen = await app.inject({ method: "PATCH", url: "/v1/moderation/causes/1", headers: bearer("CITIZEN"), payload: { pinned: true } });
    expect(citizen.statusCode).toBe(403);
    const mod = await app.inject({ method: "PATCH", url: "/v1/moderation/causes/1", headers: bearer("MODERATOR"), payload: { pinned: true } });
    expect(mod.statusCode).toBe(204);
  });

  it("verifiers review news; citizens can't", async () => {
    const review = vi.fn();
    app = await buildApp(deps({ newsService: { ...deps().newsService, review } }));
    const body = { decision: "PUBLISH", summary: "x".repeat(80), state: "Odisha", category: "WATER" };
    expect((await app.inject({ method: "POST", url: "/v1/moderation/news/3", headers: bearer("CITIZEN"), payload: body })).statusCode).toBe(403);
    expect((await app.inject({ method: "POST", url: "/v1/moderation/news/3", headers: bearer("VERIFIER"), payload: body })).statusCode).toBe(204);
    // A summary that's too short to be our own 2–5 lines is refused
    const short = await app.inject({ method: "POST", url: "/v1/moderation/news/3", headers: bearer("VERIFIER"), payload: { ...body, summary: "short" } });
    expect(short.statusCode).toBe(400);
  });

  it("GET /news returns the shared shape", async () => {
    const published = vi.fn().mockResolvedValue({ items: [], states: [] });
    app = await buildApp(deps({ newsService: { ...deps().newsService, published } }));
    expect(NewsList.parse((await app.inject({ url: "/v1/news?state=Odisha" })).json())).toEqual({ items: [], states: [] });
    expect(published).toHaveBeenCalledWith({ state: "Odisha", limit: undefined });
  });

  it("staff can add and publish a story directly; citizens can't", async () => {
    const create = vi.fn().mockResolvedValue(9);
    app = await buildApp(deps({ newsService: { ...deps().newsService, create } }));
    const body = { url: "https://www.thehindu.com/news/x", headline: "A headline that is long enough", summary: "y".repeat(80), state: "Odisha", category: "WATER" };
    expect((await app.inject({ method: "POST", url: "/v1/moderation/news", headers: bearer("CITIZEN"), payload: body })).statusCode).toBe(403);
    const ok = await app.inject({ method: "POST", url: "/v1/moderation/news", headers: bearer("ADMIN"), payload: body });
    expect(ok.statusCode).toBe(201);
    expect(ok.json()).toEqual({ id: 9 });
  });

  it("GET /news/headlines is public and passes the filters on", async () => {
    const headlines = vi.fn().mockResolvedValue({ items: [], states: [], sources: [] });
    app = await buildApp(deps({ newsService: { ...deps().newsService, headlines } }));
    const res = await app.inject({ url: "/v1/news/headlines?state=Andaman%20and%20Nicobar%20Islands&source=The%20Hindu" });
    expect(res.statusCode).toBe(200);
    expect(headlines).toHaveBeenCalledWith({ state: "Andaman and Nicobar Islands", source: "The Hindu", limit: undefined });
  });

  it("forgot-password answers 204 whether or not the email exists", async () => {
    const forgotPassword = vi.fn().mockResolvedValue(undefined);
    app = await buildApp(deps({ emailLinks: { ...deps().emailLinks, forgotPassword } }));
    const res = await app.inject({ method: "POST", url: "/v1/auth/forgot-password", payload: { email: "Nobody@Example.com" } });
    expect(res.statusCode).toBe(204);
    expect(forgotPassword).toHaveBeenCalledWith("nobody@example.com");
  });

  it("the dev outbox only exists when enabled", async () => {
    app = await buildApp(deps());
    expect((await app.inject({ url: "/v1/dev/outbox" })).statusCode).toBe(404);
  });
});
