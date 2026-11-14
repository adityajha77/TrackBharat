import { relations } from "drizzle-orm";
import { index, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

/**
 * Database schema, the single source of truth for table structure.
 *
 * Workflow: edit this file → `pnpm db:generate` (writes a SQL migration into
 * apps/api/drizzle/) → review the SQL → `pnpm db:migrate` → commit both.
 *
 * Phase 0 only has the PIN code cache. Phase 1 adds constituencies,
 * representatives, promises and evidence (see docs/ARCHITECTURE.md §5).
 */

/** One row per PIN code we have looked up. Acts as a cache in front of India Post. */
export const pincodes = pgTable("pincodes", {
  pincode: varchar("pincode", { length: 6 }).primaryKey(),
  district: text("district").notNull(),
  state: text("state").notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * A PIN code covers many post offices (one-to-many). Keeping them in their own
 * table instead of a JSON blob is normalisation: we can query
 * "all post offices in district X" with a plain indexed WHERE clause.
 */
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

// Relations are NOT database objects (the foreign key above is). They only tell
// Drizzle's query builder how to load related rows: `with: { postOffices: true }`.
export const pincodesRelations = relations(pincodes, ({ many }) => ({
  postOffices: many(postOffices),
}));
export const postOfficesRelations = relations(postOffices, ({ one }) => ({
  pincode: one(pincodes, { fields: [postOffices.pincode], references: [pincodes.pincode] }),
}));

export type PincodeRow = typeof pincodes.$inferSelect;
export type PostOfficeRow = typeof postOffices.$inferSelect;
