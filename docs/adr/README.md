# Architecture Decision Records

An ADR records **one** significant decision: the context, what we chose, what we rejected, and the consequences.
They are never edited after being accepted; if we change our mind, we write a new ADR that *supersedes* the old one.
That history is what lets someone (including future you, or an interviewer) understand *why* the code looks the way it does.

| # | Decision | Status |
|---|---|---|
| [0001](./0001-monorepo-with-pnpm-workspaces.md) | Monorepo with pnpm workspaces | Accepted |
| [0002](./0002-own-api-instead-of-supabase.md) | Our own REST API instead of a Supabase-only backend | Accepted |
| [0003](./0003-nextjs-for-the-web-app.md) | Next.js (App Router) for the web app | Accepted |
| [0004](./0004-postgres-postgis-drizzle.md) | Postgres + PostGIS, schema managed with Drizzle migrations | Accepted |
| [0005](./0005-cache-aside-for-pincode-lookups.md) | Cache-aside with stale-if-error for PIN code lookups | Accepted |
| [0006](./0006-public-data-sources-and-privacy.md) | Public data sources, licensing and privacy | Accepted |
| [0007](./0007-pincode-to-constituency-by-spatial-majority.md) | PIN code → constituency by spatial majority of post offices | Accepted |
| [0008](./0008-sourced-promises-only.md) | Promises only with a source, enforced by the database | Accepted |
| [0009](./0009-assembly-seats-and-curated-mla-data.md) | Assembly seats from open boundaries; MLAs only from curated, sourced files | Accepted |
| [0010](./0010-session-auth-and-roles.md) | Session-token authentication with roles, owned by the API | Accepted |
| [0011](./0011-citizen-issues-votes-and-moderation.md) | Citizen issues, weekly votes, community moderation and an audit log | Accepted |
| [0012](./0012-report-cards-and-published-methodology.md) | Report cards with a published, data-honest methodology | Accepted |
| [0013](./0013-national-leaderboard-live-windows.md) | National leaderboard from live windows | Accepted |

Template for new ADRs: copy any file, keep the headings: **Context → Decision → Alternatives considered → Consequences**.
