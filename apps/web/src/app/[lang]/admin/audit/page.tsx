import { Suspense } from "react";
import type { Metadata } from "next";
import { getAuditLog } from "@/lib/api-user";
import { AdminHeader, AdminTabs, requireRole } from "../admin-frame";

export const metadata: Metadata = { title: "Audit log · Admin" };

/** AUDIT LOG (admins only): the last 100 decisions, who made them and why. */
export default function AdminAuditPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <AdminHeader title="Audit log" lead="Every moderation and admin decision, newest first: who did it, to what, and the reason they gave. Entries can't be edited or deleted." />
      <Suspense fallback={<div className="mt-8 h-96 animate-pulse rounded-md bg-surface-muted" />}>
        <Audit />
      </Suspense>
    </div>
  );
}

async function Audit() {
  const me = await requireRole("/admin/audit", ["ADMIN"]);
  const { entries } = await getAuditLog();
  return (
    <>
      <AdminTabs me={me} active="/admin/audit" />
      <div className="brutal mt-6 overflow-x-auto rounded-md bg-surface">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b-2 border-ink text-left font-mono text-xs uppercase text-muted">
            <tr>
              <th className="p-3">When</th>
              <th className="p-3">Who</th>
              <th className="p-3">Action</th>
              <th className="p-3">On</th>
              <th className="p-3">Reason / details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10 align-top">
            {entries.map((e) => (
              <tr key={e.id}>
                <td className="whitespace-nowrap p-3 font-mono text-xs">{new Date(e.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}</td>
                <td className="p-3">{e.actor ?? <span className="text-muted">system / deleted account</span>}</td>
                <td className="p-3 font-mono text-xs">{e.action}</td>
                <td className="p-3 font-mono text-xs">
                  {e.entityType} #{e.entityId}
                </td>
                <td className="max-w-sm p-3 text-xs text-muted">{e.details ? String((e.details as { note?: unknown }).note ?? JSON.stringify(e.details)).slice(0, 200) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
