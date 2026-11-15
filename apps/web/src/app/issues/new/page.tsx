import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getMe } from "@/lib/api-user";
import { Card } from "@/components/ui/card";
import { NewIssueForm } from "./new-issue-form";

export const metadata: Metadata = { title: "Report a problem" };

export default function NewIssuePage({ searchParams }: PageProps<"/issues/new">) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Report a problem in your area</h1>
      <p className="mt-2 text-muted">
        Describe one specific problem. Your neighbours can vote on it, and every Monday the most-voted issues in each
        constituency are highlighted.
      </p>
      <Card className="mt-8">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-surface-muted" />}>
          {searchParams.then((sp) => (
            <Gate pincode={typeof sp.pin === "string" ? sp.pin : ""} />
          ))}
        </Suspense>
      </Card>
    </div>
  );
}

/** Logged-out visitors are sent to log in first, then straight back here. */
async function Gate({ pincode }: { pincode: string }) {
  const me = await getMe().catch(() => null);
  if (!me) redirect(`/login?next=${encodeURIComponent("/issues/new")}`);
  return <NewIssueForm defaultPincode={pincode} />;
}
