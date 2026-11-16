import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "@/components/link";
import { connection } from "next/server";
import { Flame, Landmark, MapPinned, Megaphone, Vote } from "lucide-react";
import type { Leaderboard } from "@trackbharat/shared";
import { getInsights, getLeaderboard } from "@/lib/api";
import { CATEGORY } from "@/lib/labels";
import { Badge, Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "What India is asking for",
  description: "The problems citizens across India are reporting and voting on today and this week, by category, constituency and state.",
};

export default function LeaderboardPage({ searchParams }: PageProps<"/[lang]/leaderboard">) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <header>
        <p className="flex items-center gap-2 text-sm text-muted">
          <Flame className="size-4 text-saffron" aria-hidden /> Live from citizens across India
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">What India is asking for</h1>
        <p className="mt-3 max-w-2xl text-muted">
          Every problem reported on TrackBharat and every vote on it, added up nationally. This is the real-time picture of what ordinary
          people say needs fixing, before it reaches a headline.
        </p>
      </header>
      <Suspense fallback={<div className="mt-8 h-96 animate-pulse rounded-md bg-surface-muted" aria-busy="true" />}>
        {searchParams.then((sp) => (
          <Board period={sp.period === "week" ? "week" : "day"} />
        ))}
      </Suspense>
    </div>
  );
}

