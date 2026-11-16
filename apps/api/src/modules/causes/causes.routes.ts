import type { FastifyPluginAsync } from "fastify";
import { UpdateCauseInput, VoteInput } from "@trackbharat/shared";
import { parseBody, parseId } from "../../lib/validation";
import { currentUser, requireRole, requireUser } from "../auth/auth.plugin";
import type { CausesService } from "./causes.service";

export const causesRoutes =
  (service: CausesService): FastifyPluginAsync =>
  async (app) => {
    app.get("/causes/current", async (req, reply) => {
      reply.header("cache-control", req.user ? "private, no-store" : "public, max-age=60");
      return service.current(req.user);
    });

    const limit = { rateLimit: { max: 30, timeWindow: "1 minute" } };
    app.post<{ Params: { id: string } }>("/causes/:id/vote", { preHandler: requireUser, config: limit }, async (req) =>
      service.vote(currentUser(req), parseId(req.params.id), parseBody(VoteInput, req.body ?? {}).value),
    );
    app.delete<{ Params: { id: string } }>("/causes/:id/vote", { preHandler: requireUser, config: limit }, async (req) =>
      service.vote(currentUser(req), parseId(req.params.id), null),
    );

    app.patch<{ Params: { id: string } }>("/moderation/causes/:id", { preHandler: requireRole("MODERATOR", "ADMIN") }, async (req, reply) => {
      await service.update(currentUser(req), parseId(req.params.id), parseBody(UpdateCauseInput, req.body));
      return reply.code(204).send();
    });
  };
