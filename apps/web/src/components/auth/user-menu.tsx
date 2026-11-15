import Link from "next/link";
import { LogOut, Settings, ShieldCheck, UserRound } from "lucide-react";
import { getMe } from "@/lib/api-user";
import { logoutAction } from "@/app/actions";

/**
 * Header user menu. Reads the session cookie, so it's rendered inside a
 * <Suspense> boundary (see site-header.tsx): the rest of the header stays static.
 * A native <details> element gives us an accessible dropdown with zero JS.
 */
export async function UserMenu() {
  const me = await getMe().catch(() => null);
  if (!me) {
    return (
      <Link href="/login" className="inline-flex h-9 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90">
        Log in
      </Link>
    );
  }
  const staff = me.role !== "CITIZEN";
  return (
    <details className="group relative">
      <summary className="flex h-9 cursor-pointer list-none items-center gap-2 rounded-lg px-2 text-sm hover:bg-surface-muted">
        <span className="inline-flex size-7 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">{me.name[0]?.toUpperCase()}</span>
        <span className="hidden max-w-28 truncate sm:inline">{me.name.split(" ")[0]}</span>
      </summary>
      <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-border bg-surface p-1.5 shadow-lg">
        <p className="px-3 py-2 text-xs text-muted">
          Signed in as <span className="font-medium text-foreground">{me.name}</span>
          {staff && <span className="ml-1 rounded bg-primary/12 px-1.5 py-0.5 text-[10px] font-semibold text-primary">{me.role}</span>}
        </p>
        <Link href="/me" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-surface-muted">
          <UserRound className="size-4 text-muted" aria-hidden /> My activity
        </Link>
        <Link href="/me/settings" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-surface-muted">
          <Settings className="size-4 text-muted" aria-hidden /> Settings
        </Link>
        {staff && (
          <Link href="/moderation" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-surface-muted">
            <ShieldCheck className="size-4 text-muted" aria-hidden /> Review queue
          </Link>
        )}
        <form action={logoutAction}>
          <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-muted">
            <LogOut className="size-4 text-muted" aria-hidden /> Log out
          </button>
        </form>
      </div>
    </details>
  );
}
