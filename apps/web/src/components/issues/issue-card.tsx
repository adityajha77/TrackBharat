import Link from "@/components/link";
import { Camera, Clock } from "lucide-react";
import type { IssueSummary } from "@trackbharat/shared";
import { CATEGORY } from "@/lib/labels";
import { IssueStatusBadge } from "./issue-status";
import { UpDownVote } from "@/components/voices/up-down-vote";

const ago = (iso: string) => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return days <= 0 ? "today" : days === 1 ? "yesterday" : days < 30 ? `${days} days ago` : new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

export function IssueCard({ issue, signedIn, rank }: { issue: IssueSummary; signedIn: boolean; rank?: number }) {
  return (
    <article className="brutal flex gap-4 rounded-md bg-surface p-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          {rank && <span className="font-mono font-semibold text-saffron">#{rank}</span>}
          <IssueStatusBadge status={issue.status} />
          <span>{CATEGORY[issue.category]}</span>
          {issue.photoPath && <Camera className="size-3.5" aria-label="Has a photo" />}
        </div>
        <Link href={`/issues/${issue.id}`} className="mt-1 block font-medium hover:text-primary">
          {issue.title}
        </Link>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-muted">
          <span>
            by {issue.reporter} · PIN <span className="font-mono">{issue.pincode}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3" aria-hidden /> {ago(issue.createdAt)}
          </span>
          <span>{issue.votesTotal} votes all-time</span>
        </p>
        <div className="mt-3">
          <UpDownVote
            kind="issue"
            id={issue.id}
            up={issue.votesThisWeek}
            down={issue.downVotesThisWeek}
            myVote={issue.myVote ?? 0}
            signedIn={signedIn}
            size="sm"
            disabled={issue.status === "RESOLVED" ? "Resolved issues can't be voted on" : undefined}
          />
        </div>
      </div>
      {issue.photoPath && (
        // eslint-disable-next-line @next/next/no-img-element -- our own already-optimised WebP, served via /media
        <img src={issue.photoPath} alt="" loading="lazy" className="hidden size-20 shrink-0 rounded-md border-2 border-ink object-cover sm:block" />
      )}
    </article>
  );
}
