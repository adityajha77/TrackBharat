import type { CreatePromiseInput, PublicUser, ReviewSubmissionInput } from "@trackbharat/shared";
import { AppError } from "../../lib/errors";
import type { PromiseService } from "../promises/promise.service";
import type { SubmissionRepository } from "./submission.repository";

export const MAX_SUBMISSIONS_PER_DAY = 10;

/**
 * Citizen-submitted promises go through a REVIEW QUEUE: nothing a citizen
 * submits appears on the site until a verifier has checked its source.
 * Approving runs the exact same code path as a verifier adding a promise directly.
 */
export function createSubmissionService(repo: SubmissionRepository, promises: PromiseService, now: () => Date = () => new Date()) {
  return {
    async submit(user: PublicUser, input: CreatePromiseInput) {
      if ((await repo.countByUserSince(user.id, new Date(now().getTime() - 86_400_000))) >= MAX_SUBMISSIONS_PER_DAY) {
        throw AppError.tooMany(`You can submit up to ${MAX_SUBMISSIONS_PER_DAY} promises a day`);
      }
      return repo.create(user.id, input);
    },

    async review(actor: PublicUser, id: number, input: ReviewSubmissionInput) {
      const s = await repo.find(id);
      if (!s) throw AppError.notFound(`Submission ${id} not found`);
      if (s.status !== "PENDING") throw AppError.conflict("This submission has already been reviewed");

      if (input.decision === "REJECT") {
        await repo.markReviewed(id, actor.id, "REJECTED", input.note, null);
        return { promiseId: null };
      }
      // Business rules (seat exists, sitting MP, known party…) are enforced by the promise service
      const promiseId = await promises.create(s.payload, actor.id);
      const ok = await repo.markReviewed(id, actor.id, "APPROVED", input.note, promiseId);
      if (!ok) throw AppError.conflict("This submission was reviewed by someone else at the same time");
      return { promiseId };
    },

    pending: () => repo.listPending(),
    mine: (user: PublicUser) => repo.listByUser(user.id),
  };
}

export type SubmissionService = ReturnType<typeof createSubmissionService>;
