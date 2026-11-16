import { lang as rootLang } from "next/root-params";
import { DEFAULT_LOCALE, isLocale, type Locale } from "./locales";
export { fmt } from "./locales";
import en from "./dictionaries/en.json";

/** English is the complete reference; other languages may be partial (see withFallback). */
export type Dictionary = typeof en;
type Partial2<T> = { [K in keyof T]?: Partial<T[K]> };

/**
 * A translation may be missing a few strings (e.g. a section not translated yet).
 * Deep-merge it over English so the page shows English for those, never a blank.
 * A unit test lists coverage per language and fails on unknown keys or broken {placeholders}.
 */
function withFallback(partial: Partial2<Dictionary>): Dictionary {
  const out = structuredClone(en) as Record<string, Record<string, string>>;
  for (const [section, strings] of Object.entries(partial)) Object.assign(out[section] ?? {}, strings);
  return out as Dictionary;
}

const loaders: Record<Locale, () => Promise<Dictionary>> = {
  en: async () => en,
  hi: () => import("./dictionaries/hi.json").then((m) => withFallback(m.default as Partial2<Dictionary>)),
  mr: () => import("./dictionaries/mr.json").then((m) => withFallback(m.default as Partial2<Dictionary>)),
  gu: () => import("./dictionaries/gu.json").then((m) => withFallback(m.default as Partial2<Dictionary>)),
  bn: () => import("./dictionaries/bn.json").then((m) => withFallback(m.default as Partial2<Dictionary>)),
  ta: () => import("./dictionaries/ta.json").then((m) => withFallback(m.default as Partial2<Dictionary>)),
  te: () => import("./dictionaries/te.json").then((m) => withFallback(m.default as Partial2<Dictionary>)),
  kn: () => import("./dictionaries/kn.json").then((m) => withFallback(m.default as Partial2<Dictionary>)),
  ml: () => import("./dictionaries/ml.json").then((m) => withFallback(m.default as Partial2<Dictionary>)),
  pa: () => import("./dictionaries/pa.json").then((m) => withFallback(m.default as Partial2<Dictionary>)),
  or: () => import("./dictionaries/or.json").then((m) => withFallback(m.default as Partial2<Dictionary>)),
  ur: () => import("./dictionaries/ur.json").then((m) => withFallback(m.default as Partial2<Dictionary>)),
};

/** The current language, from the [lang] root segment (no prop drilling). */
export async function getLang(): Promise<Locale> {
  const l = await rootLang();
  return isLocale(l) ? l : DEFAULT_LOCALE;
}

export async function getDictionary(lang: Locale): Promise<Dictionary> {
  return loaders[lang]();
}

/** For Server Components: `const { t, lang } = await getT()`. */
export async function getT() {
  const lang = await getLang();
  return { t: await getDictionary(lang), lang };
}
