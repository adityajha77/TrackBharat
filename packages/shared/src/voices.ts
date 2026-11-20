import { z } from "zod";
import { PromiseCategory } from "./civic";

/**
 * Contract for Phase 3b: Causes of the Week, news, parties (manifestos and
 * timeline), Know Your Neta, and email links.
 */

// ---- Votes: +1 "affects me / faced this too", -1 "not my issue / not accurate" ----
export const VoteValue = z.union([z.literal(1), z.literal(-1)]);
export type VoteValue = z.infer<typeof VoteValue>;
export const VoteInput = z.object({ value: VoteValue.default(1) });
export type VoteInput = z.infer<typeof VoteInput>;
/** What I voted: 0 = nothing (yet). */
export const MyVote = z.union([z.literal(1), z.literal(-1), z.literal(0)]);
export type MyVote = z.infer<typeof MyVote>;

export const VoteTally = z.object({ up: z.number().int(), down: z.number().int(), myVote: MyVote, counted: z.boolean() });
export type VoteTally = z.infer<typeof VoteTally>;

// ---- Causes of the Week ---------------------------------------------------
export const Cause = z.object({
  id: z.number().int(),
  category: PromiseCategory,
  /** Moderator wording; null = show the translated category name. */
  title: z.string().nullable(),
  blurb: z.string().nullable(),
  issueCount: z.number().int(),
  stateCount: z.number().int(),
  examples: z.array(z.object({ id: z.number().int(), title: z.string() })),
  pinned: z.boolean(),
  up: z.number().int(),
  down: z.number().int(),
  myVote: MyVote,
});
export type Cause = z.infer<typeof Cause>;

export const CausesResponse = z.object({ weekStart: z.iso.date(), causes: z.array(Cause) });
export type CausesResponse = z.infer<typeof CausesResponse>;

export const UpdateCauseInput = z.object({
  title: z.string().trim().min(5).max(120).nullable().optional(),
  blurb: z.string().trim().min(10).max(400).nullable().optional(),
  pinned: z.boolean().optional(),
});
export type UpdateCauseInput = z.infer<typeof UpdateCauseInput>;

// ---- News that needs a voice -----------------------------------------------
export const NewsStatus = z.enum(["DRAFT", "PUBLISHED", "REJECTED"]);
export type NewsStatus = z.infer<typeof NewsStatus>;

const httpsUrl = z.url({ protocol: /^https?$/, message: "Enter a full link starting with https://" }).max(1000);

export const NewsItem = z.object({
  id: z.number().int(),
  headline: z.string(),
  url: z.string(),
  sourceName: z.string(),
  sourcePublishedAt: z.iso.datetime().nullable(),
  summary: z.string().nullable(),
  category: PromiseCategory.nullable(),
  state: z.string().nullable(),
  district: z.string().nullable(),
  responsible: z.string().nullable(),
  status: NewsStatus,
  publishedAt: z.iso.datetime().nullable(),
});
export type NewsItem = z.infer<typeof NewsItem>;

export const NewsList = z.object({ items: z.array(NewsItem), states: z.array(z.string()) });
export type NewsList = z.infer<typeof NewsList>;

export const SubmitNewsInput = z.object({
  url: httpsUrl,
  headline: z.string().trim().min(10, "Add the headline (at least 10 characters)").max(200),
  note: z.string().trim().max(500).optional(),
});
export type SubmitNewsInput = z.infer<typeof SubmitNewsInput>;

export const ReviewNewsInput = z.discriminatedUnion("decision", [
  z.object({
    decision: z.literal("PUBLISH"),
    /** OUR OWN words, 2–5 lines. Never paste the article. */
    summary: z.string().trim().min(60, "Write at least 2 lines (60 characters)").max(600, "Keep it to 5 lines (600 characters)"),
    state: z.string().trim().min(2).max(80),
    district: z.string().trim().max(80).optional(),
    responsible: z.string().trim().max(160).optional(),
    category: PromiseCategory,
  }),
  z.object({ decision: z.literal("REJECT") }),
]);
export type ReviewNewsInput = z.infer<typeof ReviewNewsInput>;

