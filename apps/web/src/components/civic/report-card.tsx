import Link from "next/link";
import { BookOpenCheck, Info, Scale, TrendingUp } from "lucide-react";
import type { QuestionStats, ReportCard as ReportCardData } from "@trackbharat/shared";
import { Badge, Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Colour for a 0–100 score. Never red/green alone: the number is always printed too. */
const tone = (n: number) => (n >= 67 ? "text-green" : n >= 34 ? "text-saffron" : "text-danger");
const bar = (n: number) => (n >= 67 ? "bg-green" : n >= 34 ? "bg-flag-saffron" : "bg-danger");

/** SVG ring: a circle whose stroke is shortened with stroke-dasharray to show the percentage. */
function ScoreRing({ value }: { value: number | null }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative size-36 shrink-0" role="img" aria-label={value === null ? "Overall score not available" : `Overall score ${value} out of 100`}>
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--surface-muted)" strokeWidth="10" />
        {value !== null && (
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${(value / 100) * c} ${c}`}
            className={cn(value >= 67 ? "stroke-green" : value >= 34 ? "stroke-flag-saffron" : "stroke-danger")}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("font-mono text-4xl font-semibold", value === null ? "text-muted" : tone(value))}>{value ?? "—"}</span>
        <span className="text-[11px] text-muted">{value === null ? "not enough data" : "out of 100"}</span>
      </div>
    </div>
  );
}

/** Questions per quarter as plain CSS bars (no chart library). */
function QuarterBars({ data }: { data: QuestionStats["byQuarter"] }) {
  if (!data.length) return null;
  const max = Math.max(...data.map((d) => d.count));
  return (
    <figure>
      <div className="flex h-24 items-end gap-1" role="img" aria-label={`Questions per quarter: ${data.map((d) => `${d.period} ${d.count}`).join(", ")}`}>
        {data.map((d) => (
          <div key={d.period} className="flex flex-1 flex-col items-center justify-end gap-1" title={`${d.period}: ${d.count}`}>
            <span className="font-mono text-[10px] text-muted">{d.count}</span>
            <span className="w-full rounded-t bg-primary/70" style={{ height: `${Math.max(4, (d.count / max) * 64)}px` }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1 text-[9px] text-muted">
        {data.map((d) => (
          <span key={d.period} className="flex-1 text-center">
            {d.period.slice(2).replace("-", " ")}
          </span>
        ))}
      </div>
    </figure>
  );
}

function MinistryBars({ data }: { data: QuestionStats["byMinistry"] }) {
  if (!data.length) return null;
  const max = data[0]!.count;
  return (
    <ul className="space-y-1.5">
      {data.slice(0, 5).map((m) => (
        <li key={m.ministry} className="text-xs">
          <div className="flex justify-between gap-2">
            <span className="truncate">{m.ministry}</span>
            <span className="font-mono text-muted">{m.count}</span>
          </div>
          <div className="mt-0.5 h-1.5 rounded-full bg-surface-muted">
            <div className="h-full rounded-full bg-primary/70" style={{ width: `${(m.count / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ReportCard({ data }: { data: ReportCardData }) {
  const q = data.questions;
  const prev = data.previous;
  return (
    <section aria-labelledby="report-card-heading" className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="report-card-heading" className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <Scale className="size-5 text-primary" aria-hidden /> Report card
          </h2>
          <p className="mt-1 text-sm text-muted">Built only from public data, with a published formula, the same for every seat.</p>
        </div>
        <Link href="/methodology" className="inline-flex items-center gap-1 text-sm text-primary underline underline-offset-2">
          <BookOpenCheck className="size-4" aria-hidden /> How is this calculated?
        </Link>
      </div>

      <Card className="grid gap-6 md:grid-cols-[auto_1fr]">
        <div className="flex flex-col items-center gap-2">
          <ScoreRing value={data.overall} />
          <Badge>Methodology {data.methodologyVersion}</Badge>
        </div>
        <ul className="space-y-4">
          {data.components.map((c) => (
            <li key={c.key}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-medium">
                  {c.label} <span className="font-normal text-muted">(weight {Math.round(c.weight * 100)}%)</span>
                </p>
                <span className={cn("font-mono text-lg font-semibold", c.score === null ? "text-muted" : tone(c.score))}>{c.score ?? "n/a"}</span>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-surface-muted" aria-hidden>
                {c.score !== null && <div className={cn("h-full rounded-full", bar(c.score))} style={{ width: `${c.score}%` }} />}
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted">{c.detail}</p>
            </li>
          ))}
        </ul>
      </Card>

      {data.overall === null && (
        <p className="flex gap-2 rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm text-muted">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            We only show an overall score when at least two parts have enough data. An honest &ldquo;not enough data yet&rdquo; is better than a
            misleading number. Citizens can help by{" "}
            <Link href={`/promises/submit?seat=${data.constituency.slug}`} className="text-primary underline underline-offset-2">
              submitting sourced promises
            </Link>{" "}
            and reporting local problems.
          </span>
        </p>
      )}

      {q && q.total > 0 && (
        <Card className="space-y-5">
          <h3 className="flex items-center gap-2 font-semibold">
            <TrendingUp className="size-4 text-primary" aria-hidden /> What {data.mp?.name ?? "the MP"} asked in Parliament
          </h3>
          <dl className="grid grid-cols-3 gap-4 text-center">
            <div>
              <dt className="text-xs text-muted">Questions</dt>
              <dd className="font-mono text-2xl font-semibold">{q.total}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Per month</dt>
              <dd className="font-mono text-2xl font-semibold">{q.perMonth.toFixed(1)}</dd>
              <dd className="text-[10px] text-muted">median MP: {q.nationalMedianPerMonth.toFixed(1)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Ahead of</dt>
              <dd className="font-mono text-2xl font-semibold">{q.percentile === null ? "—" : `${Math.round(q.percentile)}%`}</dd>
              <dd className="text-[10px] text-muted">of MPs</dd>
            </div>
          </dl>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">By quarter</p>
              <QuarterBars data={q.byQuarter} />
            </div>
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Top ministries asked</p>
              <MinistryBars data={q.byMinistry} />
            </div>
          </div>
          <p className="text-xs text-muted">
            Source: Lok Sabha Secretariat (sansad.in). Asking more questions isn&apos;t automatically better, and ministers and the Speaker don&apos;t ask
            questions. This is one signal, not a verdict.
          </p>
        </Card>
      )}

      {prev && prev.members.length > 0 && (
        <Card className="space-y-4">
          <h3 className="font-semibold">Compared with the previous MP ({prev.legislature}th Lok Sabha, 2019–24)</h3>
          {prev.approximate && (
            <p className="text-xs text-muted">This seat&apos;s area changed in a re-delimitation, so the comparison is approximate.</p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead className="text-left text-xs text-muted">
                <tr>
                  <th className="py-1 pr-3 font-medium">Term</th>
                  <th className="py-1 pr-3 font-medium">MP</th>
                  <th className="py-1 pr-3 text-right font-medium">Questions</th>
                  <th className="py-1 text-right font-medium">Per month</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {q && data.mp && (
                  <tr>
                    <td className="py-2 pr-3 text-muted">18th (now)</td>
                    <td className="py-2 pr-3 font-medium">
                      {data.mp.name} <span className="text-muted">{data.mp.party && `· ${data.mp.party}`}</span>
                    </td>
                    <td className="py-2 pr-3 text-right font-mono">{q.total}</td>
                    <td className="py-2 text-right font-mono">{q.perMonth.toFixed(1)}</td>
                  </tr>
                )}
                {prev.members.map((m) => (
                  <tr key={m.name}>
                    <td className="py-2 pr-3 text-muted">{prev.legislature}th</td>
                    <td className="py-2 pr-3">
                      {m.name} <span className="text-muted">{m.party && `· ${m.party}`}</span>
                      {m.sameAsCurrent && <Badge className="ml-2">re-elected</Badge>}
                      {m.status === "DIED" && <Badge tone="soon" className="ml-2">died in office</Badge>}
                      {m.status === "RESIGNED" && <Badge tone="soon" className="ml-2">resigned</Badge>}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono">{m.questions?.total ?? "—"}</td>
                    <td className="py-2 text-right font-mono">{m.questions ? m.questions.perMonth.toFixed(1) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted">Per-month figures account for the 18th Lok Sabha still being in its early years.</p>
        </Card>
      )}
    </section>
  );
}
