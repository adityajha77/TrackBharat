"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { Search } from "lucide-react";
import type { ConstituencyIndexResponse } from "@trackbharat/shared";

/**
 * Instant search over 543 seats, entirely in the browser: the list is small,
 * so filtering locally beats a round trip per keystroke.
 * useDeferredValue keeps typing smooth while the list re-renders.
 */
export function ConstituencyBrowser({ states }: { states: ConstituencyIndexResponse["states"] }) {
  const [query, setQuery] = useState("");
  const q = useDeferredValue(query.trim().toLowerCase());

  const filtered = states
    .map((s) => ({
      ...s,
      constituencies: q && !s.state.toLowerCase().includes(q) ? s.constituencies.filter((c) => c.name.toLowerCase().includes(q)) : s.constituencies,
    }))
    .filter((s) => s.constituencies.length);
  const count = filtered.reduce((n, s) => n + s.constituencies.length, 0);

  return (
    <>
      <div className="sticky top-[4.25rem] z-10 -mx-4 mt-8 bg-background/90 px-4 py-3 backdrop-blur md:top-[4.25rem]">
        <label className="flex max-w-md items-center gap-2 rounded-xl border border-border bg-surface px-4 focus-within:border-primary">
          <Search className="size-4 text-muted" aria-hidden />
          <span className="sr-only">Search constituencies or states</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a constituency or state…"
            className="h-11 flex-1 bg-transparent outline-none placeholder:text-muted"
          />
        </label>
        <p className="mt-2 text-xs text-muted" aria-live="polite">
          {count} constituencies
        </p>
      </div>

      <div className="mt-4 columns-1 gap-8 sm:columns-2 lg:columns-3">
        {filtered.map((s) => (
          <section key={s.state} className="mb-8 break-inside-avoid">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">
              {s.state} <span className="font-mono font-normal">({s.constituencies.length})</span>
            </h2>
            <ul className="space-y-0.5">
              {s.constituencies.map((c) => (
                <li key={c.slug}>
                  <Link href={`/constituency/${c.slug}`} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-muted">
                    <span>{c.name}</span>
                    {c.reservation !== "GEN" && <span className="font-mono text-[10px] text-muted">{c.reservation}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
