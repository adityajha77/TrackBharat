import { and, count, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { ReportReason, type IssueDetail, type IssueStatus, type IssueSummary, type PromiseCategory } from "@trackbharat/shared";
import type { Database } from "../../db/client";
import { recordAudit } from "../../lib/audit";
import { constituencies, issueReports, issues, issueVotes, pincodeConstituencies } from "../../db/schema";

/** "Priya Sharma" → "Priya S.": enough to be human, not enough to identify. */
export const shortName = (full: string) => {
  const [first, ...rest] = full.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last[0]!.toUpperCase()}.` : (first ?? "Citizen");
};

type Row = {
  id: number;
  title: string;
  category: PromiseCategory;
  status: IssueStatus;
  pincode: string;
  created_at: Date;
  photo_key: string | null;
  votes_this_week: number;
  votes_total: number;
  reporter_name: string;
  voted_by_me: boolean | null;
};

const toSummary = (r: Row, includeVoted: boolean): IssueSummary => ({
  id: r.id,
  title: r.title,
  category: r.category,
  status: r.status,
  pincode: r.pincode,
  createdAt: new Date(r.created_at).toISOString(),
  photoPath: r.photo_key ? `/media/issues/${r.photo_key}` : null,
  votesThisWeek: r.votes_this_week,
  votesTotal: r.votes_total,
  reporter: shortName(r.reporter_name),
  ...(includeVoted ? { votedByMe: Boolean(r.voted_by_me) } : {}),
});

/**
 * The SELECT shared by lists and details. Vote counts are computed with
 * correlated sub-queries that use the (issue_id, week_start) index.
 */
const summarySelect = (weekStart: string, userId: number | null) => sql`
  SELECT i.id, i.title, i.category, i.status, i.pincode, i.created_at, i.photo_key,
         u.name AS reporter_name,
         (SELECT count(*) FROM issue_votes v WHERE v.issue_id = i.id AND v.week_start = ${weekStart})::int AS votes_this_week,
         (SELECT count(*) FROM issue_votes v WHERE v.issue_id = i.id)::int AS votes_total,
         ${userId === null ? sql`NULL` : sql`EXISTS (SELECT 1 FROM issue_votes v WHERE v.issue_id = i.id AND v.user_id = ${userId} AND v.week_start = ${weekStart})`} AS voted_by_me
  FROM issues i JOIN users u ON u.id = i.user_id`;

export function createIssueRepository(db: Database) {
  return {
    /** The Lok Sabha seat holding the largest share of this PIN's post offices. */
    async seatForPincode(pincode: string) {
      const [row] = await db
        .select({ id: constituencies.id })
        .from(pincodeConstituencies)
        .innerJoin(constituencies, eq(constituencies.id, pincodeConstituencies.constituencyId))
        .where(and(eq(pincodeConstituencies.pincode, pincode), eq(constituencies.house, "LOK_SABHA")))
        .orderBy(desc(pincodeConstituencies.share))
        .limit(1);
      return row?.id ?? null;
    },

    async seatIdBySlug(slug: string) {
      const [row] = await db.select({ id: constituencies.id }).from(constituencies).where(eq(constituencies.slug, slug));
      return row?.id ?? null;
    },

    async countByUserSince(userId: number, since: Date) {
      const [r] = await db.select({ n: count() }).from(issues).where(and(eq(issues.userId, userId), gt(issues.createdAt, since)));
      return r?.n ?? 0;
    },

    async create(v: { userId: number; constituencyId: number; pincode: string; title: string; description: string; category: PromiseCategory; photoKey: string | null }) {
      const [row] = await db.insert(issues).values(v).returning({ id: issues.id });
      return row!.id;
    },

    async list(constituencyId: number, opts: { sort: "top" | "new"; weekStart: string; userId: number | null; limit: number }) {
      const order = opts.sort === "top" ? sql`votes_this_week DESC, votes_total DESC, i.created_at DESC` : sql`i.created_at DESC`;
      const { rows } = await db.execute<Row>(sql`
        ${summarySelect(opts.weekStart, opts.userId)}
        WHERE i.constituency_id = ${constituencyId} AND i.status <> 'HIDDEN'
        ORDER BY ${order}
        LIMIT ${opts.limit}`);
      return rows.map((r) => toSummary(r, opts.userId !== null));
    },

    async findDetail(id: number, weekStart: string, userId: number | null): Promise<(IssueDetail & { ownerId: number }) | null> {
      const { rows } = await db.execute<Row & { description: string; resolved_at: Date | null; user_id: number; c_slug: string; c_name: string; c_state: string }>(sql`
        SELECT s.*, i.description, i.resolved_at, i.user_id, c.slug AS c_slug, c.name AS c_name, st.name AS c_state
        FROM (${summarySelect(weekStart, userId)} WHERE i.id = ${id}) s
        JOIN issues i ON i.id = s.id
        JOIN constituencies c ON c.id = i.constituency_id
        JOIN states st ON st.id = c.state_id`);
      const r = rows[0];
      if (!r) return null;
      return {
        ...toSummary(r, userId !== null),
        description: r.description,
        resolvedAt: r.resolved_at ? new Date(r.resolved_at).toISOString() : null,
        constituency: { slug: r.c_slug, name: r.c_name, state: r.c_state },
        ownerId: r.user_id,
      };
    },

    /** The most recent frozen weekly ranking for a seat (written by the weekly job). */
    async highlights(constituencyId: number, currentWeek: string) {
      const { rows } = await db.execute<Row & { week_start: string; rank: number; ranked_votes: number }>(sql`
        SELECT s.*, r.week_start::text AS week_start, r.rank, r.votes AS ranked_votes
        FROM weekly_issue_rankings r
        JOIN (${summarySelect(currentWeek, null)}) s ON s.id = r.issue_id
        WHERE r.constituency_id = ${constituencyId}
          AND r.week_start = (SELECT max(week_start) FROM weekly_issue_rankings WHERE constituency_id = ${constituencyId})
          AND s.status <> 'HIDDEN'
        ORDER BY r.rank`);
      return {
        weekStart: rows[0]?.week_start ?? null,
        items: rows.map((r) => ({ rank: r.rank, votes: r.ranked_votes, issue: toSummary(r, false) })),
      };
    },

    async listByUser(userId: number, weekStart: string) {
      const { rows } = await db.execute<Row>(sql`${summarySelect(weekStart, userId)} WHERE i.user_id = ${userId} ORDER BY i.created_at DESC LIMIT 100`);
      return rows.map((r) => toSummary(r, true));
    },

    /** Idempotent: voting twice in a week is a no-op (the primary key forbids duplicates). */
    async vote(userId: number, issueId: number, weekStart: string) {
      await db.insert(issueVotes).values({ userId, issueId, weekStart }).onConflictDoNothing();
    },
    async unvote(userId: number, issueId: number, weekStart: string) {
      await db.delete(issueVotes).where(and(eq(issueVotes.userId, userId), eq(issueVotes.issueId, issueId), eq(issueVotes.weekStart, weekStart)));
    },
    async votesInWeek(issueId: number, weekStart: string) {
      const [r] = await db.select({ n: count() }).from(issueVotes).where(and(eq(issueVotes.issueId, issueId), eq(issueVotes.weekStart, weekStart)));
      return r?.n ?? 0;
    },

    /**
     * Record a report. If an issue collects enough independent reports it is
     * hidden automatically until a moderator looks at it, logged as a SYSTEM action.
     */
    async report(issueId: number, userId: number, reason: string, autoHideAt: number) {
      return db.transaction(async (tx) => {
        await tx.insert(issueReports).values({ issueId, userId, reason }).onConflictDoNothing();
        const [r] = await tx.select({ n: count() }).from(issueReports).where(and(eq(issueReports.issueId, issueId), isNull(issueReports.resolvedAt)));
        const open = r?.n ?? 0;
        if (open >= autoHideAt) {
          const hidden = await tx
            .update(issues)
            .set({ status: "HIDDEN", updatedAt: sql`now()` })
            .where(and(eq(issues.id, issueId), sql`${issues.status} <> 'HIDDEN'`))
            .returning({ id: issues.id });
          if (hidden.length) await recordAudit(tx, { actorId: null, action: "issue.auto_hide", entityType: "issue", entityId: issueId, details: { openReports: open } });
        }
        return open;
      });
    },

    /** Status change + report resolution + audit entry, atomically. */
    async moderate(issueId: number, actorId: number, action: string, status: IssueStatus | null, note: string, resolveReports: boolean) {
      await db.transaction(async (tx) => {
        if (status) {
          await tx
            .update(issues)
            .set({ status, updatedAt: sql`now()`, resolvedAt: status === "RESOLVED" ? sql`now()` : undefined })
            .where(eq(issues.id, issueId));
        }
        if (resolveReports) await tx.update(issueReports).set({ resolvedAt: sql`now()` }).where(and(eq(issueReports.issueId, issueId), isNull(issueReports.resolvedAt)));
        await recordAudit(tx, { actorId, action: `issue.${action.toLowerCase()}`, entityType: "issue", entityId: issueId, details: { note, status } });
      });
    },

    async exists(issueId: number) {
      const [r] = await db.select({ id: issues.id, status: issues.status, userId: issues.userId }).from(issues).where(eq(issues.id, issueId));
      return r ?? null;
    },

    /** Issues with unresolved reports (incl. auto-hidden ones), for the moderation queue. */
    async reportedIssues(weekStart: string) {
      const { rows } = await db.execute<Row & { reports: { reason: string; created_at: string }[] }>(sql`
        SELECT s.*, (
          SELECT json_agg(json_build_object('reason', r.reason, 'created_at', r.created_at) ORDER BY r.created_at)
          FROM issue_reports r WHERE r.issue_id = s.id AND r.resolved_at IS NULL
        ) AS reports
        FROM (${summarySelect(weekStart, null)}
              WHERE EXISTS (SELECT 1 FROM issue_reports r WHERE r.issue_id = i.id AND r.resolved_at IS NULL)) s
        ORDER BY s.created_at`);
      return rows.map((r) => ({
        issue: toSummary(r, false),
        reports: (r.reports ?? []).map((x) => ({ reason: ReportReason.catch("OTHER").parse(x.reason), createdAt: new Date(x.created_at).toISOString() })),
      }));
    },
  };
}

export type IssueRepository = ReturnType<typeof createIssueRepository>;
