import { eq } from "drizzle-orm";
import { UserRole } from "@trackbharat/shared";
import { createDb } from "../db/client";
import { users } from "../db/schema";
import { recordAudit } from "../lib/audit";

/**
 * Grant a role from the command line (there is deliberately NO web endpoint to
 * make someone an admin; that's a privileged operation done by an operator):
 *
 *   pnpm user:role someone@example.com MODERATOR
 */
const [email, role] = process.argv.slice(2);
const parsed = UserRole.safeParse(role);
if (!email || !parsed.success) {
  console.error(`Usage: pnpm user:role <email> <${UserRole.options.join("|")}>`);
  process.exit(1);
}
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const { db, pool } = createDb(databaseUrl);
try {
  await db.transaction(async (tx) => {
    const [u] = await tx.update(users).set({ role: parsed.data }).where(eq(users.email, email.toLowerCase())).returning({ id: users.id });
    if (!u) throw new Error(`No user with email ${email}`);
    await recordAudit(tx, { actorId: null, action: "user.set_role", entityType: "user", entityId: u.id, details: { role: parsed.data, via: "cli" } });
  });
  console.log(`✓ ${email} is now ${parsed.data}`);
} catch (e) {
  console.error(`✗ ${e instanceof Error ? e.message : e}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
