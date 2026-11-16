import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "@/components/link";
import { redirect } from "next/navigation";
import { getMyActivity } from "@/lib/api-user";
import { ApiError } from "@/lib/api";
import { Badge, Card } from "@/components/ui/card";
import { IssueCard } from "@/components/issues/issue-card";
import { VerifyBanner } from "@/components/auth/verify-banner";

export const metadata: Metadata = { title: "My activity" };

export default function MePage({ searchParams }: PageProps<"/[lang]/me">) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-md bg-surface-muted" />}>
        {searchParams.then((sp) => (
          <Activity submitted={sp.submitted === "1"} />
        ))}
      </Suspense>
    </div>
  );
}

const SUB_TONE = { PENDING: "soon", APPROVED: "live", REJECTED: "neutral" } as const;

async function Activity({ submitted }: { submitted: boolean }) {
  const data = await getMyActivity().catch((e) => (e instanceof ApiError && e.status === 401 ? null : Promise.reject(e)));
  if (!data) redirect("/login?next=/me");

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Namaste, {data.user.name.split(" ")[0]}</h1>
        <p className="mt-1 text-muted">Everything you&apos;ve reported and submitted.</p>
      </header>
      {data.user.emailVerified === false && <VerifyBanner />}
      {submitted && (
        <p role="status" className="rounded-md border border-green/40 bg-green/10 px-4 py-3 text-sm">
          Thanks! Your promise was sent for review. A verifier checks the source before it appears on the site.
        </p>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Your reports ({data.issues.length})</h2>
          <Link href="/issues/new" className="text-sm font-medium text-primary">
            Report a problem →
          </Link>
        </div>
        {data.issues.length ? (
          data.issues.map((i) => <IssueCard key={i.id} issue={i} signedIn />)
        ) : (
          <Card className="border-dashed text-sm text-muted">You haven&apos;t reported anything yet.</Card>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Promises you submitted ({data.submissions.length})</h2>
          <Link href="/promises/submit" className="text-sm font-medium text-primary">
            Submit a promise →
          </Link>
        </div>
        {data.submissions.map((s) => (
          <Card key={s.id} className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">{s.payload.title}</p>
              <Badge tone={SUB_TONE[s.status]}>{s.status.toLowerCase()}</Badge>
            </div>
            {s.reviewNote && <p className="mt-2 text-sm text-muted">Reviewer: “{s.reviewNote}”</p>}
            {s.promiseId && (
              <Link href={`/promise/${s.promiseId}`} className="mt-2 inline-block text-sm text-primary">
                View the published promise →
              </Link>
            )}
          </Card>
        ))}
        {!data.submissions.length && <Card className="border-dashed text-sm text-muted">No submissions yet.</Card>}
      </section>
    </div>
  );
}
