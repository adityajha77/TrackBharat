# ADR-0002: Our own REST API instead of a Supabase-only backend

- **Status:** Accepted
- **Date:** 2026-11-15
- **Supersedes:** the v1 design (React SPA calling Supabase directly from the browser)

## Context
v1 called Supabase from the browser. Security depended entirely on Row Level Security policies configured in a
dashboard. When the Supabase project was deleted, the schema, functions (`get_top_issues`, `count_users`) and
policies were lost because none of it was in git. The `/admin` page had no access check in the app itself.

TrackBharat will have a mobile app, scheduled jobs (weekly issue rankings), data imports (ECI, PRS, MPLADS)
and moderation rules: real business logic that needs a home.

## Decision
A dedicated **Fastify + TypeScript REST API** (`apps/api`) is the only component that talks to the database and to
external sources. Web and mobile are clients of the versioned `/v1` API. Postgres is plain Postgres: it can be hosted
anywhere, including Supabase used *only* as a managed database.

## Alternatives considered
- **Supabase-centric (client SDK + RLS + Edge Functions).** Fastest to ship, but logic is split between SQL policies,
  edge functions and the client, harder to test locally, and couples us to one vendor. Less to learn about backend design.
- **Next.js Route Handlers / Server Actions as the backend.** Fine for web-only. But Server Actions aren't a public API
  for a mobile app, and it ties API deploys to web deploys.
- **NestJS.** More structure (modules, decorators, DI container), but more framework to learn; Fastify + explicit
  factory functions show *how* DI works instead of hiding it.

## Consequences
- ✅ One place for business rules, validation and authorization; testable with `app.inject()` and fakes.
- ✅ The mobile app needs zero backend changes.
- ✅ No vendor lock-in; everything runs locally with Docker.
- ⚠️ We must build auth ourselves (Phase 2), carefully, with a vetted library.
- ⚠️ One more service to deploy and monitor.
