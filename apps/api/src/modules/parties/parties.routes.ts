import type { FastifyPluginAsync } from "fastify";
import type { PhotoStore } from "../issues/photo-store";
import type { PartiesService } from "./parties.service";
import type { NetaService } from "./neta.service";

export const partiesRoutes =
  (service: PartiesService, neta: NetaService, leaderPhotos: PhotoStore): FastifyPluginAsync =>
  async (app) => {
    // Curated data that changes rarely: cache for 10 minutes.
    app.get("/parties", async (_req, reply) => {
      reply.header("cache-control", "public, max-age=600");
      return service.list();
    });
    app.get<{ Params: { slug: string } }>("/parties/:slug", async (req, reply) => {
      reply.header("cache-control", "public, max-age=600");
      return service.detail(req.params.slug.toLowerCase());
    });
    app.get("/timeline", async (_req, reply) => {
      reply.header("cache-control", "public, max-age=600");
      return service.timeline();
    });

    app.get<{ Querystring: { house?: string } }>("/netas", async (req, reply) => {
      reply.header("cache-control", "public, max-age=600");
      return neta.list(req.query.house === "VIDHAN_SABHA" ? "VIDHAN_SABHA" : "LOK_SABHA");
    });

    app.get<{ Params: { key: string } }>("/media/leaders/:key", async (req, reply) => {
      const stream = leaderPhotos.open(req.params.key);
      if (!stream) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Photo not found", requestId: req.id } });
      return reply.header("content-type", "image/webp").header("cache-control", "public, max-age=31536000, immutable").send(stream);
    });
  };
