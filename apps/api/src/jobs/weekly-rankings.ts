import { sql } from "drizzle-orm";
import type { Database } from "../db/client";
import { previousWeek, weekStartIST } from "../lib/time";

export const TOP_N = 5;

/**
 * WEEKLY HIGHLIGHTS JOB
 *
 * For a finished week, rank every constituency's issues by the NET votes they got
 * THAT week and store the top N in weekly_issue_rankings: a frozen snapshot that
 * later votes can't change ("what mattered most to residents in week X").
 *
 * Idempotent: re-running for the same week replaces that week's rows, so a
 * crashed or repeated run is harmless. One SQL statement does the ranking with
 * a WINDOW FUNCTION: row_number() OVER (PARTITION BY constituency ORDER BY votes).
 */
export async function computeWeeklyRankings(db: Database, weekStart: string = previousWeek(weekStartIST())) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`DELETE FROM weekly_issue_rankings WHERE week_start = ${weekStart}`);
    const res = await tx.execute(sql`
      INSERT INTO weekly_issue_rankings (week_start, constituency_id, rank, issue_id, votes)
      SELECT ${weekStart}::date, constituency_id, rnk, issue_id, votes
      FROM (
        -- Net score = "faced this too" minus "not accurate", counted (verified) votes only
        SELECT i.constituency_id, i.id AS issue_id, sum(v.value)::int AS votes,
               row_number() OVER (PARTITION BY i.constituency_id
                                  ORDER BY sum(v.value) DESC, i.created_at ASC) AS rnk
        FROM issues i
        JOIN issue_votes v ON v.issue_id = i.id AND v.week_start = ${weekStart} AND v.counted
        WHERE i.status <> 'HIDDEN'
        GROUP BY i.id
        HAVING sum(v.value) > 0
      ) ranked
      WHERE rnk <= ${TOP_N}`);
    return { weekStart, rows: res.rowCount ?? 0 };
  });
}
