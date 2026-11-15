/**
 * "Weeks" in TrackBharat run Monday 00:00 → Sunday 23:59 in INDIA time (IST,
 * UTC+05:30), wherever the server is (cloud servers usually run in UTC).
 * Returns the Monday as "YYYY-MM-DD".
 */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export function weekStartIST(at: Date = new Date()): string {
  const ist = new Date(at.getTime() + IST_OFFSET_MS); // shift so UTC getters read IST wall-clock time
  const daysSinceMonday = (ist.getUTCDay() + 6) % 7; // Sunday=0 → 6, Monday=1 → 0
  ist.setUTCDate(ist.getUTCDate() - daysSinceMonday);
  return ist.toISOString().slice(0, 10);
}

/** The Monday of the week before `weekStart`. */
export function previousWeek(weekStart: string): string {
  const d = new Date(`${weekStart}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 7);
  return d.toISOString().slice(0, 10);
}

/** The instant (a real Date) at which an India-time calendar day or week began. */
export function dayStartIST(at: Date = new Date()): Date {
  const ist = new Date(at.getTime() + IST_OFFSET_MS);
  const ymd = ist.toISOString().slice(0, 10);
  return new Date(`${ymd}T00:00:00+05:30`);
}

export function periodStartIST(period: "day" | "week", at: Date = new Date()): Date {
  return period === "day" ? dayStartIST(at) : new Date(`${weekStartIST(at)}T00:00:00+05:30`);
}
