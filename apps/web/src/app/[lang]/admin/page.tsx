import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "@/components/link";
import { getAdminOverview } from "@/lib/api-user";
import { AdminHeader, AdminTabs, requireRole } from "./admin-frame";

export const metadata: Metadata = { title: "Admin panel" };

export default function AdminHome() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <AdminHeader title="Overview" lead="What's waiting for a decision, and how the site is growing. Every action in the admin panel is recorded in the audit log." />
      <Suspense fallback={<div className="mt-8 h-64 animate-pulse rounded-md bg-surface-muted" />}>
        <Overview />
      </Suspense>
    </div>
  );
}

async function Overview() {
  const me = await requireRole("/admin", ["VERIFIER", "MODERATOR", "ADMIN"]);
  const o = await getAdminOverview();
  const card = (label: string, value: number, href?: string, urgent = false) => {
    const body = (
      <>
        <span className={`block font-mono text-3xl font-black ${urgent && value > 0 ? "text-danger" : ""}`}>{value.toLocaleString("en-IN")}</span>
        <span className="text-sm text-muted">{label}</span>
      </>
    );
    return href ? (
      <Link href={href} className="brutal-sm press block rounded-md bg-surface p-4">
        {body}
      </Link>
    ) : (
      <div className="brutal-sm rounded-md bg-surface p-4">{body}</div>
    );
  };
  return (
    <>
      <AdminTabs me={me} active="/admin" />
      <section className="mt-8">
        <h2 className="text-xl font-black">Waiting for you</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          {card("News stories suggested by citizens", o.waiting.newsSuggestions, "/moderation/news", true)}
          {card("Promise suggestions to review", o.waiting.promiseSubmissions, "/moderation", true)}
          {card("Problem reports flagged by users", o.waiting.reportedIssues, "/moderation", true)}
        </div>
      </section>
      <section className="mt-8">
        <h2 className="text-xl font-black">People</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-5">
          {card("accounts", o.users.total, me.role === "ADMIN" ? "/admin/users" : undefined)}
          {card("email verified", o.users.verified)}
          {card("joined this week", o.users.newThisWeek)}
          {card("staff (verifier+)", o.users.staff, me.role === "ADMIN" ? "/admin/users?role=VERIFIER" : undefined)}
          {card("blocked", o.users.blocked, me.role === "ADMIN" ? "/admin/users?blocked=1" : undefined)}
        </div>
      </section>
      <section className="mt-8">
        <h2 className="text-xl font-black">Content</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          {card("problem reports (visible)", o.content.issues)}
          {card("report-card promises", o.content.promises, "/admin/promises")}
          {card("verified news stories", o.content.publishedNews, "/news")}
        </div>
      </section>
    </>
  );
}
