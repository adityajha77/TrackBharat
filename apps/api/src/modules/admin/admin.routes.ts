import type { FastifyPluginAsync } from "fastify";
import { UpdateUserInput } from "@trackbharat/shared";
import { parseBody, parseId } from "../../lib/validation";
import { currentUser, requireRole } from "../auth/auth.plugin";
import type { AdminService } from "./admin.service";

/**
 * /v1/admin/*: the admin panel's data. Users are ADMIN-only. The promise list and
 * the overview are open to all staff (verifiers manage promises). Never cached.
 */
export const adminRoutes =
  (service: AdminService): FastifyPluginAsync =>
  async (app) => {
    const staff = { preHandler: requireRole("VERIFIER", "MODERATOR", "ADMIN") };
    const admins = { preHandler: requireRole("ADMIN") };
    app.addHook("onSend", async (_req, reply) => {
      reply.header("cache-control", "private, no-store");
    });

    app.get("/admin/overview", staff, async () => service.overview());

    app.get<{ Querystring: { q?: string; role?: string; blocked?: string; offset?: string } }>("/admin/users", admins, async (req) =>
      service.users({
        q: req.query.q?.trim().slice(0, 100) || undefined,
        role: ["CITIZEN", "VERIFIER", "MODERATOR", "ADMIN"].includes(req.query.role ?? "") ? req.query.role : undefined,
        blocked: req.query.blocked === "1" ? true : undefined,
        offset: Number(req.query.offset) || 0,
      }),
    );

    app.patch<{ Params: { id: string } }>("/admin/users/:id", admins, async (req, reply) => {
      await service.updateUser(currentUser(req), parseId(req.params.id, "user id"), parseBody(UpdateUserInput, req.body));
      return reply.code(204).send();
    });

    app.get<{ Querystring: { q?: string; status?: string; offset?: string } }>("/admin/promises", staff, async (req) =>
      service.promises({
        q: req.query.q?.trim().slice(0, 100) || undefined,
        status: ["PENDING", "IN_PROGRESS", "PARTIAL", "FULFILLED", "STALLED", "BROKEN"].includes(req.query.status ?? "") ? req.query.status : undefined,
        offset: Number(req.query.offset) || 0,
      }),
    );

    app.get("/admin/audit", admins, async () => service.audit(100));
  };
