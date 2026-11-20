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

## Update (2026-11-21): latest headlines are shown straight away
- `/news` now has two parts: **Verified by TrackBharat** (our summaries, as above) and **Latest from the press**: the feed
  headlines themselves, newest first, each with the publisher's name, the time, the state if known, and a link that
  opens the story **on the publisher's site**. We still store and show only the headline and the link, never the
  article text or the feed's description, so the publisher keeps the reader and the click.
- Why this is fine: publishers offer RSS feeds so that others list their headlines with a link back; a headline with
  attribution and a link is how every news reader and aggregator works. Copying article text or images would not be,
  and we don't. A publisher who objects is removed from `news-feeds.json` the same day.
- Citizen suggestions never appear in either list until a verifier publishes them. Staff can also add a story directly
  (`POST /v1/moderation/news`, the "News desk" page), which publishes at once and is audited.

## Alternatives considered
- **AI summaries.** Fast, but can misstate facts about real people; may be added later as a *draft* a human must edit.
- **Copying the feed's description.** Simple, but it's the publisher's text.

## Consequences
- ✅ Every published line is ours, sourced and reviewable; publishers get the click.
- ⚠️ Throughput depends on verifiers; the queue shows the newest stories first.
