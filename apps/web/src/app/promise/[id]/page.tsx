import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, CalendarDays, Info, ThumbsDown, ThumbsUp } from "lucide-react";
import { ApiError, getPromise } from "@/lib/api";
import { CATEGORY, STATUS, formatDate } from "@/lib/labels";
import { Card } from "@/components/ui/card";
import { DemoNotice, SourceLink, StatusBadge } from "@/components/civic/bits";
import { cn } from "@/lib/utils";

/** /promise/12: one promise, its full status history and the evidence. */

const parseId = (raw: string) => (/^\d{1,9}$/.test(raw) ? Number(raw) : null);

export async function generateMetadata({ params }: PageProps<"/promise/[id]">): Promise<Metadata> {
  const id = parseId((await params).id);
  if (!id) return { title: "Promise" };
  try {
    const p = await getPromise(id);
    return { title: p.title, description: `${STATUS[p.status].label}: a promise by ${p.madeBy}${p.constituency ? ` for ${p.constituency.name}` : ""}.` };
  } catch {
    return { title: "Promise" };
  }
}

export default function PromisePage({ params }: PageProps<"/promise/[id]">) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-surface-muted" aria-busy="true" />}>
        {params.then(({ id }) => (
          <Details rawId={id} />
        ))}
      </Suspense>
    </div>
  );
}

const STANCE = {
  SHOWS_PROGRESS: { label: "Shows progress", icon: ThumbsUp, cls: "text-green" },
  SHOWS_NO_PROGRESS: { label: "Shows no progress", icon: ThumbsDown, cls: "text-danger" },
  CONTEXT: { label: "Context", icon: Info, cls: "text-muted" },
} as const;

async function Details({ rawId }: { rawId: string }) {
  const id = parseId(rawId);
  if (!id) notFound();
  let p;
  try {
    p = await getPromise(id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  return (
    <article className="space-y-8">
      {p.constituency && (
        <Link href={`/constituency/${p.constituency.slug}`} className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden /> {p.constituency.name}, {p.constituency.state}
        </Link>
      )}
      {p.isDemo && <DemoNotice />}

      <header>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={p.status} />
          <span className="text-sm text-muted">{CATEGORY[p.category]}</span>
        </div>
        <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">{p.title}</h1>
        {p.description && <p className="mt-3 text-lg text-muted">{p.description}</p>}
        <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <div>
            <dt className="inline text-muted">Promised by </dt>
            <dd className="inline font-medium">{p.madeBy}</dd>
          </div>
          {p.madeOn && (
            <div className="flex items-center gap-1.5">
              <CalendarDays className="size-4 text-muted" aria-hidden />
              <dt className="sr-only">Made on</dt>
              <dd>{formatDate(p.madeOn)}</dd>
            </div>
          )}
          {p.deadline && (
            <div className="flex items-center gap-1.5">
              <CalendarClock className="size-4 text-muted" aria-hidden />
              <dt className="text-muted">Deadline</dt>
              <dd>{formatDate(p.deadline)}</dd>
            </div>
          )}
        </dl>
        <SourceLink source={p.source} className="mt-3" />
      </header>

      {/* Timeline: the append-only status history */}
      <section aria-labelledby="timeline">
        <h2 id="timeline" className="text-lg font-semibold">
          Timeline
        </h2>
        <ol className="mt-4 space-y-0">
          {p.history.map((h, i) => (
            <li key={i} className="relative flex gap-4 pb-6 last:pb-0">
              {i < p.history.length - 1 && <span aria-hidden className="absolute left-[7px] top-5 h-full w-px bg-border" />}
              <span aria-hidden className={cn("relative mt-1.5 size-[15px] shrink-0 rounded-full border-4 border-background", STATUS[h.status].dot)} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={h.status} />
                  <time dateTime={h.changedAt} className="text-xs text-muted">
                    {formatDate(h.changedAt)}
                  </time>
                </div>
                {h.note && <p className="mt-1.5 text-sm">{h.note}</p>}
                <SourceLink source={h.source} className="mt-1" />
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Evidence */}
      <section aria-labelledby="evidence">
        <h2 id="evidence" className="text-lg font-semibold">
          Evidence
        </h2>
        {p.evidence.length ? (
          <ul className="mt-4 space-y-3">
            {p.evidence.map((e, i) => {
              const s = STANCE[e.stance];
              return (
                <li key={i}>
                  <Card className="p-4">
                    <p className={cn("flex items-center gap-1.5 text-xs font-medium", s.cls)}>
                      <s.icon className="size-3.5" aria-hidden /> {s.label}
                    </p>
                    <p className="mt-1.5 text-sm">{e.summary}</p>
                    <SourceLink source={e.source} className="mt-2" />
                  </Card>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">No evidence has been added yet.</p>
        )}
      </section>
    </article>
  );
}
