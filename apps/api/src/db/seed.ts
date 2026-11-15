import { eq } from "drizzle-orm";
import { createDb } from "./client";
import { upsertSource } from "./helpers";
import { constituencies, evidence, issues, issueVotes, parties, promiseStatusHistory, promises, representatives, states, terms, users } from "./schema";
import { createPincodeRepository } from "../modules/pincodes/pincode.repository";
import { hashPassword } from "../modules/auth/password";
import { computeWeeklyRankings } from "../jobs/weekly-rankings";
import { previousWeek, weekStartIST } from "../lib/time";

/**
 * SEED: sample data for local development. Safe to re-run.
 *
 * Real data (constituencies, MPs) comes from `pnpm db:import`.
 * Promises about REAL politicians are only ever entered with a real source,
 * so the promise tracker demo below uses a clearly FICTIONAL constituency,
 * person and party, all flagged `is_demo` and labelled "Demo" in the UI.
 * Never attach invented promises to real people, not even locally.
 */
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set. See apps/api/.env.example");
  process.exit(1);
}

const { db, pool } = createDb(databaseUrl);

async function seedPincodeCache() {
  const repo = createPincodeRepository(db);
  const samples = [
    {
      pincode: "110001",
      offices: [{ name: "Connaught Place", branchType: "Sub Post Office", deliveryStatus: "Non-Delivery", block: "New Delhi", district: "Central Delhi", state: "Delhi" }],
    },
    {
      pincode: "560034",
      offices: [{ name: "Koramangala", branchType: "Sub Post Office", deliveryStatus: "Non-Delivery", block: "Bangalore South", district: "Bangalore", state: "Karnataka" }],
    },
  ];
  // Epoch timestamp = always "stale": online, the API refreshes from India Post;
  // offline, it falls back to this row (stale-if-error). Illustrative sample data.
  for (const s of samples) await repo.save(s.pincode, s.offices, new Date(0));
  console.log(`  ✓ PIN cache: ${samples.length} sample PIN codes`);
}

