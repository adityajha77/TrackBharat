import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiErrorBody, METHODOLOGY, type QuestionStats } from "@trackbharat/shared";
import { buildApp } from "../src/app";
import { csvCell, toCsv } from "../src/lib/csv";
import { monthsSat } from "../src/lib/legislatures";
import { dayStartIST, periodStartIST } from "../src/lib/time";
import { activityComponent, issuesComponent, median, overallScore, percentileOf, promisesComponent } from "../src/modules/report-cards/scoring";
import { bearer, deps } from "./helpers";

describe("scoring formula (methodology v1)", () => {
  it("scores promises: fulfilled = 1, partly = ½", () => {
    const c = promisesComponent({ FULFILLED: 2, PARTIAL: 2, PENDING: 4 });
    expect(c.score).toBe(38); // (2 + 0.5*2) / 8 = 37.5% → 38
  });

  it("refuses to score with too little data: no score beats a misleading score", () => {
    expect(promisesComponent({ FULFILLED: 1, PENDING: 1 }).score).toBeNull();
    expect(issuesComponent(METHODOLOGY.minIssues - 1, 4).score).toBeNull();
    expect(activityComponent(null).score).toBeNull();
  });

  it("scores resolved issues", () => expect(issuesComponent(10, 4).score).toBe(40));

  it("re-weights the overall score over the components that exist", () => {
    const p = promisesComponent({ FULFILLED: 3 }); // 100, weight .5
    const stats: QuestionStats = { legislature: 18, total: 10, months: 12, perMonth: 0.8, percentile: 50, nationalMedianPerMonth: 0.5, byMinistry: [], byQuarter: [] };
    const a = activityComponent(stats); // score 50, weight .3
    const none = issuesComponent(0, 0); // null
    expect(overallScore([p, a, none])).toBe(Math.round((100 * 0.5 + 50 * 0.3) / 0.8)); // 81
  });

  it("gives no overall score from a single component", () => {
    expect(overallScore([promisesComponent({ FULFILLED: 3 }), activityComponent(null), issuesComponent(0, 0)])).toBeNull();
  });

  it("computes percentiles and medians", () => {
    expect(percentileOf(5, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])).toBe(40);
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([])).toBe(0);
  });

  it("measures Lok Sabha length in months (a finished term is fixed, a running one grows)", () => {
    expect(monthsSat(17)).toBeCloseTo(59.6, 0);
    expect(monthsSat(18, new Date("2025-06-24"))).toBeCloseTo(12.0, 0);
  });
});

describe("CSV export safety", () => {
  it("escapes commas, quotes and newlines", () => {
    expect(csvCell('a, "b"')).toBe('"a, ""b"""');
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
  });

  it("neutralises spreadsheet formula injection", () => {
    for (const evil of ['=HYPERLINK("http://evil.example","click")', "+1+1", "-2+3", "@SUM(A1)"]) {
      expect(csvCell(evil).replace(/^"/, "")).toMatch(/^'/);
    }
    expect(csvCell(-5)).toBe("-5"); // real negative numbers stay numbers
  });

  it("starts with a BOM so Excel reads Hindi correctly, and uses CRLF line ends", () => {
    const out = toCsv(["a", "b"], [["अराकु", null]]);
    expect(out.startsWith("﻿")).toBe(true);
    expect(out).toBe("﻿a,b\r\nअराकु,\r\n");
  });
});

describe("India-time windows", () => {
  it("a day starts at 00:00 IST = 18:30 UTC the evening before", () => {
    expect(dayStartIST(new Date("2026-11-15T09:00:00Z")).toISOString()).toBe("2026-11-14T18:30:00.000Z");
    // 20:00 UTC is already the next calendar day in India
    expect(dayStartIST(new Date("2026-11-15T20:00:00Z")).toISOString()).toBe("2026-11-15T18:30:00.000Z");
  });
  it("a week starts Monday 00:00 IST", () => {
    expect(periodStartIST("week", new Date("2026-11-15T09:00:00Z")).toISOString()).toBe("2026-11-08T18:30:00.000Z");
  });
});

describe("new endpoints: access rules and errors", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  afterEach(() => app?.close());

  it("leaderboard is public and rejects unknown periods", async () => {
    const get = vi.fn().mockResolvedValue({ period: "day" });
    app = await buildApp(deps({ leaderboardService: { get } }));
    expect((await app.inject({ method: "GET", url: "/v1/leaderboard" })).statusCode).toBe(200);
    expect(get).toHaveBeenCalledWith("day"); // default
    const bad = await app.inject({ method: "GET", url: "/v1/leaderboard?period=month" });
    expect(bad.statusCode).toBe(400);
    expect(ApiErrorBody.parse(bad.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it.each(["/v1/auth/change-password", "/v1/auth/delete-account"])("%s needs a login", async (url) => {
    app = await buildApp(deps());
    const res = await app.inject({ method: "POST", url, payload: { password: "x", currentPassword: "x", newPassword: "long-enough-pass" } });
    expect(res.statusCode).toBe(401);
  });

  it("delete-account passes the logged-in user and password to the service", async () => {
    const deleteAccount = vi.fn().mockResolvedValue(undefined);
    app = await buildApp(deps({ accountService: { ...deps().accountService, deleteAccount } }));
    const res = await app.inject({ method: "POST", url: "/v1/auth/delete-account", payload: { password: "pw" }, headers: bearer("CITIZEN") });
    expect(res.statusCode).toBe(204);
    expect(deleteAccount).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }), "pw");
  });

  it("unknown export datasets are a 404, not a crash", async () => {
    app = await buildApp(deps());
    expect((await app.inject({ method: "GET", url: "/v1/export/secrets.csv" })).statusCode).toBe(404);
  });
});
