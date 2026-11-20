import { and, eq, sql } from "drizzle-orm";
import { NewsItem, NewsList, type PublicUser, type ReviewNewsInput, type SubmitNewsInput } from "@trackbharat/shared";
import type { Database } from "../../db/client";
import { newsFeeds, newsItems, states } from "../../db/schema";
import { recordAudit } from "../../lib/audit";
import { AppError } from "../../lib/errors";
import { parseFeed } from "./rss";

/**
 * NEWS THAT NEEDS A VOICE.
 *
 *   RSS feeds ──(job, every 2 h)──► DRAFT (headline + link only)
 *   citizen "suggest a story" ─────► DRAFT
 *   verifier writes 2–5 lines in their own words, tags state / district / who is
 *   responsible ──► PUBLISHED  (or REJECTED). Every decision is audited.
 */
type Row = {
  id: number;
  headline: string;
  url: string;
  source_name: string;
  source_published_at: Date | null;
  summary: string | null;
  category: NewsItem["category"];
  state: string | null;
  district: string | null;
  responsible: string | null;
  status: NewsItem["status"];
  published_at: Date | null;
};

const iso = (d: Date | null) => (d ? new Date(d).toISOString() : null);
const toItem = (r: Row): NewsItem => ({
  id: r.id,
  headline: r.headline,
  url: r.url,
  sourceName: r.source_name,
  sourcePublishedAt: iso(r.source_published_at),
  summary: r.summary,
  category: r.category,
  state: r.state,
  district: r.district,
  responsible: r.responsible,
  status: r.status,
  publishedAt: iso(r.published_at),
});

const select = sql`
  SELECT n.id, n.headline, n.url, n.source_name, n.source_published_at, n.summary, n.category,
         s.name AS state, n.district, n.responsible, n.status, n.published_at
  FROM news_items n LEFT JOIN states s ON s.id = n.state_id`;

/** Polite fetch: identify ourselves, time out, never follow a feed into a huge download. */
export async function fetchText(url: string, fetchImpl: typeof fetch = fetch): Promise<string> {
  const res = await fetchImpl(url, {
    headers: { "user-agent": "TrackBharatBot/1.0 (+https://github.com/adityajha77/TrackBharat; civic, non-commercial)", accept: "application/rss+xml, application/atom+xml, text/xml" },
    signal: AbortSignal.timeout(20_000),
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.text();
  if (body.length > 5_000_000) throw new Error("feed larger than 5 MB");
  return body;
}

export function createNewsService(db: Database, fetchImpl: typeof fetch = fetch) {
  return {
    async published(opts: { state?: string; limit?: number }): Promise<NewsList> {
      const limit = Math.min(opts.limit ?? 30, 60);
      const where = opts.state ? sql`WHERE n.status = 'PUBLISHED' AND s.name = ${opts.state}` : sql`WHERE n.status = 'PUBLISHED'`;
      const [{ rows }, { rows: st }] = await Promise.all([
        db.execute<Row>(sql`${select} ${where} ORDER BY n.published_at DESC LIMIT ${limit}`),
        db.execute<{ name: string }>(sql`SELECT DISTINCT s.name FROM news_items n JOIN states s ON s.id = n.state_id WHERE n.status = 'PUBLISHED' ORDER BY s.name`),
      ]);
      return NewsList.parse({ items: rows.map(toItem), states: st.map((r) => r.name) });
    },

    /** The verifier queue: newest drafts first. */
    async drafts(limit = 50) {
      const { rows } = await db.execute<Row>(sql`${select} WHERE n.status = 'DRAFT' ORDER BY coalesce(n.source_published_at, n.created_at) DESC LIMIT ${limit}`);
      return rows.map(toItem);
    },

    async submit(user: PublicUser, input: SubmitNewsInput) {
      const host = new URL(input.url).hostname.replace(/^www\./, "");
      const [row] = await db
        .insert(newsItems)
        .values({ headline: input.headline, url: input.url, sourceName: host, submittedBy: user.id })
        .onConflictDoNothing({ target: newsItems.url })
        .returning({ id: newsItems.id });
      if (!row) throw AppError.conflict("This story has already been suggested");
      return row.id;
    },

    async review(actor: PublicUser, id: number, input: ReviewNewsInput) {
      await db.transaction(async (tx) => {
        const [item] = await tx.select({ status: newsItems.status }).from(newsItems).where(eq(newsItems.id, id));
        if (!item) throw AppError.notFound(`Story ${id} not found`);
        if (input.decision === "REJECT") {
          await tx.update(newsItems).set({ status: "REJECTED", reviewedBy: actor.id }).where(eq(newsItems.id, id));
        } else {
          const [st] = await tx.select({ id: states.id }).from(states).where(eq(states.name, input.state));
          if (!st) throw AppError.validation(`Unknown state "${input.state}"`);
          await tx
            .update(newsItems)
            .set({
              status: "PUBLISHED",
              summary: input.summary,
              stateId: st.id,
              district: input.district || null,
              responsible: input.responsible || null,
              category: input.category,
              reviewedBy: actor.id,
              publishedAt: sql`coalesce(${newsItems.publishedAt}, now())`,
            })
            .where(eq(newsItems.id, id));
        }
        await recordAudit(tx, { actorId: actor.id, action: `news.${input.decision.toLowerCase()}`, entityType: "news", entityId: id, details: { previous: item.status } });
      });
    },

    /** The RSS job. Each feed is independent: one broken feed never stops the others. */
    async fetchFeeds() {
      const feeds = await db.select().from(newsFeeds).where(eq(newsFeeds.active, true));
      const report: { feed: string; added: number; error?: string }[] = [];
      for (const feed of feeds) {
        try {
          const entries = parseFeed(await fetchText(feed.url, fetchImpl));
          let added = 0;
          for (const e of entries) {
            const res = await db
              .insert(newsItems)
              .values({ feedId: feed.id, guid: `${feed.id}:${e.guid}`, headline: e.headline, url: e.url, sourceName: feed.name, sourcePublishedAt: e.publishedAt, stateId: feed.regionStateId })
              .onConflictDoNothing() // same guid or same URL = already have it
              .returning({ id: newsItems.id });
            added += res.length;
          }
          await db.update(newsFeeds).set({ lastFetchedAt: sql`now()`, lastError: null }).where(eq(newsFeeds.id, feed.id));
          report.push({ feed: feed.name, added });
        } catch (err) {
          await db.update(newsFeeds).set({ lastError: String(err).slice(0, 300) }).where(eq(newsFeeds.id, feed.id));
          report.push({ feed: feed.name, added: 0, error: String(err) });
        }
      }
      // Drafts nobody reviewed within 30 days are stale news: drop them.
      await db.delete(newsItems).where(and(eq(newsItems.status, "DRAFT"), sql`${newsItems.createdAt} < now() - interval '30 days'`, sql`${newsItems.submittedBy} IS NULL`));
      return report;
    },

    async latest(limit: number) {
      const { rows } = await db.execute<Row>(sql`${select} WHERE n.status = 'PUBLISHED' ORDER BY n.published_at DESC LIMIT ${limit}`);
      return rows.map(toItem);
    },
  };
}

export type NewsService = ReturnType<typeof createNewsService>;
