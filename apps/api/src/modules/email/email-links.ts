import { randomBytes } from "node:crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import type { PublicUser } from "@trackbharat/shared";
import type { Database } from "../../db/client";
import { emailTokens, issueVotes, causeVotes, sessions, users } from "../../db/schema";
import { recordAudit } from "../../lib/audit";
import { AppError } from "../../lib/errors";
import { hashToken } from "../auth/auth.service";
import { hashPassword } from "../auth/password";
import type { Mailer } from "./mailer";

/**
 * ONE-TIME EMAIL LINKS: "verify your email" and "reset your password".
 *
 * Same idea as sessions: the link carries 32 random bytes; we store only their
 * SHA-256, with an expiry, and mark the row used. A stolen database can't be used
 * to reset anyone's password, and a link works exactly once.
 */
export const VERIFY_TTL_HOURS = 48;
export const RESET_TTL_MINUTES = 30;

type Purpose = "VERIFY_EMAIL" | "RESET_PASSWORD";

export function createEmailLinksService(db: Database, mailer: Mailer, webUrl: string, now: () => Date = () => new Date()) {
  async function issue(userId: number, purpose: Purpose, ttlMs: number) {
    const token = randomBytes(32).toString("base64url");
    // Older unused links for the same purpose stop working: only the newest one is valid.
    await db.update(emailTokens).set({ usedAt: now() }).where(and(eq(emailTokens.userId, userId), eq(emailTokens.purpose, purpose), isNull(emailTokens.usedAt)));
    await db.insert(emailTokens).values({ userId, purpose, tokenHash: hashToken(token), expiresAt: new Date(now().getTime() + ttlMs) });
    return token;
  }

  /** Finds a valid (unused, unexpired) token and marks it used, atomically. */
  async function consume(token: string, purpose: Purpose) {
    const [row] = await db
      .update(emailTokens)
      .set({ usedAt: now() })
      .where(and(eq(emailTokens.tokenHash, hashToken(token)), eq(emailTokens.purpose, purpose), isNull(emailTokens.usedAt), gt(emailTokens.expiresAt, now())))
      .returning({ userId: emailTokens.userId });
    if (!row) throw AppError.validation("This link is invalid or has expired");
    return row.userId;
  }

  async function emailOf(userId: number) {
    const [u] = await db.select({ email: users.email, name: users.name, verified: users.emailVerifiedAt }).from(users).where(eq(users.id, userId));
    return u ?? null;
  }

  return {
    async sendVerification(user: PublicUser) {
      const u = await emailOf(user.id);
      if (!u || u.verified) return;
      const token = await issue(user.id, "VERIFY_EMAIL", VERIFY_TTL_HOURS * 3_600_000);
      await mailer.send({
        to: u.email,
        subject: "Verify your email for TrackBharat",
        text: `Namaste ${u.name},\n\nPlease confirm your email so your votes count in TrackBharat's rankings:\n\n${webUrl}/verify?token=${token}\n\nThe link works for ${VERIFY_TTL_HOURS} hours. If you didn't sign up, ignore this email.\n\nTrackBharat: no party, no religion, only transparency.`,
      });
    },

    /** Marks the account verified and makes the votes it already cast count. */
    async verify(token: string) {
      const userId = await consume(token, "VERIFY_EMAIL");
      await db.transaction(async (tx) => {
        await tx.update(users).set({ emailVerifiedAt: now() }).where(and(eq(users.id, userId), isNull(users.emailVerifiedAt)));
        await tx.update(issueVotes).set({ counted: true }).where(eq(issueVotes.userId, userId));
        await tx.update(causeVotes).set({ counted: true }).where(eq(causeVotes.userId, userId));
        await recordAudit(tx, { actorId: userId, action: "user.verify_email", entityType: "user", entityId: userId });
      });
    },

    /** Always succeeds silently: never reveal which emails have accounts. */
    async forgotPassword(email: string) {
      const [u] = await db.select({ id: users.id, name: users.name, blocked: users.isBlocked }).from(users).where(eq(users.email, email));
      if (!u || u.blocked) return;
      const token = await issue(u.id, "RESET_PASSWORD", RESET_TTL_MINUTES * 60_000);
      await mailer.send({
        to: email,
        subject: "Reset your TrackBharat password",
        text: `Namaste ${u.name},\n\nSomeone (hopefully you) asked to reset your TrackBharat password. Choose a new one here:\n\n${webUrl}/reset-password?token=${token}\n\nThe link works for ${RESET_TTL_MINUTES} minutes and only once. If it wasn't you, ignore this email: your password stays the same.`,
      });
    },

    /** New password, and every existing session is logged out (the old password may be known to someone). */
    async resetPassword(token: string, newPassword: string) {
      const userId = await consume(token, "RESET_PASSWORD");
      const passwordHash = await hashPassword(newPassword);
      await db.transaction(async (tx) => {
        // Clicking a link sent to the inbox also proves the email address.
        await tx.update(users).set({ passwordHash, emailVerifiedAt: sql`coalesce(${users.emailVerifiedAt}, now())` }).where(eq(users.id, userId));
        await tx.delete(sessions).where(eq(sessions.userId, userId));
        await recordAudit(tx, { actorId: userId, action: "user.reset_password", entityType: "user", entityId: userId });
      });
    },

    outbox: mailer.outbox,
  };
}

export type EmailLinksService = ReturnType<typeof createEmailLinksService>;
