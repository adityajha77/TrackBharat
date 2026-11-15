import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { createDb } from "../../src/db/client";
import { createLeaderboardService } from "../../src/modules/leaderboard/leaderboard.service";

/**
 * INTEGRATION: the leaderboard's windowed aggregation against a real Postgres.
 * "Now" is injected, so we control exactly which votes fall inside "today".
 */
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("national leaderboard (Postgres)", () => {
  const { db, pool } = createDb(url ?? "postgres://unused");
  const NOW = new Date("2031-03-12T10:00:00Z"); // a Wednesday, 15:30 IST
  const ids = { users: [] as number[], issues: [] as number[], seat: 0 };

  beforeAll(async () => {
    await db.execute(sql`INSERT INTO states (name) VALUES ('Boardland') ON CONFLICT DO NOTHING`);
    ids.seat = (await db.execute<{ id: number }>(sql`INSERT INTO constituencies (house, state_id, number, name, slug) VALUES ('LOK_SABHA', (SELECT id FROM states WHERE name='Boardland'), 1, 'Board Seat', 'board-seat') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id`)).rows[0]!.id;
    for (let i = 0; i < 3; i++) ids.users.push((await db.execute<{ id: number }>(sql`INSERT INTO users (email, name, password_hash) VALUES (${`board${i}@test.local`}, 'B', 'x') ON CONFLICT (email) DO UPDATE SET name='B' RETURNING id`)).rows[0]!.id);
    const mk = async (title: string, category: string, status: string, createdAt: string) =>
      (await db.execute<{ id: number }>(sql`INSERT INTO issues (user_id, constituency_id, pincode, title, description, category, status, created_at) VALUES (${ids.users[0]!}, ${ids.seat}, '999999', ${title}, 'desc', ${category}::promise_category, ${status}::issue_status, ${createdAt}) RETURNING id`)).rows[0]!.id;
    const water = await mk("Water today", "WATER", "OPEN", "2031-03-12T05:00:00Z"); // new today
    const road = await mk("Old road", "ROADS_INFRASTRUCTURE", "OPEN", "2031-03-01T05:00:00Z"); // old, but gets votes today
    const hidden = await mk("Hidden spam", "SAFETY", "HIDDEN", "2031-03-12T05:00:00Z"); // must never count
    ids.issues.push(water, road, hidden);
    const vote = (u: number, i: number, at: string, week: string) => db.execute(sql`INSERT INTO issue_votes (user_id, issue_id, week_start, created_at) VALUES (${ids.users[u]!}, ${i}, ${week}, ${at})`);
    await vote(1, road, "2031-03-12T06:00:00Z", "2031-03-10"); // today
    await vote(2, road, "2031-03-12T07:00:00Z", "2031-03-10"); // today
    await vote(1, water, "2031-03-11T07:00:00Z", "2031-03-10"); // yesterday: in "week", not in "day"
    await vote(2, hidden, "2031-03-12T07:00:00Z", "2031-03-10"); // on a hidden issue
  });

  afterAll(async () => {
    await db.execute(sql`DELETE FROM issues WHERE constituency_id = ${ids.seat}`);
    await db.execute(sql`DELETE FROM constituencies WHERE id = ${ids.seat}`);
    await db.execute(sql`DELETE FROM users WHERE email LIKE 'board%@test.local'`);
    await db.execute(sql`DELETE FROM states WHERE name = 'Boardland'`);
    await pool.end();
  });

  const only = <T extends { category?: string; state?: string }>(rows: T[]) => rows.filter((r) => r.state === "Boardland" || ["WATER", "ROADS_INFRASTRUCTURE", "SAFETY"].includes(r.category ?? ""));

  it("day: counts today's new issues and today's votes, never hidden issues", async () => {
    const b = await createLeaderboardService(db, () => NOW).get("day");
    const cats = Object.fromEntries(only(b.categories).map((c) => [c.category, [c.newIssues, c.votes]]));
    expect(cats.WATER).toEqual([1, 0]); // created today, its vote was yesterday
    expect(cats.ROADS_INFRASTRUCTURE).toEqual([0, 2]); // old issue, two votes today
    expect(cats.SAFETY).toBeUndefined(); // hidden → invisible
    expect(b.topIssues.find((i) => i.title === "Old road")?.votes).toBe(2);
    expect(b.topStates.find((s) => s.state === "Boardland")).toMatchObject({ newIssues: 1, votes: 2 });
  });

  it("week: also includes yesterday's vote (this week started Monday 9th, IST)", async () => {
    const b = await createLeaderboardService(db, () => NOW).get("week");
    expect(only(b.categories).find((c) => c.category === "WATER")?.votes).toBe(1);
  });
});
