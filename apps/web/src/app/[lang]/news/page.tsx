import { connection } from "next/server";
import { Suspense } from "react";
import type { Metadata } from "next";
import { BadgeCheck, ExternalLink, Newspaper, Send } from "lucide-react";
import Link from "@/components/link";
import { NewsCard } from "@/components/voices/news-card";
import { ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/card";
import { getT } from "@/i18n/server";
import { getHeadlines, getNews } from "@/lib/api";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.news.title, description: t.news.lead };
}

export default async function NewsPage({ searchParams }: PageProps<"/[lang]/news">) {
  await connection(); // live data: render per request, never at build time (the API isn't running during `next build`)
  const { t } = await getT();
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-3xl">
          <Eyebrow>{t.nav.news}</Eyebrow>
          <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">{t.news.title}</h1>
          <p className="mt-3 text-lg text-muted">{t.news.lead}</p>
        </div>
        <ButtonLink href="/news/submit" variant="secondary" size="sm">
          <Send className="size-4" aria-hidden /> {t.news.submit}
        </ButtonLink>
      </header>
      <Suspense fallback={<div className="mt-10 h-96 animate-pulse rounded-md bg-surface-muted" aria-busy="true" />}>
        {searchParams.then((sp) => (
          <Feed state={typeof sp.state === "string" ? sp.state : null} source={typeof sp.source === "string" ? sp.source : null} />
        ))}
      </Suspense>
    </div>
  );
}

async function Feed({ state, source }: { state: string | null; source: string | null }) {
  const [{ t }, verified, headlines, all] = await Promise.all([getT(), getNews(state), getHeadlines(state, source), getHeadlines(null, null)]);
  const states = [...new Set([...all.states, ...verified.states])].sort();
  const href = (s: string | null, src: string | null) => {
    const q = new URLSearchParams();
    if (s) q.set("state", s);
    if (src) q.set("source", src);
    return q.size ? `/news?${q}` : "/news";
  };
  const chip = (active: boolean) => cn("brutal-sm press shrink-0 rounded-md px-3 py-1 text-sm font-semibold", active ? "bg-saffron text-ink" : "bg-surface");
  return (
    <>
      {/* Where: every state/UT we have news for (Andaman and Nicobar too) */}
      <nav aria-label="States" className="mt-8 flex flex-wrap gap-2">
        {[null, ...states].map((s) => (
          <Link key={s ?? "all"} href={href(s, source)} aria-current={s === state ? "page" : undefined} className={chip(s === state)}>
            {s ?? t.news.allStates}
          </Link>
        ))}
      </nav>

      {verified.items.length > 0 && (
        <section className="mt-10">
          <h2 className="flex items-center gap-2 text-2xl font-black">
            <BadgeCheck className="size-6 text-flag-green" aria-hidden /> {t.news.verified}
          </h2>
          <p className="mt-1 text-sm text-muted">{t.news.verifiedLead}</p>
          <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {verified.items.map((n) => (
              <div key={n.id} id={`story-${n.id}`} className="scroll-mt-28">
                <NewsCard item={n} t={t} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-12">
        <h2 className="flex items-center gap-2 text-2xl font-black">
          <Newspaper className="size-6 text-saffron" aria-hidden /> {t.news.latest}
        </h2>
        <p className="mt-1 text-sm text-muted">{t.news.latestLead}</p>
        <nav aria-label="Sources" className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
          {[null, ...all.sources].map((src) => (
            <Link key={src ?? "all"} href={href(state, src)} aria-current={src === source ? "page" : undefined} className={chip(src === source)}>
              {src ?? t.news.allSources}
            </Link>
          ))}
        </nav>
        {headlines.items.length ? (
          <ul className="mt-5 grid gap-4 md:grid-cols-2">
            {headlines.items.map((h) => (
              <li key={h.id}>
                {/* Headline + link only: the story is read on the publisher's own site */}
                <a href={h.url} target="_blank" rel="noopener noreferrer" className="brutal-sm press group flex h-full flex-col gap-2 rounded-md bg-surface p-4">
                  <span className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-muted">
                    <span className="font-bold text-foreground">{h.sourceName}</span>
                    {h.sourcePublishedAt && <span>{new Date(h.sourcePublishedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}</span>}
                    {h.state && <span className="rounded-sm border border-current px-1.5 py-px uppercase">{h.state}</span>}
                  </span>
                  <span className="font-bold leading-snug group-hover:underline">{h.headline}</span>
                  <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-saffron">
                    {t.news.readAt.replace("{source}", h.sourceName.split(":")[0]!)} <ExternalLink className="size-3.5" aria-hidden />
                  </span>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="brutal mt-5 rounded-md bg-surface p-6 text-muted">{t.news.empty}</p>
        )}
      </section>
    </>
  );
}
