import { sql } from "drizzle-orm";
import type { Database } from "../db/client";
import { previousWeek, weekStartIST } from "../lib/time";

export const CAUSES_PER_WEEK = 5;

/**
 * PICK INDIA'S CAUSES OF THE WEEK (runs Monday 00:05 IST, after the rankings job).
 *
 * Looks at the week that just ended: which categories had the most new reports
 * plus net votes, across all real (non-demo, non-hidden) issues? The top 5
 * become this week's causes, with the evidence frozen alongside (reports,
 * states, three example issues).
 *
 * Quiet weeks: if fewer than 3 categories had activity, the window widens to 4
 * weeks so the home page is never empty on a young site.
 *
 * Idempotent: re-running refreshes the numbers but keeps moderator edits
 * (title, blurb, pinned): ON CONFLICT updates the counts only.
 */
/** includeDemo: ONLY for `pnpm db:seed`, so a fresh local setup has something to vote on. */
export async function pickCauses(db: Database, weekStart: string = weekStartIST(), opts: { includeDemo?: boolean } = {}) {
  const pick = async (from: string) =>
    db.execute<{ category: string; issue_count: number; state_count: number; examples: { id: number; title: string }[] }>(sql`
      WITH activity AS (
        SELECT i.id, i.title, i.category, c.state_id,
               (i.created_at >= ${from}::date AND i.created_at < ${weekStart}::date) AS is_new,
               coalesce((SELECT sum(v.value) FROM issue_votes v
                         WHERE v.issue_id = i.id AND v.counted
                           AND v.week_start >= ${from}::date AND v.week_start < ${weekStart}::date), 0)::int AS net
        FROM issues i JOIN constituencies c ON c.id = i.constituency_id
        WHERE i.status <> 'HIDDEN' AND (${opts.includeDemo ? sql`true` : sql`NOT c.is_demo`})
      ),
      live AS (SELECT * FROM activity WHERE is_new OR net <> 0)
      SELECT category,
             count(*) FILTER (WHERE is_new)::int AS issue_count,
             count(DISTINCT state_id)::int AS state_count,
             (SELECT coalesce(json_agg(json_build_object('id', e.id, 'title', e.title)), '[]'::json)
                FROM (SELECT l2.id, l2.title FROM live l2 WHERE l2.category = live.category ORDER BY l2.net DESC, l2.id DESC LIMIT 3) e) AS examples
      FROM live
      GROUP BY category
      ORDER BY count(*) FILTER (WHERE is_new) + sum(net) DESC, category
      LIMIT ${CAUSES_PER_WEEK}`);

  let { rows } = await pick(previousWeek(weekStart));
  let window = "1 week";
  if (rows.length < 3) {
    let from = weekStart;
    for (let i = 0; i < 4; i++) from = previousWeek(from);
    ({ rows } = await pick(from));
    window = "4 weeks";
  }

  for (const r of rows) {
    await db.execute(sql`
      INSERT INTO weekly_causes (week_start, category, issue_count, state_count, examples)
      VALUES (${weekStart}, ${r.category}, ${r.issue_count}, ${r.state_count}, ${JSON.stringify(r.examples)}::jsonb)
      ON CONFLICT (week_start, category) DO UPDATE
        SET issue_count = EXCLUDED.issue_count, state_count = EXCLUDED.state_count, examples = EXCLUDED.examples`);
  }
  return { weekStart, picked: rows.length, window };
}
