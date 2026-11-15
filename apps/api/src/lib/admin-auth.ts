import { createHash, timingSafeEqual } from "node:crypto";
import type { preHandlerAsyncHookHandler } from "fastify";
import { AppError } from "./errors";

/**
 * TEMPORARY admin protection until Phase 2 adds real accounts and roles:
 * write endpoints require `Authorization: Bearer <ADMIN_API_TOKEN>`.
 *
 * - If no token is configured, admin writes are simply disabled (safe default).
 * - Tokens are compared with timingSafeEqual on fixed-length hashes, so an
 *   attacker can't guess the token character by character by measuring how
 *   long each comparison takes (a "timing attack").
 */
const digest = (s: string) => createHash("sha256").update(s).digest();

export function requireAdmin(adminToken: string | undefined): preHandlerAsyncHookHandler {
  const expected = adminToken ? digest(adminToken) : null;
  return async (req) => {
    if (!expected) throw AppError.unauthorized("Admin API is disabled (ADMIN_API_TOKEN not set)");
    const header = req.headers.authorization ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!token || !timingSafeEqual(digest(token), expected)) throw AppError.unauthorized("Invalid or missing admin token");
  };
}
