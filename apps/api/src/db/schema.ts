import { relations, sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  customType,
  date,
  index,
  integer,
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
