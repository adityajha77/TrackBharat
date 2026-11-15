# TrackBharat

**Vote with facts, not faces.** TrackBharat makes political promises measurable and government performance
understandable to ordinary Indian citizens. Enter your PIN code to see your area, your representatives, the promises
they made, and what actually happened.

[![CI](https://github.com/adityajha77/TrackBharat/actions/workflows/ci.yml/badge.svg)](https://github.com/adityajha77/TrackBharat/actions/workflows/ci.yml)

| | |
|---|---|
| **Web** | Next.js 16 (App Router, Server Components, Cache Components), React 19, Tailwind CSS v4 |
| **API** | Fastify 5, TypeScript, Zod, Drizzle ORM |
| **Data** | PostgreSQL 17 + PostGIS (spatial joins, GiST indexes), versioned SQL migrations, an idempotent import pipeline |
| **DevOps** | pnpm monorepo, Docker multi-stage builds, Docker Compose, GitHub Actions CI |
| **Tests** | Vitest (unit, HTTP contract, security, PostGIS/SQL integration) · Playwright end-to-end |

📐 **How it's built and why:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · decisions in [`docs/adr/`](docs/adr)

## Status

**Phases 0–3 are built.** PIN code → Lok Sabha seat and assembly seat, your MP, a sourced promise tracker, **report cards** with a
published formula and a comparison with the previous MP, citizen problem reports with weekly votes, and a **national leaderboard of
what India is asking for** (today / this week). Accounts, roles, moderation, open-data CSVs and end-to-end tests are in. Next:
state-by-state MLA data, then going live (Phase 4) and the mobile app (Phase 5). See the [roadmap](docs/ARCHITECTURE.md#11-roadmap).

## Run it locally

Requirements: **Node 22+**, **pnpm 10+**, **Docker Desktop**.

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

pnpm db:up        # Postgres + PostGIS in Docker, on localhost:5433
pnpm db:migrate   # create the tables
pnpm db:import    # public data: constituencies, assembly seats, post offices, MPs, previous MPs (~1 min)
pnpm db:import questions   # parliamentary questions per MP (slow, ~20 min once; resumable, then cached)
pnpm db:seed      # sample data incl. the fictional "Demo Nagar" promise-tracker demo
pnpm dev          # API → http://localhost:4000 · web → http://localhost:3000
pnpm worker       # (optional) the weekly-highlights scheduler
```

Log in locally with `citizen@`, `verifier@`, `moderator@` or `admin@trackbharat.local` (the password is in `apps/api/src/db/seed.ts`).

Try it: open http://localhost:3000 and search `560034`, or open http://localhost:3000/constituency/demo-nagar.

Whole stack in containers (production-like): `docker compose --profile full up --build`

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | API + web with hot reload |
| `pnpm test` | Unit, HTTP and integration tests (set `TEST_DATABASE_URL` for the PostGIS/SQL ones) |
| `pnpm test:e2e` | Playwright browser tests against a running **production** build (`E2E_BASE_URL`) |
| `pnpm lint` / `pnpm typecheck` | Static checks (same as CI) |
| `pnpm build` | Production builds |
| `pnpm db:generate` | Generate a SQL migration after editing `apps/api/src/db/schema.ts` |
| `pnpm db:migrate` / `db:seed` / `db:studio` | Apply migrations / load sample data / browse data |
| `pnpm db:import` | Import public datasets (or one step: `pnpm db:import members`) |

## API

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Liveness + database check |
| GET | `/v1/pincodes/:pincode` | Area, district, state and post offices for a PIN code |
| GET | `/v1/pincodes/:pincode/constituencies` | Lok Sabha seat(s) for a PIN code, with share and sitting MP |
| GET | `/v1/constituencies` | All 543 seats grouped by state |
| GET | `/v1/constituencies/:slug` | Seat detail: outline, MP, promises and status counts |
| GET | `/v1/promises/:id` | Promise with source, status timeline and evidence |
| GET | `/v1/constituencies/:slug/report-card` | Score, components, questions asked, previous-MP comparison |
| GET | `/v1/leaderboard?period=day` or `week` | National problems by category, issue, constituency and state |
| GET | `/v1/insights`, `/v1/export/:dataset.csv` | India-wide totals; open-data downloads |
| POST | `/v1/auth/signup`, `login`, `logout`, `change-password`, `delete-account` | Accounts (Argon2 passwords, opaque session tokens) |
| GET / POST | `/v1/constituencies/:slug/issues`, `/v1/issues`, `…/vote`, `…/report` | Citizen issues, weekly votes, community reports |
| POST | `/v1/admin/promises…`, `/v1/moderation/…` | Verifier / moderator actions (role-checked and audited); every promise needs an https source |

Errors always look like `{ "error": { "code": "NOT_FOUND", "message": "...", "requestId": "..." } }`.

## Principles

- **Every claim has a source.** No source, no claim.
- **Non-partisan.** The same rules and the same published formula for everyone.
- **Open data.** What you can see, you can download.

## Contributing

Corrections with a source are welcome: open an issue or a PR. CI must be green.

---

Built by [Aditya Jha](https://www.linkedin.com/in/aditya-kumar-jha-72493a319/).

**Data:** constituency boundaries by DataMeet / Arun Ganesh (CC0) · post office directory by the Department of Posts
(Government Open Data Licence – India, via IndiaPIN) · members from the Lok Sabha Secretariat (sansad.in) · PIN lookups
by India Post. Details in [ADR-0006](docs/adr/0006-public-data-sources-and-privacy.md).
