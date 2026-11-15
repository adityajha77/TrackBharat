# ADR-0012: Report cards with a published, data-honest methodology

- **Status:** Accepted
- **Date:** 2026-11-15

## Context
The project's goal is to make government performance *understandable*. A single "performance score" about a named
elected representative is powerful and risky: a wrong or unfair number damages trust in the whole site and can be
defamatory. Available data is uneven: promises are curated slowly, parliamentary questions exist for every MP, citizen
reports exist only where people use the site.

## Decision
1. **A transparent three-part score (methodology v1):** promises delivered (50%), questions asked in Parliament (30%,
   as a percentile among MPs of the same Lok Sabha), citizen problems resolved (20%).
2. **The formula lives in code that the website also reads.** `METHODOLOGY` in `packages/shared` holds weights and
   thresholds; the API computes with it and `/methodology` renders it, so the explanation cannot drift from reality.
3. **No score beats a misleading score.** A part with too little data (fewer than 3 promises, fewer than 5 aged citizen
   reports, no questions) is *omitted*, never scored as zero; remaining weights are re-normalised; the overall score is
   shown only when at least 2 parts are scored. Missing data is shown as "n/a" or "—", never `0`.
4. **Fair comparison.** Questions are compared per month and as percentiles within the same Lok Sabha, so the still-running
   18th is never compared with a finished five-year term. Ministers and the Speaker don't ask questions; that is stated.
5. **Previous-MP comparison** uses the 17th Lok Sabha members, matching renamed seats (Assam, J&K) through a documented
   name map and marking those comparisons as approximate.
6. **Scoring is pure functions** (`scoring.ts`): numbers in, numbers out, unit-tested without a database.
7. **Open data.** Every dataset behind the numbers is downloadable as CSV (`/data`).

## Alternatives considered
- **One opaque "development index".** Easy to headline, impossible to audit, easy to game.
- **Ranking MPs against each other (league table).** Rewards volume (questions) over substance and invites a
  misleading "worst MP" narrative; we show each seat against a published formula and a national median instead.
- **Waiting until data is complete.** Never happens; showing the gaps honestly is itself the transparency goal.

## Consequences
- ✅ Anyone can recompute any score from the CSVs and the short scoring module.
- ✅ Today most seats show only the questions part, and the page says exactly why.
- ⚠️ Question counts are a weak proxy for effectiveness; the methodology page says so prominently.
- ⚠️ Attendance and MPLADS spending are deliberately not included yet: no clean machine-readable official source was found.
