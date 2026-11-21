import Link from "@/components/link";
import { LayoutDashboard, LogOut, Newspaper, Settings, ShieldCheck, UserRound } from "lucide-react";
import { getMe } from "@/lib/api-user";
import { logoutAction } from "@/app/actions";
import { getT } from "@/i18n/server";
import { Dropdown } from "@/components/more-menu";

/**
 * Header user menu. Reads the session cookie, so it's rendered inside a
 * <Suspense> boundary (see site-header.tsx): the rest of the header stays static.
 * Same dropdown as "More": closes on a click outside, on Escape, or when a link is chosen.
 */
export async function UserMenu() {
  const [me, { t }] = await Promise.all([getMe().catch(() => null), getT()]);
  if (!me) {
    return (
      <Link href="/login" className="brutal-sm press inline-flex h-9 items-center whitespace-nowrap rounded-md bg-saffron px-3 text-sm font-semibold text-ink">
        {t.account.login}
      </Link>
    );
  }
  const staff = me.role !== "CITIZEN";
  return (
    <Dropdown
      label={t.account.myAccount}
      buttonClassName="h-9 gap-2 rounded-lg px-2"
      trigger={
        <>
          <span className="inline-flex size-7 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">{me.name[0]?.toUpperCase()}</span>
          <span className="hidden max-w-28 truncate sm:inline">{me.name.split(" ")[0]}</span>
        </>
      }
    >
        <p className="px-3 py-2 text-xs text-muted">
          Signed in as <span className="font-medium text-foreground">{me.name}</span>
          {staff && <span className="ml-1 rounded bg-primary/12 px-1.5 py-0.5 text-[10px] font-semibold text-primary">{me.role}</span>}
        </p>
        <Link href="/me" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-surface-muted">
          <UserRound className="size-4 text-muted" aria-hidden /> {t.account.myAccount}
        </Link>
        <Link href="/me/settings" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-surface-muted">
          <Settings className="size-4 text-muted" aria-hidden /> {t.account.settings}
        </Link>
        {staff && (
          <Link href="/admin" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold hover:bg-surface-muted">
            <LayoutDashboard className="size-4 text-saffron" aria-hidden /> Admin panel
          </Link>
        )}
        {staff && (
          <Link href="/moderation" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-surface-muted">
            <ShieldCheck className="size-4 text-muted" aria-hidden /> {t.account.moderation}
          </Link>
        )}
        {staff && (
          <Link href="/moderation/news" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-surface-muted">
            <Newspaper className="size-4 text-muted" aria-hidden /> News desk
          </Link>
        )}
        <form action={logoutAction}>
          <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-muted">
            <LogOut className="size-4 text-muted" aria-hidden /> {t.account.logout}
          </button>
        </form>
    </Dropdown>
  );
}
