import type { FastifyPluginAsync } from "fastify";
import { ChangePasswordInput, DeleteAccountInput, ForgotPasswordInput, LoginInput, ResetPasswordInput, SignupInput, TokenInput } from "@trackbharat/shared";
import type { EmailLinksService } from "../email/email-links";
import { parseBody } from "../../lib/validation";
import { currentUser, requireUser } from "./auth.plugin";
import type { AccountService } from "./account";
import type { AuthService } from "./auth.service";

// Much stricter limit than the global one: slows down password guessing.
const AUTH_RATE_LIMIT = { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } };

export const authRoutes =
  (service: AuthService, account: AccountService, links: EmailLinksService): FastifyPluginAsync =>
  async (app) => {
    app.post("/auth/signup", AUTH_RATE_LIMIT, async (req, reply) => {
      const res = await service.signup(parseBody(SignupInput, req.body), req.headers["user-agent"] ?? null);
      // A failed email must not fail the signup: they can ask for the link again.
      await links.sendVerification(res.user).catch((err) => req.log.warn({ err }, "verification email failed"));
      return reply.code(201).send(res);
    });

    // ---- Email links -------------------------------------------------------
    app.post("/auth/verify-email", AUTH_RATE_LIMIT, async (req, reply) => {
      await links.verify(parseBody(TokenInput, req.body).token);
      return reply.code(204).send();
    });
    app.post("/auth/resend-verification", { preHandler: requireUser, config: { rateLimit: { max: 3, timeWindow: "10 minutes" } } }, async (req, reply) => {
      await links.sendVerification(currentUser(req));
      return reply.code(204).send();
    });
    app.post("/auth/forgot-password", { config: { rateLimit: { max: 5, timeWindow: "10 minutes" } } }, async (req, reply) => {
      // Same answer whether or not the account exists, and whether or not the email
      // could be sent right now (a mail outage must not reveal which emails exist).
      await links.forgotPassword(parseBody(ForgotPasswordInput, req.body).email).catch((err) => req.log.error({ err }, "password-reset email failed"));
      return reply.code(204).send();
    });
    app.post("/auth/reset-password", AUTH_RATE_LIMIT, async (req, reply) => {
      const input = parseBody(ResetPasswordInput, req.body);
      await links.resetPassword(input.token, input.newPassword);
      return reply.code(204).send();
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
