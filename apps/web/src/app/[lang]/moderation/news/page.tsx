import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { Eyebrow } from "@/components/ui/card";
import { getT } from "@/i18n/server";
import { getConstituencyIndex } from "@/lib/api";
import { getMe, getNewsQueue } from "@/lib/api-user";
import { NewsReviewForm } from "./news-review-form";

export const metadata: Metadata = { title: "News review queue" };

/**
 * VERIFIER QUEUE: headlines from RSS feeds and citizens. A verifier reads the
 * original, writes 2–5 lines in their own words, tags where it happened and who
 * is responsible, and publishes. Or rejects. Every decision is audited.
 */
export default function NewsQueuePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <Eyebrow>Verifiers</Eyebrow>
      <h1 className="mt-2 text-3xl font-black tracking-tight">News review queue</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Open the original, then summarise it in your own words (2–5 lines, never copy the article). Prefer stories about everyday
        problems that get little attention. Name who is responsible only if the report says so.
      </p>
      <Suspense fallback={<div className="mt-8 h-96 animate-pulse rounded-md bg-surface-muted" />}>
        <Queue />
      </Suspense>
    </div>
  );
}

async function Queue() {
  const me = await getMe().catch(() => null);
  if (!me) redirect("/login?next=/moderation/news");
  if (me.role === "CITIZEN") redirect("/me");
  const [{ t }, { items }, index] = await Promise.all([getT(), getNewsQueue(), getConstituencyIndex()]);
  const states = index.states.map((s) => s.state).sort();
  if (!items.length) return <p className="brutal mt-8 rounded-md bg-surface p-6 text-muted">The queue is empty. Run `pnpm job:news` to fetch headlines.</p>;
  return (
    <ul className="mt-8 space-y-5">
      {items.slice(0, 30).map((n) => (
        <li key={n.id} className="brutal rounded-md bg-surface p-5">
          <p className="font-mono text-xs text-muted">
            {n.sourceName}
            {n.sourcePublishedAt && ` · ${new Date(n.sourcePublishedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}`}
          </p>
          <a href={n.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-start gap-1 text-lg font-bold hover:underline">
            {n.headline} <ExternalLink className="mt-1.5 size-4 shrink-0" aria-hidden />
          </a>
          <NewsReviewForm id={n.id} states={states} categories={Object.entries(t.category)} defaultState={n.state} />
        </li>
      ))}
    </ul>
  );
}
