import fp from "fastify-plugin";
import type { FastifyRequest, preHandlerAsyncHookHandler } from "fastify";
import type { PublicUser, UserRole } from "@trackbharat/shared";
import { AppError } from "../../lib/errors";
import type { AuthService } from "./auth.service";

// TypeScript "declaration merging": teach Fastify that every request has `user`.
declare module "fastify" {
  interface FastifyRequest {
    user: PublicUser | null;
    sessionToken: string | null;
  }
}

/**
 * AUTHENTICATION ("who are you?") runs on EVERY request: if a bearer token is
 * present, attach the user. A missing or invalid token is NOT an error here:
 * public routes still work for anonymous visitors.
 *
 * fastify-plugin (fp) makes the hook apply to the whole app instead of being
 * scoped to this plugin's encapsulation context.
 */
export const authPlugin = fp<{ auth: Pick<AuthService, "resolve"> }>(async (app, { auth }) => {
  app.decorateRequest("user", null);
  app.decorateRequest("sessionToken", null);
  app.addHook("onRequest", async (req) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) return;
    const token = header.slice(7).trim();
    if (!token || token.length > 200) return;
    req.user = await auth.resolve(token);
    req.sessionToken = req.user ? token : null;
  });
});

/**
 * AUTHORIZATION ("are you allowed?"): route-level guards, used as preHandlers.
 *   requireUser   → 401 if not logged in
 *   requireRole() → 401 if not logged in, 403 if logged in with the wrong role
 */
export const requireUser: preHandlerAsyncHookHandler = async (req) => {
  if (!req.user) throw AppError.unauthorized("Please log in to do this");
};

export function requireRole(...roles: UserRole[]): preHandlerAsyncHookHandler {
  return async (req) => {
    if (!req.user) throw AppError.unauthorized("Please log in to do this");
    if (!roles.includes(req.user.role)) throw AppError.forbidden(`This needs one of these roles: ${roles.join(", ")}`);
  };
}

/** Narrowing helper inside handlers that are already guarded. */
export function currentUser(req: FastifyRequest): PublicUser {
  if (!req.user) throw AppError.unauthorized("Please log in to do this");
  return req.user;
}
