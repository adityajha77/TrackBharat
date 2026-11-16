"use client";

import { createContext, useContext } from "react";
import type { Dictionary } from "./server";
import type { Locale } from "./locales";
export { fmt } from "./locales";

/**
 * Client components can't call next/root-params, so the root layout passes the
 * active dictionary down once through context. Only ONE language is sent to the browser.
 */
export const I18nContext = createContext<{ t: Dictionary; lang: Locale } | null>(null);

export function I18nProvider({ t, lang, children }: { t: Dictionary; lang: Locale; children: React.ReactNode }) {
  return <I18nContext value={{ t, lang }}>{children}</I18nContext>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
