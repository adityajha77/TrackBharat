import type { FastifyPluginAsync } from "fastify";
import type { z } from "zod";
import { AddEvidenceInput, CreatePromiseInput, UpdatePromiseStatusInput } from "@trackbharat/shared";
import { requireAdmin } from "../../lib/admin-auth";
import { AppError } from "../../lib/errors";
import type { PromiseService } from "./promise.service";

/** Parse a request body with a shared schema, turning Zod errors into a 400. */
function parseBody<T extends z.ZodType>(schema: T, body: unknown): z.infer<T> {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    throw AppError.validation(i ? `${i.path.join(".") || "body"}: ${i.message}` : "Invalid request body");
  }
  return parsed.data;
}

function parseId(raw: string) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) throw AppError.validation("Invalid promise id");
  return id;
}

export const promiseRoutes =
  (service: PromiseService, opts: { adminToken: string | undefined }): FastifyPluginAsync =>
  async (app) => {
    // ---- Public ------------------------------------------------------------
    app.get<{ Params: { id: string } }>("/promises/:id", async (req, reply) => {
      reply.header("cache-control", "public, max-age=60, stale-while-revalidate=600");
      return service.get(parseId(req.params.id));
    });

    // ---- Admin (writes) ----------------------------------------------------
    // Registered as a nested plugin so the auth hook applies ONLY to these routes.
    await app.register(async (admin) => {
      admin.addHook("preHandler", requireAdmin(opts.adminToken));

      admin.post("/admin/promises", async (req, reply) => {
        const id = await service.create(parseBody(CreatePromiseInput, req.body));
        return reply.code(201).send({ id });
      });

      admin.post<{ Params: { id: string } }>("/admin/promises/:id/status", async (req, reply) => {
        const id = await service.updateStatus(parseId(req.params.id), parseBody(UpdatePromiseStatusInput, req.body));
        return reply.code(201).send({ id });
      });

      admin.post<{ Params: { id: string } }>("/admin/promises/:id/evidence", async (req, reply) => {
        const id = await service.addEvidence(parseId(req.params.id), parseBody(AddEvidenceInput, req.body));
        return reply.code(201).send({ id });
      });
    });
  };
