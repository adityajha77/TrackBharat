# ADR-0006: Public data sources, licensing and privacy

- **Status:** Accepted
- **Date:** 2026-11-15

## Context
TrackBharat's value depends entirely on its data being **correct, attributable and legal to use**. Phase 1 needed
constituency boundaries, PIN code locations and the current MPs. We evaluated several sources.

## Decision

| Data | Source | Licence | Why this one |
|---|---|---|---|
| 543 Lok Sabha boundaries | DataMeet, `india_pc_2019_simplified` (Arun Ganesh) | CC0 1.0 | Public domain, web-sized (1.9 MB), includes Hindi names and reservation category |
| ~144k post office coordinates | Department of Posts directory, via the IndiaPIN package | Government Open Data Licence – India | Official origin; coordinates for 19,258 of ~19,300 PINs |
| Members of the 18th Lok Sabha | `sansad.in` member API (Lok Sabha Secretariat) | Public record | The authoritative source; includes status (sitting/died/resigned) |

Rules:
1. **Every imported row links to a `sources` row** (URL, publisher, licence, access time), shown in the UI next to the fact.
2. **Raw files are never committed or hand-edited.** They are downloaded into `apps/api/.data/` (gitignored); fixes live
   in `src/imports/corrections.ts`, each with a reason.
3. **Data minimisation (DPDP Act, 2023).** sansad.in also returns MPs' phone numbers, home addresses, emails, dates of birth
   and family details. The import's Zod schema parses only public-role fields, so the rest never reaches our database.
4. **Respect publishers' technical choices.** sansad.in serves photos with `Cross-Origin-Resource-Policy: same-site`, so we
   don't display or re-host them; the UI uses initials avatars.

## Alternatives considered
- **Wikidata** (CC0): only 79 of 543 current MPs had the "member of the 18th Lok Sabha" statement. Too incomplete.
  We keep each constituency's `wikidata_qid` for future enrichment.
- **OpenSanctions `in_sansad`**: convenient JSON, but its licence restricts use. Not used.
- **Scraping Wikipedia tables**: CC BY-SA and fragile HTML. Not needed given the official API.

## Consequences
- ✅ All Phase 1 data is reproducible from three public URLs with `pnpm db:import`.
- ⚠️ The boundary map predates the **Assam (2023)** and **J&K (2022)** re-delimitations. These 20 seats are flagged
  `boundary_outdated` and the UI warns users and links to the ECI's search.
- ⚠️ The sansad.in API is undocumented and could change; the import validates the response shape and fails loudly.
