import { z } from "zod";
import { AppError } from "../../lib/errors";
import type { PostOffice } from "@trackbharat/shared";

/**
 * ADAPTER for the external India Post API (https://api.postalpincode.in).
 *
 * Why an adapter? The rest of our code never sees India Post's odd response
 * format (capitalised keys, "Status": "Error", arrays-in-arrays). If they change
 * it, or we switch to a different data source, only this file changes.
 *
 * It is an *interface* + implementation, so tests can pass a fake instead of
 * hitting the real network (dependency injection; see pincode.service.test.ts).
 */
export interface PincodeDirectory {
  /** Returns post offices for the PIN, or `null` if the PIN does not exist. */
  lookup(pincode: string): Promise<PostOffice[] | null>;
}

// What India Post actually returns. We validate it, never trust external input.
const IndiaPostResponse = z.array(
  z.object({
    Status: z.string(),
    PostOffice: z
      .array(
        z.object({
          Name: z.string(),
          BranchType: z.string(),
          DeliveryStatus: z.string(),
          Block: z.string().nullable().optional(),
          District: z.string(),
          State: z.string(),
        }),
      )
      .nullable(),
  }),
);

export function createIndiaPostClient(baseUrl: string, timeoutMs = 5_000): PincodeDirectory {
  return {
    async lookup(pincode) {
      let res: Response;
      try {
        res = await fetch(`${baseUrl}/pincode/${pincode}`, {
          signal: AbortSignal.timeout(timeoutMs), // never hang a request on a slow upstream
          headers: { accept: "application/json" },
        });
      } catch {
        throw AppError.upstream("India Post API did not respond in time");
      }
      if (!res.ok) throw AppError.upstream(`India Post API returned HTTP ${res.status}`);

      const parsed = IndiaPostResponse.safeParse(await res.json());
      if (!parsed.success) throw AppError.upstream("India Post API returned an unexpected format");

      const first = parsed.data[0];
      if (!first || first.Status !== "Success" || !first.PostOffice?.length) return null;

      return first.PostOffice.map((po) => ({
        name: po.Name,
        branchType: po.BranchType,
        deliveryStatus: po.DeliveryStatus,
        block: po.Block && po.Block !== "NA" ? po.Block : null,
        district: po.District,
        state: po.State,
      }));
    },
  };
}
