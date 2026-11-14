import Link from "next/link";
import { site } from "@/lib/site";
import { ThemeToggle } from "./theme";
import { Logo } from "./logo";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      {/* Tricolour hairline: identity without kitsch */}
      <div aria-hidden className="flex h-0.5">
        <span className="flex-1 bg-saffron" />
        <span className="flex-1 bg-primary" />
        <span className="flex-1 bg-green" />
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
        <ThemeToggle />
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
