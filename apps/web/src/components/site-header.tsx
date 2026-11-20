import { Suspense } from "react";
import Link from "@/components/link";
import { getT } from "@/i18n/server";
import { site } from "@/lib/site";
import { UserMenu } from "./auth/user-menu";
import { LanguageSwitcher } from "./language-switcher";
import { MoreMenu } from "./more-menu";
import { ThemeToggle } from "./theme";
import { Logo } from "./logo";

export async function SiteHeader() {
  const { t } = await getT();
  return (
    <header className="sticky top-0 z-40 border-b-2 border-ink bg-background/90 backdrop-blur-md">
      {/* Tiranga stripe: saffron, white, green, on every page */}
      <div aria-hidden className="flex h-1.5">
        <span className="flex-1 bg-flag-saffron" />
        <span className="flex-1 bg-flag-white" />
        <span className="flex-1 bg-flag-green" />
      </div>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2 text-lg font-bold tracking-tight">
          <Logo />
          <span>
            Track<span className="text-saffron">Bharat</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Main">
          {site.nav.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-md px-2.5 py-2 text-sm font-medium hover:bg-surface-muted">
              {t.nav[item.key]}
            </Link>
          ))}
          <MoreMenu label={t.nav.more}>
            {site.more.map((item) => (
              <Link key={item.href} href={item.href} className="block rounded-sm px-3 py-2 text-sm hover:bg-surface-muted">
                {t.nav[item.key]}
              </Link>
            ))}
          </MoreMenu>
        </nav>
        <div className="flex items-center gap-1.5">
          {/* Reads the current URL (to switch language on the same page) → its own Suspense boundary */}
          <Suspense fallback={<span className="inline-block h-9 w-24 rounded-md bg-surface-muted" />}>
            <LanguageSwitcher />
          </Suspense>
          <ThemeToggle />
          {/* Reads the session cookie → its own Suspense boundary, so the header shell stays static */}
          <Suspense fallback={<span className="inline-block h-9 w-16 animate-pulse rounded-md bg-surface-muted" />}>
            <UserMenu />
          </Suspense>
        </div>
      </div>
      {/* Phones and tablets: a swipeable row of chips */}
      <nav className="flex gap-1.5 overflow-x-auto px-3 pb-2.5 [scrollbar-width:none] lg:hidden" aria-label="Main mobile">
        {[...site.nav, ...site.more.slice(0, 2)].map((item) => (
          <Link key={item.href} href={item.href} className="brutal-sm shrink-0 rounded-md bg-surface px-3 py-1 text-sm font-medium">
            {t.nav[item.key]}
          </Link>
        ))}
      </nav>
    </header>
  );
}
