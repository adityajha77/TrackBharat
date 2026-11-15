# ADR-0009: Assembly seats from open boundaries; MLAs only from curated, sourced files

- **Status:** Accepted
- **Date:** 2026-11-15

## Context
Phase 1b adds the Vidhan Sabha (state assembly) layer: which assembly seat a PIN is in, and who its MLA is.

- **Boundaries:** DataMeet's `India_AC` shapefile (CC BY 2.5 India) covers ~4,100 seats but, as its README warns, files
  Telangana under Andhra Pradesh (pre-2014 numbering), splits some seats into several rows, has unnamed slivers, uses
  pre-delimitation boundaries in six states, and is "somewhat shifted".
- **MLAs:** there is no national, open, machine-readable list. We checked Wikidata (1 of 224 current Karnataka MLAs) and
  ECI results pages (taken down after elections). Each of the 31 legislatures publishes differently, often as PDFs.

## Decision
1. **Import the boundaries with documented fixes** (`src/imports/assembly.ts`): Telangana = old AP seats 1–119, AP renumbered
   (−119); multi-row seats merged with `ST_Union` via a staging table; unnamed rows skipped; Ladakh's seats dropped (no
   assembly since 2019); six states flagged `boundary_outdated`; every assembly page says boundaries are approximate.
2. **Link each assembly seat to its Lok Sabha seat** (`parent_id`) with `ST_Contains(pc, ST_PointOnSurface(ac))`.
   `ST_PointOnSurface`, unlike `ST_Centroid`, is guaranteed to lie inside oddly-shaped polygons.
3. **MLAs come only from curated CSV files** in `apps/api/data/mlas/`, one per state and election, **with an official
   `https://` source on every row** (validated with Zod). The repo ships with none, so pages say "MLA data for {state}
   isn't available yet" instead of guessing.
4. **PIN shares are computed per house**, so Lok Sabha and Vidhan Sabha matches don't dilute each other.

## Alternatives considered
- **Scrape 31 legislature websites.** Fragile and each one different; maybe later, per state, behind the same CSV contract.
- **Wikipedia lists.** Easy to read but secondary and CC BY-SA; we prefer official primary sources.
- **Skip Vidhan Sabha.** Most local issues (roads, water, police) are state subjects; the MLA layer matters.

## Consequences
- ✅ 4,091 assembly seats; counts match official totals (Telangana 119, AP 175, Karnataka 224, Delhi 70, UP 403).
- ✅ MP ⇄ MLA navigation: e.g. Bangalore South lists its 8 assembly segments.
- ⚠️ MLA coverage grows only as sourced files are added; that's a contribution opportunity, not a bug.
