import { z } from "zod";

/**
 * Phase 3: REPORT CARDS. Methodology lives HERE, in the shared package, so the
 * API (which computes scores) and the website (which explains them on
 * /methodology) can never disagree about the formula.
 */
export const METHODOLOGY = {
  version: "v1",
  /** Component weights. If a component has too little data it is left out and the others are re-weighted. */
  weights: { promises: 0.5, activity: 0.3, issues: 0.2 },
  /** Minimum data before a component is scored at all (no score beats a misleading score). */
  minPromises: 3,
  minIssues: 5,
  /** Issues younger than this aren't counted as "unresolved" yet. */
  issueGraceDays: 30,
  /** An overall score needs at least this many scored components. */
  minComponents: 2,
} as const;

export const ComponentKey = z.enum(["promises", "activity", "issues"]);
export type ComponentKey = z.infer<typeof ComponentKey>;

export const ScoreComponent = z.object({
  key: ComponentKey,
  label: z.string(),
  /** 0–100, or null when there isn't enough data to score fairly. */
  score: z.number().min(0).max(100).nullable(),
  weight: z.number(),
  /** Plain-language explanation of what went into the number. */
  detail: z.string(),
});
export type ScoreComponent = z.infer<typeof ScoreComponent>;

const MinistryCount = z.object({ ministry: z.string(), count: z.number().int() });
const PeriodCount = z.object({ period: z.string(), count: z.number().int() }); // "2025-Q3"

export const QuestionStats = z.object({
  legislature: z.number().int(),
  total: z.number().int(),
  months: z.number(), // months the Lok Sabha has run (or ran) for
  perMonth: z.number(),
  /** 0–100 rank among MPs of the same Lok Sabha who asked at least one question. */
  percentile: z.number().nullable(),
  nationalMedianPerMonth: z.number(),
  byMinistry: z.array(MinistryCount),
  byQuarter: z.array(PeriodCount),
});
export type QuestionStats = z.infer<typeof QuestionStats>;

const MpRef = z.object({ name: z.string(), party: z.string().nullable(), status: z.string(), sameAsCurrent: z.boolean() });

export const ReportCard = z.object({
  methodologyVersion: z.string(),
  constituency: z.object({ slug: z.string(), name: z.string(), state: z.string(), boundaryOutdated: z.boolean() }),
  mp: MpRef.nullable(),
  overall: z.number().min(0).max(100).nullable(),
  components: z.array(ScoreComponent),
  questions: QuestionStats.nullable(),
  previous: z
    .object({
      legislature: z.number().int(),
      members: z.array(MpRef.extend({ questions: QuestionStats.nullable() })),
      /** True for seats renamed/redrawn since (Assam, J&K): comparison is approximate. */
      approximate: z.boolean(),
    })
    .nullable(),
});
export type ReportCard = z.infer<typeof ReportCard>;

// ---- National insights ----------------------------------------------------
export const Insights = z.object({
  promiseStatus: z.record(z.string(), z.number().int()),
  promisesTracked: z.number().int(),
  issues: z.object({ total: z.number().int(), resolved: z.number().int(), votesThisWeek: z.number().int() }),
  questions: z.object({ total: z.number().int(), medianPerMonth: z.number(), byMinistry: z.array(MinistryCount) }),
  mostActive: z.array(z.object({ name: z.string(), party: z.string().nullable(), constituency: z.string(), slug: z.string(), perMonth: z.number(), total: z.number().int() })),
  partySeats: z.array(z.object({ party: z.string(), seats: z.number().int() })),
});
export type Insights = z.infer<typeof Insights>;
