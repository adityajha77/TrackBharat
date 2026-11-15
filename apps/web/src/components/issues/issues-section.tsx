import Link from "next/link";
import { Megaphone, Plus, Trophy } from "lucide-react";
import { getHighlights } from "@/lib/api";
import { getIssues, getMe } from "@/lib/api-user";
import { Card } from "@/components/ui/card";
import { IssueCard } from "./issue-card";

const weekLabel = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

/**
 * Citizen issues for one constituency: this week's live ranking + last week's
 * frozen highlights. Personalised (votedByMe), so render inside <Suspense>.
 */
export async function IssuesSection({ slug, name, compact = false }: { slug: string; name: string; compact?: boolean }) {
  const [me, live, highlights] = await Promise.all([getMe().catch(() => null), getIssues(slug, "top", compact ? 3 : 10).catch(() => null), getHighlights(slug).catch(() => null)]);
  const signedIn = Boolean(me);

  return (
    <section aria-labelledby={`issues-${slug}`} className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id={`issues-${slug}`} className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <Megaphone className="size-5 text-saffron" aria-hidden /> Local issues in {name}
          </h2>
          <p className="mt-1 text-sm text-muted">
            Ranked by residents&apos; votes this week{live && <> (week of {weekLabel(live.weekStart)})</>}. One vote per person per issue per week.
          </p>
        </div>
        <Link href={`/issues/new?seat=${slug}`} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90">
          <Plus className="size-4" aria-hidden /> Report a problem
        </Link>
      </div>

      {live?.issues.length ? (
        <div className="space-y-3">
          {live.issues.map((i) => (
            <IssueCard key={i.id} issue={i} signedIn={signedIn} />
          ))}
        </div>
      ) : (
        <Card className="border-dashed text-sm text-muted">No issues reported here yet. Be the first to raise one.</Card>
      )}

      {!compact && highlights?.weekStart && highlights.items.length > 0 && (
        <Card className="bg-surface-muted">
          <h3 className="flex items-center gap-2 font-semibold">
            <Trophy className="size-4 text-saffron" aria-hidden /> Highlighted last week (week of {weekLabel(highlights.weekStart)})
          </h3>
          <p className="mt-1 text-xs text-muted">Frozen every Monday by our weekly job: what residents cared about most that week.</p>
          <ol className="mt-4 space-y-2">
            {highlights.items.map((h) => (
              <li key={h.rank} className="flex items-baseline gap-3 text-sm">
                <span className="w-6 shrink-0 font-mono font-semibold text-saffron">#{h.rank}</span>
                <Link href={`/issues/${h.issue.id}`} className="flex-1 hover:text-primary">
                  {h.issue.title}
                </Link>
                <span className="shrink-0 font-mono text-xs text-muted">{h.votes} votes</span>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </section>
  );
}
