"use client";

import { useState, type ReactNode } from "react";
import type { TimelineEvent } from "@trackbharat/shared";
import { cn } from "@/lib/utils";

type Party = { slug: string; name: string; short: string; color: string };

/**
 * The shared timeline: national milestones for everyone, plus each party's
 * events. Filter chips are client-side (the whole list is small).
 * Mobile: one column; desktop: events alternate left and right of the spine.
 */
export function TimelineView({
  parties,
  events,
  labels,
  profiles,
}: {
  parties: Party[];
  events: TimelineEvent[];
  labels: { all: string; national: string; source: string };
  /** Server-rendered profile (founders, mission, leaders' photos) per party slug. */
  profiles: Record<string, ReactNode>;
}) {
  const [only, setOnly] = useState<string | null>(null);
  const colour = Object.fromEntries(parties.map((p) => [p.slug, p.color]));
  const short = Object.fromEntries(parties.map((p) => [p.slug, p.short]));
  // "All parties": everything, with national milestones. One party: only its
  // own events and its own profile, nothing from other parties.
  const shown = events.filter((e) => (only ? e.party === only : true));
  const shownProfiles = only ? parties.filter((p) => p.slug === only) : parties;

  return (
    <div className="mt-10">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by party">
        {[{ slug: null, short: labels.all, color: "var(--ink)" }, ...parties].map((p) => (
          <button
            key={p.slug ?? "all"}
            type="button"
            aria-pressed={only === p.slug}
            onClick={() => setOnly(p.slug)}
            className={cn("brutal-sm press inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-semibold", only === p.slug ? "bg-saffron text-ink" : "bg-surface")}
          >
            <span className="inline-block size-2.5 rounded-sm border border-ink" style={{ background: p.color }} />
            {p.short}
          </button>
        ))}
      </div>

      <ol className="relative mt-10 before:absolute before:inset-y-0 before:left-3 before:w-1 before:bg-ink md:before:left-1/2 md:before:-translate-x-1/2">
        {shown.map((e, i) => {
          const national = e.party === null;
          const left = i % 2 === 0;
          return (
            <li key={`${e.party}-${e.date}-${e.title}`} className={cn("reveal relative mb-6 pl-10 md:w-1/2 md:pl-0", left ? "md:pr-10" : "md:ml-auto md:pl-10")}>
              <span
                aria-hidden
                className={cn("absolute left-1 top-4 size-5 rounded-full border-2 border-ink md:top-4", left ? "md:left-auto md:-right-2.5" : "md:-left-2.5")}
                style={{ background: national ? "var(--flag-saffron)" : colour[e.party!] }}
              />
              <div className={cn("brutal rounded-md p-4", national ? "bg-ink text-background" : "bg-surface")}>
                <p className="flex flex-wrap items-center gap-2 font-mono text-xs">
                  <span className="font-bold">{e.precision === "YEAR" ? e.date.slice(0, 4) : e.precision === "MONTH" ? e.date.slice(0, 7) : e.date}</span>
                  <span className="rounded-sm border border-current px-1.5 py-px uppercase">{national ? labels.national : short[e.party!]}</span>
                </p>
                <p className="mt-1 font-bold">{e.title}</p>
                <p className={cn("mt-1 text-sm", national ? "text-background/80" : "text-muted")}>
                  {e.body}{" "}
                  <a href={e.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-xs underline">
                    {labels.source}
                  </a>
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      {/* Every party, the same sections in the same order */}
      <section className="mt-16 space-y-12">{shownProfiles.map((p) => profiles[p.slug])}</section>
    </div>
  );
}
