import { relations, sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  bigserial,
  boolean,
  check,
  customType,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * Database schema, the single source of truth for table structure.
 *
 * Workflow: edit this file → `pnpm db:generate` (writes a SQL migration into
 * apps/api/drizzle/) → review the SQL → `pnpm db:migrate` → commit both.
 *
 * Map of the tables (see docs/ARCHITECTURE.md §5 for the diagram):
 *
 *   GEOGRAPHY     states ─< constituencies          pin_locations ─► pincode_constituencies
 *   PEOPLE        parties, representatives ─< terms >─ constituencies
 *   PROMISES      terms/parties ─< promises ─< promise_status_history, evidence
 *   PROVENANCE    sources  (referenced by terms, promises, history, evidence)
 *   CACHE         pincodes ─< post_offices   (India Post lookups, Phase 0)
 */

// ---------------------------------------------------------------------------
// Enums: Postgres rejects any value not in the list, so typos can't sneak in.
// ---------------------------------------------------------------------------
export const houseEnum = pgEnum("house", ["LOK_SABHA", "VIDHAN_SABHA"]);
export const reservationEnum = pgEnum("reservation", ["GEN", "SC", "ST"]);
export const termStatusEnum = pgEnum("term_status", ["SITTING", "COMPLETED", "RESIGNED", "DIED", "DISQUALIFIED"]);
export const sourceKindEnum = pgEnum("source_kind", ["OFFICIAL", "MANIFESTO", "NEWS", "DATASET", "OTHER"]);
export const promiseStatusEnum = pgEnum("promise_status", [
  "PENDING", // made, no visible progress yet
  "IN_PROGRESS",
  "PARTIAL", // partly delivered
  "FULFILLED",
  "STALLED", // started, then stopped
  "BROKEN", // deadline passed / officially abandoned
]);
export const promiseCategoryEnum = pgEnum("promise_category", [
  "ROADS_INFRASTRUCTURE",
  "HEALTH",
  "EDUCATION",
  "EMPLOYMENT",
  "WATER",
  "ELECTRICITY",
  "AGRICULTURE",
  "HOUSING",
  "SAFETY",
  "ENVIRONMENT",
  "LOCAL_DEVELOPMENT",
  "OTHER",
]);
export const evidenceStanceEnum = pgEnum("evidence_stance", ["SHOWS_PROGRESS", "SHOWS_NO_PROGRESS", "CONTEXT"]);

/**
 * PostGIS MultiPolygon. Drizzle has a built-in `geometry` type for points but
 * not polygons, so we declare a custom column type. We never send polygons to
 * the client raw; queries use PostGIS functions (ST_Contains, ST_AsSVG) instead.
 */
const multiPolygon = customType<{ data: string; driverData: string }>({
  dataType: () => "geometry(MultiPolygon, 4326)",
});

/**
 * PostGIS Point in WGS84 (SRID 4326 = plain latitude/longitude, same as GPS).
 * Declared by hand because Drizzle's built-in geometry() leaves the SRID out of
 * the generated SQL, and PostGIS refuses to compare shapes with different SRIDs.
 */
const point4326 = customType<{ data: string; driverData: string }>({
  dataType: () => "geometry(Point, 4326)",
});

// ---------------------------------------------------------------------------
// PROVENANCE: "no source, no claim". Everything factual points at a source.
// ---------------------------------------------------------------------------
export const sources = pgTable("sources", {
  id: serial("id").primaryKey(),
  url: text("url").notNull().unique(),
  title: text("title").notNull(),
  publisher: text("publisher").notNull(),
  kind: sourceKindEnum("kind").notNull(),
  license: text("license"),
  publishedOn: date("published_on"),
  accessedAt: timestamp("accessed_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// GEOGRAPHY
// ---------------------------------------------------------------------------
export const states = pgTable("states", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(), // current official name, e.g. "Odisha", "NCT of Delhi"
});

export const constituencies = pgTable(
  "constituencies",
  {
    id: serial("id").primaryKey(),
    house: houseEnum("house").notNull(),
    stateId: integer("state_id")
      .notNull()
      .references(() => states.id),
    number: smallint("number").notNull(), // official ECI number within the state
    name: text("name").notNull(),
    nameHi: text("name_hi"),
    slug: text("slug").notNull().unique(), // URL-friendly id: /constituency/bangalore-south
    reservation: reservationEnum("reservation").notNull().default("GEN"),
    boundary: multiPolygon("boundary"), // null for demo data / unknown boundary
    boundarySourceId: integer("boundary_source_id").references(() => sources.id),
    /** True where the open map predates a re-delimitation (Assam 2023, J&K 2022). */
    boundaryOutdated: boolean("boundary_outdated").notNull().default(false),
    wikidataQid: text("wikidata_qid"),
    isDemo: boolean("is_demo").notNull().default(false),
    /**
     * SELF-REFERENCE: an assembly seat (Vidhan Sabha) lies inside a Lok Sabha seat.
     * Computed spatially at import. Lets the UI link MLA ⇄ MP.
     */
    parentId: integer("parent_id").references((): AnyPgColumn => constituencies.id, { onDelete: "set null" }),
  },
  (t) => [
    index("constituencies_parent_idx").on(t.parentId),
    uniqueIndex("constituencies_house_state_number_uq").on(t.house, t.stateId, t.number),
    // GiST = the index type for geometry. Makes "which polygon contains this point?" fast.
    index("constituencies_boundary_gist").using("gist", t.boundary),
  ],
);

/** One row per post office location. Used only to work out PIN → constituency. */
export const pinLocations = pgTable(
  "pin_locations",
  {
    id: serial("id").primaryKey(),
    pincode: varchar("pincode", { length: 6 }).notNull(),
    officeName: text("office_name").notNull(),
    location: point4326("location").notNull(),
  },
  (t) => [index("pin_locations_pincode_idx").on(t.pincode), index("pin_locations_location_gist").using("gist", t.location)],
);

/**
 * Precomputed answer to "which constituencies does this PIN code cover?".
 * A PIN can span several constituencies, so we store the SHARE of its post
 * offices that fall inside each one. Rebuilt by the import (a spatial join),
 * so the website never has to run heavy geometry queries per request.
 */
export const pincodeConstituencies = pgTable(
  "pincode_constituencies",
  {
    pincode: varchar("pincode", { length: 6 }).notNull(),
    constituencyId: integer("constituency_id")
      .notNull()
      .references(() => constituencies.id, { onDelete: "cascade" }),
    officeCount: integer("office_count").notNull(),
    share: real("share").notNull(), // 0..1
  },
  (t) => [primaryKey({ columns: [t.pincode, t.constituencyId] })],
);

// ---------------------------------------------------------------------------
// PEOPLE
// ---------------------------------------------------------------------------
export const parties = pgTable("parties", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  shortName: text("short_name"),
});

/**
 * The PERSON. Deliberately minimal (public-role facts only): no phone numbers,
 * addresses, date of birth or family details, even though the source publishes
 * them. Data minimisation is a core rule of India's DPDP Act, 2023.
 */
export const representatives = pgTable("representatives", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  gender: text("gender"),
  education: text("education"),
  profession: text("profession"),
  imageUrl: text("image_url"),
  sansadMemberId: integer("sansad_member_id").unique(), // "mpsno" on sansad.in
  isDemo: boolean("is_demo").notNull().default(false),
});

/**
 * The SEAT FOR A PERIOD: person × constituency × legislature. Separating this
 * from the person is what makes "compare with the previous MP" possible, and
 * handles party switches and by-elections cleanly.
 */
export const terms = pgTable(
  "terms",
  {
    id: serial("id").primaryKey(),
    representativeId: integer("representative_id")
      .notNull()
      .references(() => representatives.id),
    constituencyId: integer("constituency_id")
      .notNull()
      .references(() => constituencies.id),
    partyId: integer("party_id").references(() => parties.id),
    legislature: smallint("legislature").notNull(), // e.g. 18 = 18th Lok Sabha
    status: termStatusEnum("status").notNull(),
    termsServed: smallint("terms_served"), // incl. this one, per source
    startedOn: date("started_on"),
    endedOn: date("ended_on"),
    sourceId: integer("source_id")
      .notNull()
      .references(() => sources.id),
  },
  (t) => [
    uniqueIndex("terms_person_seat_legislature_uq").on(t.representativeId, t.constituencyId, t.legislature),
    index("terms_constituency_idx").on(t.constituencyId),
  ],
);

// ---------------------------------------------------------------------------
// PROMISES
// ---------------------------------------------------------------------------
export const promises = pgTable(
  "promises",
  {
    id: serial("id").primaryKey(),
    /** Promise by a specific representative (their term)... */
    termId: integer("term_id").references(() => terms.id),
    /** ...or by a party in its manifesto. */
    partyId: integer("party_id").references(() => parties.id),
    /** Where it applies (may be null for a nationwide manifesto promise). */
    constituencyId: integer("constituency_id").references(() => constituencies.id),
    title: text("title").notNull(),
    description: text("description"),
    category: promiseCategoryEnum("category").notNull(),
    status: promiseStatusEnum("status").notNull().default("PENDING"), // = latest history row
    madeOn: date("made_on"),
    deadline: date("deadline"),
    /** NOT NULL: the database itself refuses a promise without a source. */
    sourceId: integer("source_id")
      .notNull()
      .references(() => sources.id),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("promises_has_maker", sql`${t.termId} IS NOT NULL OR ${t.partyId} IS NOT NULL`),
    check("promises_deadline_after_made", sql`${t.deadline} IS NULL OR ${t.madeOn} IS NULL OR ${t.deadline} >= ${t.madeOn}`),
    index("promises_constituency_idx").on(t.constituencyId),
    index("promises_term_idx").on(t.termId),
  ],
);

/**
 * APPEND-ONLY audit trail. We never UPDATE a status in place; we add a row.
 * The promise's current `status` is a convenience copy of the newest row.
 */
export const promiseStatusHistory = pgTable(
  "promise_status_history",
  {
    id: serial("id").primaryKey(),
    promiseId: integer("promise_id")
      .notNull()
      .references(() => promises.id, { onDelete: "cascade" }),
    status: promiseStatusEnum("status").notNull(),
    note: text("note"),
    sourceId: integer("source_id")
      .notNull()
      .references(() => sources.id),
    changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("promise_status_history_promise_idx").on(t.promiseId)],
);

export const evidence = pgTable(
  "evidence",
  {
    id: serial("id").primaryKey(),
    promiseId: integer("promise_id")
      .notNull()
      .references(() => promises.id, { onDelete: "cascade" }),
    sourceId: integer("source_id")
      .notNull()
      .references(() => sources.id),
    summary: text("summary").notNull(),
    stance: evidenceStanceEnum("stance").notNull(),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("evidence_promise_idx").on(t.promiseId)],
);

// ---------------------------------------------------------------------------
// PHASE 3: PARLIAMENTARY ACTIVITY (for report cards)
// ---------------------------------------------------------------------------
/**
 * One row per question an MP asked in the Lok Sabha (from sansad.in). A joint
 * question appears once for each MP who asked it. Ministers and the Speaker
 * don't ask questions, so "zero" doesn't automatically mean "inactive".
 */
export const parliamentQuestions = pgTable(
  "parliament_questions",
  {
    id: serial("id").primaryKey(),
    representativeId: integer("representative_id")
      .notNull()
      .references(() => representatives.id, { onDelete: "cascade" }),
    legislature: smallint("legislature").notNull(),
    questionNo: integer("question_no").notNull(),
    askedOn: date("asked_on").notNull(),
    ministry: text("ministry").notNull(),
    type: text("type").notNull(), // STARRED (oral answer) | UNSTARRED (written answer)
    subject: text("subject").notNull(),
  },
  (t) => [
    uniqueIndex("parliament_questions_uq").on(t.representativeId, t.legislature, t.askedOn, t.questionNo, t.type),
    index("parliament_questions_rep_idx").on(t.representativeId, t.legislature),
  ],
);

// ---------------------------------------------------------------------------
// PHASE 2: CITIZENS: accounts, issues, votes, moderation
// ---------------------------------------------------------------------------
export const userRoleEnum = pgEnum("user_role", ["CITIZEN", "VERIFIER", "MODERATOR", "ADMIN"]);
export const issueStatusEnum = pgEnum("issue_status", ["OPEN", "ACKNOWLEDGED", "RESOLVED", "HIDDEN"]);
export const submissionStatusEnum = pgEnum("submission_status", ["PENDING", "APPROVED", "REJECTED"]);

/**
 * Accounts. We store only what we need: a display name and an email to log in.
 * Passwords are stored as Argon2id hashes, never in plain text, never reversibly encrypted.
 */
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(), // stored lower-cased by the service
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: userRoleEnum("role").notNull().default("CITIZEN"),
    isBlocked: boolean("is_blocked").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_uq").on(t.email)],
);

