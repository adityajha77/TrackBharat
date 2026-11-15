import { METHODOLOGY, type QuestionStats, type ScoreComponent } from "@trackbharat/shared";

/**
 * THE FORMULA (methodology v1), as pure functions: numbers in, numbers out.
 * No database, no HTTP, so it's trivially testable and easy to audit. The
 * published /methodology page explains exactly these rules.
 *
 * Principle: NO SCORE BEATS A MISLEADING SCORE. Every component returns
 * `score: null` when there isn't enough data, and the overall score is only
 * shown when enough components exist.
 */
const W = METHODOLOGY.weights;
const pct = (n: number) => Math.round(Math.max(0, Math.min(100, n)));

export function promisesComponent(counts: Record<string, number>): ScoreComponent {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const fulfilled = counts.FULFILLED ?? 0;
  const partial = counts.PARTIAL ?? 0;
  if (total < METHODOLOGY.minPromises) {
    return { key: "promises", label: "Promises delivered", score: null, weight: W.promises, detail: `Only ${total} sourced promise(s) tracked; at least ${METHODOLOGY.minPromises} are needed to score.` };
  }
  return {
    key: "promises",
    label: "Promises delivered",
    score: pct((100 * (fulfilled + 0.5 * partial)) / total),
    weight: W.promises,
    detail: `${fulfilled} fulfilled and ${partial} partly delivered out of ${total} tracked promises (fulfilled = 1, partly = ½).`,
  };
}

export function activityComponent(q: QuestionStats | null): ScoreComponent {
  if (!q || q.total === 0 || q.percentile === null) {
    return {
      key: "activity",
      label: "Questions in Parliament",
      score: null,
      weight: W.activity,
      detail: "No questions recorded. Ministers and the Speaker don't ask questions, so this isn't scored rather than scored as zero.",
    };
  }
  return {
    key: "activity",
    label: "Questions in Parliament",
    score: pct(q.percentile),
    weight: W.activity,
    detail: `${q.total} questions (${q.perMonth.toFixed(1)}/month, national median ${q.nationalMedianPerMonth.toFixed(1)}): more than ${pct(q.percentile)}% of MPs who asked questions.`,
  };
}

export function issuesComponent(eligible: number, resolved: number): ScoreComponent {
  if (eligible < METHODOLOGY.minIssues) {
    return {
      key: "issues",
      label: "Local problems resolved",
      score: null,
      weight: W.issues,
      detail: `${eligible} citizen report(s) older than ${METHODOLOGY.issueGraceDays} days; at least ${METHODOLOGY.minIssues} are needed to score.`,
    };
  }
  return {
    key: "issues",
    label: "Local problems resolved",
    score: pct((100 * resolved) / eligible),
    weight: W.issues,
    detail: `${resolved} of ${eligible} citizen reports older than ${METHODOLOGY.issueGraceDays} days are marked resolved.`,
  };
}

/** Weighted average of the components that HAVE a score, re-weighted to sum to 1. */
export function overallScore(components: ScoreComponent[]): number | null {
  const scored = components.filter((c) => c.score !== null);
  if (scored.length < METHODOLOGY.minComponents) return null;
  const weightSum = scored.reduce((s, c) => s + c.weight, 0);
  return pct(scored.reduce((s, c) => s + c.score! * c.weight, 0) / weightSum);
}

/** Share of values strictly below `value`, as 0–100. */
export function percentileOf(value: number, all: number[]): number | null {
  if (!all.length) return null;
  return (100 * all.filter((v) => v < value).length) / all.length;
}

export function median(values: number[]): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}
