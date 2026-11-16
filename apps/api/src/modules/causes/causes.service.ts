import { and, eq, sql } from "drizzle-orm";
import { CausesResponse, type Cause, type PublicUser, type UpdateCauseInput } from "@trackbharat/shared";
import type { Database } from "../../db/client";
import { causeVotes, weeklyCauses } from "../../db/schema";
import { recordAudit } from "../../lib/audit";
import { AppError } from "../../lib/errors";
import { weekStartIST } from "../../lib/time";

/**
 * INDIA'S CAUSES OF THE WEEK.
 *
 * Every Monday the worker picks the 5 problem categories citizens raised most
 * across India in the week before (see jobs/pick-causes.ts). During the week,
 * anyone can vote +1 ("affects me") or -1 ("not my issue"), which tells us
 * whether a problem is widely felt or only loud in a few places.
 */
type CauseRow = {
  id: number;
  category: Cause["category"];
  title: string | null;
  blurb: string | null;
  issue_count: number;
  state_count: number;
  examples: { id: number; title: string }[];
  pinned: boolean;
  up: number;
  down: number;
  my_vote: number | null;
};

export function createCausesService(db: Database, now: () => Date = () => new Date()) {
  async function causeInCurrentWeek(id: number) {
    const [c] = await db.select({ weekStart: weeklyCauses.weekStart }).from(weeklyCauses).where(eq(weeklyCauses.id, id));
    if (!c) throw AppError.notFound(`Cause ${id} not found`);
    if (c.weekStart !== weekStartIST(now())) throw AppError.validation("Voting on this cause has closed. Vote on this week's causes.");
  }

  async function tally(id: number) {
    const [r] = await db
      .select({
        up: sql<number>`count(*) FILTER (WHERE ${causeVotes.value} = 1)::int`,
        down: sql<number>`count(*) FILTER (WHERE ${causeVotes.value} = -1)::int`,
      })
      .from(causeVotes)
      .where(and(eq(causeVotes.causeId, id), eq(causeVotes.counted, true)));
    return { up: r?.up ?? 0, down: r?.down ?? 0 };
  }

  return {
    async current(user: PublicUser | null): Promise<CausesResponse> {
      const weekStart = weekStartIST(now());
      const { rows } = await db.execute<CauseRow>(sql`
        SELECT c.id, c.category, c.title, c.blurb, c.issue_count, c.state_count, c.examples, c.pinned,
               count(v.*) FILTER (WHERE v.counted AND v.value = 1)::int AS up,
               count(v.*) FILTER (WHERE v.counted AND v.value = -1)::int AS down,
               ${user ? sql`(SELECT value FROM cause_votes m WHERE m.cause_id = c.id AND m.user_id = ${user.id})` : sql`NULL`}::int AS my_vote
        FROM weekly_causes c
        LEFT JOIN cause_votes v ON v.cause_id = c.id
        WHERE c.week_start = ${weekStart}
        GROUP BY c.id
        ORDER BY c.pinned DESC,
                 count(v.*) FILTER (WHERE v.counted AND v.value = 1) - count(v.*) FILTER (WHERE v.counted AND v.value = -1) DESC,
                 c.issue_count DESC, c.id`);
      return CausesResponse.parse({
        weekStart,
        causes: rows.map((r) => ({
          id: r.id,
          category: r.category,
          title: r.title,
          blurb: r.blurb,
          issueCount: r.issue_count,
          stateCount: r.state_count,
          examples: r.examples ?? [],
          pinned: r.pinned,
          up: r.up,
          down: r.down,
          myVote: r.my_vote === 1 ? 1 : r.my_vote === -1 ? -1 : 0,
        })),
      });
    },

    /** value null = take my vote back. Unverified accounts' votes are stored but not counted. */
    async vote(user: PublicUser, id: number, value: 1 | -1 | null) {
      await causeInCurrentWeek(id);
      const counted = user.emailVerified !== false;
      if (value === null) await db.delete(causeVotes).where(and(eq(causeVotes.userId, user.id), eq(causeVotes.causeId, id)));
      else
        await db
          .insert(causeVotes)
          .values({ userId: user.id, causeId: id, value, counted })
          .onConflictDoUpdate({ target: [causeVotes.userId, causeVotes.causeId], set: { value, counted, createdAt: sql`now()` } });
      return { myVote: value ?? 0, counted, ...(await tally(id)) } as const;
    },

    /** Moderators can reword or pin a cause. Audited. */
    async update(actor: PublicUser, id: number, input: UpdateCauseInput) {
      await db.transaction(async (tx) => {
        const res = await tx.update(weeklyCauses).set(input).where(eq(weeklyCauses.id, id)).returning({ id: weeklyCauses.id });
        if (!res.length) throw AppError.notFound(`Cause ${id} not found`);
        await recordAudit(tx, { actorId: actor.id, action: "cause.update", entityType: "cause", entityId: id, details: input });
      });
    },
  };
}

export type CausesService = ReturnType<typeof createCausesService>;
