import { sql } from "drizzle-orm";
import { Leaderboard, type LeaderboardPeriod } from "@trackbharat/shared";
import type { Database } from "../../db/client";
import { periodStartIST } from "../../lib/time";

/**
 * NATIONAL LEADERBOARD: "what is India asking for right now?"
 *
 * Adds up citizens' reports and votes across ALL constituencies for a window:
 *   day  = since midnight today, India time
 *   week = since Monday 00:00, India time
 * Windows are "live" (computed on request from issue_votes.created_at), unlike
 * the per-constituency weekly highlights, which are frozen by the weekly job.
 * Hidden issues are never counted.
 *
 * Idea to notice: one pass of SQL aggregation produces four different rankings,
 * each just a different GROUP BY over the same filtered rows (a CTE).
 */
export function createLeaderboardService(db: Pick<Database, "execute">, now: () => Date = () => new Date()) {
  type R<T> = T & Record<string, unknown>;
  const run = async <T>(q: ReturnType<typeof sql>) => (await db.execute<R<T>>(q)).rows as T[];

  return {
    async get(period: LeaderboardPeriod): Promise<Leaderboard> {
      const since = periodStartIST(period, now());

      // One filtered "activity" set: every issue with how many votes it got in the window.
      const activity = sql`
        WITH activity AS (
          SELECT i.id, i.title, i.category, i.status, i.created_at >= ${since} AS is_new,
                 c.slug, c.name AS cname, s.name AS state, c.is_demo,
                 (SELECT count(*) FROM issue_votes v WHERE v.issue_id = i.id AND v.created_at >= ${since})::int AS votes
          FROM issues i JOIN constituencies c ON c.id = i.constituency_id JOIN states s ON s.id = c.state_id
          WHERE i.status <> 'HIDDEN'
        ),
        live AS (SELECT * FROM activity WHERE is_new OR votes > 0)`;

      const [totals, categories, topIssues, topConstituencies, topStates] = await Promise.all([
        run<{ new_issues: number; votes: number; constituencies: number }>(sql`${activity}
          SELECT count(*) FILTER (WHERE is_new)::int AS new_issues, coalesce(sum(votes), 0)::int AS votes, count(DISTINCT slug)::int AS constituencies FROM live`),
        run<{ category: string; new_issues: number; votes: number }>(sql`${activity}
          SELECT category, count(*) FILTER (WHERE is_new)::int AS new_issues, sum(votes)::int AS votes
          FROM live GROUP BY category ORDER BY sum(votes) + count(*) FILTER (WHERE is_new) DESC, category LIMIT 12`),
        run<{ id: number; title: string; category: string; status: string; votes: number; is_demo: boolean; slug: string; cname: string; state: string }>(sql`${activity}
          SELECT id, title, category, status, votes, is_demo, slug, cname, state FROM live ORDER BY votes DESC, id DESC LIMIT 10`),
        run<{ slug: string; cname: string; state: string; new_issues: number; votes: number; is_demo: boolean }>(sql`${activity}
          SELECT slug, cname, state, count(*) FILTER (WHERE is_new)::int AS new_issues, sum(votes)::int AS votes, bool_and(is_demo) AS is_demo
          FROM live GROUP BY slug, cname, state ORDER BY sum(votes) + count(*) FILTER (WHERE is_new) DESC, cname LIMIT 10`),
        run<{ state: string; new_issues: number; votes: number }>(sql`${activity}
          SELECT state, count(*) FILTER (WHERE is_new)::int AS new_issues, sum(votes)::int AS votes
          FROM live GROUP BY state ORDER BY sum(votes) + count(*) FILTER (WHERE is_new) DESC, state LIMIT 10`),
      ]);

      // Validate our own output against the contract: a bug here fails loudly in tests, not silently in prod
      return Leaderboard.parse({
        period,
        since: since.toISOString(),
        totals: { newIssues: totals[0]?.new_issues ?? 0, votes: totals[0]?.votes ?? 0, constituencies: totals[0]?.constituencies ?? 0 },
        categories: categories.map((c) => ({ category: c.category, newIssues: c.new_issues, votes: c.votes })),
        topIssues: topIssues.map((i) => ({ id: i.id, title: i.title, category: i.category, status: i.status, votes: i.votes, isDemo: i.is_demo, constituency: { slug: i.slug, name: i.cname, state: i.state } })),
        topConstituencies: topConstituencies.map((c) => ({ slug: c.slug, name: c.cname, state: c.state, newIssues: c.new_issues, votes: c.votes, isDemo: c.is_demo })),
        topStates: topStates.map((s) => ({ state: s.state, newIssues: s.new_issues, votes: s.votes })),
      });
    },
  };
}

export type LeaderboardService = ReturnType<typeof createLeaderboardService>;
