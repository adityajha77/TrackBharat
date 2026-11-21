# How TrackBharat was built

The story of the project: what was built, in what order, how each part works, and the problems we hit along the way
with how each was solved. For the detailed design decisions, see [`docs/adr/`](adr/) (one file per decision) and
[`ARCHITECTURE.md`](ARCHITECTURE.md).

> **TrackBharat in one line:** enter your PIN code, see who represents you, what they promised and what they did. Vote
> on the problems India faces this week and read the news that needs a voice, every claim linked to its source.
> Not from any party or any religion.

---

## 1. The big picture

```
          Phone app (Expo)            Website (Next.js on Vercel)
      track-bharat app / APK          https://track-bharat.vercel.app
                 \                         /
                  \   HTTPS + session     /
                   v      token          v
               API (Fastify, Docker on Render)  https://trackbharat-api.onrender.com
                 |                |                         |
                 v                v                         v
        Postgres + PostGIS   Supabase Storage        Google (sign-in), Brevo (email)
        (Supabase)           (citizens' photos)

        GitHub Actions: tests on every push · news every 2 hours · weekly causes every Monday
```

| Part | Technology | Lives in | Hosted on (free plans) |
|---|---|---|---|
| Website | Next.js 16, React 19, Tailwind 4 | `apps/web` | Vercel |
| API | Fastify 5, TypeScript, Drizzle ORM, Zod | `apps/api` | Render (Docker) |
| Mobile app | Expo SDK 58, React Native, Expo Router | `apps/mobile` | Expo build service → APK / Play Store |
| Shared contract | Zod schemas and types used by all three | `packages/shared` | – |
| Database | Postgres 17 + PostGIS (maps) | migrations in `apps/api/drizzle` | Supabase |
| Photos | private bucket | – | Supabase Storage |
| Scheduled jobs | news feeds, weekly rankings | `.github/workflows/jobs.yml` | GitHub Actions |
| Email | Brevo's HTTPS API | `apps/api/src/modules/email` | Brevo (300/day free) |

**One API for everything.** The website and the app never talk to the database. They both call the same API, which
checks every request (who you are, what your role allows), so the rules exist in one place.

**One contract.** `packages/shared` holds the shape of every request and response as a Zod schema. The API uses it to
validate what comes in, the website to validate what comes back, and the app imports the same types. If a field
changes, TypeScript points at every place that needs to follow.

---

## 2. How it was built, phase by phase

| Phase | What it added |
|---|---|
| **0. Foundation** | Monorepo (pnpm workspaces), Next.js site, Fastify API, Postgres migrations, CI that runs lint, types, tests and a build on every push |
| **1. Seats and MPs** | All 543 Lok Sabha constituencies with their map boundaries; PIN code → constituency by *where most of the PIN's post offices are* (PostGIS); the 18th Lok Sabha's MPs from sansad.in; a promise tracker where every promise needs a source |
| **1b. MLAs** | 4,091 assembly seats; MLAs from curated, source-linked CSV files (3,322 MLAs in 19 states/UTs) |
| **2. Citizens** | Accounts (sessions, roles), reporting local problems with photos, weekly votes, moderation with an audit log |
| **3. Report cards** | MP report cards with a published formula, 57,000 parliamentary questions, "What India is asking for" leaderboard, open data downloads, browser tests (Playwright) |
| **3b. Voices** | A clear home page, **12 Indian languages**, up/down votes, **Causes of the Week**, a news pipeline, **party manifestos: promised vs done**, a neutral **party timeline**, Know Your Neta |
| **Polish** | Done vs not-done scorecards, sources panels ("check it yourself"), regional news (incl. Andaman & Nicobar), privacy policy and terms |
| **4. Going live** | Supabase database, Render API, Vercel website, Google sign-in, email, scheduled jobs |
| **Admin** | Admin panel on the website: users and roles, blocking, promises, causes, audit log |
| **5. Mobile** | The Expo app for Android and iPhone, including an admin panel |

---

## 3. How the main features work

### PIN code → your representatives
A PIN code covers many villages and can straddle constituencies. We take the location of every post office in the PIN
(143,609 locations), find which constituency boundary each falls in (a PostGIS spatial join), and show the seat(s) that
cover the PIN with their share. The MP comes from the Lok Sabha's records; the MLA from a curated CSV whose every row
links to its source.

### Promises and report cards
A promise can't exist without a source: the database itself refuses one (`NOT NULL source_id`). Status changes and
evidence also carry a source, and the history is kept. The report-card score uses a formula published at
`/methodology` and computed from the same constants the API uses, so the page and the numbers can't drift apart.

