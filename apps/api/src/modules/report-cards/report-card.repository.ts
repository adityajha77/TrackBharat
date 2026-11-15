import { sql } from "drizzle-orm";
import type { Database } from "../../db/client";

/**
 * SQL for report cards and national insights: mostly AGGREGATIONS
 * (count, GROUP BY, FILTER, percentile_cont) over questions, promises and issues.
 */
export function createReportCardRepository(db: Database) {
  const rows = async <T>(q: ReturnType<typeof sql>) => (await db.execute<T & Record<string, unknown>>(q)).rows as T[];

  return {
    async seat(slug: string) {
      const [r] = await rows<{ id: number; name: string; state: string; house: string; boundary_outdated: boolean }>(sql`
        SELECT c.id, c.name, s.name AS state, c.house, c.boundary_outdated
        FROM constituencies c JOIN states s ON s.id = c.state_id WHERE c.slug = ${slug}`);
      return r ?? null;
    },

    /** Members of a seat in one Lok Sabha (sitting first). */
    async members(seatId: number, legislature: number) {
      return rows<{ rep_id: number; name: string; party: string | null; status: string }>(sql`
        SELECT r.id AS rep_id, r.full_name AS name, coalesce(p.short_name, p.name) AS party, t.status
        FROM terms t JOIN representatives r ON r.id = t.representative_id LEFT JOIN parties p ON p.id = t.party_id
        WHERE t.constituency_id = ${seatId} AND t.legislature = ${legislature}
        ORDER BY (t.status = 'SITTING') DESC, (t.status = 'COMPLETED') DESC, r.full_name`);
    },

    async questionTotal(repId: number, legislature: number) {
      const [r] = await rows<{ n: number }>(sql`SELECT count(*)::int AS n FROM parliament_questions WHERE representative_id = ${repId} AND legislature = ${legislature}`);
      return r?.n ?? 0;
    },

    async byMinistry(repId: number | null, legislature: number, limit: number) {
      return rows<{ ministry: string; count: number }>(sql`
        SELECT initcap(lower(ministry)) AS ministry, count(*)::int AS count
        FROM parliament_questions
        WHERE legislature = ${legislature} ${repId === null ? sql`` : sql`AND representative_id = ${repId}`}
        GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT ${limit}`);
    },

    async byQuarter(repId: number, legislature: number) {
      return rows<{ period: string; count: number }>(sql`
        SELECT to_char(asked_on, 'YYYY-"Q"Q') AS period, count(*)::int AS count
        FROM parliament_questions WHERE representative_id = ${repId} AND legislature = ${legislature}
        GROUP BY 1 ORDER BY 1`);
    },

    /** Question totals of every MP who asked at least one question in that Lok Sabha (for percentiles). */
    async allTotals(legislature: number) {
      return (await rows<{ n: number }>(sql`SELECT count(*)::int AS n FROM parliament_questions WHERE legislature = ${legislature} GROUP BY representative_id`)).map((r) => r.n);
    },

    async promiseCounts(seatId: number) {
      const r = await rows<{ status: string; n: number }>(sql`SELECT status, count(*)::int AS n FROM promises WHERE constituency_id = ${seatId} GROUP BY status`);
      return Object.fromEntries(r.map((x) => [x.status, x.n]));
    },

    /** Citizen issues old enough to judge, and how many of them are resolved. */
    async issueStats(seatId: number, graceDays: number) {
      const [r] = await rows<{ eligible: number; resolved: number }>(sql`
        SELECT count(*)::int AS eligible, count(*) FILTER (WHERE status = 'RESOLVED')::int AS resolved
        FROM issues WHERE constituency_id = ${seatId} AND status <> 'HIDDEN'
          AND created_at < now() - make_interval(days => ${graceDays})`);
      return r ?? { eligible: 0, resolved: 0 };
    },

    // ---- National insights (demo data excluded everywhere) ----------------
    async nationalPromiseStatus() {
      return rows<{ status: string; n: number }>(sql`
        SELECT p.status, count(*)::int AS n FROM promises p WHERE NOT p.is_demo GROUP BY 1`);
    },
    async nationalIssues(weekStart: string) {
      const [r] = await rows<{ total: number; resolved: number; votes: number }>(sql`
        SELECT count(*)::int AS total, count(*) FILTER (WHERE i.status = 'RESOLVED')::int AS resolved,
               (SELECT count(*)::int FROM issue_votes v JOIN issues i2 ON i2.id = v.issue_id JOIN constituencies c2 ON c2.id = i2.constituency_id
                WHERE v.week_start = ${weekStart} AND NOT c2.is_demo) AS votes
        FROM issues i JOIN constituencies c ON c.id = i.constituency_id
        WHERE i.status <> 'HIDDEN' AND NOT c.is_demo`);
      return r!;
    },
    async mostActive(legislature: number, limit: number) {
      return rows<{ name: string; party: string | null; constituency: string; slug: string; total: number }>(sql`
        SELECT r.full_name AS name, coalesce(p.short_name, p.name) AS party, c.name AS constituency, c.slug, count(q.id)::int AS total
        FROM terms t
        JOIN representatives r ON r.id = t.representative_id
        JOIN constituencies c ON c.id = t.constituency_id
        LEFT JOIN parties p ON p.id = t.party_id
        JOIN parliament_questions q ON q.representative_id = r.id AND q.legislature = t.legislature
        WHERE t.legislature = ${legislature} AND t.status = 'SITTING'
        GROUP BY r.id, p.short_name, p.name, c.name, c.slug
        ORDER BY total DESC LIMIT ${limit}`);
    },
    async partySeats(legislature: number, limit: number) {
      return rows<{ party: string; seats: number }>(sql`
        SELECT coalesce(p.short_name, p.name, 'Independent') AS party, count(*)::int AS seats
        FROM terms t LEFT JOIN parties p ON p.id = t.party_id
        WHERE t.legislature = ${legislature} AND t.status = 'SITTING'
        GROUP BY 1 ORDER BY 2 DESC LIMIT ${limit}`);
    },
  };
}

export type ReportCardRepository = ReturnType<typeof createReportCardRepository>;
