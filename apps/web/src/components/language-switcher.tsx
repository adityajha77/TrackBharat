"use client";

import { Languages } from "lucide-react";
import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n/client";
import { LOCALES, stripLocale } from "@/i18n/locales";

/**
 * Language menu. Plain <a> links (full page loads) on purpose: the proxy sees the
 * request, remembers the choice in a cookie, and English goes through /en/… so the
 * cookie is reset before redirecting to the clean URL.
 */
export function LanguageSwitcher() {
  const { lang, t } = useI18n();
  const path = stripLocale(usePathname() || "/");
  const current = LOCALES.find((l) => l.code === lang)!;
  return (
    <details className="relative">
      <summary
        aria-label={t.nav.language}
        className="brutal-sm press flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-md bg-surface px-2.5 text-sm font-semibold"
      >
        <Languages className="size-4" aria-hidden />
        <span>{current.name}</span>
      </summary>
      <ul className="brutal absolute end-0 z-50 mt-2 grid w-64 grid-cols-2 gap-1 rounded-md bg-surface p-1.5">
        {LOCALES.map((l) => (
          <li key={l.code}>
            <a
              href={`/${l.code}${path === "/" ? "" : path}`}
              hrefLang={l.bcp47}
              lang={l.bcp47}
              aria-current={l.code === lang ? "true" : undefined}
              className="block rounded-sm px-2.5 py-1.5 text-sm hover:bg-surface-muted aria-[current]:bg-saffron aria-[current]:text-ink"
            >
              {l.name}
              <span className="block text-[10px] uppercase tracking-wide text-muted">{l.english}</span>
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}
