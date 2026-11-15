import { createHash, randomBytes } from "node:crypto";
import type { AuthResponse, LoginInput, PublicUser, SignupInput } from "@trackbharat/shared";
import { AppError } from "../../lib/errors";
import type { AuthRepository } from "./auth.repository";
import { dummyHash, hashPassword, verifyPassword } from "./password";

/**
 * SESSION-BASED AUTH with opaque bearer tokens.
 *
 *   login → we create 32 random bytes (the token), give it to the client ONCE,
 *           and store only sha256(token) in the sessions table.
 *   every request → client sends "Authorization: Bearer <token>" → we hash it
 *           and look the hash up.
 *
 * Why not JWTs? A JWT can't be revoked before it expires; deleting a session row
 * logs someone out instantly (logout, "block this user"). The web app keeps the
 * token in an httpOnly cookie; the future mobile app keeps it in secure storage.
 */
export const SESSION_TTL_DAYS = 30;
const DAY_MS = 86_400_000;

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export function createAuthService(repo: AuthRepository, now: () => Date = () => new Date()) {
  const expiry = () => new Date(now().getTime() + SESSION_TTL_DAYS * DAY_MS);

  async function issueSession(user: PublicUser, userAgent: string | null): Promise<AuthResponse> {
    const token = randomBytes(32).toString("base64url"); // 256 bits of randomness: unguessable
    const expiresAt = expiry();
    await repo.createSession(user.id, hashToken(token), expiresAt, userAgent);
    return { token, expiresAt: expiresAt.toISOString(), user };
  }

  return {
    async signup(input: SignupInput, userAgent: string | null): Promise<AuthResponse> {
      if (await repo.findUserByEmail(input.email)) throw AppError.conflict("An account with this email already exists");
      const user = await repo.createUser({ name: input.name, email: input.email, passwordHash: await hashPassword(input.password) });
      return issueSession(user, userAgent);
    },

    async login(input: LoginInput, userAgent: string | null): Promise<AuthResponse> {
      const u = await repo.findUserByEmail(input.email);
      // Always run ONE password verification, even for unknown emails (see dummyHash)
      const ok = await verifyPassword(u?.passwordHash ?? (await dummyHash()), input.password);
      // Same message for "no such user" and "wrong password": don't reveal which emails exist
      if (!u || !ok) throw AppError.unauthorized("Incorrect email or password");
      if (u.isBlocked) throw AppError.forbidden("This account has been blocked");
      return issueSession({ id: u.id, name: u.name, role: u.role }, userAgent);
    },

    async logout(token: string) {
      await repo.deleteSession(hashToken(token));
    },

    /** Resolve a bearer token to a user (or null). Called on every request that carries a token. */
    async resolve(token: string): Promise<PublicUser | null> {
      const s = await repo.findSessionUser(hashToken(token));
      if (!s) return null;
      // Extend the session at most once a day, not on every request (saves a write per request)
      if (now().getTime() - s.lastSeenAt.getTime() > DAY_MS) await repo.touchSession(s.sessionId, expiry());
      return { id: s.id, name: s.name, role: s.role };
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
