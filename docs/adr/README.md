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

Template for new ADRs: copy any file, keep the headings: **Context → Decision → Alternatives considered → Consequences**.
