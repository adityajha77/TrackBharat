# ADR-0001: Monorepo with pnpm workspaces

- **Status:** Accepted
- **Date:** 2026-11-15

## Context
TrackBharat has a web app, an API, a shared API contract and, later, a mobile app. They change together:
a new field in an API response usually means a change in the API, the contract and the page that shows it.

## Decision
One git repository with **pnpm workspaces**: `apps/web`, `apps/api`, `packages/shared` (later `apps/mobile`).
Internal packages are linked with `workspace:*` and ship TypeScript source ("just-in-time" packages), compiled by
each consumer (Next.js `transpilePackages`, tsup `noExternal`).

## Alternatives considered
- **Separate repositories.** Each change needs coordinated PRs and publishing the contract to a registry. Too much overhead for a small team.
- **Turborepo / Nx on top.** They add task caching and dependency-aware pipelines. Not needed at this size; easy to add later without restructuring.
- **npm / yarn workspaces.** They work, but pnpm is faster, uses a content-addressed store (saves disk), and is strict about undeclared dependencies.

## Consequences
- ✅ Atomic changes across API + web + contract in one PR; one CI pipeline.
- ✅ The contract is imported directly. Type errors appear at build time when API and web disagree.
- ⚠️ Docker builds must be run from the repo root so they can see `packages/shared`.
- ⚠️ CI runs everything on every change; add Turborepo caching if that becomes slow.
