import { and, eq, gt, sql } from "drizzle-orm";
import type { PublicUser, UserRole } from "@trackbharat/shared";
import type { Database } from "../../db/client";
import { sessions, users } from "../../db/schema";

export interface UserRecord extends PublicUser {
  email: string;
  passwordHash: string;
  isBlocked: boolean;
}

export function createAuthRepository(db: Database) {
  return {
    async findUserByEmail(email: string): Promise<UserRecord | null> {
      const [u] = await db
        .select({ id: users.id, name: users.name, role: users.role, email: users.email, passwordHash: users.passwordHash, isBlocked: users.isBlocked })
        .from(users)
        .where(eq(users.email, email));
      return u ?? null;
    },

    async createUser(input: { name: string; email: string; passwordHash: string; role?: UserRole }): Promise<PublicUser> {
      const [u] = await db.insert(users).values(input).returning({ id: users.id, name: users.name, role: users.role });
      return u!;
    },

    async createSession(userId: number, tokenHash: string, expiresAt: Date, userAgent: string | null) {
      await db.insert(sessions).values({ userId, tokenHash, expiresAt, userAgent });
    },

    /** The user behind a session token, if the session exists, hasn't expired and the user isn't blocked. */
    async findSessionUser(tokenHash: string): Promise<(PublicUser & { sessionId: number; lastSeenAt: Date }) | null> {
      const [row] = await db
        .select({ sessionId: sessions.id, lastSeenAt: sessions.lastSeenAt, id: users.id, name: users.name, role: users.role })
        .from(sessions)
        .innerJoin(users, eq(users.id, sessions.userId))
        .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, sql`now()`), eq(users.isBlocked, false)));
      return row ?? null;
    },

    /** Sliding expiry: an active user stays logged in; an idle session dies after the TTL. */
    async touchSession(sessionId: number, expiresAt: Date) {
      await db.update(sessions).set({ lastSeenAt: sql`now()`, expiresAt }).where(eq(sessions.id, sessionId));
    },

    async deleteSession(tokenHash: string) {
      await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
    },
  };
}

export type AuthRepository = ReturnType<typeof createAuthRepository>;
