import { connection } from "next/server";
import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink, FileText, Quote, Search } from "lucide-react";
import type { Manifesto, PartyDetail } from "@trackbharat/shared";
import Link from "@/components/link";
import { LeaderCard } from "@/components/voices/leader-card";
import { fulfilledShare, MANIFESTO_TONE, Ring, Scorecard, StatusBar } from "@/components/voices/progress";
import { ShareBar } from "@/components/voices/share-bar";
import { Badge, Eyebrow } from "@/components/ui/card";
import { fmt, getT, type Dictionary } from "@/i18n/server";
import { ApiError, getParties, getParty } from "@/lib/api";

export async function generateStaticParams() {
  const { parties } = await getParties().catch(() => ({ parties: [] }));
  return parties.length ? parties.map((p) => ({ slug: p.slug })) : [{ slug: "inc" }];
}

export async function generateMetadata({ params }: PageProps<"/[lang]/parties/[slug]">): Promise<Metadata> {
  await connection(); // the title comes from live data, so it is resolved per request too
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
  await connection(); // live data: render per request, never at build time (the API isn't running during `next build`)
  const { t } = await getT();
  const p = await getParty(slug).catch((e) => {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  });
  const share = fulfilledShare(p.byStatus, p.promises);
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
          {share !== null && <Ring value={share} label={t.parties.fulfilled} size={120} />}
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

      {/* The headline: of what they promised while in power, what is done and what is not */}
      {share !== null && <PromisedVsDone p={p} t={t} />}

      <section className="mt-12">
        <Eyebrow>{t.nav.manifestos}</Eyebrow>
        {p.manifestoNote ? (
          <p className="brutal mt-5 rounded-md bg-surface p-6 text-muted">
            <span className="font-bold text-foreground">{t.parties.noManifesto}. </span>
            {p.manifestoNote.text}{" "}
            <a href={p.manifestoNote.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-xs underline">
              {t.common.source}
            </a>
          </p>
        ) : (
          p.manifestos.length === 0 && <p className="brutal mt-5 rounded-md bg-surface p-6 text-muted">{t.parties.notRated}: no manifesto promises added yet.</p>
        )}
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
      <SourcesPanel p={p} t={t} />
    </div>
  );
}

/**
 * PROMISED vs DONE across every manifesto this party could deliver on (it led
 * the government afterwards): the score, then two plain lists, done and not done.
 */
function PromisedVsDone({ p, t }: { p: PartyDetail; t: Dictionary }) {
  const accountable = p.manifestos
    .filter((m) => m.formedGovernment)
    .flatMap((m) => m.promises.map((pr) => ({ ...pr, election: `${m.state ?? "Lok Sabha"} ${m.electionYear}` })));
  const done = accountable.filter((pr) => pr.status === "FULFILLED");
  const pending = accountable.filter((pr) => pr.status !== "FULFILLED");
  const item = (pr: (typeof accountable)[number]) => (
    <li key={pr.id} className="flex items-start justify-between gap-3 py-2">
      <span className="min-w-0 text-sm">
        {pr.text} <span className="font-mono text-[11px] text-muted">· {pr.election}</span>
      </span>
      <span className={`shrink-0 rounded-sm border-2 border-ink px-1.5 py-px font-mono text-[10px] font-bold uppercase ${MANIFESTO_TONE[pr.status]} ${pr.status === "FULFILLED" || pr.status === "BROKEN" || pr.status === "IN_PROGRESS" ? "text-white" : "text-ink dark:text-foreground"}`}>
        {t.status[pr.status]}
      </span>
    </li>
  );
  return (
    <section className="brutal reveal mt-12 rounded-md bg-surface p-5">
      <Eyebrow>{t.parties.scorecard}</Eyebrow>
      <div className="mt-4">
        <Scorecard byStatus={p.byStatus} total={p.promises} t={t} />
      </div>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="font-black text-flag-green">✓ {t.parties.didList} ({done.length})</h3>
          <ul className="mt-2 divide-y-2 divide-ink/10">{done.map(item)}</ul>
        </div>
        <div>
          <h3 className="font-black text-danger">✗ {t.parties.pendingList} ({pending.length})</h3>
          <ul className="mt-2 divide-y-2 divide-ink/10">{pending.map(item)}</ul>
        </div>
      </div>
    </section>
  );
}

