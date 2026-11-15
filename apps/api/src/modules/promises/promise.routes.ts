import type { FastifyPluginAsync } from "fastify";
import { AddEvidenceInput, CreatePromiseInput, UpdatePromiseStatusInput } from "@trackbharat/shared";
import { parseBody, parseId } from "../../lib/validation";
import { currentUser, requireRole } from "../auth/auth.plugin";
import type { PromiseService } from "./promise.service";

/**
 * Promise routes. Reads are public. Writes need the VERIFIER or ADMIN role
 * (Phase 2 replaced Phase 1's temporary shared admin token with real accounts),
 * and every write is recorded in the audit log with who made it.
 */
export const promiseRoutes =
  (service: PromiseService): FastifyPluginAsync =>
  async (app) => {
    app.get<{ Params: { id: string } }>("/promises/:id", async (req, reply) => {
      reply.header("cache-control", "public, max-age=60, stale-while-revalidate=600");
      return service.get(parseId(req.params.id, "promise id"));
    });

    const verifiers = { preHandler: requireRole("VERIFIER", "ADMIN") };

    app.post("/admin/promises", verifiers, async (req, reply) => {
      const id = await service.create(parseBody(CreatePromiseInput, req.body), currentUser(req).id);
      return reply.code(201).send({ id });
    });

    app.post<{ Params: { id: string } }>("/admin/promises/:id/status", verifiers, async (req, reply) => {
      const id = await service.updateStatus(parseId(req.params.id, "promise id"), parseBody(UpdatePromiseStatusInput, req.body), currentUser(req).id);
      return reply.code(201).send({ id });
    });

    app.post<{ Params: { id: string } }>("/admin/promises/:id/evidence", verifiers, async (req, reply) => {
      const id = await service.addEvidence(parseId(req.params.id, "promise id"), parseBody(AddEvidenceInput, req.body), currentUser(req).id);
      return reply.code(201).send({ id });
    });
  };