// ---- Parties: manifestos and timeline ---------------------------------------
export const ManifestoStatus = z.enum(["FULFILLED", "PARTIAL", "IN_PROGRESS", "BROKEN", "NOT_RATED", "NOT_IN_POWER"]);
export type ManifestoStatus = z.infer<typeof ManifestoStatus>;

export const PartySummary = z.object({
  slug: z.string(),
  name: z.string(),
  shortName: z.string().nullable(),
  founded: z.iso.date(),
  symbol: z.string(),
  color: z.string(),
  seatsLokSabha: z.number().int(),
  promises: z.number().int(),
  /** Count per manifesto status across all this party's manifestos. */
  byStatus: z.record(z.string(), z.number().int()),
});
export type PartySummary = z.infer<typeof PartySummary>;

export const ManifestoPromiseView = z.object({
  id: z.number().int(),
  category: PromiseCategory,
  text: z.string(),
  page: z.number().int().nullable(),
  status: ManifestoStatus,
  statusNote: z.string().nullable(),
  evidenceUrl: z.string().nullable(),
});

export const Manifesto = z.object({
  id: z.number().int(),
  electionYear: z.number().int(),
  /** null = Lok Sabha (national); otherwise the state whose assembly election it was. */
  state: z.string().nullable(),
  title: z.string(),
  sourceUrl: z.string(),
  formedGovernment: z.boolean(),
  promises: z.array(ManifestoPromiseView),
});
export type Manifesto = z.infer<typeof Manifesto>;

export const PartyLeader = z.object({
  name: z.string(),
  role: z.string(),
  years: z.string(),
  quote: z.string().nullable(),
  quoteSourceUrl: z.string().nullable(),
  photoPath: z.string().nullable(),
  photoCredit: z.string().nullable(),
  photoSourceUrl: z.string().nullable(),
});
export type PartyLeader = z.infer<typeof PartyLeader>;

export const TimelineEvent = z.object({
  date: z.iso.date(),
  precision: z.enum(["DAY", "MONTH", "YEAR"]),
  title: z.string(),
  body: z.string(),
  sourceUrl: z.string(),
  /** null = a national milestone. */
  party: z.string().nullable(),
});
export type TimelineEvent = z.infer<typeof TimelineEvent>;

export const PartyDetail = PartySummary.extend({
  founders: z.string(),
  ideologyQuote: z.string(),
  ideologySourceUrl: z.string(),
  leaders: z.array(PartyLeader),
  manifestos: z.array(Manifesto),
  events: z.array(TimelineEvent),
});
export type PartyDetail = z.infer<typeof PartyDetail>;

export const PartiesResponse = z.object({ parties: z.array(PartySummary) });
export const Timeline = z.object({
  parties: z.array(PartyDetail.omit({ manifestos: true })),
  national: z.array(TimelineEvent),
});
export type Timeline = z.infer<typeof Timeline>;

// ---- Know Your Neta ----------------------------------------------------------
export const NetaHouse = z.enum(["LOK_SABHA", "VIDHAN_SABHA"]);
export const Neta = z.object({
  name: z.string(),
  party: z.string().nullable(),
  partyShort: z.string().nullable(),
  imageUrl: z.string().nullable(),
  seat: z.object({ slug: z.string(), name: z.string(), number: z.number().int(), state: z.string(), reservation: z.enum(["GEN", "SC", "ST"]) }),
});
export type Neta = z.infer<typeof Neta>;
export const NetaResponse = z.object({
  house: NetaHouse,
  netas: z.array(Neta),
  /** Seats per party in this house (for the chips). */
  parties: z.array(z.object({ party: z.string(), short: z.string().nullable(), seats: z.number().int() })),
  states: z.array(z.object({ state: z.string(), seats: z.number().int(), filled: z.number().int() })),
});
export type NetaResponse = z.infer<typeof NetaResponse>;

// ---- Email links -------------------------------------------------------------
export const ForgotPasswordInput = z.object({ email: z.email("Enter a valid email address").trim().toLowerCase() });
export const TokenInput = z.object({ token: z.string().min(20).max(200) });
export const ResetPasswordInput = TokenInput.extend({ newPassword: z.string().min(10, "Use at least 10 characters").max(200) });
export type ResetPasswordInput = z.infer<typeof ResetPasswordInput>;
