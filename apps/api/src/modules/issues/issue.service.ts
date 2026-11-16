import type { CreateIssueInput, IssueDetail, IssueListResponse, ModerationActionInput, PublicUser, WeeklyHighlights } from "@trackbharat/shared";
import { AppError } from "../../lib/errors";
import { weekStartIST } from "../../lib/time";
import type { IssueRepository } from "./issue.repository";
import type { PhotoStore } from "./photo-store";

/** Anti-spam limits: generous for a real citizen, painful for a bot. */
export const MAX_ISSUES_PER_DAY = 5;
/** Independent reports needed to hide an issue until a moderator reviews it. */
export const AUTO_HIDE_REPORTS = 3;

const STAFF: PublicUser["role"][] = ["MODERATOR", "ADMIN"];

export function createIssueService(repo: IssueRepository, photos: PhotoStore, now: () => Date = () => new Date()) {
  const week = () => weekStartIST(now());

  async function visibleIssue(id: number) {
    const issue = await repo.exists(id);
    if (!issue || issue.status === "HIDDEN") throw AppError.notFound(`Issue ${id} not found`);
    return issue;
  }

  return {
    async create(user: PublicUser, input: CreateIssueInput, photo: Buffer | null): Promise<number> {
      const since = new Date(now().getTime() - 86_400_000);
      if ((await repo.countByUserSince(user.id, since)) >= MAX_ISSUES_PER_DAY) {
        throw AppError.tooMany(`You can report up to ${MAX_ISSUES_PER_DAY} issues a day. Please try again tomorrow.`);
      }
      const constituencyId = await repo.seatForPincode(input.pincode);
      if (!constituencyId) throw AppError.validation("We couldn't match this PIN code to a constituency");
      // Validate everything BEFORE writing the photo, so rejected requests leave no orphan files
      const photoKey = photo ? await photos.save(photo) : null;
      return repo.create({ userId: user.id, constituencyId, ...input, photoKey });
    },

    async list(slug: string, sort: "top" | "new", user: PublicUser | null, limit = 20): Promise<IssueListResponse> {
      const constituencyId = await repo.seatIdBySlug(slug);
      if (!constituencyId) throw AppError.notFound(`No constituency called "${slug}"`);
      const weekStart = week();
      return { weekStart, issues: await repo.list(constituencyId, { sort, weekStart, userId: user?.id ?? null, limit }) };
    },

    async highlights(slug: string): Promise<WeeklyHighlights> {
      const constituencyId = await repo.seatIdBySlug(slug);
      if (!constituencyId) throw AppError.notFound(`No constituency called "${slug}"`);
      return repo.highlights(constituencyId, week());
    },

    async get(id: number, user: PublicUser | null): Promise<IssueDetail> {
      const issue = await repo.findDetail(id, week(), user?.id ?? null);
      // Hidden issues are visible only to their author and to staff
      const canSeeHidden = user && (user.id === issue?.ownerId || STAFF.includes(user.role));
      if (!issue || (issue.status === "HIDDEN" && !canSeeHidden)) throw AppError.notFound(`Issue ${id} not found`);
      const { ownerId: _owner, ...rest } = issue;
      return rest;
    },

    /** value: +1 "faced this too", -1 "not accurate", null = take my vote back. */
    async vote(user: PublicUser, id: number, value: 1 | -1 | null) {
      const issue = await visibleIssue(id);
      if (issue.userId === user.id) throw AppError.validation("You can't vote on your own report");
      if (issue.status === "RESOLVED") throw AppError.validation("This issue is already resolved");
      const weekStart = week();
      // Unverified accounts may vote, but their votes don't count until they verify (anti-brigading).
      const counted = user.emailVerified !== false;
      if (value === null) await repo.unvote(user.id, id, weekStart);
      else await repo.vote(user.id, id, weekStart, value, counted);
      return { myVote: value ?? 0, counted, ...(await repo.tally(id, weekStart)) } as const;
    },

    async report(user: PublicUser, id: number, reason: string) {
      await visibleIssue(id);
      await repo.report(id, user.id, reason, AUTO_HIDE_REPORTS);
    },

    mine: (user: PublicUser) => repo.listByUser(user.id, week()),

    async moderate(actor: PublicUser, id: number, input: ModerationActionInput) {
      if (!(await repo.exists(id))) throw AppError.notFound(`Issue ${id} not found`);
      const plan = {
        HIDE: { status: "HIDDEN", resolveReports: true },
        RESTORE: { status: "OPEN", resolveReports: true },
        ACKNOWLEDGE: { status: "ACKNOWLEDGED", resolveReports: false },
        RESOLVE: { status: "RESOLVED", resolveReports: true },
        DISMISS_REPORTS: { status: null, resolveReports: true },
      } as const;
      const p = plan[input.action];
      await repo.moderate(id, actor.id, input.action, p.status, input.note, p.resolveReports);
    },

    reported: () => repo.reportedIssues(week()),
  };
}

export type IssueService = ReturnType<typeof createIssueService>;
