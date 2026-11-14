# ADR-0005: Cache-aside with stale-if-error for PIN code lookups

- **Status:** Accepted
- **Date:** 2026-11-15

## Context
PIN code → post office data comes from the free public India Post API (`api.postalpincode.in`). It has no SLA,
is sometimes slow or down, and the data changes very rarely. v1 called it directly from every visitor's browser.

## Decision
The API owns the lookup and caches results in Postgres (`pincodes` + `post_offices`):
1. Fresh row (younger than `PINCODE_CACHE_TTL_DAYS`, default 30)? Serve it.
2. Otherwise fetch from India Post (5 s timeout), validate with Zod, save in one transaction, serve it.
3. India Post fails but a stale row exists? **Serve the stale row** (stale-if-error).

The web layer adds `"use cache"` (hours), and responses carry `Cache-Control: max-age=3600, stale-while-revalidate=86400`.

## Alternatives considered
- **Import all ~19,000 PIN codes up front** from the data.gov.in dataset. Likely in Phase 1 (we need coordinates for
  PostGIS anyway); cache-aside remains useful for freshness.
- **Redis cache.** Faster, but another service to run; Postgres is fast enough here and the data is useful relationally.
- **No cache.** Every page view depends on a third party being up.

## Consequences
- ✅ Site keeps working when India Post is down (for PINs seen before).
- ✅ The response includes `"source": "cache" | "upstream"`, so you can observe the behaviour while learning.
- ⚠️ Data can be up to 30 days old, acceptable for post office data.
