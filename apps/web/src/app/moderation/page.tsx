import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { ApiError } from "@/lib/api";
import { getMe, getModerationQueue } from "@/lib/api-user";
import { CATEGORY } from "@/lib/labels";
import { Card } from "@/components/ui/card";
import { IssueStatusBadge } from "@/components/issues/issue-status";
import { DecisionForm } from "./decision-form";

export const metadata: Metadata = { title: "Review queue", robots: { index: false } };

export default function ModerationPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Review queue</h1>
      <p className="mt-2 text-muted">Every decision is recorded in the audit log with your name and note.</p>
      <Suspense fallback={<div className="mt-8 h-96 animate-pulse rounded-2xl bg-surface-muted" />}>
        <Queue />
      </Suspense>
    </div>
  );
}

async function Queue() {
  const me = await getMe().catch(() => null);
  if (!me) redirect("/login?next=/moderation");
  if (me.role === "CITIZEN") redirect("/me"); // the API would refuse anyway (403); this is just UX
  const q = await getModerationQueue().catch((e) => (e instanceof ApiError ? null : Promise.reject(e)));
  if (!q) return <p className="mt-8 text-sm text-danger">Couldn&apos;t load the queue.</p>;

  const canModerate = me.role === "MODERATOR" || me.role === "ADMIN";
  const canVerify = me.role === "VERIFIER" || me.role === "ADMIN";

  return (
    <div className="mt-10 space-y-12">
      {canModerate && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Reported issues ({q.reportedIssues.length})</h2>
          {q.reportedIssues.map(({ issue, reports }) => (
            <Card key={issue.id} className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <IssueStatusBadge status={issue.status} />
                <span>{CATEGORY[issue.category]}</span>
                <span>· by {issue.reporter}</span>
              </div>
              <Link href={`/issues/${issue.id}`} className="block font-medium hover:text-primary">
                {issue.title}
              </Link>
              <p className="text-sm text-muted">
                {reports.length} open report(s): {[...new Set(reports.map((r) => r.reason.toLowerCase().replace(/_/g, " ")))].join(", ")}
              </p>
              <DecisionForm kind="issue" id={issue.id} options={["RESTORE", "HIDE", "ACKNOWLEDGE", "RESOLVE", "DISMISS_REPORTS"]} />
            </Card>
          ))}
          {!q.reportedIssues.length && <Card className="border-dashed text-sm text-muted">Nothing reported. 🎉</Card>}
        </section>
      )}

      {canVerify && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Promise submissions ({q.submissions.length})</h2>
          {q.submissions.map((s) => (
            <Card key={s.id} className="space-y-3">
              <p className="text-xs text-muted">
                Submitted by {s.submittedBy} for <span className="font-mono">{s.payload.constituencySlug}</span> ·{" "}
                {s.payload.madeBy.type === "PARTY" ? `party: ${s.payload.madeBy.partyName}` : "by the sitting representative"}
              </p>
              <p className="font-medium">{s.payload.title}</p>
              {s.payload.description && <p className="text-sm text-muted">{s.payload.description}</p>}
              <a href={s.payload.source.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-sm text-primary underline underline-offset-2">
                Check the source: {s.payload.source.title} ({s.payload.source.publisher}) <ExternalLink className="size-3" aria-hidden />
              </a>
              <DecisionForm kind="submission" id={s.id} slug={s.payload.constituencySlug} options={["APPROVE", "REJECT"]} />
            </Card>
          ))}
          {!q.submissions.length && <Card className="border-dashed text-sm text-muted">No submissions waiting.</Card>}
        </section>
      )}
    </div>
  );
}
