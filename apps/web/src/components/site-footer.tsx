import Link from "next/link";
import { site } from "@/lib/site";
import { Logo } from "./logo";
import { IndiaFlag } from "./india/flag";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-[2fr_1fr_1fr]">
        <div className="space-y-3">
          <div className="flex items-center gap-2 font-semibold">
            <Logo className="size-6" /> TrackBharat
          </div>
          <p className="max-w-sm text-sm text-muted">
            An independent, non-partisan civic project, not affiliated with any government body or political party. Every
            claim on this site links to a public source.
          </p>
          <p className="flex items-center gap-2 pt-2 text-sm">
            <IndiaFlag className="h-3.5 w-[21px]" />
            Made in India, for the citizens of India
            <span className="font-hindi text-muted" lang="hi">· जय हिन्द</span>
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
          <Link href="/insights" className="block text-muted hover:text-foreground">India at a glance</Link>
          <Link href="/methodology" className="block text-muted hover:text-foreground">How scores work</Link>
          <Link href="/data" className="block text-muted hover:text-foreground">Open data</Link>
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
