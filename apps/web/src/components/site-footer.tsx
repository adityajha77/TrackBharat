import Link from "next/link";
import { site } from "@/lib/site";
import { Logo } from "./logo";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-[2fr_1fr_1fr]">
        <div className="space-y-3">
          <div className="flex items-center gap-2 font-semibold">
            <Logo className="size-6" /> TrackBharat
          </div>
          <p className="max-w-sm text-sm text-muted">
            An independent, non-partisan civic project. Every claim on this site links to a public source.
          </p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-medium">Explore</p>
          {site.nav.map((n) => (
            <Link key={n.href} href={n.href} className="block text-muted hover:text-foreground">
              {n.label}
            </Link>
          ))}
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-medium">Project</p>
          <a href={site.repo} className="block text-muted hover:text-foreground">
            Source code
          </a>
          <a href={site.author.linkedin} className="block text-muted hover:text-foreground">
            Built by {site.author.name}
          </a>
          <p className="text-muted">PIN data: India Post</p>
        </div>
      </div>
    </footer>
  );
}
