"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { RepresentativePhoto } from "@/components/civic/representative-photo";
import type { NetaResponse } from "@trackbharat/shared";
import Link from "@/components/link";
import { fmt } from "@/i18n/client";
import { cn } from "@/lib/utils";

type Labels = { search: string; allParties: string; allStates: string; results: string; noMla: string; seats: string };

/**
 * Filters run in the browser: ~540 MPs or a few thousand MLAs is a small list.
 * useDeferredValue keeps typing smooth while the list re-renders.
 */
export function NetaBrowser({ data, labels }: { data: NetaResponse; labels: Labels }) {
  const [q, setQ] = useState("");
  const [party, setParty] = useState<string | null>(null);
  const [state, setState] = useState<string>("");
  const query = useDeferredValue(q.trim().toLowerCase());

  const shown = useMemo(
    () =>
      data.netas.filter(
        (n) =>
          (!party || (n.party ?? "Independent") === party) &&
          (!state || n.seat.state === state) &&
          (!query || n.name.toLowerCase().includes(query) || n.seat.name.toLowerCase().includes(query)),
      ),
    [data.netas, party, state, query],
  );
  // Thousands of MLAs at once would be slow on a cheap phone: show the first 300 until filtered.
  const LIMIT = 300;
  const capped = shown.length > LIMIT;
  const byState = useMemo(() => {
    const m = new Map<string, typeof shown>();
    for (const n of shown.slice(0, LIMIT)) m.set(n.seat.state, [...(m.get(n.seat.state) ?? []), n]);
    return [...m.entries()];
  }, [shown]);
  const emptyStates = data.house === "VIDHAN_SABHA" ? data.states.filter((s) => s.filled === 0).map((s) => s.state) : [];

  return (
    <div className="mt-6">
      {/* Party chips: seats per party (top 10) */}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setParty(null)} aria-pressed={!party} className={cn("brutal-sm press rounded-md px-3 py-1 text-sm font-semibold", !party ? "bg-saffron text-ink" : "bg-surface")}>
          {labels.allParties} <span className="font-mono">{data.netas.length}</span>
        </button>
        {data.parties.slice(0, 10).map((p) => (
          <button
            key={p.party}
            type="button"
            onClick={() => setParty(party === p.party ? null : p.party)}
            aria-pressed={party === p.party}
            title={p.party}
            className={cn("brutal-sm press rounded-md px-3 py-1 text-sm font-semibold", party === p.party ? "bg-saffron text-ink" : "bg-surface")}
          >
            {p.short ?? p.party} <span className="font-mono">{p.seats}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_16rem]">
        <label className="relative block">
          <span className="sr-only">{labels.search}</span>
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={labels.search}
            className="w-full rounded-md border-2 border-ink bg-surface py-2.5 pl-9 pr-3 text-sm outline-none focus:shadow-[3px_3px_0_var(--ink)]"
          />
        </label>
        <select value={state} onChange={(e) => setState(e.target.value)} aria-label={labels.allStates} className="rounded-md border-2 border-ink bg-surface px-3 py-2.5 text-sm">
          <option value="">{labels.allStates}</option>
          {data.states.map((s) => (
            <option key={s.state} value={s.state}>
              {s.state} ({s.filled}/{s.seats})
            </option>
          ))}
        </select>
      </div>
      <p className="mt-3 font-mono text-xs text-muted" aria-live="polite">
        {fmt(labels.results, { n: shown.length })}
      </p>

      <div className="mt-6 space-y-10">
        {byState.map(([st, netas]) => (
          <section key={st}>
            <h2 className="flex items-baseline gap-3 border-b-2 border-ink pb-1 text-xl font-black">
              {st} <span className="font-mono text-xs font-normal text-muted">{fmt(labels.seats, { n: netas.length })}</span>
            </h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {netas.map((n) => (
                <li key={n.seat.slug}>
                  <Link href={`/constituency/${n.seat.slug}`} className="brutal-sm press flex h-full items-center gap-3 rounded-md bg-surface p-3">
                    {/* Initials, not the sansad.in photo: that site forbids embedding (see RepresentativePhoto) */}
                    <RepresentativePhoto name={n.name} className="size-12 shrink-0 rounded-sm border-2 border-ink text-sm" />
                    <span className="min-w-0">
                      <span className="block truncate font-bold">{n.name}</span>
                      <span className="block truncate text-xs text-muted">
                        #{n.seat.number} {n.seat.name}
                        {n.seat.reservation !== "GEN" && ` (${n.seat.reservation})`}
                      </span>
                      <span className="block truncate font-mono text-[11px]">{n.partyShort ?? n.party ?? "Independent"}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {capped && <p className="mt-8 text-center font-mono text-xs text-muted">Showing the first {LIMIT}. Choose a state or search to see the rest.</p>}

      {emptyStates.length > 0 && !party && !query && (
        <p className="brutal mt-10 rounded-md bg-surface p-5 text-sm text-muted">
          {labels.noMla} {emptyStates.join(", ")}.
        </p>
      )}
    </div>
  );
}
