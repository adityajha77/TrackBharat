import type { PromiseCategory, PromiseStatus } from "@trackbharat/shared";

/**
 * Human-readable labels and colours for enum values. The API speaks in codes
 * ("IN_PROGRESS"); only the UI decides how they look. Hindi labels sit alongside
 * so a future language switch (Phase 4) is a lookup, not a rewrite.
 */
export const STATUS: Record<PromiseStatus, { label: string; hi: string; dot: string; badge: string; bar: string }> = {
  FULFILLED: { label: "Fulfilled", hi: "पूरा हुआ", dot: "bg-green", badge: "bg-green/12 text-green", bar: "bg-green" },
  PARTIAL: { label: "Partly done", hi: "आंशिक", dot: "bg-flag-saffron", badge: "bg-saffron/12 text-saffron", bar: "bg-flag-saffron" },
  IN_PROGRESS: { label: "In progress", hi: "प्रगति पर", dot: "bg-primary", badge: "bg-primary/12 text-primary", bar: "bg-primary" },
  PENDING: { label: "Pending", hi: "लंबित", dot: "bg-muted", badge: "bg-surface-muted text-muted", bar: "bg-muted/50" },
  STALLED: { label: "Stalled", hi: "रुका हुआ", dot: "bg-amber-500", badge: "bg-amber-500/12 text-amber-600 dark:text-amber-400", bar: "bg-amber-500" },
  BROKEN: { label: "Broken", hi: "टूटा", dot: "bg-danger", badge: "bg-danger/12 text-danger", bar: "bg-danger" },
};

/** Display order: delivered first, failed last. */
export const STATUS_ORDER: PromiseStatus[] = ["FULFILLED", "PARTIAL", "IN_PROGRESS", "PENDING", "STALLED", "BROKEN"];

export const CATEGORY: Record<PromiseCategory, string> = {
  ROADS_INFRASTRUCTURE: "Roads & infrastructure",
  HEALTH: "Health",
  EDUCATION: "Education",
  EMPLOYMENT: "Jobs",
  WATER: "Water",
  ELECTRICITY: "Electricity",
  AGRICULTURE: "Agriculture",
  HOUSING: "Housing",
  SAFETY: "Safety",
  ENVIRONMENT: "Environment",
  LOCAL_DEVELOPMENT: "Local development",
  OTHER: "Other",
};

export const RESERVATION: Record<"GEN" | "SC" | "ST", string | null> = {
  GEN: null,
  SC: "Reserved: Scheduled Castes",
  ST: "Reserved: Scheduled Tribes",
};

export const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : null;
