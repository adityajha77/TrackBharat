/**
 * When each Lok Sabha sat. Used to turn "total questions" into "questions per
 * month", so a by-election MP or the still-running current Lok Sabha can be
 * compared fairly with a full 5-year term.
 *   17th: first sitting 17 Jun 2019, dissolved 5 Jun 2024
 *   18th: first sitting 24 Jun 2024, still running
 */
export const LOK_SABHAS: Record<number, { start: string; end: string | null }> = {
  17: { start: "2019-06-17", end: "2024-06-05" },
  18: { start: "2024-06-24", end: null },
};
export const CURRENT_LOK_SABHA = 18;
export const PREVIOUS_LOK_SABHA = 17;

const MONTH_MS = 30.44 * 86_400_000;

export function monthsSat(ls: number, now: Date = new Date()): number {
  const l = LOK_SABHAS[ls];
  if (!l) return 0;
  const end = l.end ? new Date(l.end) : now;
  return Math.max(1, (end.getTime() - new Date(l.start).getTime()) / MONTH_MS);
}
