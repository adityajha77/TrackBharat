import type { FastifyPluginAsync } from "fastify";
import { LoginInput, SignupInput } from "@trackbharat/shared";
import { parseBody } from "../../lib/validation";
import { currentUser, requireUser } from "./auth.plugin";
import type { AuthService } from "./auth.service";

// Much stricter limit than the global one: slows down password guessing.
const AUTH_RATE_LIMIT = { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } };

export const authRoutes =
  (service: AuthService): FastifyPluginAsync =>
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

    app.get("/auth/me", { preHandler: requireUser }, async (req, reply) => {
      reply.header("cache-control", "private, no-store"); // per-user: never cache in shared caches
      return currentUser(req);
    });
  };
