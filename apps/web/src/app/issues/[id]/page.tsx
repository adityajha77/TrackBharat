import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, MapPin } from "lucide-react";
import { ApiError } from "@/lib/api";
import { getIssue, getMe } from "@/lib/api-user";
import { CATEGORY, formatDate } from "@/lib/labels";
import { Card } from "@/components/ui/card";
import { IssueStatusBadge } from "@/components/issues/issue-status";
import { VoteButton } from "@/components/issues/vote-button";
import { ReportButton } from "./report-button";

export const metadata: Metadata = { title: "Local issue" };

export default function IssuePage({ params, searchParams }: PageProps<"/issues/[id]">) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-surface-muted" aria-busy="true" />}>
        {Promise.all([params, searchParams]).then(([p, sp]) => (
          <Details rawId={p.id} isNew={sp.new === "1"} />
        ))}
      </Suspense>
    </div>
  );
}

async function Details({ rawId, isNew }: { rawId: string; isNew: boolean }) {
  if (!/^\d{1,9}$/.test(rawId)) notFound();
  const [issue, me] = await Promise.all([
    getIssue(Number(rawId)).catch((e) => (e instanceof ApiError && e.status === 404 ? null : Promise.reject(e))),
    getMe().catch(() => null),
  ]);
  if (!issue) notFound();

  return (
    <article className="space-y-6">
      <Link href={`/constituency/${issue.constituency.slug}`} className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Issues in {issue.constituency.name}
      </Link>

      {isNew && (
        <p role="status" className="flex items-center gap-2 rounded-xl border border-green/40 bg-green/10 px-4 py-3 text-sm">
          <CheckCircle2 className="size-4 text-green" aria-hidden /> Thanks! Your report is live. Share it with neighbours so they can vote.
        </p>
      )}
      {issue.status === "HIDDEN" && (
        <p className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm">
          This report is hidden while moderators review it. Only you and moderators can see it.
        </p>
      )}

      <header className="flex gap-5">
        <VoteButton
          issueId={issue.id}
          votes={issue.votesThisWeek}
          voted={issue.votedByMe ?? false}
          signedIn={Boolean(me)}
          disabled={issue.status === "RESOLVED" ? "Resolved issues can't be voted on" : undefined}
        />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
            <IssueStatusBadge status={issue.status} />
            <span>{CATEGORY[issue.category]}</span>
          </div>
          <h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight">{issue.title}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 text-sm text-muted">
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden /> PIN <span className="font-mono">{issue.pincode}</span> · {issue.constituency.name}, {issue.constituency.state}
            </span>
            <span>
              Reported by {issue.reporter} on {formatDate(issue.createdAt)}
            </span>
          </p>
        </div>
      </header>

      {issue.photoPath && (
        // eslint-disable-next-line @next/next/no-img-element -- already resized WebP from our API
        <img src={issue.photoPath} alt={`Photo of: ${issue.title}`} className="max-h-[480px] w-full rounded-2xl border border-border object-cover" />
      )}

      <Card>
        <p className="whitespace-pre-line leading-relaxed">{issue.description}</p>
      </Card>

      <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted">Votes this week</dt>
          <dd className="font-mono text-2xl font-semibold">{issue.votesThisWeek}</dd>
        </div>
        <div>
          <dt className="text-muted">Votes all-time</dt>
          <dd className="font-mono text-2xl font-semibold">{issue.votesTotal}</dd>
        </div>
        {issue.resolvedAt && (
          <div>
            <dt className="text-muted">Resolved on</dt>
            <dd className="font-medium text-green">{formatDate(issue.resolvedAt)}</dd>
          </div>
        )}
      </dl>

      {me && issue.status !== "HIDDEN" && <ReportButton issueId={issue.id} />}
    </article>
  );
}
