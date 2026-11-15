import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getMe } from "@/lib/api-user";
import { Card } from "@/components/ui/card";
import { SubmitPromiseForm } from "./submit-form";

export const metadata: Metadata = { title: "Submit a promise" };

export default function SubmitPromisePage({ searchParams }: PageProps<"/promises/submit">) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Submit a promise</h1>
      <p className="mt-2 text-muted">
        Saw a candidate or MP promise something? Send it with a public link: a manifesto, an official speech, a gazette or a
        news report. A verifier checks the source before anything is published.
      </p>
      <Card className="mt-8">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-surface-muted" />}>
          {searchParams.then((sp) => (
            <Gate seat={typeof sp.seat === "string" ? sp.seat : ""} />
          ))}
        </Suspense>
      </Card>
    </div>
  );
}

async function Gate({ seat }: { seat: string }) {
  if (!(await getMe().catch(() => null))) redirect("/login?next=/promises/submit");
  return <SubmitPromiseForm defaultSeat={seat} />;
}
