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
