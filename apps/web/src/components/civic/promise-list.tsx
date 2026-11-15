"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarClock, ChevronRight } from "lucide-react";
import type { PromiseStatus, PromiseSummary } from "@trackbharat/shared";
import { CATEGORY, STATUS, STATUS_ORDER, formatDate } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./bits";

/** Promise list with status filter chips. Client-side: the full list is already on the page. */
export function PromiseList({ promises }: { promises: PromiseSummary[] }) {
  const [filter, setFilter] = useState<PromiseStatus | "ALL">("ALL");
  const present = STATUS_ORDER.filter((s) => promises.some((p) => p.status === s));
  const visible = filter === "ALL" ? promises : promises.filter((p) => p.status === filter);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter promises by status">
        {(["ALL", ...present] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            aria-pressed={filter === s}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors",
              filter === s ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted hover:text-foreground",
            )}
          >
            {s === "ALL" ? `All (${promises.length})` : STATUS[s].label}
          </button>
        ))}
      </div>

      <ul className="mt-4 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
        {visible.map((p) => {
          const overdue = p.deadline && p.deadline < today && !["FULFILLED", "BROKEN"].includes(p.status);
          return (
            <li key={p.id}>
              <Link href={`/promise/${p.id}`} className="group flex items-center gap-4 px-5 py-4 hover:bg-surface-muted">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={p.status} />
                    <span className="text-xs text-muted">{CATEGORY[p.category]}</span>
                  </div>
                  <p className="mt-1.5 font-medium">{p.title}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-muted">
                    <span>by {p.madeBy}</span>
                    {p.deadline && (
                      <span className={cn("inline-flex items-center gap-1", overdue && "text-danger")}>
                        <CalendarClock className="size-3" aria-hidden />
                        {overdue ? "Overdue since" : "Due"} {formatDate(p.deadline)}
                      </span>
                    )}
                  </p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
