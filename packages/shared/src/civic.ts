import { z } from "zod";

/**
 * Contract for Phase 1: constituencies, representatives and promises.
 * Enum values mirror the Postgres enums in apps/api/src/db/schema.ts.
 */

export const House = z.enum(["LOK_SABHA", "VIDHAN_SABHA"]);
export type House = z.infer<typeof House>;

export const Reservation = z.enum(["GEN", "SC", "ST"]);

export const PromiseStatus = z.enum(["PENDING", "IN_PROGRESS", "PARTIAL", "FULFILLED", "STALLED", "BROKEN"]);
export type PromiseStatus = z.infer<typeof PromiseStatus>;

export const PromiseCategory = z.enum([
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
export type PromiseCategory = z.infer<typeof PromiseCategory>;

export const SourceKind = z.enum(["OFFICIAL", "MANIFESTO", "NEWS", "DATASET", "OTHER"]);
export const EvidenceStance = z.enum(["SHOWS_PROGRESS", "SHOWS_NO_PROGRESS", "CONTEXT"]);

/** Every factual claim carries one of these. */
export const Source = z.object({
  url: z.url(),
  title: z.string(),
  publisher: z.string(),
  kind: SourceKind,
  license: z.string().nullable(),
});
export type Source = z.infer<typeof Source>;

export const Party = z.object({ name: z.string(), shortName: z.string().nullable() });

export const ConstituencySummary = z.object({
  slug: z.string(),
  name: z.string(),
  nameHi: z.string().nullable(),
  house: House,
  state: z.string(),
  number: z.number().int(),
  reservation: Reservation,
  boundaryOutdated: z.boolean(),
  isDemo: z.boolean(),
});
export type ConstituencySummary = z.infer<typeof ConstituencySummary>;

/** A constituency that a PIN code falls into, with the share of its post offices inside. */
export const PincodeConstituency = ConstituencySummary.extend({
  share: z.number().min(0).max(1),
  representative: z.object({ name: z.string(), party: z.string().nullable(), imageUrl: z.string().nullable() }).nullable(),
});
export type PincodeConstituency = z.infer<typeof PincodeConstituency>;

export const PincodeConstituenciesResponse = z.object({
  pincode: z.string(),
  constituencies: z.array(PincodeConstituency),
});
export type PincodeConstituenciesResponse = z.infer<typeof PincodeConstituenciesResponse>;

export const Representative = z.object({
  name: z.string(),
  gender: z.string().nullable(),
  education: z.string().nullable(),
  profession: z.string().nullable(),
  imageUrl: z.string().nullable(),
  party: Party.nullable(),
  legislature: z.number().int(),
  status: z.enum(["SITTING", "COMPLETED", "RESIGNED", "DIED", "DISQUALIFIED"]),
  termsServed: z.number().int().nullable(),
  source: Source,
  isDemo: z.boolean(),
});
export type Representative = z.infer<typeof Representative>;

export const PromiseStatusCounts = z.record(PromiseStatus, z.number().int());

export const PromiseSummary = z.object({
  id: z.number().int(),
  title: z.string(),
  category: PromiseCategory,
  status: PromiseStatus,
  madeOn: z.string().nullable(), // YYYY-MM-DD
  deadline: z.string().nullable(),
  madeBy: z.string(), // representative or party name
  isDemo: z.boolean(),
});
export type PromiseSummary = z.infer<typeof PromiseSummary>;

const SeatLink = z.object({ slug: z.string(), name: z.string(), number: z.number().int() });

export const ConstituencyDetail = ConstituencySummary.extend({
  /** For a Vidhan Sabha seat: the Lok Sabha seat it lies in. */
  parent: SeatLink.nullable(),
  /** For a Lok Sabha seat: its assembly segments (Vidhan Sabha seats). */
  segments: z.array(SeatLink),
  /** Outline of the constituency as an SVG path (from PostGIS ST_AsSVG). */
  outline: z.object({ path: z.string(), viewBox: z.string() }).nullable(),
  boundarySource: Source.nullable(),
  /** Current (sitting) representative(s); empty when the seat is vacant. */
  representatives: z.array(Representative),
  /** Earlier members of this legislature for this seat (died, resigned…). */
  formerRepresentatives: z.array(Representative),
  promiseCounts: PromiseStatusCounts,
  promises: z.array(PromiseSummary),
});
export type ConstituencyDetail = z.infer<typeof ConstituencyDetail>;

export const StateWithConstituencies = z.object({
  state: z.string(),
  constituencies: z.array(ConstituencySummary.pick({ slug: true, name: true, number: true, reservation: true })),
});
export const ConstituencyIndexResponse = z.object({ states: z.array(StateWithConstituencies), total: z.number().int() });
export type ConstituencyIndexResponse = z.infer<typeof ConstituencyIndexResponse>;

export const PromiseDetail = PromiseSummary.extend({
  description: z.string().nullable(),
  source: Source,
  constituency: ConstituencySummary.pick({ slug: true, name: true, state: true }).nullable(),
  history: z.array(z.object({ status: PromiseStatus, note: z.string().nullable(), changedAt: z.iso.datetime(), source: Source })),
  evidence: z.array(z.object({ summary: z.string(), stance: EvidenceStance, addedAt: z.iso.datetime(), source: Source })),
});
export type PromiseDetail = z.infer<typeof PromiseDetail>;

// ---------------------------------------------------------------------------
// Admin input (writes). Every write must cite a source.
// ---------------------------------------------------------------------------
const httpsUrl = z.url({ protocol: /^https$/, error: "Source must be an https:// link" });

export const SourceInput = z.object({
  url: httpsUrl,
  title: z.string().trim().min(3).max(300),
  publisher: z.string().trim().min(2).max(200),
  kind: SourceKind,
});
export type SourceInput = z.infer<typeof SourceInput>;

const isoDate = z.iso.date();

export const CreatePromiseInput = z
  .object({
    constituencySlug: z.string().min(1),
    /** Who made it: the sitting representative of that seat, or a party (manifesto). */
    madeBy: z.discriminatedUnion("type", [
      z.object({ type: z.literal("REPRESENTATIVE") }),
      z.object({ type: z.literal("PARTY"), partyName: z.string().min(2) }),
    ]),
    title: z.string().trim().min(10).max(200),
    description: z.string().trim().max(2000).optional(),
    category: PromiseCategory,
    madeOn: isoDate.optional(),
    deadline: isoDate.optional(),
    source: SourceInput,
  })
  .refine((p) => !p.madeOn || !p.deadline || p.deadline >= p.madeOn, {
    message: "Deadline cannot be before the date the promise was made",
    path: ["deadline"],
  });
export type CreatePromiseInput = z.infer<typeof CreatePromiseInput>;

export const UpdatePromiseStatusInput = z.object({
  status: PromiseStatus,
  note: z.string().trim().min(10).max(1000),
  source: SourceInput,
});
export type UpdatePromiseStatusInput = z.infer<typeof UpdatePromiseStatusInput>;

export const AddEvidenceInput = z.object({
  summary: z.string().trim().min(10).max(1000),
  stance: EvidenceStance,
  source: SourceInput,
});
export type AddEvidenceInput = z.infer<typeof AddEvidenceInput>;

export const CreatedResponse = z.object({ id: z.number().int() });
