import { and, eq, isNotNull, ne } from "drizzle-orm";
import type { ChangePasswordInput, PublicUser } from "@trackbharat/shared";
import type { Database } from "../../db/client";
import { recordAudit } from "../../lib/audit";
import { AppError } from "../../lib/errors";
import { issues, sessions, users } from "../../db/schema";
import type { PhotoStore } from "../issues/photo-store";
import { hashPassword, verifyPassword } from "./password";
import { hashToken } from "./auth.service";

/**
 * ACCOUNT MANAGEMENT: change password, delete account.
 *
 * DELETE = the "right to erasure" of India's DPDP Act, 2023. Deleting a user
 * removes (via ON DELETE CASCADE) their sessions, reports, votes and promise
 * submissions; their photos are deleted from disk; audit-log entries stay but
 * lose the link to the person (ON DELETE SET NULL): accountability records
 * must outlive the account, without identifying the person.
 */
export function createAccountService(db: Database, photos: Pick<PhotoStore, "remove">) {
  async function checkPassword(userId: number, password: string) {
    const [u] = await db.select({ hash: users.passwordHash }).from(users).where(eq(users.id, userId));
    // Same answer whether the account is missing or the password is wrong
    if (!u || !(await verifyPassword(u.hash, password))) throw AppError.unauthorized("Incorrect password");
  }

  return {
    async changePassword(user: PublicUser, currentToken: string, input: ChangePasswordInput) {
      await checkPassword(user.id, input.currentPassword);
      const passwordHash = await hashPassword(input.newPassword);
      await db.transaction(async (tx) => {
        await tx.update(users).set({ passwordHash }).where(eq(users.id, user.id));
        // Log out every OTHER device: if the old password was stolen, the thief is kicked out
        await tx.delete(sessions).where(and(eq(sessions.userId, user.id), ne(sessions.tokenHash, hashToken(currentToken))));
        await recordAudit(tx, { actorId: user.id, action: "user.change_password", entityType: "user", entityId: user.id });
      });
    },

    async deleteAccount(user: PublicUser, password: string) {
      // Accounts linked to Google may have no password they know: being signed in is the proof.
      const [linked] = await db.select({ sub: users.googleSub }).from(users).where(eq(users.id, user.id));
      if (!(linked?.sub && password === "")) await checkPassword(user.id, password);
      const keys = (await db.select({ k: issues.photoKey }).from(issues).where(and(eq(issues.userId, user.id), isNotNull(issues.photoKey)))).map((r) => r.k!);
      await db.transaction(async (tx) => {
        await recordAudit(tx, { actorId: null, action: "user.delete_self", entityType: "user", entityId: user.id });
        await tx.delete(users).where(eq(users.id, user.id));
      });
      await Promise.all(keys.map((k) => photos.remove(k).catch(() => undefined))); // best effort, after the DB commit
    },
  };
}

export type AccountService = ReturnType<typeof createAccountService>;
