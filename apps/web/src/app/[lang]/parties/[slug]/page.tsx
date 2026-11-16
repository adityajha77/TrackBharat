import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink, FileText, Quote } from "lucide-react";
import type { Manifesto } from "@trackbharat/shared";
import Link from "@/components/link";
import { LeaderCard } from "@/components/voices/leader-card";
import { MANIFESTO_TONE, Ring, StatusBar } from "@/components/voices/progress";
import { ShareBar } from "@/components/voices/share-bar";
import { Badge, Eyebrow } from "@/components/ui/card";
import { fmt, getT, type Dictionary } from "@/i18n/server";
import { ApiError, getParties, getParty } from "@/lib/api";

export async function generateStaticParams() {
  const { parties } = await getParties().catch(() => ({ parties: [] }));
  return parties.length ? parties.map((p) => ({ slug: p.slug })) : [{ slug: "inc" }];
}

export async function generateMetadata({ params }: PageProps<"/[lang]/parties/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = await getParty(slug).catch(() => null);
  return p ? { title: `${p.name}: promised vs done`, description: `Manifesto promises of the ${p.name}, with sources and status.` } : {};
}

export default function PartyPage({ params }: PageProps<"/[lang]/parties/[slug]">) {
  return (
    <Suspense fallback={<div className="mx-auto mt-12 h-96 max-w-7xl animate-pulse rounded-md bg-surface-muted" />}>
      {params.then(({ slug }) => (
        <Party slug={slug} />
      ))}
    </Suspense>
  );
}

async function Party({ slug }: { slug: string }) {
  const { t } = await getT();
  const p = await getParty(slug).catch((e) => {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  });
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <Link href="/parties" className="font-mono text-xs text-muted hover:underline">
        ← {t.parties.all}
      </Link>
      <header className="brutal mt-4 overflow-hidden rounded-md bg-surface">
        <div className="h-3 border-b-2 border-ink" style={{ background: p.color }} aria-hidden />
        <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto]">
          <div>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl">{p.name}</h1>
            <p className="mt-2 font-mono text-sm text-muted">
              {p.shortName} · {t.timeline.founded} {new Date(p.founded).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} · {p.symbol} ·{" "}
              {p.seatsLokSabha} Lok Sabha seats
            </p>
            <p className="mt-4 text-sm">
              <span className="font-semibold">Founders: </span>
              {p.founders}
            </p>
            <blockquote className="mt-4 flex gap-2 border-l-4 border-saffron pl-3 text-muted">
              <Quote className="size-4 shrink-0 text-saffron" aria-hidden />
              <span>
                {p.ideologyQuote}{" "}
                <a href={p.ideologySourceUrl} target="_blank" rel="noopener noreferrer" className="whitespace-nowrap font-mono text-xs underline">
                  {t.common.source}
                </a>
              </span>
            </blockquote>
          </div>
          {p.promises > 0 && <Ring value={(p.byStatus.FULFILLED ?? 0) / p.promises} label={t.parties.fulfilled} size={120} />}
        </div>
      </header>

      {p.leaders.length > 0 && (
        <section className="mt-12">
          <Eyebrow>{t.timeline.leaders}</Eyebrow>
          <ul className="mt-5 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {p.leaders.map((l) => (
              <LeaderCard key={l.name} leader={l} t={t} />
            ))}
          </ul>
        </section>
      )}

      <section className="mt-12">
        <Eyebrow>{t.nav.manifestos}</Eyebrow>
        {p.manifestos.length === 0 && <p className="brutal mt-5 rounded-md bg-surface p-6 text-muted">{t.parties.notRated}: no manifesto promises added yet.</p>}
        <div className="mt-5 space-y-10">
          {p.manifestos.map((m) => (
            <ManifestoBlock key={m.id} m={m} t={t} party={p.shortName ?? p.name} slug={p.slug} />
          ))}
        </div>
      </section>

      {p.events.length > 0 && (
        <section className="mt-12">
          <Eyebrow>{t.timeline.milestones}</Eyebrow>
          <ol className="mt-5 space-y-3 border-l-4 border-ink pl-5">
            {p.events.map((e) => (
              <li key={`${e.date}-${e.title}`} className="reveal relative">
                <span aria-hidden className="absolute -left-[30px] top-1.5 size-4 rounded-full border-2 border-ink" style={{ background: p.color }} />
                <p className="font-mono text-xs text-muted">{e.precision === "YEAR" ? e.date.slice(0, 4) : e.date}</p>
                <p className="font-bold">{e.title}</p>
                <p className="text-sm text-muted">
                  {e.body}{" "}
                  <a href={e.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-xs underline">
                    {t.common.source}
                  </a>
                </p>
              </li>
            ))}
          </ol>
          <Link href="/timeline" className="mt-10 inline-block text-sm font-semibold underline underline-offset-4">
            {t.home.timelineCta} →
          </Link>
        </section>
      )}
    </div>
  );
}

function ManifestoBlock({ m, t, party, slug }: { m: Manifesto; t: Dictionary; party: string; slug: string }) {
  const byStatus: Record<string, number> = {};
  for (const pr of m.promises) byStatus[pr.status] = (byStatus[pr.status] ?? 0) + 1;
  return (
    <article className="brutal reveal rounded-md bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-3xl font-black">{m.electionYear}</p>
          <h2 className="text-xl font-bold">{m.title}</h2>
          <p className="mt-1 text-sm text-muted">
            {m.formedGovernment ? "Formed the government after this election." : `${t.status.NOT_IN_POWER} after this election, so promises aren't rated as kept or broken.`}
          </p>
        </div>
        <a href={m.sourceUrl} target="_blank" rel="noopener noreferrer" className="brutal-sm press inline-flex items-center gap-1.5 rounded-md bg-surface px-3 py-1.5 text-sm font-semibold">
          <FileText className="size-4" aria-hidden /> {t.parties.manifesto}
        </a>
      </div>
      <div className="mt-4">
        <StatusBar byStatus={byStatus} t={t} />
      </div>
      <ul className="mt-5 divide-y-2 divide-ink/10">
        {m.promises.map((pr) => (
          <li key={pr.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="font-medium">{pr.text}</p>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                <Badge>{t.category[pr.category]}</Badge>
                {pr.page && <span>{fmt(t.parties.page, { n: pr.page })}</span>}
                {pr.statusNote && <span>{pr.statusNote}</span>}
                {pr.evidenceUrl && (
                  <a href={pr.evidenceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 underline">
                    {t.parties.evidence} <ExternalLink className="size-3" aria-hidden />
                  </a>
                )}
              </p>
            </div>
            <span className={`inline-flex shrink-0 items-center gap-1.5 self-start rounded-sm border-2 border-ink px-2 py-0.5 font-mono text-[11px] font-bold uppercase ${MANIFESTO_TONE[pr.status]} ${pr.status === "FULFILLED" || pr.status === "BROKEN" || pr.status === "IN_PROGRESS" ? "text-white" : "text-ink dark:text-foreground"}`}>
              {t.status[pr.status]}
            </span>
          </li>
        ))}
      </ul>
      <ShareBar className="mt-4" path={`/parties/${slug}`} text={`${party} ${m.electionYear} manifesto: promised vs done, with sources, on TrackBharat`} />
    </article>
  );
}
