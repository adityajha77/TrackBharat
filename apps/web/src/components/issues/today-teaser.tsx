import Link from "@/components/link";
import { connection } from "next/server";
import { ArrowRight, Flame } from "lucide-react";
import { getLeaderboard } from "@/lib/api";
import { CATEGORY } from "@/lib/labels";

/**
 * Homepage teaser: the top 3 problem categories India is raising today. Live
 * data, so it's rendered at request time inside <Suspense>; if the API is
 * down or there's nothing yet, it renders nothing and the page is unaffected.
 */
export async function TodayTeaser() {
  await connection();
  const b = await getLeaderboard("day").catch(() => null);
  if (!b || b.categories.length === 0) return null;
  return (
    <section aria-label="What India is asking for today" className="mx-auto max-w-7xl px-4 pt-16">
      <Link href="/leaderboard" className="brutal press group block rounded-md bg-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Flame className="size-4 text-saffron" aria-hidden /> What India is asking for today
          </p>
          <span className="inline-flex items-center gap-1 text-sm text-primary">
            See the leaderboard <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </span>
        </div>
        <ol className="mt-4 grid gap-3 sm:grid-cols-3">
          {b.categories.slice(0, 3).map((c, i) => (
            <li key={c.category} className="rounded-sm border-2 border-ink bg-surface-muted px-4 py-3">
              <span className="font-mono text-xs text-saffron">#{i + 1}</span>
              <p className="font-medium">{CATEGORY[c.category]}</p>
              <p className="text-xs text-muted">
                {c.votes} votes · {c.newIssues} new reports
              </p>
            </li>
          ))}
        </ol>
      </Link>
    </section>
  );
}
