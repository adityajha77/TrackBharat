# ADR-0014: Twelve Indian languages with a `[lang]` root segment

- **Status:** Accepted
- **Date:** 2026-11-16

## Context
Most Indians are more comfortable reading in their own language. We want English (default) plus Hindi, Marathi,
Gujarati, Bengali, Tamil, Telugu, Kannada, Malayalam, Punjabi, Odia and Urdu (right-to-left), without losing the
static, cached pages that Cache Components give us.

## Decision
- **Routing:** all pages live under `app/[lang]/`, with that folder holding the root layout. `generateStaticParams` lists the 12 codes, so every
  language is prerendered. `next/root-params` (`lang()`) lets any Server Component read the language without prop drilling.
- **Clean English URLs:** `src/proxy.ts` rewrites `/leaderboard` → `/en/leaderboard` internally, redirects `/en/…` to
  the clean URL, and remembers a chosen language in the `tb_lang` cookie, so a redirect after a form keeps the visitor in
  Marathi.
- **Strings:** one JSON dictionary per language in `src/i18n/dictionaries/`. English is complete. Other languages may be
  partial: missing strings fall back to English (deep merge), never a blank. A unit test fails on unknown keys or broken
  `{placeholders}`, and requires the first-seen sections (nav, home, votes, causes, statuses, categories) to be complete.
- **Client components** get the dictionary once through `I18nProvider`; our `Link` wrapper prefixes paths with the language
  from that context (not `useParams()`, which would make every page dynamic).
- **Fonts:** one Noto font per script via `next/font`, `preload: false`, so a browser downloads only the script it shows.
  `<html lang dir>` is set per language.
- **Data stays in its source language:** names, news summaries, manifesto text and long explainer pages are English for
  now, and the pages say so.

## Alternatives considered
- **A library (next-intl, i18next).** Good, but our needs are small, and the built-in root params + dictionaries are easier
  to learn and have no version lock-in.
- **Language from a cookie only, no URL prefix.** Breaks caching (one URL, many languages) and makes links unshareable.

## Consequences
- ✅ Every language is a static, cacheable, shareable URL (`/ta/causes`).
- ⚠️ Translations are a first version written without native-speaker review; the footer asks for corrections.
