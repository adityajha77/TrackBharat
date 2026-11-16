"use client";

import { useActionState } from "react";
import { moderateIssueAction, reviewSubmissionAction, type ActionState } from "@/app/actions";
import { Input } from "@/components/ui/field";
import { cn } from "@/lib/utils";

const LABEL: Record<string, string> = {
  RESTORE: "Restore",
  HIDE: "Hide",
  ACKNOWLEDGE: "Acknowledge",
  RESOLVE: "Mark resolved",
  DISMISS_REPORTS: "Dismiss reports",
  APPROVE: "Approve & publish",
  REJECT: "Reject",
};
const DANGER = new Set(["HIDE", "REJECT"]);

/** One form, several submit buttons: the clicked button's name/value is sent with the form. */
export function DecisionForm({ kind, id, slug, options }: { kind: "issue" | "submission"; id: number; slug?: string; options: string[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(kind === "issue" ? moderateIssueAction : reviewSubmissionAction, {});
  if (state.ok) return <p className="text-sm text-green">Done. Recorded in the audit log.</p>;
  const field = kind === "issue" ? "action" : "decision";

  return (
    <form action={action} className="space-y-2 border-t border-border pt-3">
      <input type="hidden" name={kind === "issue" ? "issueId" : "submissionId"} value={id} />
      {slug && <input type="hidden" name="constituencySlug" value={slug} />}
      <Input name="note" required minLength={5} maxLength={500} placeholder="Note for the record (required)" className="mt-0" />
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o}
            name={field}
            value={o}
            disabled={pending}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50",
              DANGER.has(o) ? "border-danger/40 text-danger hover:bg-danger/10" : "border-border hover:border-primary hover:text-primary",
            )}
          >
            {LABEL[o] ?? o}
          </button>
        ))}
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
    </form>
  );
}
