import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "@/components/link";
import { connection } from "next/server";
import { getInsights } from "@/lib/api";
import { STATUS, STATUS_ORDER } from "@/lib/labels";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "India at a glance",
  description: "Promises, citizen problems and parliamentary questions, summed up across all of India.",
};

export default function InsightsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">India at a glance</h1>
      <p className="mt-3 max-w-2xl text-muted">National totals from the data on TrackBharat. Demo data is never included.</p>
      <Suspense fallback={<div className="mt-8 h-96 animate-pulse rounded-md bg-surface-muted" aria-busy="true" />}>
        <Insights />
      </Suspense>
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <Card className="p-5">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 font-mono text-3xl font-semibold">{value}</dd>
      {note && <dd className="mt-1 text-xs text-muted">{note}</dd>}
    </Card>
  );
}

async function Insights() {
  await connection();
  const d = await getInsights().catch(() => null);
  if (!d) return <p className="mt-8 text-sm text-danger">Insights are unavailable right now.</p>;
  const maxMin = Math.max(1, ...d.questions.byMinistry.map((m) => m.count));
  const maxParty = Math.max(1, ...d.partySeats.map((p) => p.seats));

  return (
    <div className="mt-8 space-y-10">
      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Parliamentary questions (18th LS)" value={d.questions.total.toLocaleString("en-IN")} note={`median MP: ${d.questions.medianPerMonth.toFixed(1)} a month`} />
        <Stat label="Promises tracked" value={d.promisesTracked} note="each with a public source" />
        <Stat label="Citizen reports" value={d.issues.total} note={`${d.issues.resolved} resolved`} />
        <Stat label="Votes this week" value={d.issues.votesThisWeek} />
      </dl>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="text-lg font-semibold">What MPs ask ministries about</h2>
          <p className="mb-4 text-xs text-muted">Questions asked in the 18th Lok Sabha so far, by ministry. Source: sansad.in.</p>
          <ol className="space-y-2.5">
            {d.questions.byMinistry.map((m) => (
              <li key={m.ministry} className="text-sm">
                <div className="flex justify-between gap-3">
                  <span className="truncate">{m.ministry}</span>
                  <span className="font-mono text-xs text-muted">{m.count.toLocaleString("en-IN")}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-surface-muted" aria-hidden>
                  <div className="h-full rounded-full bg-primary/70" style={{ width: `${(m.count / maxMin) * 100}%` }} />
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Seats by party</h2>
          <p className="mb-4 text-xs text-muted">Sitting members of the 18th Lok Sabha.</p>
          <ol className="space-y-2.5">
            {d.partySeats.map((p) => (
              <li key={p.party} className="text-sm">
                <div className="flex justify-between gap-3">
                  <span>{p.party}</span>
                  <span className="font-mono text-xs text-muted">{p.seats}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-surface-muted" aria-hidden>
                  <div className="h-full rounded-full bg-flag-saffron" style={{ width: `${(p.seats / maxParty) * 100}%` }} />
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section>
        <h2 className="text-lg font-semibold">Most questions asked by a sitting MP</h2>
        <p className="mb-3 text-xs text-muted">
          Raw counts reward volume, not quality, and ministers don&apos;t ask questions. See <Link href="/methodology" className="underline underline-offset-2">what a report card can&apos;t tell you</Link>.
        </p>
        <ol className="divide-y divide-border brutal rounded-md bg-surface">
          {d.mostActive.map((m, i) => (
            <li key={m.slug} className="flex items-center gap-4 px-5 py-3 text-sm">
              <span className="w-6 font-mono text-saffron">#{i + 1}</span>
              <Link href={`/constituency/${m.slug}`} className="min-w-0 flex-1 hover:text-primary">
                <span className="font-medium">{m.name}</span>
                <span className="text-muted">
                  {" "}
                  · {m.party ?? "Independent"} · {m.constituency}
                </span>
              </Link>
              <span className="shrink-0 font-mono">{m.total}</span>
            </li>
          ))}
        </ol>
      </section>

      {d.promisesTracked > 0 && (
        <section>
          <h2 className="text-lg font-semibold">Promise status across India</h2>
          <ul className="mt-3 flex flex-wrap gap-3">
            {STATUS_ORDER.filter((s) => d.promiseStatus[s]).map((s) => (
              <li key={s} className="flex items-center gap-2 text-sm">
                <span className={`size-2.5 rounded-full ${STATUS[s].dot}`} aria-hidden /> {STATUS[s].label} <span className="font-mono text-muted">{d.promiseStatus[s]}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
