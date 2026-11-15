import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { createDb } from "../../src/db/client";
import { computeWeeklyRankings } from "../../src/jobs/weekly-rankings";

/**
 * INTEGRATION: the weekly ranking SQL (window function) and the database-level
 * "one vote per user per issue per week" rule, against a real Postgres.
 */
const url = process.env.TEST_DATABASE_URL;
const WEEK = "2001-01-01"; // a week no real data uses

describe.skipIf(!url)("weekly rankings + vote uniqueness (Postgres)", () => {
  const { db, pool } = createDb(url ?? "postgres://unused");
  let seat = 0;
  const issueIds: number[] = [];
  const userIds: number[] = [];

  beforeAll(async () => {
    await db.execute(sql`INSERT INTO states (name) VALUES ('Weekland') ON CONFLICT DO NOTHING`);
    seat = (
      await db.execute<{ id: number }>(sql`
        INSERT INTO constituencies (house, state_id, number, name, slug) VALUES ('LOK_SABHA', (SELECT id FROM states WHERE name='Weekland'), 1, 'Week Seat', 'week-seat')
        ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id`)
    ).rows[0]!.id;
    for (let i = 0; i < 4; i++) {
      userIds.push((await db.execute<{ id: number }>(sql`INSERT INTO users (email, name, password_hash) VALUES (${`weekly${i}@test.local`}, 'Voter', 'x') ON CONFLICT (email) DO UPDATE SET name = 'Voter' RETURNING id`)).rows[0]!.id);
    }
    for (const title of ["A", "B", "C"]) {
      issueIds.push((await db.execute<{ id: number }>(sql`INSERT INTO issues (user_id, constituency_id, pincode, title, description, category) VALUES (${userIds[0]!}, ${seat}, '999999', ${title}, 'desc', 'OTHER') RETURNING id`)).rows[0]!.id);
    }
    // votes in WEEK: A=1, B=3, C=2
    const votes: [number, number][] = [[0, 0], [1, 1], [1, 2], [1, 3], [2, 1], [2, 2]];
    for (const [issue, user] of votes) await db.execute(sql`INSERT INTO issue_votes (user_id, issue_id, week_start) VALUES (${userIds[user]!}, ${issueIds[issue]!}, ${WEEK})`);
  });

  afterAll(async () => {
    await db.execute(sql`DELETE FROM issues WHERE constituency_id = ${seat}`);
    await db.execute(sql`DELETE FROM constituencies WHERE id = ${seat}`);
    await db.execute(sql`DELETE FROM users WHERE email LIKE 'weekly%@test.local'`);
    await db.execute(sql`DELETE FROM states WHERE name = 'Weekland'`);
    await pool.end();
  });

  it("the database itself rejects a second vote in the same week", async () => {
    await expect(db.execute(sql`INSERT INTO issue_votes (user_id, issue_id, week_start) VALUES (${userIds[1]!}, ${issueIds[1]!}, ${WEEK})`)).rejects.toThrow();
  });

  it("ranks issues by that week's votes, and re-running replaces the snapshot", async () => {
    await computeWeeklyRankings(db, WEEK);
    await computeWeeklyRankings(db, WEEK); // idempotent
    const { rows } = await db.execute<{ rank: number; title: string; votes: number }>(sql`
      SELECT r.rank, i.title, r.votes FROM weekly_issue_rankings r JOIN issues i ON i.id = r.issue_id
      WHERE r.week_start = ${WEEK} AND r.constituency_id = ${seat} ORDER BY r.rank`);
    expect(rows.map((r) => [r.rank, r.title, r.votes])).toEqual([
      [1, "B", 3],
      [2, "C", 2],
      [3, "A", 1],
    ]);
  });
});
