import type { DbOrTx } from "../db/helpers";
import { auditLog } from "../db/schema";

export interface AuditEntry {
  actorId: number | null; // null = the system itself
  action: string; // "issue.hide", "submission.approve", …
  entityType: string;
  entityId: string | number;
  details?: Record<string, unknown>;
}

/**
 * Append to the audit log. Pass the SAME transaction as the action it records,
 * so an action and its audit entry are committed together or not at all.
 */
export async function recordAudit(db: DbOrTx, e: AuditEntry) {
  await db.insert(auditLog).values({ actorId: e.actorId, action: e.action, entityType: e.entityType, entityId: String(e.entityId), details: e.details ?? null });
}
