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
      title: `${c.name} Lok Sabha constituency`,
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

  return (
    <div className="mt-6 space-y-8">
      {c.isDemo && <DemoNotice />}

      {/* Header */}
      <header className="grid items-center gap-6 md:grid-cols-[1fr_auto]">
        <div>
          <p className="flex items-center gap-2 text-sm text-muted">
            <Landmark className="size-4" aria-hidden /> Lok Sabha constituency · {c.state}
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

      {/* Representative */}
      <section aria-labelledby="rep-heading" className="space-y-4">
        <h2 id="rep-heading" className="sr-only">
          Representative
        </h2>
        {c.representatives.length ? (
          c.representatives.map((r) => <RepresentativeCard key={r.name} rep={r} />)
        ) : (
          <Card className="border-dashed text-sm text-muted">This seat is currently vacant. A by-election is due.</Card>
        )}
        {c.formerRepresentatives.map((r) => (
          <RepresentativeCard key={r.name} rep={r} title="Earlier this term" />
        ))}
      </section>

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
              <Link href="/contact" className="text-primary underline underline-offset-2">
                Send it to us with the link
              </Link>
              .{" "}
              <Link href="/constituency/demo-nagar" className="text-primary underline underline-offset-2">
                See a demo of the tracker
              </Link>
              .
            </p>
          </Card>
        )}
      </section>
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
