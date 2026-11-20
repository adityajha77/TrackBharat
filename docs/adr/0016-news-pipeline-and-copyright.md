# ADR-0016: "News that needs a voice": RSS headlines, human summaries

- **Status:** Accepted
- **Date:** 2026-11-16

## Context
Citizens asked for short summaries of under-reported stories with the district, state and who is responsible, linking to
the source. News articles are copyrighted, and automated summaries can be wrong or biased.

## Decision
- A worker job (every 2 hours, `pnpm job:news`) reads a curated list of public RSS feeds (`apps/api/data/news-feeds.json`)
  and stores **only the headline, link, feed item id and date** as DRAFTs. Feed descriptions (often the article's first
  paragraphs) are deliberately dropped. Duplicates are impossible (`guid` and `url` are unique).
- Regional papers (e.g. Andaman Sheekha, Greater Kashmir, The Hindu's state pages) carry a `region`; their drafts start
  tagged with that state so verifiers only confirm it. National feeds stay untagged until a verifier picks the state.
- Citizens can suggest a story (link + headline). It also becomes a DRAFT.
- A **verifier** writes 2–5 lines **in their own words** (60–600 characters, enforced by the contract), picks the state,
  optional district, the responsible office if the report names it, and a category, then publishes. The database refuses a
  published story without a summary and a state. Every decision is audited.
- Unreviewed feed drafts older than 30 days are deleted (stale news).
- Feeds that block automated reading (e.g. returned 403/"Access Denied" when tested) are not used.

## Alternatives considered
- **AI summaries.** Fast, but can misstate facts about real people; may be added later as a *draft* a human must edit.
- **Copying the feed's description.** Simple, but it's the publisher's text.

## Consequences
- ✅ Every published line is ours, sourced and reviewable; publishers get the click.
- ⚠️ Throughput depends on verifiers; the queue shows the newest stories first.
