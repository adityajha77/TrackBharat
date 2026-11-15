import type { FastifyPluginAsync } from "fastify";
import { Pincode } from "@trackbharat/shared";
import { AppError } from "../../lib/errors";
import type { ConstituencyService } from "./constituency.service";

// Public, read-only, rarely-changing data → let browsers/CDNs cache it.
const PUBLIC_CACHE = "public, max-age=300, stale-while-revalidate=3600";

export const constituencyRoutes =
  (service: ConstituencyService): FastifyPluginAsync =>
  async (app) => {
    app.get("/constituencies", async (_req, reply) => {
      reply.header("cache-control", PUBLIC_CACHE);
      return service.index();
    });

    app.get<{ Params: { slug: string } }>("/constituencies/:slug", async (req, reply) => {
      const slug = req.params.slug.toLowerCase();
      if (!/^[a-z0-9-]{1,120}$/.test(slug)) throw AppError.validation("Invalid constituency id");
      reply.header("cache-control", PUBLIC_CACHE);
      return service.detail(slug);
    });

    app.get<{ Params: { pincode: string } }>("/pincodes/:pincode/constituencies", async (req, reply) => {
      const parsed = Pincode.safeParse(req.params.pincode);
      if (!parsed.success) throw AppError.validation(parsed.error.issues[0]?.message ?? "Invalid PIN code");
      reply.header("cache-control", PUBLIC_CACHE);
      return service.forPincode(parsed.data);
    });
  };