/**
 * Login sessions. The client holds a random token; we store only its SHA-256
 * hash. If the database leaked, the hashes couldn't be used to log in.
 * Logging out (or an admin blocking a user) = deleting rows here.
 */
export const sessions = pgTable(
  "sessions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [uniqueIndex("sessions_token_hash_uq").on(t.tokenHash), index("sessions_user_idx").on(t.userId)],
);

/** A local problem reported by a citizen (pothole, broken street light, water supply…). */
export const issues = pgTable(
  "issues",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** The Lok Sabha seat, derived from the PIN code, so issues roll up to an MP. */
    constituencyId: integer("constituency_id")
      .notNull()
      .references(() => constituencies.id),
    pincode: varchar("pincode", { length: 6 }).notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    category: promiseCategoryEnum("category").notNull(),
    status: issueStatusEnum("status").notNull().default("OPEN"),
    /** File name of the re-encoded photo in the uploads folder (never the user's original file). */
    photoKey: text("photo_key"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (t) => [index("issues_constituency_idx").on(t.constituencyId, t.status), index("issues_user_idx").on(t.userId)],
);

/**
 * One upvote per user, per issue, PER WEEK. The composite primary key makes the
 * DATABASE reject a second vote in the same week: no race condition can beat it.
 * week_start = the Monday of the week, in India time.
 */
export const issueVotes = pgTable(
  "issue_votes",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    issueId: integer("issue_id")
      .notNull()
      .references(() => issues.id, { onDelete: "cascade" }),
    weekStart: date("week_start").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.issueId, t.weekStart] }), index("issue_votes_issue_week_idx").on(t.issueId, t.weekStart)],
);

