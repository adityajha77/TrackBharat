import { and, count, desc, eq, gt, sql } from "drizzle-orm";
import { CreatePromiseInput, type PromiseSubmissionView } from "@trackbharat/shared";
import type { Database } from "../../db/client";
import { recordAudit } from "../../lib/audit";
import { promiseSubmissions, users } from "../../db/schema";
import { shortName } from "../issues/issue.repository";

const columns = {
  id: promiseSubmissions.id,
  status: promiseSubmissions.status,
  createdAt: promiseSubmissions.createdAt,
  reviewNote: promiseSubmissions.reviewNote,
  promiseId: promiseSubmissions.promiseId,
  payload: promiseSubmissions.payload,
  userName: users.name,
};

type Row = { id: number; status: PromiseSubmissionView["status"]; createdAt: Date; reviewNote: string | null; promiseId: number | null; payload: unknown; userName: string };

// jsonb comes back as `unknown`: re-validate it on the way OUT too, never trust stored JSON blindly
const toView = (r: Row): PromiseSubmissionView => ({
  id: r.id,
  status: r.status,
  createdAt: r.createdAt.toISOString(),
  reviewNote: r.reviewNote,
  promiseId: r.promiseId,
  submittedBy: shortName(r.userName),
  payload: CreatePromiseInput.parse(r.payload),
});

export function createSubmissionRepository(db: Database) {
  return {
    async create(userId: number, payload: CreatePromiseInput) {
      const [row] = await db.insert(promiseSubmissions).values({ userId, payload }).returning({ id: promiseSubmissions.id });
      return row!.id;
    },

    async countByUserSince(userId: number, since: Date) {
      const [r] = await db.select({ n: count() }).from(promiseSubmissions).where(and(eq(promiseSubmissions.userId, userId), gt(promiseSubmissions.createdAt, since)));
      return r?.n ?? 0;
    },

    async listPending() {
      const rows = await db.select(columns).from(promiseSubmissions).innerJoin(users, eq(users.id, promiseSubmissions.userId)).where(eq(promiseSubmissions.status, "PENDING")).orderBy(promiseSubmissions.createdAt);
      return rows.map(toView);
    },

    async listByUser(userId: number) {
      const rows = await db.select(columns).from(promiseSubmissions).innerJoin(users, eq(users.id, promiseSubmissions.userId)).where(eq(promiseSubmissions.userId, userId)).orderBy(desc(promiseSubmissions.createdAt)).limit(100);
      return rows.map(toView);
    },

    async find(id: number) {
      const [row] = await db.select(columns).from(promiseSubmissions).innerJoin(users, eq(users.id, promiseSubmissions.userId)).where(eq(promiseSubmissions.id, id));
      return row ? toView(row) : null;
    },

    /** Only a PENDING submission can be reviewed: the WHERE clause makes double-reviews impossible. */
    async markReviewed(id: number, reviewerId: number, status: "APPROVED" | "REJECTED", note: string, promiseId: number | null) {
      return db.transaction(async (tx) => {
        const updated = await tx
          .update(promiseSubmissions)
          .set({ status, reviewerId, reviewNote: note, promiseId, reviewedAt: sql`now()` })
          .where(and(eq(promiseSubmissions.id, id), eq(promiseSubmissions.status, "PENDING")))
          .returning({ id: promiseSubmissions.id });
        if (!updated.length) return false;
        await recordAudit(tx, { actorId: reviewerId, action: `submission.${status === "APPROVED" ? "approve" : "reject"}`, entityType: "promise_submission", entityId: id, details: { note, promiseId } });
        return true;
      });
    },
  };
}

export type SubmissionRepository = ReturnType<typeof createSubmissionRepository>;