function Tabs({ period }: { period: "day" | "week" }) {
  return (
    <nav aria-label="Time window" className="mt-8 inline-flex brutal rounded-md bg-surface p-1">
      {(
        [
          ["day", "Today"],
          ["week", "This week"],
        ] as const
      ).map(([p, label]) => (
        <Link
          key={p}
          href={p === "day" ? "/leaderboard" : "/leaderboard?period=week"}
          aria-current={period === p ? "page" : undefined}
          className={cn("rounded-lg px-4 py-2 text-sm font-medium", period === p ? "bg-primary text-primary-foreground" : "text-muted hover:text-foreground")}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

/** Horizontal bar list. `value` decides the bar length; `label`/`right` are display text. */
function Bars({ rows }: { rows: { key: string; label: string; right: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ol className="space-y-3">
      {rows.map((r, i) => (
        <li key={r.key}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-baseline gap-2">
              <span className="w-5 shrink-0 font-mono text-xs text-saffron">#{i + 1}</span>
              <span className="truncate font-medium">{r.label}</span>
            </span>
            <span className="shrink-0 font-mono text-xs text-muted">{r.right}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-surface-muted" aria-hidden>
            <div className="h-full rounded-full bg-gradient-to-r from-flag-saffron to-saffron" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}

const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
const score = (x: { newIssues: number; votes: number }) => x.votes + x.newIssues;

async function Board({ period }: { period: "day" | "week" }) {
  await connection(); // live data: render at request time (it's cached for a minute inside getLeaderboard)
  const [b, insights] = await Promise.all([getLeaderboard(period).catch(() => null), getInsights().catch(() => null)]);
  if (!b) return <p className="mt-8 text-sm text-danger">The leaderboard is unavailable right now. Please try again shortly.</p>;
  const empty = b.totals.newIssues === 0 && b.totals.votes === 0;

  return (
    <div className="mt-2 space-y-10">
      <Tabs period={period} />
      <p className="text-xs text-muted">
        Counting from {when(b.since)} India time. Updated every minute. Hidden or removed reports are never counted.
      </p>

      <dl className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          { icon: Megaphone, label: "New problems", value: b.totals.newIssues },
          { icon: Vote, label: "Votes cast", value: b.totals.votes },
          { icon: MapPinned, label: "Constituencies active", value: b.totals.constituencies },
        ].map((s) => (
          <Card key={s.label} className="p-4 text-center sm:p-5">
            <s.icon className="mx-auto size-5 text-primary" aria-hidden />
            <dd className="mt-2 font-mono text-2xl font-semibold sm:text-3xl">{s.value}</dd>
            <dt className="text-xs text-muted">{s.label}</dt>
          </Card>
        ))}
      </dl>

      {empty ? (
        <Card className="border-dashed text-center">
          <p className="font-medium">Nothing yet {period === "day" ? "today" : "this week"}</p>
          <p className="mt-1 text-sm text-muted">The leaderboard fills as citizens report and vote on problems in their area.</p>
          <Link href="/issues/new" className="mt-4 inline-block text-sm font-medium text-primary">
            Report a problem →
          </Link>
        </Card>
      ) : (
        <>
          <Section title="Most-raised kinds of problems" hint="Votes plus new reports, by category">
            <Bars rows={b.categories.map((c) => ({ key: c.category, label: CATEGORY[c.category], right: `${c.votes} votes · ${c.newIssues} new`, value: score(c) }))} />
          </Section>

          <Section title="Top problems right now" hint="Most votes in this window">
            <ol className="divide-y divide-border">
              {b.topIssues.map((i, n) => (
                <li key={i.id} className="flex items-center gap-4 py-3">
                  <span className="w-6 shrink-0 font-mono text-sm text-saffron">#{n + 1}</span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/issues/${i.id}`} className="block truncate font-medium hover:text-primary">
                      {i.title}
                    </Link>
                    <p className="text-xs text-muted">
                      {CATEGORY[i.category]} ·{" "}
                      <Link href={`/constituency/${i.constituency.slug}`} className="hover:text-foreground">
                        {i.constituency.name}, {i.constituency.state}
                      </Link>
                      {i.isDemo && <Badge tone="soon" className="ml-2">demo</Badge>}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-sm">{i.votes} votes</span>
                </li>
              ))}
            </ol>
          </Section>

          <div className="grid gap-10 lg:grid-cols-2">
            <Section title="Most active constituencies">
              <Bars rows={b.topConstituencies.map((c) => ({ key: c.slug, label: `${c.name}, ${c.state}`, right: `${c.votes} votes · ${c.newIssues} new`, value: score(c) }))} />
            </Section>
            <Section title="Most active states">
              <Bars rows={b.topStates.map((s) => ({ key: s.state, label: s.state, right: `${s.votes} votes · ${s.newIssues} new`, value: score(s) }))} />
            </Section>
          </div>
        </>
      )}

      {insights && insights.questions.byMinistry.length > 0 && <CitizensVsParliament board={b} ministries={insights.questions.byMinistry} />}
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {hint && <p className="mb-4 text-xs text-muted">{hint}</p>}
      <div className={hint ? "" : "mt-4"}>{children}</div>
    </section>
  );
}

/** Two lists side by side: what citizens raise vs what MPs ask ministries about. */
function CitizensVsParliament({ board, ministries }: { board: Leaderboard; ministries: { ministry: string; count: number }[] }) {
  return (
    <section aria-labelledby="vs">
      <h2 id="vs" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
        <Landmark className="size-5 text-primary" aria-hidden /> Citizens vs Parliament
      </h2>
      <p className="mb-4 mt-1 max-w-2xl text-xs text-muted">
        Do MPs ask about what citizens are raising? On the left: what people report. On the right: which ministries MPs of the 18th Lok Sabha
        have asked the most questions of so far (from sansad.in).
      </p>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-sm font-semibold">Citizens are raising</h3>
          {board.categories.length ? (
            <Bars rows={board.categories.slice(0, 6).map((c) => ({ key: c.category, label: CATEGORY[c.category], right: `${score(c)}`, value: score(c) }))} />
          ) : (
            <p className="text-sm text-muted">No activity in this window yet.</p>
          )}
        </Card>
        <Card>
          <h3 className="mb-3 text-sm font-semibold">MPs are asking ministries about</h3>
          <Bars rows={ministries.slice(0, 6).map((m) => ({ key: m.ministry, label: m.ministry, right: m.count.toLocaleString("en-IN"), value: m.count }))} />
        </Card>
      </div>
    </section>
  );
}
