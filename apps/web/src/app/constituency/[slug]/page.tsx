import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileCheck2, Landmark } from "lucide-react";
import { ApiError, getConstituency } from "@/lib/api";
import { RESERVATION } from "@/lib/labels";
import { Badge, Card } from "@/components/ui/card";
import { ConstituencyOutline } from "@/components/civic/constituency-outline";
import { DemoNotice, OutdatedBoundaryNote, SourceLink } from "@/components/civic/bits";
import { PromiseList } from "@/components/civic/promise-list";
import { PromiseProgress } from "@/components/civic/promise-progress";
import { RepresentativeCard } from "@/components/civic/representative-card";
import { IssuesSection } from "@/components/issues/issues-section";

/**
 * /constituency/bangalore-south: the heart of TrackBharat.
 * Same rendering model as /area: static shell, details streamed in <Suspense>.
 */

export async function generateMetadata({ params }: PageProps<"/constituency/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  try {
    const c = await getConstituency(slug);
    const mp = c.representatives[0];
    return {
      title: `${c.name} ${c.house === "LOK_SABHA" ? "Lok Sabha" : "Vidhan Sabha"} constituency`,
      description: `${c.name}, ${c.state}: ${mp ? `MP ${mp.name}${mp.party ? ` (${mp.party.shortName ?? mp.party.name})` : ""}, ` : ""}promises made and what happened to them.`,
    };
  } catch {
    return { title: "Constituency" };
  }
}

export default function ConstituencyPage({ params }: PageProps<"/constituency/[slug]">) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link href="/constituencies" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> All constituencies
      </Link>
      <Suspense fallback={<Skeleton />}>
        {params.then(({ slug }) => (
          <Details slug={slug} />
        ))}
      </Suspense>
    </div>
  );
}

async function Details({ slug }: { slug: string }) {
  let c;
  try {
    c = await getConstituency(slug);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) notFound();
    throw err;
  }

  const reservation = RESERVATION[c.reservation];
  const isLs = c.house === "LOK_SABHA";

  return (
    <div className="mt-6 space-y-8">
      {c.isDemo && <DemoNotice />}

      {/* Header */}
      <header className="grid items-center gap-6 md:grid-cols-[1fr_auto]">
        <div>
          <p className="flex items-center gap-2 text-sm text-muted">
            <Landmark className="size-4" aria-hidden /> {isLs ? "Lok Sabha" : "Vidhan Sabha (assembly)"} constituency · {c.state}
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">{c.name}</h1>
          {c.nameHi && (
            <p lang="hi" className="mt-1 font-hindi text-xl text-muted">
              {c.nameHi}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {!c.isDemo && <Badge>Seat #{c.number}</Badge>}
            {reservation && <Badge tone="primary">{reservation}</Badge>}
          </div>
        </div>
        {c.outline && (
          <figure className="justify-self-start md:justify-self-end">
            <ConstituencyOutline outline={c.outline} name={c.name} className="h-36 w-48 sm:h-44 sm:w-60" />
            {c.boundarySource && <SourceLink source={c.boundarySource} className="mt-1" />}
          </figure>
        )}
      </header>

      {c.boundaryOutdated && <OutdatedBoundaryNote />}
      {!isLs && !c.boundaryOutdated && (
        <p className="text-xs text-muted">Assembly boundaries come from scraped ECI polling-station maps and may be slightly shifted; treat them as approximate.</p>
      )}

      {/* Representative */}
      <section aria-labelledby="rep-heading" className="space-y-4">
        <h2 id="rep-heading" className="sr-only">
          Representative
        </h2>
        {c.representatives.length ? (
          c.representatives.map((r) => <RepresentativeCard key={r.name} rep={r} house={c.house} />)
        ) : isLs ? (
          <Card className="border-dashed text-sm text-muted">This seat is currently vacant. A by-election is due.</Card>
        ) : (
          <Card className="border-dashed text-sm text-muted">
            MLA data for {c.state} isn&apos;t available yet. We add MLAs state by state from official sources only.{" "}
            <Link href="/contact" className="text-primary underline underline-offset-2">
              Help us add {c.state}
            </Link>
            .
          </Card>
        )}
        {c.formerRepresentatives.map((r) => (
          <RepresentativeCard key={r.name} rep={r} house={c.house} title="Earlier this term" />
        ))}
      </section>

      {/* MP ⇄ MLA navigation: a Lok Sabha seat is made of several assembly segments */}
      {c.parent && (
        <Card className="flex flex-wrap items-center justify-between gap-3 py-4">
          <p className="text-sm text-muted">
            Part of the <strong className="text-foreground">{c.parent.name}</strong> Lok Sabha constituency
          </p>
          <Link href={`/constituency/${c.parent.slug}`} className="text-sm font-medium text-primary">
            See the MP →
          </Link>
        </Card>
      )}
      {c.segments.length > 0 && (
        <section aria-labelledby="segments-heading">
          <h2 id="segments-heading" className="text-sm font-medium uppercase tracking-widest text-muted">
            Assembly segments ({c.segments.length})
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {c.segments.map((s) => (
              <li key={s.slug}>
                <Link href={`/constituency/${s.slug}`} className="inline-block rounded-full border border-border px-3 py-1 text-sm hover:border-primary hover:text-primary">
                  {s.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Promises */}
      <section aria-labelledby="promises-heading" className="space-y-5">
        <div className="flex items-center gap-2">
          <FileCheck2 className="size-5 text-primary" aria-hidden />
          <h2 id="promises-heading" className="text-xl font-semibold tracking-tight">
            Promises &amp; progress
          </h2>
        </div>
        {c.promises.length ? (
          <>
            <Card>
              <PromiseProgress counts={c.promiseCounts} />
            </Card>
            <PromiseList promises={c.promises} />
          </>
        ) : (
          <Card className="border-dashed">
            <p className="font-medium">No promises tracked here yet</p>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              We only publish a promise when it comes with a public source: a manifesto, an official speech, a gazette or a news
              report. Know of one for {c.name}?{" "}
              <Link href={`/promises/submit?seat=${c.slug}`} className="text-primary underline underline-offset-2">
                Submit it with the link
              </Link>
              .{" "}
              <Link href="/constituency/demo-nagar" className="text-primary underline underline-offset-2">
                See a demo of the tracker
              </Link>
              .
            </p>
          </Card>
        )}
        {c.promises.length > 0 && (
          <Link href={`/promises/submit?seat=${c.slug}`} className="inline-block text-sm font-medium text-primary">
            Know of another promise? Submit it with a source →
          </Link>
        )}
      </section>

      {/* Citizen issues roll up to Lok Sabha seats (an MP's constituency) */}
      {isLs && (
        <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-surface-muted" aria-busy="true" />}>
          <IssuesSection slug={c.slug} name={c.name} />
        </Suspense>
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="mt-6 animate-pulse space-y-8" aria-busy="true" aria-label="Loading constituency">
      <div className="space-y-3">
        <div className="h-4 w-56 rounded bg-surface-muted" />
        <div className="h-12 w-72 rounded bg-surface-muted" />
      </div>
      <div className="h-40 rounded-2xl bg-surface-muted" />
      <div className="h-64 rounded-2xl bg-surface-muted" />
    </div>
  );
}
