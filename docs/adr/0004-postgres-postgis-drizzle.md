# ADR-0004: Postgres + PostGIS, schema managed with Drizzle migrations

- **Status:** Accepted
- **Date:** 2026-11-15

## Context
The domain is relational (constituencies → terms → promises → evidence; users → issues → votes) and needs
integrity rules (one vote per user per issue per week), aggregation for scores, transactions, and **geography**:
mapping a PIN code to the constituency polygons it overlaps. v1 lost its schema because it was never versioned.

## Decision
- **PostgreSQL 17** as the single source of truth, with the **PostGIS** extension for spatial queries.
- **Drizzle ORM**: schema defined in TypeScript; `drizzle-kit generate` produces **plain SQL migration files committed to git**;
  `pnpm db:migrate` applies them (locally, in CI, and on deploy).
- CI fails if `schema.ts` changes without a matching generated migration.

## Alternatives considered
- **MongoDB.** Flexible documents, but our data is highly relational and integrity matters more than schema flexibility.
- **Prisma.** Great DX, but its own schema language and a heavier engine; Drizzle stays closer to SQL, which is the point while learning.
- **Raw SQL + node-pg-migrate.** Maximum control, but no type safety on query results.
- **Supabase dashboard / manual SQL.** That's exactly how v1 lost its schema.

## Consequences
- ✅ Rebuild the whole database from zero with one command; every schema change is reviewed as SQL in a PR.
- ✅ Typed queries; PostGIS ready for Phase 1.
- ⚠️ Migrations are forward-only in practice; destructive changes (dropping columns) need a two-step deploy.
- ⚠️ The `postgis/postgis` image also installs US "tiger" geocoder tables we don't use; harmless.
