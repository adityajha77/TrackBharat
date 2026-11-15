import type { FastifyPluginAsync } from "fastify";
import { ChangePasswordInput, DeleteAccountInput, LoginInput, SignupInput } from "@trackbharat/shared";
import { parseBody } from "../../lib/validation";
import { currentUser, requireUser } from "./auth.plugin";
import type { AccountService } from "./account";
import type { AuthService } from "./auth.service";

// Much stricter limit than the global one: slows down password guessing.
const AUTH_RATE_LIMIT = { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } };

export const authRoutes =
  (service: AuthService, account: AccountService): FastifyPluginAsync =>
  async (app) => {
    app.post("/auth/signup", AUTH_RATE_LIMIT, async (req, reply) => {
      const res = await service.signup(parseBody(SignupInput, req.body), req.headers["user-agent"] ?? null);
      return reply.code(201).send(res);
    });

    app.post("/auth/login", AUTH_RATE_LIMIT, async (req) => service.login(parseBody(LoginInput, req.body), req.headers["user-agent"] ?? null));

    app.post("/auth/logout", { preHandler: requireUser }, async (req, reply) => {
      await service.logout(req.sessionToken!);
      return reply.code(204).send();
    });

    app.post("/auth/change-password", { preHandler: requireUser, ...AUTH_RATE_LIMIT }, async (req, reply) => {
      await account.changePassword(currentUser(req), req.sessionToken!, parseBody(ChangePasswordInput, req.body));
      return reply.code(204).send();
    });

    // DELETE with a body is legal but awkward for some clients, so we use POST
    app.post("/auth/delete-account", { preHandler: requireUser, ...AUTH_RATE_LIMIT }, async (req, reply) => {
      await account.deleteAccount(currentUser(req), parseBody(DeleteAccountInput, req.body).password);
      return reply.code(204).send();
    });

    app.get("/auth/me", { preHandler: requireUser }, async (req, reply) => {
      reply.header("cache-control", "private, no-store"); // per-user: never cache in shared caches
      return currentUser(req);
    });
  };
