# TrackBharat

**Vote with facts, not faces.** TrackBharat makes political promises measurable and government performance
understandable to ordinary Indian citizens. Enter your PIN code to see your area, your representatives, the promises
they made, and what actually happened.

[![CI](https://github.com/adityajha77/TrackBharat/actions/workflows/ci.yml/badge.svg)](https://github.com/adityajha77/TrackBharat/actions/workflows/ci.yml)

| | |
|---|---|
| **Web** | Next.js 16 (App Router, Server Components, Cache Components), React 19, Tailwind CSS v4 |
| **API** | Fastify 5, TypeScript, Zod, Drizzle ORM |
| **Data** | PostgreSQL 17 + PostGIS, versioned SQL migrations |
| **DevOps** | pnpm monorepo, Docker multi-stage builds, Docker Compose, GitHub Actions CI |
| **Tests** | Vitest (unit, HTTP contract tests) |

📐 **How it's built and why:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · decisions in [`docs/adr/`](docs/adr)

## Status

Phase 0 (foundation) is done: PIN code lookup works end to end with caching. Next up is **Phase 1**: constituencies,
MP/MLA profiles and the promise tracker. See the [roadmap](docs/ARCHITECTURE.md#11-roadmap).

## Run it locally

Requirements: **Node 22+**, **pnpm 10+**, **Docker Desktop**.

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

pnpm db:up        # Postgres + PostGIS in Docker, on localhost:5433
pnpm db:migrate   # create the tables
pnpm db:seed      # sample data
pnpm dev          # API → http://localhost:4000 · web → http://localhost:3000
```

Try it: open http://localhost:3000 and search `560034`, or `curl localhost:4000/v1/pincodes/560034`.

Whole stack in containers (production-like): `docker compose --profile full up --build`

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | API + web with hot reload |
| `pnpm test` | All tests |
| `pnpm lint` / `pnpm typecheck` | Static checks (same as CI) |
| `pnpm build` | Production builds |
| `pnpm db:generate` | Generate a SQL migration after editing `apps/api/src/db/schema.ts` |
| `pnpm db:migrate` / `db:seed` / `db:studio` | Apply migrations / load sample data / browse data |

## API

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Liveness + database check |
| GET | `/v1/pincodes/:pincode` | Area, district, state and post offices for a PIN code |

Errors always look like `{ "error": { "code": "NOT_FOUND", "message": "...", "requestId": "..." } }`.

## Principles

- **Every claim has a source.** No source, no claim.
- **Non-partisan.** The same rules and the same published formula for everyone.
- **Open data.** What you can see, you can download.

## Contributing

Corrections with a source are welcome: open an issue or a PR. CI must be green.

---

Built by [Aditya Jha](https://www.linkedin.com/in/aditya-kumar-jha-72493a319/). Data: India Post (PIN codes).