async function seedDemoPromiseTracker() {
  await db.transaction(async (tx) => {
    const demoSource = (path: string, title: string) =>
      upsertSource(tx, { url: `https://example.org/trackbharat-demo/${path}`, title: `[DEMO] ${title}`, publisher: "TrackBharat demo data", kind: "OTHER" });

    const [state] = await tx.insert(states).values({ name: "Demo State (fictional)" }).onConflictDoUpdate({ target: states.name, set: { name: "Demo State (fictional)" } }).returning();
    const [party] = await tx.insert(parties).values({ name: "Demo Party (fictional)", shortName: "DEMO" }).onConflictDoUpdate({ target: parties.name, set: { shortName: "DEMO" } }).returning();

    // Re-running the seed must not duplicate anything: wipe the previous demo constituency first.
    const old = await tx.select({ id: constituencies.id }).from(constituencies).where(eq(constituencies.slug, "demo-nagar"));
    if (old[0]) {
      await tx.delete(issues).where(eq(issues.constituencyId, old[0].id));
      await tx.delete(promises).where(eq(promises.constituencyId, old[0].id));
      await tx.delete(terms).where(eq(terms.constituencyId, old[0].id));
      await tx.delete(constituencies).where(eq(constituencies.id, old[0].id));
    }
    await tx.delete(representatives).where(eq(representatives.fullName, "Demo Representative"));

    const [seat] = await tx
      .insert(constituencies)
      .values({ house: "LOK_SABHA", stateId: state!.id, number: 1, name: "Demo Nagar", nameHi: "डेमो नगर", slug: "demo-nagar", isDemo: true })
      .returning();
    const [rep] = await tx.insert(representatives).values({ fullName: "Demo Representative", education: "Post Graduate", profession: "Social worker", isDemo: true }).returning();
    const termSource = await demoSource("election-result", "Election result");
    const [term] = await tx
      .insert(terms)
      .values({ representativeId: rep!.id, constituencyId: seat!.id, partyId: party!.id, legislature: 18, status: "SITTING", termsServed: 2, sourceId: termSource })
      .returning();

    type Demo = {
      title: string;
      description: string;
      category: typeof promises.$inferInsert.category;
      madeOn: string;
      deadline: string;
      history: { status: typeof promises.$inferInsert.status & string; note: string; at: string }[];
      evidence?: { summary: string; stance: "SHOWS_PROGRESS" | "SHOWS_NO_PROGRESS" | "CONTEXT" }[];
    };
    const demos: Demo[] = [
      {
        title: "Four-lane road between Demo Nagar and the district HQ",
        description: "Widen the 32 km state highway to four lanes with a bypass around the old market.",
        category: "ROADS_INFRASTRUCTURE",
        madeOn: "2024-04-02",
        deadline: "2026-12-31",
        history: [
          { status: "PENDING", note: "Promise recorded", at: "2024-04-02" },
          { status: "IN_PROGRESS", note: "Tender awarded and work started on the first 12 km.", at: "2025-02-10" },
        ],
        evidence: [{ summary: "Work order issued for phase 1 (12 km).", stance: "SHOWS_PROGRESS" }],
      },
      {
        title: "100-bed government hospital with a trauma centre",
        description: "Upgrade the community health centre to a 100-bed district hospital.",
        category: "HEALTH",
        madeOn: "2024-04-02",
        deadline: "2025-12-31",
        history: [
          { status: "PENDING", note: "Promise recorded", at: "2024-04-02" },
          { status: "IN_PROGRESS", note: "Foundation stone laid.", at: "2024-11-20" },
          { status: "FULFILLED", note: "Hospital opened to patients with 100 beds and a trauma ward.", at: "2025-11-05" },
        ],
        evidence: [
          { summary: "Inauguration reported with 100 functional beds.", stance: "SHOWS_PROGRESS" },
          { summary: "Only 6 of 14 sanctioned specialist posts filled at opening.", stance: "CONTEXT" },
        ],
      },
      {
        title: "Piped drinking water to every household in 18 villages",
        description: "Tap connections under the state water mission for the 18 villages of the eastern block.",
        category: "WATER",
        madeOn: "2024-04-15",
        deadline: "2026-03-31",
        history: [
          { status: "PENDING", note: "Promise recorded", at: "2024-04-15" },
          { status: "PARTIAL", note: "11 of 18 villages connected.", at: "2026-04-02" },
        ],
      },
      {
        title: "New degree college for women",
        description: "A government degree college for women with science and commerce streams.",
        category: "EDUCATION",
        madeOn: "2024-04-15",
        deadline: "2025-07-01",
        history: [
          { status: "PENDING", note: "Promise recorded", at: "2024-04-15" },
          { status: "STALLED", note: "Land identified, but no budget allocated in two consecutive years.", at: "2026-02-01" },
        ],
        evidence: [{ summary: "College absent from the state budget for 2025-26.", stance: "SHOWS_NO_PROGRESS" }],
      },
      {
        title: "Cold storage for farmers at the mandi",
        description: "A 5,000-tonne cold storage facility at the Demo Nagar agricultural market.",
        category: "AGRICULTURE",
        madeOn: "2024-05-01",
        deadline: "2027-03-31",
        history: [{ status: "PENDING", note: "Promise recorded", at: "2024-05-01" }],
      },
    ];

    for (const [i, d] of demos.entries()) {
      const src = await demoSource(`rally-speech-${i + 1}`, `Election rally speech #${i + 1}`);
      const current = d.history.at(-1)!.status;
      const [p] = await tx
        .insert(promises)
        .values({ termId: term!.id, constituencyId: seat!.id, title: d.title, description: d.description, category: d.category, status: current, madeOn: d.madeOn, deadline: d.deadline, sourceId: src, isDemo: true })
        .returning();
      for (const [j, h] of d.history.entries()) {
        const hs = j === 0 ? src : await demoSource(`update-${i + 1}-${j}`, `Status update ${i + 1}.${j}`);
        await tx.insert(promiseStatusHistory).values({ promiseId: p!.id, status: h.status, note: h.note, sourceId: hs, changedAt: new Date(`${h.at}T10:00:00Z`) });
      }
      for (const [k, e] of (d.evidence ?? []).entries()) {
        const es = await demoSource(`evidence-${i + 1}-${k}`, `News report ${i + 1}.${k}`);
        await tx.insert(evidence).values({ promiseId: p!.id, summary: e.summary, stance: e.stance, sourceId: es });
      }
    }
    console.log(`  ✓ Demo promise tracker: "Demo Nagar" with ${demos.length} fictional promises (flagged is_demo)`);
  });
}

