import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { createDb } from "../../src/db/client";
import { createIssueRepository } from "../../src/modules/issues/issue.repository";
import { createIssueService } from "../../src/modules/issues/issue.service";
import { createCausesService } from "../../src/modules/causes/causes.service";
import { createEmailLinksService } from "../../src/modules/email/email-links";
import { createOutboxMailer } from "../../src/modules/email/mailer";
import { pickCauses } from "../../src/jobs/pick-causes";

/**
 * INTEGRATION (real Postgres): up/down votes, verified-only counting, the weekly
 * cause pick, and one-time email links.
 */
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("Phase 3b on Postgres", () => {
  const { db, pool } = createDb(url ?? "postgres://unused");
  const NOW = new Date("2032-03-17T06:00:00Z"); // Wednesday; week starts Monday 2032-03-15
  const ids = { users: [] as number[], seat: 0, issue: 0 };
  const noPhotos = { save: async () => "", open: async () => null, remove: async () => {} };

  beforeAll(async () => {
    await db.execute(sql`INSERT INTO states (name) VALUES ('Voiceland') ON CONFLICT DO NOTHING`);
    ids.seat = (await db.execute<{ id: number }>(sql`INSERT INTO constituencies (house, state_id, number, name, slug) VALUES ('LOK_SABHA', (SELECT id FROM states WHERE name='Voiceland'), 1, 'Voice Seat', 'voice-seat') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id`)).rows[0]!.id;
    for (let i = 0; i < 4; i++) {
      // user 3 is NOT verified
      const verified = i < 3 ? sql`now()` : sql`NULL`;
      ids.users.push((await db.execute<{ id: number }>(sql`INSERT INTO users (email, name, password_hash, email_verified_at) VALUES (${`voice${i}@test.local`}, 'V', 'x', ${verified}) ON CONFLICT (email) DO UPDATE SET email_verified_at = EXCLUDED.email_verified_at RETURNING id`)).rows[0]!.id);
    }
    ids.issue = (await db.execute<{ id: number }>(sql`INSERT INTO issues (user_id, constituency_id, pincode, title, description, category, created_at) VALUES (${ids.users[0]!}, ${ids.seat}, '999998', 'No water for a week', 'Taps have been dry since Monday', 'WATER', '2032-03-10T05:00:00Z') RETURNING id`)).rows[0]!.id;
  });

  afterAll(async () => {
    await db.execute(sql`DELETE FROM weekly_causes WHERE week_start = '2032-03-15'`);
    await db.execute(sql`DELETE FROM issues WHERE constituency_id = ${ids.seat}`);
    await db.execute(sql`DELETE FROM constituencies WHERE id = ${ids.seat}`);
    await db.execute(sql`DELETE FROM users WHERE email LIKE 'voice%@test.local'`);
    await db.execute(sql`DELETE FROM states WHERE name = 'Voiceland'`);
    await pool.end();
  });

  const user = (i: number, emailVerified = true) => ({ id: ids.users[i]!, name: "V", role: "CITIZEN" as const, emailVerified });

  it("one vote per person per week: voting again switches up ⇄ down", async () => {
    const svc = createIssueService(createIssueRepository(db), noPhotos, () => NOW);
    expect(await svc.vote(user(1), ids.issue, 1)).toMatchObject({ up: 1, down: 0, myVote: 1 });
    expect(await svc.vote(user(1), ids.issue, -1)).toMatchObject({ up: 0, down: 1, myVote: -1 });
    expect(await svc.vote(user(2), ids.issue, 1)).toMatchObject({ up: 1, down: 1 });
    expect(await svc.vote(user(1), ids.issue, null)).toMatchObject({ up: 1, down: 0, myVote: 0 });
  });

  it("an unverified account's vote is stored but not counted", async () => {
    const svc = createIssueService(createIssueRepository(db), noPhotos, () => NOW);
    const res = await svc.vote(user(3, false), ids.issue, 1);
    expect(res).toMatchObject({ counted: false, up: 1 }); // still only user 2's vote
  });

  it("verifying the email makes earlier votes count", async () => {
    const mailer = createOutboxMailer(() => {});
    const links = createEmailLinksService(db, mailer, "https://tb.test", () => NOW);
    await links.sendVerification(user(3, false));
    const token = mailer.outbox!()[0]!.text.match(/token=([\w-]+)/)![1]!;
    await links.verify(token);
    const svc = createIssueService(createIssueRepository(db), noPhotos, () => NOW);
    const detail = await svc.get(ids.issue, null);
    expect(detail.votesThisWeek).toBe(2);
    await expect(links.verify(token)).rejects.toThrow(/invalid or has expired/); // one-time
  });

  it("a reset link expires after 30 minutes", async () => {
    let now = NOW;
    const mailer = createOutboxMailer(() => {});
    const links = createEmailLinksService(db, mailer, "https://tb.test", () => now);
    await links.forgotPassword("voice0@test.local");
    await links.forgotPassword("nobody@test.local"); // silently ignored
    expect(mailer.outbox!()).toHaveLength(1);
    const token = mailer.outbox!()[0]!.text.match(/token=([\w-]+)/)![1]!;
    now = new Date(NOW.getTime() + 31 * 60_000);
    await expect(links.resetPassword(token, "a-brand-new-passphrase")).rejects.toThrow(/expired/);
  });

  it("picks causes from last week's reports and lets people vote ±1", async () => {
    // The issue was created last week (2032-03-10) in a non-demo seat
    const res = await pickCauses(db, "2032-03-15");
    expect(res.picked).toBeGreaterThan(0);
    const causes = createCausesService(db, () => NOW);
    const water = (await causes.current(null)).causes.find((c) => c.category === "WATER")!;
    expect(water.examples.map((e) => e.id)).toContain(ids.issue);
    expect(await causes.vote(user(1), water.id, 1)).toMatchObject({ up: 1, down: 0 });
    expect(await causes.vote(user(2), water.id, -1)).toMatchObject({ up: 1, down: 1 });
    expect(await causes.vote(user(2), water.id, 1)).toMatchObject({ up: 2, down: 0 });
    // Re-running the pick keeps moderator edits
    await db.execute(sql`UPDATE weekly_causes SET pinned = true WHERE id = ${water.id}`);
    await pickCauses(db, "2032-03-15");
    expect((await causes.current(user(1))).causes.find((c) => c.id === water.id)).toMatchObject({ pinned: true, myVote: 1 });
  });
});
