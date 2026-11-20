import { connection } from "next/server";
import { Megaphone, Pin } from "lucide-react";
import type { Cause } from "@trackbharat/shared";
import Link from "@/components/link";
import { Stamp } from "@/components/ui/card";
import { fmt, getT } from "@/i18n/server";
import { getMe, getCauses } from "@/lib/api-user";
import { getCausesPublic } from "@/lib/api";
import { UpDownVote } from "./up-down-vote";
import { ShareBar } from "./share-bar";

/**
 * India's Causes of the Week, with up/down votes. Reads the session cookie (to
 * show "my vote"), so it must render inside <Suspense>. Logged-out visitors get
 * the cached public version.
 */
export async function CausesSection({ limit }: { limit?: number }) {
  await connection(); // live data: render per request, never at build time (the API isn't running during `next build`)
  const [{ t, lang }, me] = await Promise.all([getT(), getMe().catch(() => null)]);
  const data = me ? await getCauses() : await getCausesPublic();
  const causes = limit ? data.causes.slice(0, limit) : data.causes;
  const week = new Date(`${data.weekStart}T00:00:00+05:30`).toLocaleDateString(lang === "en" ? "en-IN" : `${lang}-IN`, { day: "numeric", month: "long" });

  if (!causes.length) {
    return (
      <div className="brutal rounded-md bg-surface p-6 text-sm text-muted">
        <p>{t.causes.empty}</p>
        <Link href="/issues/new" className="mt-3 inline-block font-semibold text-foreground underline underline-offset-4">
          {t.home.step1Cta} →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="font-mono text-xs text-muted">{fmt(t.causes.week, { date: week })}</p>
      <ol className="grid gap-4 lg:grid-cols-2">
        {causes.map((c, i) => (
          <CauseCard key={c.id} cause={c} rank={i + 1} signedIn={Boolean(me)} title={c.title ?? t.category[c.category]} t={t} />
        ))}
      </ol>
    </div>
  );
}

function CauseCard({ cause, rank, signedIn, title, t }: { cause: Cause; rank: number; signedIn: boolean; title: string; t: Awaited<ReturnType<typeof getT>>["t"] }) {
  return (
    <li className="brutal reveal relative flex flex-col gap-4 rounded-md bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-md border-2 border-ink bg-saffron font-mono text-lg font-bold text-ink">{rank}</span>
          <div>
            <h3 className="text-lg font-bold leading-tight">{title}</h3>
            <p className="font-mono text-xs text-muted">
              {fmt(t.causes.reports, { n: cause.issueCount })} · {fmt(t.causes.states, { n: cause.stateCount })}
            </p>
          </div>
        </div>
        {cause.pinned ? (
          <Stamp className="text-primary" tilt={4}>
            <Pin className="mr-1 inline size-3" aria-hidden />
            {t.causes.pinned}
          </Stamp>
        ) : (
          <Megaphone className="size-5 shrink-0 text-saffron" aria-hidden />
        )}
      </div>
      {cause.blurb && <p className="text-sm text-muted">{cause.blurb}</p>}
      {cause.examples.length > 0 && (
        <ul className="space-y-1 border-l-2 border-saffron pl-3 text-sm">
          {cause.examples.map((e) => (
            <li key={e.id}>
              <Link href={`/issues/${e.id}`} className="hover:underline">
                {e.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-auto space-y-3">
        <UpDownVote kind="cause" id={cause.id} up={cause.up} down={cause.down} myVote={cause.myVote} signedIn={signedIn} />
        <ShareBar path="/causes" text={`${title}: one of India's Causes of the Week. Does it affect you? Vote on TrackBharat`} hashtags={["CausesOfTheWeek"]} />
      </div>
    </li>
  );
}