/**
 * LOCAL DEVELOPMENT ACCOUNTS: one per role, so every screen can be tried.
 * Never created when NODE_ENV=production.
 *
 *   citizen@trackbharat.local    CITIZEN
 *   verifier@trackbharat.local   VERIFIER   (reviews promise submissions, edits promises)
 *   moderator@trackbharat.local  MODERATOR  (handles reported issues)
 *   admin@trackbharat.local      ADMIN
 *
 * Password for all of them (local only): trackbharat-dev-password
 */
export const DEV_PASSWORD = "trackbharat-dev-password";
const DEV_USERS = [
  { email: "citizen@trackbharat.local", name: "Demo Citizen", role: "CITIZEN" },
  { email: "verifier@trackbharat.local", name: "Demo Verifier", role: "VERIFIER" },
  { email: "moderator@trackbharat.local", name: "Demo Moderator", role: "MODERATOR" },
  { email: "admin@trackbharat.local", name: "Demo Admin", role: "ADMIN" },
] as const;

async function seedDevAccountsAndIssues() {
  if (process.env.NODE_ENV === "production") return console.log("  ↳ production: dev accounts skipped");
  const passwordHash = await hashPassword(DEV_PASSWORD);
  const ids: Record<string, number> = {};
  for (const u of DEV_USERS) {
    const [row] = await db.insert(users).values({ ...u, passwordHash }).onConflictDoUpdate({ target: users.email, set: { role: u.role, passwordHash } }).returning({ id: users.id });
    ids[u.role] = row!.id;
  }
  // A few voters so the demo has realistic vote counts
  const voters: number[] = [];
  for (let i = 1; i <= 6; i++) {
    const [row] = await db
      .insert(users)
      .values({ email: `voter${i}@trackbharat.local`, name: `Demo Voter ${i}`, passwordHash })
      .onConflictDoUpdate({ target: users.email, set: { passwordHash } })
      .returning({ id: users.id });
    voters.push(row!.id);
  }
  console.log(`  ✓ Dev accounts: ${DEV_USERS.map((u) => u.email).join(", ")} (+6 voters), password "${DEV_PASSWORD}"`);

  // Demo issues in the fictional Demo Nagar, with votes this week and last week
  const [seat] = await db.select({ id: constituencies.id }).from(constituencies).where(eq(constituencies.slug, "demo-nagar"));
  const thisWeek = weekStartIST();
  const lastWeek = previousWeek(thisWeek);
  const demo = [
    { title: "Deep potholes on Station Road near the bus depot", description: "Three large potholes have been there since the monsoon. Two-wheelers fall every week.", category: "ROADS_INFRASTRUCTURE", votes: [5, 3] },
    { title: "No water supply in Ward 7 for four days", description: "Taps in Ward 7 have been dry since Monday; tankers come only once a day.", category: "WATER", votes: [2, 6] },
    { title: "Street lights not working on Canal Road", description: "The whole 1 km stretch of Canal Road is dark after 7 pm; it is unsafe for women walking home.", category: "SAFETY", votes: [4, 1] },
    { title: "Primary health centre has no doctor on Sundays", description: "The PHC is closed on Sundays and there is no emergency cover for the 20 surrounding villages.", category: "HEALTH", votes: [1, 2] },
  ] as const;
  for (const d of demo) {
    const [issue] = await db
      .insert(issues)
      .values({ userId: ids.CITIZEN!, constituencyId: seat!.id, pincode: "999999", title: `[DEMO] ${d.title}`, description: d.description, category: d.category })
      .returning({ id: issues.id });
    const [lastW, thisW] = d.votes;
    for (const v of voters.slice(0, lastW)) await db.insert(issueVotes).values({ userId: v, issueId: issue!.id, weekStart: lastWeek }).onConflictDoNothing();
    for (const v of voters.slice(0, thisW)) await db.insert(issueVotes).values({ userId: v, issueId: issue!.id, weekStart: thisWeek }).onConflictDoNothing();
  }
  const ranked = await computeWeeklyRankings(db, lastWeek);
  console.log(`  ✓ Demo issues: ${demo.length} in Demo Nagar, with votes; last week's highlights computed (${ranked.rows} rows)`);
}

try {
  console.log("Seeding…");
  await seedPincodeCache();
  await seedDemoPromiseTracker();
  await seedDevAccountsAndIssues();
} finally {
  await pool.end();
}
