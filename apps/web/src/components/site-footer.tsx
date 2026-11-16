import Link from "@/components/link";
import { fmt, getT } from "@/i18n/server";
import { site } from "@/lib/site";
import { Logo } from "./logo";
import { AshokaChakra } from "./india/flag";

export async function SiteFooter() {
  const { t } = await getT();
  return (
    <footer className="mt-24 border-t-2 border-ink bg-surface">
      <div aria-hidden className="flex h-1.5">
        <span className="flex-1 bg-flag-saffron" />
        <span className="flex-1 bg-flag-white" />
        <span className="flex-1 bg-flag-green" />
      </div>
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-[2fr_1fr_1fr]">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-lg font-bold">
            <Logo className="size-6" /> TrackBharat
          </div>
          <p className="max-w-sm text-sm text-muted">{t.footer.about}</p>
          <p className="flex items-center gap-2 pt-2 text-sm font-medium">
            <AshokaChakra className="chakra-spin-fast size-5" color="currentColor" />
            {t.footer.made}
            <span className="font-hindi text-muted" lang="hi">· जय हिन्द</span>
          </p>
          <p className="max-w-sm text-xs text-muted">{t.footer.translations}</p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-mono text-xs font-semibold uppercase tracking-widest">{t.footer.explore}</p>
          {site.nav.map((n) => (
            <Link key={n.href} href={n.href} className="block text-muted hover:text-foreground">
              {t.nav[n.key]}
            </Link>
          ))}
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-mono text-xs font-semibold uppercase tracking-widest">{t.footer.project}</p>
          {site.more.map((n) => (
            <Link key={n.href} href={n.href} className="block text-muted hover:text-foreground">
              {t.nav[n.key]}
            </Link>
          ))}
          <a href={site.repo} className="block text-muted hover:text-foreground">
            {t.footer.source}
          </a>
          <a href={site.author.linkedin} className="block text-muted hover:text-foreground">
            {fmt(t.footer.builtBy, { name: site.author.name })}
          </a>
        </div>
      </div>
    </footer>
  );
}
