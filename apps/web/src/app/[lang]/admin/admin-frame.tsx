import { redirect } from "next/navigation";
import type { PublicUser } from "@trackbharat/shared";
import Link from "@/components/link";
import { Eyebrow } from "@/components/ui/card";
import { getMe } from "@/lib/api-user";
import { cn } from "@/lib/utils";

/**
 * ADMIN PANEL frame: a title and the tab bar. Which tabs show depends on the role:
 *   Overview, Promises      → verifiers, moderators, admins
 *   Causes                  → moderators, admins
 *   Users, Audit log        → admins only
 * The API enforces the same rules; hiding a tab is only for clarity.
 */
type Role = PublicUser["role"];
const TABS: { href: string; label: string; roles: Role[] }[] = [
  { href: "/admin", label: "Overview", roles: ["VERIFIER", "MODERATOR", "ADMIN"] },
  { href: "/admin/users", label: "Users & roles", roles: ["ADMIN"] },
  { href: "/admin/promises", label: "Promises", roles: ["VERIFIER", "ADMIN"] },
  { href: "/admin/causes", label: "Causes", roles: ["MODERATOR", "ADMIN"] },
  { href: "/admin/audit", label: "Audit log", roles: ["ADMIN"] },
  { href: "/moderation", label: "Moderation queue ↗", roles: ["VERIFIER", "MODERATOR", "ADMIN"] },
  { href: "/moderation/news", label: "News desk ↗", roles: ["VERIFIER", "MODERATOR", "ADMIN"] },
];

/** Signed in with one of these roles, or sent away. Call inside a <Suspense> (reads the session). */
export async function requireRole(path: string, roles: Role[]): Promise<PublicUser> {
  const me = await getMe().catch(() => null);
  if (!me) redirect(`/login?next=${encodeURIComponent(path)}`);
  if (!roles.includes(me.role)) redirect(me.role === "CITIZEN" ? "/me" : "/admin");
  return me;
}

export function AdminTabs({ me, active }: { me: PublicUser; active: string }) {
  return (
    <nav aria-label="Admin sections" className="mt-6 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
      {TABS.filter((t) => t.roles.includes(me.role)).map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={t.href === active ? "page" : undefined}
          className={cn("brutal-sm press shrink-0 rounded-md px-3 py-1.5 text-sm font-semibold", t.href === active ? "bg-saffron text-ink" : "bg-surface")}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

export function AdminHeader({ title, lead }: { title: string; lead: string }) {
  return (
    <header>
      <Eyebrow>Admin panel</Eyebrow>
      <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-2 max-w-3xl text-muted">{lead}</p>
    </header>
  );
}
