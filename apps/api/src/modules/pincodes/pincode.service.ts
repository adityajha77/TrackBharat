import type { PincodeLookupResponse } from "@trackbharat/shared";
import { AppError } from "../../lib/errors";
import type { PincodeDirectory } from "./india-post.client";
import type { CachedPincode, PincodeRepository } from "./pincode.repository";

/**
 * SERVICE: business rules, with no HTTP and no SQL in here.
 *
 * Rule: "cache-aside" (a.k.a. lazy loading):
 *   1. Look in our database.
 *   2. Fresh hit (younger than TTL)? Return it. Fast, and India Post isn't touched.
 *   3. Miss or stale? Fetch from India Post, save it, return it.
 *   4. India Post down but we have a stale copy? Serve the stale copy (graceful
 *      degradation): old data beats an error page.
 */
export interface PincodeServiceDeps {
  repo: PincodeRepository;
  directory: PincodeDirectory;
  cacheTtlDays: number;
  now?: () => Date; // injectable clock, so tests can time-travel
}

export function createPincodeService({ repo, directory, cacheTtlDays, now = () => new Date() }: PincodeServiceDeps) {
  const ttlMs = cacheTtlDays * 24 * 60 * 60 * 1000;

  const toResponse = (c: CachedPincode, source: "cache" | "upstream"): PincodeLookupResponse => ({
    pincode: c.pincode,
    district: c.district,
    state: c.state,
    postOffices: c.postOffices,
    source,
    fetchedAt: c.fetchedAt.toISOString(),
  });

  return {
    async lookup(pincode: string): Promise<PincodeLookupResponse> {
      const cached = await repo.find(pincode);
      const isFresh = cached && now().getTime() - cached.fetchedAt.getTime() < ttlMs;
      if (cached && isFresh) return toResponse(cached, "cache");

      let offices;
      try {
        offices = await directory.lookup(pincode);
      } catch (err) {
        if (cached) return toResponse(cached, "cache"); // stale-if-error
        throw err;
      }

      if (!offices) throw AppError.notFound(`No post offices found for PIN code ${pincode}`);
      return toResponse(await repo.save(pincode, offices), "upstream");
    },
  };
}

export type PincodeService = ReturnType<typeof createPincodeService>;
