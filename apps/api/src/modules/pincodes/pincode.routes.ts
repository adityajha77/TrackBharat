import type { FastifyPluginAsync } from "fastify";
import { Pincode } from "@trackbharat/shared";
import { AppError } from "../../lib/errors";
import type { PincodeService } from "./pincode.service";

/**
 * ROUTES (HTTP layer): parse input → call service → send output.
 * No business logic here, which is why the same service could be called from a
 * CLI, a cron job or a GraphQL resolver later without copy-paste.
 */
export const pincodeRoutes =
  (service: PincodeService): FastifyPluginAsync =>
  async (app) => {
    app.get<{ Params: { pincode: string } }>("/pincodes/:pincode", async (req, reply) => {
      const parsed = Pincode.safeParse(req.params.pincode);
      if (!parsed.success) throw AppError.validation(parsed.error.issues[0]?.message ?? "Invalid PIN code");

      const result = await service.lookup(parsed.data);
      // HTTP caching: browsers/CDNs may reuse this for 1h, and serve a stale copy
      // for a day while revalidating in the background. PIN data rarely changes.
      reply.header("cache-control", "public, max-age=3600, stale-while-revalidate=86400");
      return result;
    });
  };
