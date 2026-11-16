import type { Metadata } from "next";
import { Scale } from "lucide-react";
import { LeaderCard } from "@/components/voices/leader-card";
import { Eyebrow } from "@/components/ui/card";
import { getT } from "@/i18n/server";
import { getTimeline } from "@/lib/api";
import { TimelineView } from "./timeline-view";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.timeline.title, description: t.timeline.lead };
}

/**
 * HOW INDIA'S PARTIES EVOLVED. The same fields, in the same order, for every
 * party; parties are ordered by founding date. Dated, sourced facts only.
 */
export default async function TimelinePage() {
  const [{ t }, data] = await Promise.all([getT(), getTimeline()]);
  const parties = data.parties.map((p) => ({ slug: p.slug, name: p.name, short: p.shortName ?? p.name, color: p.color }));
  const events = [
    ...data.national.map((e) => ({ ...e, party: null })),
    ...data.parties.flatMap((p) => p.events.map((e) => ({ ...e, party: p.slug }))),
  ].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <header className="max-w-3xl">
        <Eyebrow>{t.nav.timeline}</Eyebrow>
        <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">{t.timeline.title}</h1>
        <p className="mt-3 text-lg text-muted">{t.timeline.lead}</p>
      </header>

      <TimelineView parties={parties} events={events} labels={{ all: t.timeline.allParties, national: t.timeline.national, source: t.common.source }} />

      {/* Every party, the same sections in the same order */}
      <section className="mt-16 space-y-12">
        {data.parties.map((p) => (
          <article key={p.slug} id={p.slug} className="scroll-mt-28">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b-4 pb-2" style={{ borderColor: p.color }}>
              <h2 className="text-2xl font-black">{p.name}</h2>
              <p className="font-mono text-xs text-muted">
                {t.timeline.founded} {p.founded} · {p.symbol}
              </p>
            </div>
            <p className="mt-3 text-sm">
              <span className="font-semibold">Founders: </span>
              {p.founders}
            </p>
            <p className="mt-2 text-sm text-muted">
              <span className="font-semibold text-foreground">{t.timeline.mission}: </span>
              {p.ideologyQuote}{" "}
              <a href={p.ideologySourceUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-xs underline">
                {t.common.source}
              </a>
            </p>
            <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {p.leaders.map((l) => (
                <LeaderCard key={l.name} leader={l} t={t} />
              ))}
            </ul>
          </article>
        ))}
      </section>

      <aside className="brutal mt-16 rounded-md bg-surface p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Scale className="size-5 text-saffron" aria-hidden /> {t.timeline.rules}
        </h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted">
          <li>Every party gets the same sections, in the same order. Parties are listed by founding date, never by size.</li>
          <li>Only dated facts with a public source. No praise, no blame, no adjectives.</li>
          <li>Missions are short neutral summaries of how each party describes itself, with a link.</li>
          <li>Quotes appear only where we could verify them; photos only under a free licence, with credit.</li>
          <li>Something missing or wrong? Send a correction with a source on the contact page.</li>
        </ul>
      </aside>
    </div>
  );
}