/** "This post is spam / abusive / false". One report per user per issue. */
export const issueReports = pgTable(
  "issue_reports",
  {
    id: serial("id").primaryKey(),
    issueId: integer("issue_id")
      .notNull()
      .references(() => issues.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("issue_reports_issue_user_uq").on(t.issueId, t.userId)],
);

/**
 * Written by the weekly background job: the top issues of each constituency
 * for a finished week. A frozen snapshot: later votes don't change history.
 */
export const weeklyIssueRankings = pgTable(
  "weekly_issue_rankings",
  {
    weekStart: date("week_start").notNull(),
    constituencyId: integer("constituency_id")
      .notNull()
      .references(() => constituencies.id, { onDelete: "cascade" }),
    rank: smallint("rank").notNull(),
    issueId: integer("issue_id")
      .notNull()
      .references(() => issues.id, { onDelete: "cascade" }),
    votes: integer("votes").notNull(),
    computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.weekStart, t.constituencyId, t.rank] })],
);

/** A promise submitted by a citizen, waiting for a verifier to check its source. */
export const promiseSubmissions = pgTable(
  "promise_submissions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** The exact CreatePromiseInput, validated with the shared schema before storing. */
    payload: jsonb("payload").notNull(),
    status: submissionStatusEnum("status").notNull().default("PENDING"),
    reviewerId: integer("reviewer_id").references(() => users.id),
    reviewNote: text("review_note"),
    promiseId: integer("promise_id").references(() => promises.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  },
  (t) => [index("promise_submissions_status_idx").on(t.status)],
);

