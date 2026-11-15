import { PromiseStatus, type ConstituencyDetail, type PincodeConstituenciesResponse } from "@trackbharat/shared";
import { AppError } from "../../lib/errors";
import type { ConstituencyRepository } from "./constituency.repository";

/**
 * A PIN code is shown as belonging to a constituency only if at least this
 * share of its post offices lies inside it. Filters out the noise from a few
 * badly geocoded offices (see ADR-0007). The top match is always kept.
 */
export const MIN_PINCODE_SHARE = 0.2;

export function createConstituencyService(repo: ConstituencyRepository) {
  return {
    async forPincode(pincode: string): Promise<PincodeConstituenciesResponse> {
      const all = await repo.forPincode(pincode); // sorted by share, highest first
      // Apply the threshold separately per house: a PIN has its own Lok Sabha AND Vidhan Sabha seats.
      const constituencies = (["LOK_SABHA", "VIDHAN_SABHA"] as const).flatMap((house) =>
        all.filter((c) => c.house === house).filter((c, i) => i === 0 || c.share >= MIN_PINCODE_SHARE),
      );
      return { pincode, constituencies };
    },

    async detail(slug: string): Promise<ConstituencyDetail> {
      const c = await repo.findBySlug(slug);
      if (!c) throw AppError.notFound(`No constituency called "${slug}"`);

      // Independent queries → run them in parallel
      const [outline, boundarySource, reps, promises, family] = await Promise.all([
        repo.outline(c.id),
        repo.boundarySource(c.id),
        repo.representatives(c.id),
        repo.promises(c.id),
        repo.family(c.id),
      ]);

      const promiseCounts = Object.fromEntries(PromiseStatus.options.map((s) => [s, 0])) as ConstituencyDetail["promiseCounts"];
      for (const p of promises) promiseCounts[p.status]++;

      const { id: _id, ...summary } = c;
      return {
        ...summary,
        ...family,
        outline,
        boundarySource,
        representatives: reps.filter((r) => r.status === "SITTING"),
        formerRepresentatives: reps.filter((r) => r.status !== "SITTING"),
        promiseCounts,
        promises,
      };
    },

    index: () => repo.index(),
  };
}

export type ConstituencyService = ReturnType<typeof createConstituencyService>;
