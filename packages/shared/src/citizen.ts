import { z } from "zod";
import { CreatePromiseInput, PromiseCategory } from "./civic";
import { Pincode } from "./pincode";

/**
 * Contract for Phase 2: accounts, citizen issues, votes and moderation.
 */

// ---- Accounts -------------------------------------------------------------
export const UserRole = z.enum(["CITIZEN", "VERIFIER", "MODERATOR", "ADMIN"]);
export type UserRole = z.infer<typeof UserRole>;

export const PublicUser = z.object({ id: z.number().int(), name: z.string(), role: UserRole });
export type PublicUser = z.infer<typeof PublicUser>;

export const SignupInput = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  email: z.email("Enter a valid email address").trim().toLowerCase(),
  // Length beats complexity rules: a long passphrase is both stronger and easier to remember.
  password: z.string().min(10, "Use at least 10 characters").max(200),
});
export type SignupInput = z.infer<typeof SignupInput>;

export const LoginInput = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1).max(200),
});
export type LoginInput = z.infer<typeof LoginInput>;

export const AuthResponse = z.object({ token: z.string(), expiresAt: z.iso.datetime(), user: PublicUser });
export type AuthResponse = z.infer<typeof AuthResponse>;

// ---- Issues ---------------------------------------------------------------
export const IssueStatus = z.enum(["OPEN", "ACKNOWLEDGED", "RESOLVED", "HIDDEN"]);
export type IssueStatus = z.infer<typeof IssueStatus>;

export const CreateIssueInput = z.object({
  title: z.string().trim().min(8, "Title must be at least 8 characters").max(120),
  description: z.string().trim().min(20, "Describe the problem in at least 20 characters").max(2000),
  category: PromiseCategory,
  pincode: Pincode,
});
export type CreateIssueInput = z.infer<typeof CreateIssueInput>;

export const IssueSummary = z.object({
  id: z.number().int(),
  title: z.string(),
  category: PromiseCategory,
  status: IssueStatus,
  pincode: z.string(),
  createdAt: z.iso.datetime(),
  /** Path relative to the site, e.g. "/media/issues/<uuid>.webp". */
  photoPath: z.string().nullable(),
  votesThisWeek: z.number().int(),
  votesTotal: z.number().int(),
  /** Short public name, e.g. "Priya S.": never the full name or email. */
  reporter: z.string(),
  /** Only present when the request is authenticated. */
  votedByMe: z.boolean().optional(),
});
export type IssueSummary = z.infer<typeof IssueSummary>;

export const IssueDetail = IssueSummary.extend({
  description: z.string(),
  constituency: z.object({ slug: z.string(), name: z.string(), state: z.string() }),
  resolvedAt: z.iso.datetime().nullable(),
});
export type IssueDetail = z.infer<typeof IssueDetail>;

export const IssueListResponse = z.object({ weekStart: z.iso.date(), issues: z.array(IssueSummary) });
export type IssueListResponse = z.infer<typeof IssueListResponse>;

/** Frozen top issues of the last finished week, computed by the weekly job. */
export const WeeklyHighlights = z.object({
  weekStart: z.iso.date().nullable(),
  items: z.array(z.object({ rank: z.number().int(), votes: z.number().int(), issue: IssueSummary })),
});
export type WeeklyHighlights = z.infer<typeof WeeklyHighlights>;

export const VoteResponse = z.object({ voted: z.boolean(), votesThisWeek: z.number().int() });

export const ReportReason = z.enum(["SPAM", "ABUSIVE", "FALSE_INFORMATION", "PERSONAL_INFORMATION", "DUPLICATE", "OTHER"]);
export const ReportIssueInput = z.object({ reason: ReportReason });
export type ReportIssueInput = z.infer<typeof ReportIssueInput>;

// ---- Moderation & review ----------------------------------------------------
export const ModerationActionInput = z.object({
  action: z.enum(["HIDE", "RESTORE", "ACKNOWLEDGE", "RESOLVE", "DISMISS_REPORTS"]),
  note: z.string().trim().min(5, "Add a short note explaining the decision").max(500),
});
export type ModerationActionInput = z.infer<typeof ModerationActionInput>;

export const SubmissionStatus = z.enum(["PENDING", "APPROVED", "REJECTED"]);

export const PromiseSubmissionView = z.object({
  id: z.number().int(),
  status: SubmissionStatus,
  submittedBy: z.string(),
  createdAt: z.iso.datetime(),
  reviewNote: z.string().nullable(),
  promiseId: z.number().int().nullable(),
  payload: CreatePromiseInput,
});
export type PromiseSubmissionView = z.infer<typeof PromiseSubmissionView>;

export const ReviewSubmissionInput = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  note: z.string().trim().min(5, "Explain the decision (the submitter will see it)").max(500),
});
export type ReviewSubmissionInput = z.infer<typeof ReviewSubmissionInput>;

export const ModerationQueue = z.object({
  reportedIssues: z.array(z.object({ issue: IssueSummary, reports: z.array(z.object({ reason: ReportReason, createdAt: z.iso.datetime() })) })),
  submissions: z.array(PromiseSubmissionView),
});
export type ModerationQueue = z.infer<typeof ModerationQueue>;

export const MyActivity = z.object({
  user: PublicUser,
  issues: z.array(IssueSummary),
  submissions: z.array(PromiseSubmissionView),
});
export type MyActivity = z.infer<typeof MyActivity>;
