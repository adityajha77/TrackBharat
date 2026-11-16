"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { categories, rights } from "./rights-data";

export function RightsBrowser() {
  const [category, setCategory] = useState<(typeof categories)[number]>("All");
  const visible = category === "All" ? rights : rights.filter((r) => r.category === category);

  return (
    <>
      <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label="Filter by category">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            aria-pressed={category === c}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm transition-colors",
              category === c ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted hover:text-foreground",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="mt-6 divide-y divide-border brutal rounded-md bg-surface">
        {visible.map((r) => (
          // Native <details>: accessible accordion with zero JavaScript state.
          <details key={r.id} className="group px-6 py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
              <div>
                <p className="font-medium">{r.title}</p>
                <p className="mt-1 text-sm text-muted">{r.summary}</p>
              </div>
              <ChevronDown className="size-5 shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <p className="mt-4 text-sm leading-relaxed">{r.details}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {r.references.map((ref) => (
                <span key={ref} className="rounded-md bg-surface-muted px-2 py-1 font-mono text-xs text-muted">
                  {ref}
                </span>
              ))}
            </div>
          </details>
        ))}
      </div>
    </>
  );
}
