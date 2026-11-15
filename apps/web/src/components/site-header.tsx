import { Suspense } from "react";
import Link from "next/link";
import { site } from "@/lib/site";
import { UserMenu } from "./auth/user-menu";
import { ThemeToggle } from "./theme";
import { Logo } from "./logo";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      {/* Tiranga stripe: saffron, white, green, on every page */}
      <div aria-hidden className="flex h-1">
        <span className="flex-1 bg-flag-saffron" />
        <span className="flex-1 bg-flag-white dark:bg-white/85" />
        <span className="flex-1 bg-flag-green" />
      </div>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Logo />
          <span>
            Track<span className="text-saffron">Bharat</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {site.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-muted hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          {/* Reads the session cookie → its own Suspense boundary, so the header shell stays static */}
          <Suspense fallback={<span className="inline-block h-9 w-16 animate-pulse rounded-lg bg-surface-muted" />}>
            <UserMenu />
          </Suspense>
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-2 [scrollbar-width:none] md:hidden" aria-label="Main mobile">
        {site.nav.map((item) => (
          <Link key={item.href} href={item.href} className="shrink-0 rounded-lg px-3 py-1.5 text-sm text-muted hover:bg-surface-muted">
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
