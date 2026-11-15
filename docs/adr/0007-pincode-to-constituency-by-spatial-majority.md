# ADR-0007: PIN code → constituency by spatial majority of post offices

- **Status:** Accepted
- **Date:** 2026-11-15

## Context
Users start with a PIN code, but PIN codes (postal zones) and constituencies (electoral zones) were drawn by different
departments and don't line up. We have no official PIN polygon dataset, but we do have coordinates for ~144k post
offices. Some coordinates are wrong (e.g. one office of 800001, Patna, is placed in Tibet).

## Decision
At import time, run a PostGIS **spatial join**: for every post office point, find the constituency polygon that contains
it (`ST_Contains`, GiST-indexed), then for each PIN store **how many of its offices fall in each constituency and the
share** in `pincode_constituencies`.

At read time, show a constituency if it holds **≥ 20% of the PIN's offices** (always keeping the top match). When two or
more pass, the UI says honestly that the PIN spans several constituencies and shows each with its share.

## Alternatives considered
- **One point per PIN (e.g. the head post office).** Simple, but a single bad coordinate gives a confidently wrong answer.
- **Compute on every request.** Correct, but wasteful: the answer only changes when boundaries or offices change.
- **PIN polygons.** Would give area-weighted overlaps, but no reliable open dataset exists.

## Consequences
- ✅ Covers 19,141 PIN codes; 3,237 genuinely span more than one seat and are shown as such.
- ✅ Outliers are filtered (110001's 4% "Faridabad" match from bad coordinates is dropped).
- ✅ Requests are a cheap indexed lookup; the whole join takes ~1 s at import.
- ⚠️ Post offices aren't population-weighted; a PIN split 50/50 by offices may not be 50/50 by residents.
