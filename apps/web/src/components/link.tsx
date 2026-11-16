"use client";

import NextLink from "next/link";
import { useContext, type ComponentProps } from "react";
import { I18nContext } from "@/i18n/client";
import { localePath } from "@/i18n/locales";

/**
 * Drop-in replacement for next/link that keeps the visitor in their language:
 * <Link href="/leaderboard"> becomes /mr/leaderboard when browsing in Marathi.
 *
 * The language comes from the I18nProvider in the root layout, NOT from
 * useParams(): reading URL params in a Client Component would make every page
 * dynamic under Cache Components, while the language is fixed per prerendered page.
 */
export default function Link({ href, ...props }: ComponentProps<typeof NextLink>) {
  const lang = useContext(I18nContext)?.lang;
  const to = typeof href === "string" ? localePath(lang, href) : href;
  return <NextLink href={to} {...props} />;
}