### Manifestos: promised vs done
Curated JSON files (`apps/api/data/parties/`) list each manifesto's promises. Rules enforced by code and database:
a verdict (fulfilled, broken…) needs an evidence link; a party that didn't form the government after that election is
never marked "broken" (its promises are "didn't form government"); the **fulfilled %** counts only promises a party was
in power to deliver. Parties are also judged on **state governments** they led (e.g. INC Karnataka 2023), not only on
national elections.

### Causes of the Week and votes
Every Monday 00:05 IST a job picks the 5 categories with the most new reports and net votes, across India. Votes are
+1/−1, one per person per week, and **only votes from verified accounts count**, which makes brigading harder.

### News that needs a voice
Every 2 hours a job reads 18 public RSS feeds (national papers, The Hindu's state pages, Northeast, Kashmir, Andaman &
Nicobar) and stores **only the headline and the link**. The site lists them under "Latest from the press"; reading
happens on the publisher's own site. Verifiers can add their own 2–5-line summary with the place and who is
responsible ("Verified by TrackBharat"). Citizens' suggestions stay hidden until a verifier publishes them.

### Accounts and sign-in
- **Sessions, not JWTs.** At log-in the API makes a random token and stores only its SHA-256 hash, so a database leak
  can't be used to log in, and deleting the row logs someone out instantly (also used when an admin blocks a user).
