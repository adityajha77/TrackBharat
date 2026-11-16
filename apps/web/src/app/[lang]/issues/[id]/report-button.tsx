"use client";

import { useState, useTransition } from "react";
import { Flag } from "lucide-react";
import { reportIssueAction } from "@/app/actions";

const REASONS = {
  SPAM: "Spam or advertising",
  ABUSIVE: "Abusive or hateful",
  FALSE_INFORMATION: "False or misleading",
  PERSONAL_INFORMATION: "Shares someone's personal information",
  DUPLICATE: "Duplicate of another report",
  OTHER: "Something else",
} as const;

/** Flag a report for moderators. Three independent flags hide it until reviewed. */
export function ReportButton({ issueId }: { issueId: number }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (done) return <p className="text-sm text-muted">{done}</p>;
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-danger">
        <Flag className="size-4" aria-hidden /> Report this post
      </button>
    );

  return (
    <fieldset className="brutal rounded-md p-4" disabled={pending}>
      <legend className="px-1 text-sm font-medium">Why are you reporting this?</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {Object.entries(REASONS).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() =>
              start(async () => {
                const res = await reportIssueAction(issueId, value);
                setDone(res.error ?? "Thanks. Moderators will take a look.");
              })
            }
            className="rounded-full border border-border px-3 py-1 text-sm hover:border-danger hover:text-danger"
          >
            {label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
