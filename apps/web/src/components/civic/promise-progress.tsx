import type { PromiseStatus } from "@trackbharat/shared";
import { STATUS, STATUS_ORDER } from "@/lib/labels";

/**
 * Stacked bar of promise statuses + legend. No chart library needed: it's
 * just flex children whose widths are percentages.
 */
export function PromiseProgress({ counts }: { counts: Record<PromiseStatus, number> }) {
  const total = STATUS_ORDER.reduce((n, s) => n + counts[s], 0);
  if (total === 0) return null;
  const done = counts.FULFILLED + counts.PARTIAL * 0.5;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-sm text-muted">
          <span className="font-mono text-2xl font-semibold text-foreground">{total}</span> promises tracked
        </p>
        <p className="text-sm text-muted">
          <span className="font-mono font-semibold text-foreground">{Math.round((done / total) * 100)}%</span> delivered*
        </p>
      </div>
      <div
        className="mt-3 flex h-3 overflow-hidden rounded-full bg-surface-muted"
        role="img"
        aria-label={STATUS_ORDER.filter((s) => counts[s]).map((s) => `${counts[s]} ${STATUS[s].label}`).join(", ")}
      >
        {STATUS_ORDER.map((s) =>
          counts[s] ? <span key={s} className={STATUS[s].bar} style={{ width: `${(counts[s] / total) * 100}%` }} /> : null,
        )}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted">
        {STATUS_ORDER.filter((s) => counts[s]).map((s) => (
          <li key={s} className="flex items-center gap-1.5">
            <span aria-hidden className={`size-2 rounded-full ${STATUS[s].dot}`} />
            {STATUS[s].label} <span className="font-mono text-foreground">{counts[s]}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted">* Fulfilled promises count fully, partly-done promises count as half.</p>
    </div>
  );
}
