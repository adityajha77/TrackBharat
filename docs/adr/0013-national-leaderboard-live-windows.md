# ADR-0013: National "what India is asking for" leaderboard from live windows

- **Status:** Accepted
- **Date:** 2026-11-15

## Context
Beyond each constituency's own list, citizens (and journalists) want the national picture: *what problems are people
raising across India today and this week?* Per-constituency weekly highlights (ADR-0011) are frozen snapshots; a national
"right now" view needs fresh numbers.

## Decision
- A public endpoint `GET /v1/leaderboard?period=day|week` aggregates **live** from `issues` and `issue_votes`
  (`created_at` window): new problems, votes, plus rankings by **category**, **top issues**, **constituency** and
  **state**. One CTE selects the activity once; each ranking is a different `GROUP BY` over it.
- **Windows are India time:** "today" starts at 00:00 IST (18:30 UTC the evening before), "this week" on Monday 00:00 IST.
- **Hidden issues never count**; demo data is included but flagged `isDemo` and labelled in the UI.
- The web page adds **Citizens vs Parliament**: the categories citizens raise next to the ministries MPs ask the most
  questions of (from sansad.in), to show whether Parliament's attention matches public concern.
- Cached for one minute (HTTP + `"use cache"`) so a viral page can't hammer the database.
- The response is validated with the shared Zod schema before being sent (a bug fails loudly in tests, not silently in prod).

## Alternatives considered
- **A materialised view refreshed by the worker.** Faster at huge scale, but staleness and extra moving parts for no benefit at
  this size; the indexed windows are cheap. Revisit if the table passes millions of rows.
- **Using only the weekly frozen rankings.** Great for history, but can't answer "today".
- **Mapping ministries onto our categories automatically.** Tempting but misleading; shown side by side instead.

## Consequences
- ✅ Real-time national view with no new infrastructure.
- ⚠️ Counts reflect people who use TrackBharat, not all Indians; the page says "citizens on TrackBharat" and the
  methodology page explains the bias. Verified accounts and anti-brigading checks come with Phase 4.
