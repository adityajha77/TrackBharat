import { METHODOLOGY, type Insights, type QuestionStats, type ReportCard } from "@trackbharat/shared";
import { AppError } from "../../lib/errors";
import { CURRENT_LOK_SABHA, monthsSat, PREVIOUS_LOK_SABHA } from "../../lib/legislatures";
import { weekStartIST } from "../../lib/time";
import type { ReportCardRepository } from "./report-card.repository";
import { activityComponent, issuesComponent, median, overallScore, percentileOf, promisesComponent } from "./scoring";

export function createReportCardService(repo: ReportCardRepository, now: () => Date = () => new Date()) {
  /**
   * National question totals per Lok Sabha, memoised for 10 minutes. It's one
   * GROUP BY over ~95k rows, cheap but pointless to repeat on every page view.
   */
  const memo = new Map<number, { at: number; totals: number[] }>();
  async function totals(ls: number) {
    const hit = memo.get(ls);
    if (hit && Date.now() - hit.at < 600_000) return hit.totals;
    const t = await repo.allTotals(ls);
    memo.set(ls, { at: Date.now(), totals: t });
    return t;
  }

  async function questionStats(repId: number, ls: number): Promise<QuestionStats> {
    const [total, byMinistry, byQuarter, all] = await Promise.all([repo.questionTotal(repId, ls), repo.byMinistry(repId, ls, 8), repo.byQuarter(repId, ls), totals(ls)]);
    const months = monthsSat(ls, now());
    return {
      legislature: ls,
      total,
      months: Number(months.toFixed(1)),
      perMonth: total / months,
      percentile: total > 0 ? percentileOf(total, all) : null,
      nationalMedianPerMonth: median(all) / months,
      byMinistry,
      byQuarter,
    };
  }

  return {
    async reportCard(slug: string): Promise<ReportCard> {
      const seat = await repo.seat(slug);
      if (!seat) throw AppError.notFound(`No constituency called "${slug}"`);
      if (seat.house !== "LOK_SABHA") throw AppError.notFound("Report cards are available for Lok Sabha constituencies");

      const [current, previous, promiseCounts, issues] = await Promise.all([
        repo.members(seat.id, CURRENT_LOK_SABHA),
        repo.members(seat.id, PREVIOUS_LOK_SABHA),
        repo.promiseCounts(seat.id),
        repo.issueStats(seat.id, METHODOLOGY.issueGraceDays),
      ]);
      const mp = current.find((m) => m.status === "SITTING") ?? null;
      const questions = mp ? await questionStats(mp.rep_id, CURRENT_LOK_SABHA) : null;

      const components = [promisesComponent(promiseCounts), activityComponent(questions), issuesComponent(issues.eligible, issues.resolved)];
      const prevMembers = await Promise.all(
        previous.map(async (p) => ({
          name: p.name,
          party: p.party,
          status: p.status,
          sameAsCurrent: mp?.rep_id === p.rep_id, // re-elected: same person, previous term
          questions: await questionStats(p.rep_id, PREVIOUS_LOK_SABHA),
        })),
      );

      return {
        methodologyVersion: METHODOLOGY.version,
        constituency: { slug, name: seat.name, state: seat.state, boundaryOutdated: seat.boundary_outdated },
        mp: mp ? { name: mp.name, party: mp.party, status: mp.status, sameAsCurrent: true } : null,
        overall: overallScore(components),
        components,
        questions,
        previous: prevMembers.length ? { legislature: PREVIOUS_LOK_SABHA, members: prevMembers, approximate: seat.boundary_outdated } : null,
      };
    },

    async insights(): Promise<Insights> {
      const [status, issues, byMinistry, active, parties, all] = await Promise.all([
        repo.nationalPromiseStatus(),
        repo.nationalIssues(weekStartIST(now())),
        repo.byMinistry(null, CURRENT_LOK_SABHA, 10),
        repo.mostActive(CURRENT_LOK_SABHA, 10),
        repo.partySeats(CURRENT_LOK_SABHA, 8),
        totals(CURRENT_LOK_SABHA),
      ]);
      const months = monthsSat(CURRENT_LOK_SABHA, now());
      return {
        promiseStatus: Object.fromEntries(status.map((s) => [s.status, s.n])),
        promisesTracked: status.reduce((a, s) => a + s.n, 0),
        issues: { total: issues.total, resolved: issues.resolved, votesThisWeek: issues.votes },
        questions: { total: all.reduce((a, b) => a + b, 0), medianPerMonth: median(all) / months, byMinistry },
        mostActive: active.map((a) => ({ ...a, perMonth: a.total / months })),
        partySeats: parties,
      };
    },
  };
}

export type ReportCardService = ReturnType<typeof createReportCardService>;
