import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { Eyebrow } from "@/components/ui/card";
import { getT } from "@/i18n/server";
import { getConstituencyIndex } from "@/lib/api";
import { getMe, getNewsQueue } from "@/lib/api-user";
import { AddStoryForm } from "./add-story-form";
import { NewsReviewForm } from "./news-review-form";

export const metadata: Metadata = { title: "News desk" };

/**
 * VERIFIER QUEUE: headlines from RSS feeds and citizens. A verifier reads the
 * original, writes 2–5 lines in their own words, tags where it happened and who
 * is responsible, and publishes. Or rejects. Every decision is audited.
 */
export default function NewsQueuePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <Eyebrow>Verifiers, moderators and admins</Eyebrow>
      <h1 className="mt-2 text-3xl font-black tracking-tight">News desk</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Two jobs here: <strong>add a story yourself</strong>, or <strong>review the queue</strong> (headlines from the press feeds and
        stories citizens suggested). Citizens&apos; suggestions never appear on the site until someone here publishes them. Always
        open the original and summarise it in your own words (2–5 lines, never copy the article).
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
  const categories = Object.entries(t.category);
  const suggested = items.filter((n) => !n.fromFeed);
  const press = items.filter((n) => n.fromFeed);
  const row = (n: (typeof items)[number]) => (
    <li key={n.id} className="brutal rounded-md bg-surface p-5">
      <p className="font-mono text-xs text-muted">
        {n.fromFeed ? n.sourceName : `Suggested by a citizen · ${n.sourceName}`}
        {n.sourcePublishedAt && ` · ${new Date(n.sourcePublishedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}`}
      </p>
      <a href={n.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-start gap-1 text-lg font-bold hover:underline">
        {n.headline} <ExternalLink className="mt-1.5 size-4 shrink-0" aria-hidden />
      </a>
      <NewsReviewForm id={n.id} states={states} categories={categories} defaultState={n.state} />
    </li>
  );
  return (
    <>
      <section className="brutal mt-8 rounded-md bg-surface p-5">
        <h2 className="text-xl font-black">Add a story directly</h2>
        <p className="mt-1 text-sm text-muted">Found something important? Publish it here; it goes live on the News page at once.</p>
        <AddStoryForm states={states} categories={categories} />
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-black">Suggested by citizens ({suggested.length})</h2>
        <p className="mt-1 text-sm text-muted">From the &ldquo;Suggest a story&rdquo; button. Hidden from the public until you publish them.</p>
        {suggested.length ? <ul className="mt-4 space-y-5">{suggested.map(row)}</ul> : <p className="mt-4 text-sm text-muted">Nothing waiting.</p>}
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-black">From the press feeds</h2>
        <p className="mt-1 text-sm text-muted">
          These headlines already show on the News page as links to the publisher. Publishing one here adds your summary, the place
          and who is responsible, and moves it to the top as a verified story.
        </p>
        {press.length ? <ul className="mt-4 space-y-5">{press.slice(0, 30).map(row)}</ul> : <p className="mt-4 text-sm text-muted">The queue is empty. Run `pnpm job:news` to fetch headlines.</p>}
      </section>
    </>
  );
}
