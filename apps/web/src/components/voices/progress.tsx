import type { ManifestoStatus } from "@trackbharat/shared";
import type { Dictionary } from "@/i18n/server";

/** Colours per manifesto status. "Didn't form government" is neutral grey, never red. */
export const MANIFESTO_TONE: Record<ManifestoStatus, string> = {
  FULFILLED: "bg-flag-green",
  PARTIAL: "bg-flag-saffron",
  IN_PROGRESS: "bg-primary",
  BROKEN: "bg-danger",
  NOT_RATED: "bg-surface-muted",
  NOT_IN_POWER: "bg-muted/40",
};
export const MANIFESTO_ORDER: ManifestoStatus[] = ["FULFILLED", "PARTIAL", "IN_PROGRESS", "BROKEN", "NOT_RATED", "NOT_IN_POWER"];

/**
 * Share of promises fulfilled, out of those the party was IN POWER to deliver.
 * Promises made from opposition ("didn't form government") are left out of the
 * denominator, so a party is never scored 0% for elections it lost.
 * null = nothing it could be judged on yet.
 */
export function fulfilledShare(byStatus: Record<string, number>, total: number): number | null {
  const accountable = total - (byStatus.NOT_IN_POWER ?? 0);
  return accountable > 0 ? (byStatus.FULFILLED ?? 0) / accountable : null;
}

/** Animated ring: share of promises fulfilled (CSS @property animation, see globals.css). */
export function Ring({ value, label, size = 88 }: { value: number; label: string; size?: number }) {
  const pct = Math.round(value * 100);
  return (
    <figure className="flex flex-col items-center gap-1" style={{ width: size }}>
      <svg viewBox="0 0 36 36" width={size} height={size} role="img" aria-label={`${pct}% ${label}`}>
        <circle cx="18" cy="18" r="15.9155" fill="none" stroke="var(--surface-muted)" strokeWidth="4" />
        <circle
          className="ring-arc"
          cx="18"
          cy="18"
          r="15.9155"
          fill="none"
          stroke="var(--flag-green)"
          strokeWidth="4"
          pathLength={100}
          transform="rotate(-90 18 18)"
          style={{ ["--p" as string]: pct }}
        />
        <text x="18" y="20.5" textAnchor="middle" className="fill-foreground font-mono text-[8px] font-bold">
          {pct}%
        </text>
      </svg>
      <figcaption className="text-center font-mono text-[10px] uppercase tracking-wide text-muted">{label}</figcaption>
    </figure>
  );
}

/** Stacked bar of statuses with a legend. */
export function StatusBar({ byStatus, t }: { byStatus: Record<string, number>; t: Dictionary }) {
  const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
  if (!total) return null;
  return (
    <div className="space-y-2">
      <div className="bar-grow flex h-4 overflow-hidden rounded-sm border-2 border-ink">
        {MANIFESTO_ORDER.filter((s) => byStatus[s]).map((s) => (
          <span key={s} className={MANIFESTO_TONE[s]} style={{ width: `${(byStatus[s]! / total) * 100}%` }} title={`${t.status[s]}: ${byStatus[s]}`} />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
        {MANIFESTO_ORDER.filter((s) => byStatus[s]).map((s) => (
          <li key={s} className="inline-flex items-center gap-1.5">
            <span className={`inline-block size-2.5 rounded-sm border border-ink ${MANIFESTO_TONE[s]}`} />
            {t.status[s]} <span className="font-mono text-muted">{byStatus[s]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * DONE vs NOT DONE YET, the headline transparency number. Counts only promises
 * made by a party that then led the government (central or state): of those,
 * how many are fulfilled, and how many are still not (with a breakdown, so
 * "not done" never hides whether it is partly done, under way, broken or
 * simply not checked yet).
 */
export function Scorecard({ byStatus, total, t, compact = false }: { byStatus: Record<string, number>; total: number; t: Dictionary; compact?: boolean }) {
  const accountable = total - (byStatus.NOT_IN_POWER ?? 0);
  if (accountable <= 0) return null;
  const done = byStatus.FULFILLED ?? 0;
  const notDone = accountable - done;
  // Round once, so the two sides always add up to exactly 100%.
  const donePct = Math.round((done / accountable) * 100);
  const pct = (n: number) => (n === done ? donePct : 100 - donePct);
  const parts = (["PARTIAL", "IN_PROGRESS", "BROKEN", "NOT_RATED"] as const).filter((s) => byStatus[s]);
  return (
    <div className="space-y-3">
      <p className="font-mono text-xs uppercase tracking-wide text-muted">{t.parties.scoreOf.replace("{n}", String(accountable))}</p>
      <div className="bar-grow flex h-7 overflow-hidden rounded-sm border-2 border-ink font-mono text-xs font-bold">
        {done > 0 && (
          <span className="flex items-center justify-center bg-flag-green text-white" style={{ width: `${pct(done)}%` }}>
            {pct(done)}%
          </span>
        )}
        {notDone > 0 && (
          <span className="flex items-center justify-center bg-[repeating-linear-gradient(135deg,var(--danger)_0_6px,color-mix(in_oklab,var(--danger)_75%,black)_6px_12px)] text-white" style={{ width: `${pct(notDone)}%` }}>
            {pct(notDone)}%
          </span>
        )}
      </div>
      <div className={compact ? "flex flex-wrap gap-x-4 gap-y-1 text-sm" : "grid gap-3 sm:grid-cols-2"}>
        <p className={compact ? "" : "brutal-sm rounded-md bg-surface p-3"}>
          <span className="font-black text-flag-green">✓ {done}</span> {t.parties.done} <span className="font-mono text-muted">({pct(done)}%)</span>
        </p>
        <p className={compact ? "" : "brutal-sm rounded-md bg-surface p-3"}>
          <span className="font-black text-danger">✗ {notDone}</span> {t.parties.notDoneYet} <span className="font-mono text-muted">({pct(notDone)}%)</span>
          {!compact && parts.length > 0 && (
            <span className="mt-1 block text-xs text-muted">{parts.map((s) => `${t.status[s]} ${byStatus[s]}`).join(" · ")}</span>
          )}
        </p>
      </div>
    </div>
  );
}
