import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "@/components/link";
import { Input, Select } from "@/components/ui/field";
import { getAdminPromises } from "@/lib/api-user";
import { AdminHeader, AdminTabs, requireRole } from "../admin-frame";
import { PromiseEvidenceForm, PromiseStatusForm } from "../forms";

export const metadata: Metadata = { title: "Promises · Admin" };

/**
 * PROMISES on MP report cards (verifiers and admins): change a status or add
 * evidence. Both always need a public source, which the report card shows.
 * (Party manifestos are curated files in apps/api/data/parties, not edited here.)
 */
export default function AdminPromisesPage({ searchParams }: PageProps<"/[lang]/admin/promises">) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <AdminHeader title="Promises" lead="Update a report-card promise when something happens: a new status, or evidence for or against progress. Always link the source; it is shown to everyone." />
      <Suspense fallback={<div className="mt-8 h-96 animate-pulse rounded-md bg-surface-muted" />}>
        {searchParams.then((sp) => (
          <Promises q={typeof sp.q === "string" ? sp.q : ""} status={typeof sp.status === "string" ? sp.status : ""} offset={Number(sp.offset) || 0} />
        ))}
      </Suspense>
    </div>
  );
}

async function Promises({ q, status, offset }: { q: string; status: string; offset: number }) {
  const me = await requireRole("/admin/promises", ["VERIFIER", "ADMIN"]);
  const { promises, total } = await getAdminPromises({ q, status, offset });
  return (
    <>
      <AdminTabs me={me} active="/admin/promises" />
      <form className="mt-6 flex flex-wrap items-end gap-2" action="/admin/promises">
        <Input name="q" defaultValue={q} placeholder="Search promise or constituency" className="mt-0 max-w-xs" />
        <Select name="status" defaultValue={status} className="mt-0 w-44">
          <option value="">Any status</option>
          {["PENDING", "IN_PROGRESS", "PARTIAL", "FULFILLED", "STALLED", "BROKEN"].map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ").toLowerCase()}
            </option>
          ))}
        </Select>
        <button className="brutal-sm press rounded-md bg-surface px-3 py-2 text-sm font-semibold">Search</button>
      </form>
      <p className="mt-4 font-mono text-xs text-muted">{total} promises</p>
      {promises.length === 0 && (
        <p className="brutal mt-4 rounded-md bg-surface p-6 text-muted">
          No promises yet. They are added when a verifier approves a citizen&apos;s promise suggestion (Moderation queue).
        </p>
      )}
      <ul className="mt-3 space-y-4">
        {promises.map((p) => (
          <li key={p.id} className="brutal rounded-md bg-surface p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-bold">{p.title}</p>
              <span className="rounded-sm border-2 border-ink px-1.5 font-mono text-[11px] uppercase">{p.status.replace("_", " ")}</span>
            </div>
            <p className="mt-1 text-xs text-muted">
              {p.madeBy ?? "Unknown"} ·{" "}
              {p.constituency ? (
                <Link href={`/constituency/${p.constituency.slug}`} className="underline">
                  {p.constituency.name}, {p.constituency.state}
                </Link>
              ) : (
                "nationwide"
              )}{" "}
              · {p.evidenceCount} evidence · updated {new Date(p.updatedAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
              {p.isDemo && " · demo data"}
            </p>
            <div className="mt-3 grid gap-4 lg:grid-cols-2">
              <details className="rounded-md border-2 border-ink/15 p-3">
                <summary className="cursor-pointer text-sm font-semibold">Change status</summary>
                <div className="mt-3">
                  <PromiseStatusForm id={p.id} status={p.status} />
                </div>
              </details>
              <details className="rounded-md border-2 border-ink/15 p-3">
                <summary className="cursor-pointer text-sm font-semibold">Add evidence</summary>
                <div className="mt-3">
                  <PromiseEvidenceForm id={p.id} />
                </div>
              </details>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex gap-3">
        {offset > 0 && (
          <Link href={`/admin/promises?${new URLSearchParams({ q, status, offset: String(Math.max(offset - 30, 0)) })}`} className="underline">
            ← Previous
          </Link>
        )}
        {offset + promises.length < total && (
          <Link href={`/admin/promises?${new URLSearchParams({ q, status, offset: String(offset + 30) })}`} className="underline">
            Next →
          </Link>
        )}
      </div>
    </>
  );
}
