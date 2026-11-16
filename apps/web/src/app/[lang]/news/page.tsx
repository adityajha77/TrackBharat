import { Suspense } from "react";
import type { Metadata } from "next";
import { Send } from "lucide-react";
import Link from "@/components/link";
import { NewsCard } from "@/components/voices/news-card";
import { ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/card";
import { getT } from "@/i18n/server";
import { getNews } from "@/lib/api";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.news.title, description: t.news.lead };
}

export default async function NewsPage({ searchParams }: PageProps<"/[lang]/news">) {
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
          <Feed state={typeof sp.state === "string" ? sp.state : null} />
        ))}
      </Suspense>
    </div>
  );
}

async function Feed({ state }: { state: string | null }) {
  const [{ t }, all, filtered] = await Promise.all([getT(), getNews(null), state ? getNews(state) : null]);
  const items = (filtered ?? all).items;
  return (
    <>
      {all.states.length > 0 && (
        <nav aria-label="States" className="mt-8 flex flex-wrap gap-2">
          {[null, ...all.states].map((s) => (
            <Link
              key={s ?? "all"}
              href={s ? `/news?state=${encodeURIComponent(s)}` : "/news"}
              aria-current={s === state ? "page" : undefined}
              className={cn("brutal-sm press rounded-md px-3 py-1 text-sm font-semibold", s === state ? "bg-saffron text-ink" : "bg-surface")}
            >
              {s ?? t.news.allStates}
            </Link>
          ))}
        </nav>
      )}
      {items.length ? (
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {items.map((n) => (
            <div key={n.id} id={`story-${n.id}`} className="scroll-mt-28">
              <NewsCard item={n} t={t} />
            </div>
          ))}
        </div>
      ) : (
        <p className="brutal mt-8 rounded-md bg-surface p-6 text-muted">{t.news.empty}</p>
      )}
    </>
  );
}
