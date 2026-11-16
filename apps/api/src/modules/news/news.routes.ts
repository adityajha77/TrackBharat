import type { FastifyPluginAsync } from "fastify";
import { ReviewNewsInput, SubmitNewsInput } from "@trackbharat/shared";
import { parseBody, parseId } from "../../lib/validation";
import { currentUser, requireRole, requireUser } from "../auth/auth.plugin";
import type { NewsService } from "./news.service";

export const newsRoutes =
  (service: NewsService): FastifyPluginAsync =>
  async (app) => {
    app.get<{ Querystring: { state?: string; limit?: string } }>("/news", async (req, reply) => {
      reply.header("cache-control", "public, max-age=120");
      return service.published({ state: req.query.state?.slice(0, 80), limit: Number(req.query.limit) || undefined });
    });

    app.post("/news", { preHandler: requireUser, config: { rateLimit: { max: 5, timeWindow: "10 minutes" } } }, async (req, reply) => {
      const id = await service.submit(currentUser(req), parseBody(SubmitNewsInput, req.body));
      return reply.code(201).send({ id });
    });

    // Verifiers write the summary and publish; same people who check promises.
    const staff = requireRole("VERIFIER", "MODERATOR", "ADMIN");
    app.get("/moderation/news", { preHandler: staff }, async (_req, reply) => {
      reply.header("cache-control", "private, no-store");
      return { items: await service.drafts() };
    });
    app.post<{ Params: { id: string } }>("/moderation/news/:id", { preHandler: staff }, async (req, reply) => {
      await service.review(currentUser(req), parseId(req.params.id), parseBody(ReviewNewsInput, req.body));
      return reply.code(204).send();
    });
  };
