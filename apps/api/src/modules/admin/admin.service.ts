import { eq, sql } from "drizzle-orm";
import { AdminOverview, AdminPromiseList, AdminUserList, AuditLogResponse, type PublicUser, type UpdateUserInput } from "@trackbharat/shared";
import type { Database } from "../../db/client";
import { sessions, users } from "../../db/schema";
import { recordAudit } from "../../lib/audit";
import { AppError } from "../../lib/errors";

/**
 * ADMIN PANEL: the overview, users (roles and blocking), the promise list and
 * the audit log. Safety rules for user changes:
 *  - nobody changes their own role or blocks themselves (no accidental lock-out);
 *  - the last remaining admin can't be demoted or blocked;
 *  - blocking signs the person out everywhere at once (their sessions are deleted);
 *  - every change is in the audit log with the admin's reason.
 */
const iso = (d: Date | string) => new Date(d).toISOString();
const n = (v: unknown) => Number(v ?? 0);

export function createAdminService(db: Database) {
  return {
    async overview(): Promise<AdminOverview> {
      const { rows } = await db.execute<Record<string, string>>(sql`
        SELECT
          (SELECT count(*) FROM users) AS users,
          (SELECT count(*) FROM users WHERE email_verified_at IS NOT NULL) AS verified,
          (SELECT count(*) FROM users WHERE is_blocked) AS blocked,
          (SELECT count(*) FROM users WHERE role <> 'CITIZEN') AS staff,
          (SELECT count(*) FROM users WHERE created_at > now() - interval '7 days') AS new_week,
          (SELECT count(*) FROM news_items WHERE status = 'DRAFT' AND feed_id IS NULL) AS news_suggestions,
          (SELECT count(*) FROM promise_submissions WHERE status = 'PENDING') AS submissions,
          (SELECT count(DISTINCT issue_id) FROM issue_reports) AS reported,
          (SELECT count(*) FROM issues WHERE status <> 'HIDDEN') AS issues,
          (SELECT count(*) FROM promises WHERE NOT is_demo) AS promises,
          (SELECT count(*) FROM news_items WHERE status = 'PUBLISHED') AS published_news`);
      const r = rows[0]!;
      return AdminOverview.parse({
        users: { total: n(r.users), verified: n(r.verified), blocked: n(r.blocked), staff: n(r.staff), newThisWeek: n(r.new_week) },
        waiting: { newsSuggestions: n(r.news_suggestions), promiseSubmissions: n(r.submissions), reportedIssues: n(r.reported) },
        content: { issues: n(r.issues), promises: n(r.promises), publishedNews: n(r.published_news) },
      });
    },

    /** Search by name or email; filter by role or "blocked". Newest first. */
    async users(opts: { q?: string; role?: string; blocked?: boolean; limit?: number; offset?: number }): Promise<AdminUserList> {
      const conds = [sql`true`];
      if (opts.q) conds.push(sql`(u.email ILIKE ${`%${opts.q}%`} OR u.name ILIKE ${`%${opts.q}%`})`);
      if (opts.role) conds.push(sql`u.role = ${opts.role}::user_role`);
      if (opts.blocked !== undefined) conds.push(sql`u.is_blocked = ${opts.blocked}`);
      const where = sql.join(conds, sql` AND `);
      const limit = Math.min(opts.limit ?? 30, 100);
      const offset = Math.max(opts.offset ?? 0, 0);
      const [{ rows }, { rows: total }] = await Promise.all([
        db.execute<{ id: number; name: string; email: string; role: string; is_blocked: boolean; verified: boolean; google: boolean; created_at: Date; issues: number; votes: number }>(sql`
          SELECT u.id, u.name, u.email, u.role, u.is_blocked, u.email_verified_at IS NOT NULL AS verified, u.google_sub IS NOT NULL AS google, u.created_at,
                 (SELECT count(*)::int FROM issues i WHERE i.user_id = u.id) AS issues,
                 (SELECT count(*)::int FROM issue_votes v WHERE v.user_id = u.id) + (SELECT count(*)::int FROM cause_votes c WHERE c.user_id = u.id) AS votes
          FROM users u WHERE ${where} ORDER BY u.created_at DESC LIMIT ${limit} OFFSET ${offset}`),
        db.execute<{ n: number }>(sql`SELECT count(*)::int AS n FROM users u WHERE ${where}`),
      ]);
      return AdminUserList.parse({
        users: rows.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, isBlocked: u.is_blocked, emailVerified: u.verified, googleLinked: u.google, createdAt: iso(u.created_at), issues: u.issues, votes: u.votes })),
        total: total[0]!.n,
      });
    },

    async updateUser(actor: PublicUser, id: number, input: UpdateUserInput) {
      if (id === actor.id) throw AppError.forbidden("You can't change your own role or block yourself");
      await db.transaction(async (tx) => {
        const [target] = await tx.select({ id: users.id, role: users.role, isBlocked: users.isBlocked }).from(users).where(eq(users.id, id)).for("update");
        if (!target) throw AppError.notFound(`User ${id} not found`);
        const losingAdmin = target.role === "ADMIN" && ((input.role && input.role !== "ADMIN") || input.blocked === true);
        if (losingAdmin) {
          const { rows } = await tx.execute<{ n: number }>(sql`SELECT count(*)::int AS n FROM users WHERE role = 'ADMIN' AND NOT is_blocked`);
          if (rows[0]!.n <= 1) throw AppError.forbidden("This is the last admin; make someone else admin first");
        }
        await tx
          .update(users)
          .set({ ...(input.role ? { role: input.role } : {}), ...(input.blocked !== undefined ? { isBlocked: input.blocked } : {}) })
          .where(eq(users.id, id));
        if (input.blocked) await tx.delete(sessions).where(eq(sessions.userId, id)); // signed out everywhere, now
        await recordAudit(tx, {
          actorId: actor.id,
          action: input.blocked === true ? "user.block" : input.blocked === false ? "user.unblock" : "user.role",
          entityType: "user",
          entityId: id,
          details: { from: { role: target.role, blocked: target.isBlocked }, to: { role: input.role ?? target.role, blocked: input.blocked ?? target.isBlocked }, note: input.note },
        });
      });
    },

    /** Report-card promises (newest change first), with search and a status filter. */
    async promises(opts: { q?: string; status?: string; limit?: number; offset?: number }): Promise<AdminPromiseList> {
      const conds = [sql`true`];
      if (opts.q) conds.push(sql`(p.title ILIKE ${`%${opts.q}%`} OR c.name ILIKE ${`%${opts.q}%`})`);
      if (opts.status) conds.push(sql`p.status = ${opts.status}::promise_status`);
      const where = sql.join(conds, sql` AND `);
      const limit = Math.min(opts.limit ?? 30, 100);
      const [{ rows }, { rows: total }] = await Promise.all([
        db.execute<{ id: number; title: string; category: string; status: string; slug: string | null; seat: string | null; state: string | null; made_by: string | null; updated_at: Date; evidence: number; is_demo: boolean }>(sql`
          SELECT p.id, p.title, p.category, p.status, c.slug, c.name AS seat, s.name AS state,
                 coalesce(r.full_name, pa.name) AS made_by, p.updated_at, p.is_demo,
                 (SELECT count(*)::int FROM evidence e WHERE e.promise_id = p.id) AS evidence
          FROM promises p
          LEFT JOIN constituencies c ON c.id = p.constituency_id
          LEFT JOIN states s ON s.id = c.state_id
          LEFT JOIN terms t ON t.id = p.term_id
          LEFT JOIN representatives r ON r.id = t.representative_id
          LEFT JOIN parties pa ON pa.id = p.party_id
          WHERE ${where} ORDER BY p.updated_at DESC LIMIT ${limit} OFFSET ${Math.max(opts.offset ?? 0, 0)}`),
        db.execute<{ n: number }>(sql`SELECT count(*)::int AS n FROM promises p LEFT JOIN constituencies c ON c.id = p.constituency_id WHERE ${where}`),
      ]);
      return AdminPromiseList.parse({
        promises: rows.map((p) => ({
          id: p.id,
          title: p.title,
          category: p.category,
          status: p.status,
          constituency: p.slug ? { slug: p.slug, name: p.seat!, state: p.state ?? "" } : null,
          madeBy: p.made_by,
          updatedAt: iso(p.updated_at),
          evidenceCount: p.evidence,
          isDemo: p.is_demo,
        })),
        total: total[0]!.n,
      });
    },

    /** Latest entries of the audit log (who did what, when). */
    async audit(limit = 50) {
      const { rows } = await db.execute<{ id: number; action: string; entity_type: string; entity_id: string; actor: string | null; details: Record<string, unknown> | null; created_at: Date }>(sql`
        SELECT a.id, a.action, a.entity_type, a.entity_id, u.name AS actor, a.details, a.created_at
        FROM audit_log a LEFT JOIN users u ON u.id = a.actor_id
        ORDER BY a.created_at DESC LIMIT ${Math.min(limit, 200)}`);
      return AuditLogResponse.parse({
        entries: rows.map((e) => ({ id: Number(e.id), action: e.action, entityType: e.entity_type, entityId: e.entity_id, actor: e.actor, details: e.details, createdAt: iso(e.created_at) })),
      });
    },
  };
}

export type AdminService = ReturnType<typeof createAdminService>;
