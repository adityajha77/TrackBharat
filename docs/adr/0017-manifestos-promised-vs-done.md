# ADR-0017: Party manifestos, promised vs done

- **Status:** Accepted
- **Date:** 2026-11-16

## Context
People want to compare what parties promised before an election with what happened. This is the most politically
sensitive data on the site, so the rules must be strict and identical for every party.

## Decision
- Curated JSON in `apps/api/data/parties/` (`pnpm db:import parties`) → `manifestos` and `manifesto_promises`.
- Statuses: fulfilled, partly done, in progress, broken, **not yet rated**, **didn't form government**.
- **Rules enforced by the importer and the database:**
  - a verdict (fulfilled, partly, in progress, broken) needs an evidence link (CHECK constraint);
  - a party that did not lead the government after that election is **never** rated kept or broken: its promises are
    "didn't form government" (importer refuses anything else);
  - no evidence either way → "not yet rated". We don't guess.
- Starter data: BJP and INC 2019 and 2024 (29 promises). Verdicts only where public evidence is clear (e.g. Article 370,
  CAA, Ayushman Bharat 70+); contested or unmeasured promises (doubling farmers' income, UCC) stay "not yet rated".
- Sources: the official manifesto site where we could reach it (INC 2024: manifesto.inc.in); otherwise the Wikipedia
  campaign article that cites the manifesto, until an official PDF link is confirmed.
- **Every party is judged where it governed.** A manifesto has an optional `state`: NULL is a Lok Sabha manifesto, otherwise
  the state assembly election (e.g. INC Karnataka 2023, DMK Tamil Nadu 2021, AAP Punjab 2022). So parties that lead state
  governments are rated on those, not only on national elections they lost.
- **The fulfilled % counts only promises the party was in power to deliver** (`fulfilledShare`): "didn't form government"
  promises are left out of the denominator, so no party shows 0% for an election it lost.
- - The UI shows parties in founding order and colours "didn't form government" neutral grey, never red.

## Consequences
- ✅ Fair by construction, auditable line by line.
- ⚠️ BSP has no rated manifesto yet. Coverage is small and needs volunteers with sources; page numbers are empty until checked against the PDFs.
