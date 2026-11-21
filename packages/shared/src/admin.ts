import { z } from "zod";
import { PromiseCategory, PromiseStatus } from "./civic";
import { UserRole } from "./citizen";

/**
 * Contract for the ADMIN PANEL (website /admin and the mobile app's admin tab).
 * Users & roles and blocking are ADMIN-only; promises are VERIFIER+; causes are
 * MODERATOR+. Every change is written to the audit log.
 */

// ---- Overview ---------------------------------------------------------------
export const AdminOverview = z.object({
  users: z.object({ total: z.number().int(), verified: z.number().int(), blocked: z.number().int(), staff: z.number().int(), newThisWeek: z.number().int() }),
  waiting: z.object({ newsSuggestions: z.number().int(), promiseSubmissions: z.number().int(), reportedIssues: z.number().int() }),
  content: z.object({ issues: z.number().int(), promises: z.number().int(), publishedNews: z.number().int() }),
});
export type AdminOverview = z.infer<typeof AdminOverview>;

// ---- Users -------------------------------------------------------------------
export const AdminUser = z.object({
  id: z.number().int(),
  name: z.string(),
  email: z.string(),
  role: UserRole,
  isBlocked: z.boolean(),
  emailVerified: z.boolean(),
  googleLinked: z.boolean(),
  createdAt: z.iso.datetime(),
  issues: z.number().int(),
  votes: z.number().int(),
});
export type AdminUser = z.infer<typeof AdminUser>;

export const AdminUserList = z.object({ users: z.array(AdminUser), total: z.number().int() });
export type AdminUserList = z.infer<typeof AdminUserList>;

/** Change a role and/or block. A note is required: it goes into the audit log. */
export const UpdateUserInput = z
  .object({
    role: UserRole.optional(),
    blocked: z.boolean().optional(),
    note: z.string().trim().min(5, "Add a short reason (it goes into the audit log)").max(300),
  })
  .refine((v) => v.role !== undefined || v.blocked !== undefined, "Nothing to change");
export type UpdateUserInput = z.infer<typeof UpdateUserInput>;

// ---- Promises on report cards ----------------------------------------------
export const AdminPromise = z.object({
  id: z.number().int(),
  title: z.string(),
  category: PromiseCategory,
  status: PromiseStatus,
  constituency: z.object({ slug: z.string(), name: z.string(), state: z.string() }).nullable(),
  madeBy: z.string().nullable(),
  updatedAt: z.iso.datetime(),
  evidenceCount: z.number().int(),
  isDemo: z.boolean(),
});
export type AdminPromise = z.infer<typeof AdminPromise>;
export const AdminPromiseList = z.object({ promises: z.array(AdminPromise), total: z.number().int() });
export type AdminPromiseList = z.infer<typeof AdminPromiseList>;

// ---- Audit log ------------------------------------------------------------------
export const AuditEntryView = z.object({
  id: z.number().int(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  actor: z.string().nullable(),
  details: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.iso.datetime(),
});
export type AuditEntryView = z.infer<typeof AuditEntryView>;
export const AuditLogResponse = z.object({ entries: z.array(AuditEntryView) });