- **Website:** the token lives in an httpOnly cookie (JavaScript can't read it). **App:** in the phone's secure storage.
- **Passwords:** Argon2 hashes.
- **Continue with Google:** done by the API (OAuth code flow with PKCE and a `state` check). The browser never sees
  the Google secret, and the session never appears in a URL: the API hands over a **one-time 2-minute code**, which the
  website's server (or the app) swaps for a session. The app gets its code at its own address `trackbharat://auth`.

### Roles and the admin panel
| Role | Can do |
|---|---|
| Citizen | report problems, vote, suggest stories and promises |
| Verifier | News desk, promise suggestions, promise status and evidence |
| Moderator | moderation queue, Causes |
| Admin | everything, plus users and roles, blocking, audit log |

Safety rules: you can't change your own role or block yourself; the last admin can't be removed; every change needs a
reason and goes into the audit log (which can't be edited). The API enforces all of this; the website and app only
hide what you can't use.

### 12 languages
Pages live under `/[lang]` (English at clean URLs, others prefixed: `/hi`, `/ta`…). Text comes from one JSON file per
language, merged over English so a missing string falls back instead of breaking. A test fails if any language loses a
core section or a placeholder. Urdu is right-to-left.

---

## 4. The obstacles, and how each was solved

### Data
| Problem | Fix |
|---|---|
| **No single open list of India's ~4,000 MLAs.** | Generate each state's CSV from the Wikipedia election article (whose tables cite ECI), store the article as a secondary source on every row, and cross-check every row against our own seat map (number **and** name must match; a file with under 80% matches is refused). |
| **Wikipedia tables differ by state** (Kerala, Haryana, West Bengal, Punjab gave 0 rows). | The parser learned three layouts: `bgcolor=`, `style="background:"` and the `{{Party color cell}}` template, plus seat numbers in header cells. |
| **Odisha spellings differ** ("Cuttack Sadar" vs "Kataka Sadar", 38 seats). | A reviewed `seat-aliases.csv`: exact pairs only, checked by seat number, never fuzzy matching. |
| **Manifesto verdicts need proof.** | Every verdict was checked against the cited page before adding it; unclear ones stay "not yet rated". One broken evidence link was found by checking all 111 source links. |
| **One party (BSP) publishes no manifesto.** | Show that fact with its source instead of an empty card. |

### Building and testing
| Problem | Fix |
|---|---|
| **CI build failed**: new pages called the API while Next.js was building, and there is no API in CI. | Live pages render per request (`connection()`) inside `loading.tsx` boundaries. Proven by building with the API switched off. |
| **Browser tests flaky**: a streamed page briefly has a hidden duplicate of its content. | Tests look inside `#main` only. |
| **Database tests interfered with each other** when test files ran at the same time on one database. | Test files run one after another when a test database is used. |
| **E2E tests left "village school without a teacher" stories on the dev site.** | A teardown removes test stories and test accounts after every run. |
| **Log-in rate limit (10/minute) broke the browser tests.** | Relaxed only outside production. |
| **CI couldn't download from sansad.in** (it refuses servers outside India). | A committed snapshot for CI, and downloads fall back to an older cached copy. |
| **Fresh machines failed** to save downloads into sub-folders. | Create the folder first (found only because CI starts from scratch). |
| **CI logs need a GitHub login**, so failures were invisible. | CI now posts the failing test and its error as a public annotation. |

### Going live
| Problem | Fix |
|---|---|
| **Railway's builder ignored our config** ("No start command detected"). | Switched to Render's free plan with a `render.yaml` blueprint. |
| **`sh -c "…"` start command: "not found"** on Render. | One entry file, `node dist/start.js`, that migrates then starts. |
| **`ENETUNREACH` to the database.** Supabase's direct address is IPv6-only; Render and GitHub can't reach it. | Use Supabase's **Session pooler** address. |
| **A password with `@` and `#`** broke the database URL. | URL-encode them (`%40`, `%23`), or use letters and numbers only. |
| **Wrong values pasted into settings** (`PUBLIC_API_URL`, `SUPABASE_URL`). | The API now checks its settings at startup and names the bad one in plain words. |
| **Render's free disk is wiped on restart**, so uploaded photos would vanish. | Photos go to Supabase Storage (private bucket, served through the API). Leader photos ship inside the Docker image. |
| **Render's free plan has no background worker.** | News and weekly jobs run on GitHub Actions on a schedule. |
| **Google `redirect_uri_mismatch`.** | Register the exact callback `https://trackbharat-api.onrender.com/v1/auth/google/callback`. |
| **Site address mix-up** (`trackbharat` vs `track-bharat`), so Google sign-in returned to the wrong site. | Fixed `WEB_URL` on Render; checked by asking the live API where it redirects. |
| **Google branding verification**: "home page not registered to you". | Verified the site in Search Console with an HTML tag (set through `GOOGLE_SITE_VERIFICATION`); the first try failed because the *file* method was chosen instead of the *tag*. |
| **No emails**: Render's free plan blocks SMTP, so Gmail SMTP hung for 2 minutes. | Send email over Brevo's HTTPS API. The reset request now answers at once even if email fails. |
| **Brevo "unrecognised IP address".** | Turn off Brevo's IP allow-list (Render's addresses change). |
| **Secrets pasted in a chat.** | Database password rotated; real keys live only in Render, Vercel and local `.env` files (never in git). |

### The mobile app
| Problem | Fix |
|---|---|
| **React Native wants a flat `node_modules`; the web/API use pnpm's strict layout.** | The app installs with npm on its own (excluded from the pnpm workspace), so it can't break the web or API builds. Types still come from `packages/shared` (type-only imports, nothing extra bundled). |
| **Expo changes between versions.** | Followed the SDK 58 docs (native tabs, secure storage, auth sessions) instead of memory. |
| **React Compiler lint rules** rejected the data-loading helper (state set directly in an effect). | Rewritten so state only changes when data arrives. |
| **Google sign-in in an app** can't use the website's cookie hand-off. | `client=app`: the API sends the one-time code to the fixed address `trackbharat://auth`, never to an address taken from the request. |
| **The free API sleeps** after 15 quiet minutes. | The app waits up to 60 seconds and says the server may be waking up. |

---

## 5. Safety and privacy, in short
- Every claim links to a public source; no source, no verdict.
- Passwords (Argon2) and session tokens (SHA-256) are stored only as hashes.
- Photos are re-encoded: hidden data such as GPS location is removed.
- Votes are never shown individually.
- Every moderation and admin decision is in an append-only audit log.
- Account deletion removes the account, reports, votes and photos.
- Secrets live only in the hosting dashboards and local `.env` files, never in git.

---

## 6. Running it yourself
| What | Command |
|---|---|
| Database (Docker) | `pnpm db:up` |
| Tables, data, demo accounts | `pnpm db:migrate`, `pnpm db:import constituencies assembly pins members parties news-feeds mlas`, `pnpm db:seed` |
| API + website | `pnpm dev` (API :4000, site :3100) |
| All checks | `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e` |
| Mobile app | `cd apps/mobile && npm install && npx expo start` (see [`apps/mobile/README.md`](../apps/mobile/README.md)) |
| Make someone admin | `pnpm --filter @trackbharat/api exec tsx src/scripts/set-role.ts <email> ADMIN` (or the admin panel) |

---

## 7. What's next
- Build and publish the Android app (`eas build`), then the Play Store listing.
- A domain of our own: the site, API and email (`no-reply@…`) on it.
- More sourced verdicts for "not yet rated" promises; native-speaker review of the translations; more verifiers.
