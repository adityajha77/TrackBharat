import { Suspense } from "react";
import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { getCauses } from "@/lib/api-user";
import { AdminHeader, AdminTabs, requireRole } from "../admin-frame";
import { CauseForm } from "../forms";

export const metadata: Metadata = { title: "Causes · Admin" };

/** CAUSES OF THE WEEK (moderators and admins): reword or pin. The weekly job keeps your edits. */
export default function AdminCausesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <AdminHeader
        title="Causes of the Week"
        lead="Picked every Monday from what citizens reported and voted on. You can give a cause clearer wording or pin it to the top; leave a field empty to use the automatic text."
      />
      <Suspense fallback={<div className="mt-8 h-96 animate-pulse rounded-md bg-surface-muted" />}>
        <Causes />
      </Suspense>
    </div>
  );
}

async function Causes() {
  const me = await requireRole("/admin/causes", ["MODERATOR", "ADMIN"]);
  const [{ t }, data] = await Promise.all([getT(), getCauses()]);
  return (
    <>
      <AdminTabs me={me} active="/admin/causes" />
      <p className="mt-6 font-mono text-xs text-muted">Week starting {data.weekStart}</p>
      {data.causes.length === 0 && (
        <p className="brutal mt-4 rounded-md bg-surface p-6 text-muted">
          No causes this week yet. They are picked on Monday from the previous week&apos;s reports (GitHub Actions → Scheduled jobs → weekly).
        </p>
      )}
      <ul className="mt-3 grid gap-4 md:grid-cols-2">
        {data.causes.map((c) => (
          <li key={c.id} className="brutal rounded-md bg-surface p-4">
            <p className="font-bold">
              {c.title ?? t.category[c.category]} {c.pinned && <span className="ml-1 rounded-sm bg-saffron px-1.5 font-mono text-[10px] text-ink">PINNED</span>}
            </p>
            <p className="mt-1 text-xs text-muted">
              {t.category[c.category]} · {c.issueCount} reports from {c.stateCount} states · ▲ {c.up} ▼ {c.down}
            </p>
            <CauseForm id={c.id} title={c.title} blurb={c.blurb} pinned={c.pinned} />
          </li>
        ))}
      </ul>
    </>
  );
}