/**
 * CHECK IT YOURSELF: every link this page relies on, in one place. Manifestos
 * first (what was promised), then the evidence for each verdict (what happened),
 * then the history. Anyone can open them and tell us if we got something wrong.
 */
function SourcesPanel({ p, t }: { p: PartyDetail; t: Dictionary }) {
  const groups: { title: string; links: { url: string; label: string }[] }[] = [
    {
      title: "What they promised (the manifestos)",
      links: p.manifestos.map((m) => ({ url: m.sourceUrl, label: `${m.title} · ${m.state ?? "Lok Sabha"} ${m.electionYear}` })),
    },
    {
      title: "What happened (evidence for each verdict)",
      links: p.manifestos.flatMap((m) => m.promises.filter((pr) => pr.evidenceUrl).map((pr) => ({ url: pr.evidenceUrl!, label: `${t.status[pr.status]} · ${pr.text}` }))),
    },
    {
      title: "History, mission and leaders",
      links: [{ url: p.ideologySourceUrl, label: "How the party describes itself" }, ...p.events.map((e) => ({ url: e.sourceUrl, label: `${e.date.slice(0, 4)} · ${e.title}` }))],
    },
  ];
  if (p.manifestoNote) groups[0]!.links.push({ url: p.manifestoNote.sourceUrl, label: "Why there is no manifesto to rate" });
  return (
    <section className="brutal reveal mt-12 rounded-md bg-surface p-5">
      <h2 className="flex items-center gap-2 text-xl font-black">
        <Search className="size-5 text-saffron" aria-hidden /> Check it yourself: every source on this page
      </h2>
      <p className="mt-1 text-sm text-muted">
        TrackBharat is built and checked by a small group of people. We only add a promise or a verdict when a public source supports
        it, and we link that source so you can verify it. Found a mistake or a better source?{" "}
        <Link href="/contact" className="font-semibold underline">
          Tell us
        </Link>
        .
      </p>
      <div className="mt-5 grid gap-6 lg:grid-cols-3">
        {groups
          .filter((g) => g.links.length)
          .map((g) => (
            <div key={g.title}>
              <h3 className="font-bold">{g.title}</h3>
              <ol className="mt-2 space-y-1.5 text-sm">
                {g.links.map((l, i) => (
                  <li key={`${l.url}-${i}`} className="flex gap-1.5">
                    <ExternalLink className="mt-1 size-3 shrink-0 text-muted" aria-hidden />
                    <a href={l.url} target="_blank" rel="noopener noreferrer" className="min-w-0 break-words hover:underline">
                      {l.label} <span className="font-mono text-[11px] text-muted">({new URL(l.url).hostname.replace(/^www\./, "")})</span>
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          ))}
      </div>
    </section>
  );
}

function ManifestoBlock({ m, t, party, slug }: { m: Manifesto; t: Dictionary; party: string; slug: string }) {
  const byStatus: Record<string, number> = {};
  for (const pr of m.promises) byStatus[pr.status] = (byStatus[pr.status] ?? 0) + 1;
  return (
    <article className="brutal reveal rounded-md bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex flex-wrap items-baseline gap-2">
            <span className="font-mono text-3xl font-black">{m.electionYear}</span>
            <span className="rounded-sm border-2 border-ink px-1.5 py-px font-mono text-[11px] font-bold uppercase">{m.state ? `${m.state} assembly` : "Lok Sabha"}</span>
          </p>
          <h2 className="text-xl font-bold">{m.title}</h2>
          <p className="mt-1 text-sm text-muted">
            {m.formedGovernment ? `Formed the ${m.state ? `${m.state} state` : "central"} government after this election.` : `${t.status.NOT_IN_POWER} after this election, so promises aren't rated as kept or broken.`}
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
      <ShareBar className="mt-4" path={`/parties/${slug}`} text={`${party} ${m.state ? `${m.state} ` : ""}${m.electionYear} manifesto: promised vs done, with sources, on TrackBharat`} />
    </article>
  );
}