/**
 * AUDIT LOG: who did what, when. Every moderator/verifier/admin action is
 * recorded here and never edited. Accountability applies to us too.
 */
export const auditLog = pgTable(
  "audit_log",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    actorId: integer("actor_id").references(() => users.id), // null = the system (e.g. auto-hide)
    action: text("action").notNull(), // e.g. "issue.hide", "submission.approve"
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    details: jsonb("details"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_log_entity_idx").on(t.entityType, t.entityId), index("audit_log_created_idx").on(t.createdAt)],
);

// ---------------------------------------------------------------------------
// CACHE (Phase 0): India Post lookups
// ---------------------------------------------------------------------------
/** One row per PIN code we have looked up. Acts as a cache in front of India Post. */
export const pincodes = pgTable("pincodes", {
  pincode: varchar("pincode", { length: 6 }).primaryKey(),
  district: text("district").notNull(),
  state: text("state").notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
});

export const postOffices = pgTable(
  "post_offices",
  {
    id: serial("id").primaryKey(),
    pincode: varchar("pincode", { length: 6 })
      .notNull()
      .references(() => pincodes.pincode, { onDelete: "cascade" }),
    name: text("name").notNull(),
    branchType: text("branch_type").notNull(),
    deliveryStatus: text("delivery_status").notNull(),
    block: text("block"),
    district: text("district").notNull(),
    state: text("state").notNull(),
  },
  (t) => [index("post_offices_pincode_idx").on(t.pincode), index("post_offices_district_idx").on(t.district)],
);

// ---------------------------------------------------------------------------
// RELATIONS: not database objects; they tell Drizzle's query builder how to
// load related rows with `with: { ... }`.
// ---------------------------------------------------------------------------
export const pincodesRelations = relations(pincodes, ({ many }) => ({ postOffices: many(postOffices) }));
export const postOfficesRelations = relations(postOffices, ({ one }) => ({
  pincode: one(pincodes, { fields: [postOffices.pincode], references: [pincodes.pincode] }),
}));
export const statesRelations = relations(states, ({ many }) => ({ constituencies: many(constituencies) }));
export const constituenciesRelations = relations(constituencies, ({ one, many }) => ({
  state: one(states, { fields: [constituencies.stateId], references: [states.id] }),
  parent: one(constituencies, { fields: [constituencies.parentId], references: [constituencies.id], relationName: "segments" }),
  segments: many(constituencies, { relationName: "segments" }),
  boundarySource: one(sources, { fields: [constituencies.boundarySourceId], references: [sources.id] }),
  terms: many(terms),
  promises: many(promises),
}));
export const representativesRelations = relations(representatives, ({ many }) => ({ terms: many(terms) }));
export const termsRelations = relations(terms, ({ one, many }) => ({
  representative: one(representatives, { fields: [terms.representativeId], references: [representatives.id] }),
  constituency: one(constituencies, { fields: [terms.constituencyId], references: [constituencies.id] }),
  party: one(parties, { fields: [terms.partyId], references: [parties.id] }),
  source: one(sources, { fields: [terms.sourceId], references: [sources.id] }),
  promises: many(promises),
}));
export const promisesRelations = relations(promises, ({ one, many }) => ({
  term: one(terms, { fields: [promises.termId], references: [terms.id] }),
  party: one(parties, { fields: [promises.partyId], references: [parties.id] }),
  constituency: one(constituencies, { fields: [promises.constituencyId], references: [constituencies.id] }),
  source: one(sources, { fields: [promises.sourceId], references: [sources.id] }),
  history: many(promiseStatusHistory),
  evidence: many(evidence),
}));
export const promiseStatusHistoryRelations = relations(promiseStatusHistory, ({ one }) => ({
  promise: one(promises, { fields: [promiseStatusHistory.promiseId], references: [promises.id] }),
  source: one(sources, { fields: [promiseStatusHistory.sourceId], references: [sources.id] }),
}));
export const evidenceRelations = relations(evidence, ({ one }) => ({
  promise: one(promises, { fields: [evidence.promiseId], references: [promises.id] }),
  source: one(sources, { fields: [evidence.sourceId], references: [sources.id] }),
}));
