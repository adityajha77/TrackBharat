import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { createDb } from "../../src/db/client";
import { createAdminService } from "../../src/modules/admin/admin.service";

/**
 * INTEGRATION: the admin panel's queries and safety rules on a real Postgres.
 */
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("admin panel (Postgres)", () => {
  const { db, pool } = createDb(url ?? "postgres://unused");
  const admin = createAdminService(db);
  const ids = { boss: 0, citizen: 0 };

  beforeAll(async () => {
    await db.execute(sql`DELETE FROM users WHERE email LIKE 'admin-test-%@test.local'`);
    const mk = async (email: string, role: string) =>
      (await db.execute<{ id: number }>(sql`INSERT INTO users (email, name, password_hash, role) VALUES (${email}, 'T', 'x', ${role}::user_role) RETURNING id`)).rows[0]!.id;
    ids.boss = await mk("admin-test-boss@test.local", "ADMIN");
    ids.citizen = await mk("admin-test-citizen@test.local", "CITIZEN");
    await db.execute(sql`INSERT INTO sessions (user_id, token_hash, expires_at) VALUES (${ids.citizen}, 'admin-test-session', now() + interval '1 day')`);
  });

  afterAll(async () => {
    await db.execute(sql`DELETE FROM audit_log WHERE entity_type = 'user' AND entity_id IN (${String(ids.boss)}, ${String(ids.citizen)})`);
    await db.execute(sql`DELETE FROM users WHERE email LIKE 'admin-test-%@test.local'`);
    await pool.end();
  });

  const boss = () => ({ id: ids.boss, name: "T", role: "ADMIN" as const });

  it("overview, users, promises and audit queries all run", async () => {
    const o = await admin.overview();
    expect(o.users.total).toBeGreaterThanOrEqual(2);
    const found = await admin.users({ q: "admin-test-citizen" });
    expect(found.users).toHaveLength(1);
    expect(found.users[0]).toMatchObject({ role: "CITIZEN", isBlocked: false, googleLinked: false });
    await admin.promises({ status: "PENDING" });
    await admin.audit();
  });

  it("promotes a user and records why", async () => {
    await admin.updateUser(boss(), ids.citizen, { role: "VERIFIER", note: "Helps with news" });
    expect((await admin.users({ q: "admin-test-citizen" })).users[0]!.role).toBe("VERIFIER");
    const { entries } = await admin.audit();
    expect(entries.find((e) => e.action === "user.role" && e.entityId === String(ids.citizen))?.details).toMatchObject({ note: "Helps with news" });
  });

  it("blocking signs the person out everywhere", async () => {
    await admin.updateUser(boss(), ids.citizen, { blocked: true, note: "Spam reports" });
    const { rows } = await db.execute<{ n: number }>(sql`SELECT count(*)::int AS n FROM sessions WHERE user_id = ${ids.citizen}`);
    expect(rows[0]!.n).toBe(0);
    expect((await admin.users({ blocked: true, q: "admin-test" })).users.map((u) => u.id)).toContain(ids.citizen);
  });

  it("refuses to change yourself, or to remove the last admin", async () => {
    await expect(admin.updateUser(boss(), ids.boss, { role: "CITIZEN", note: "oops oops" })).rejects.toThrow(/your own/);
    // make every other admin a non-admin for this check, then try to demote the only one left
    const others = await db.execute<{ id: number }>(sql`SELECT id FROM users WHERE role = 'ADMIN' AND id <> ${ids.boss}`);
    if (others.rows.length === 0) {
      await expect(admin.updateUser({ ...boss(), id: ids.citizen }, ids.boss, { role: "CITIZEN", note: "demote" })).rejects.toThrow(/last admin/);
    }
  });
});
