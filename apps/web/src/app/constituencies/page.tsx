import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { getConstituencyIndex } from "@/lib/api";
import { ConstituencyBrowser } from "./constituency-browser";

export const metadata: Metadata = {
  title: "All Lok Sabha constituencies",
  description: "Browse all 543 Lok Sabha constituencies of India by state: MPs, promises and progress.",
};

export default function ConstituenciesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Lok Sabha constituencies</h1>
      <p className="mt-3 max-w-2xl text-muted">
        All 543 seats of the 18th Lok Sabha, by state and union territory. Pick one to see its MP and the promises being
        tracked.
      </p>
      <Suspense fallback={<div className="mt-8 h-96 animate-pulse rounded-2xl bg-surface-muted" aria-busy="true" />}>
        <List />
      </Suspense>
    </div>
  );
}

async function List() {
  // connection() = "render this at request time, not at build time". Without it,
  // Next would prerender during `next build`, when the API may not be running
  // (e.g. in CI), and bake an error into the page. The data itself is still
  // cached for days by getConstituencyIndex's "use cache".
  await connection();
  const data = await getConstituencyIndex().catch(() => null);
  if (!data) return <p className="mt-8 text-sm text-danger">The constituency list is unavailable right now. Please try again shortly.</p>;
  return <ConstituencyBrowser states={data.states} />;
}
