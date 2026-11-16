/**
 * The languages TrackBharat speaks. Client-safe (no server imports), used by the
 * proxy, the language switcher and links.
 *
 * URLs: English lives at clean paths (/leaderboard); every other language gets a
 * prefix (/mr/leaderboard). The proxy rewrites clean paths to /en internally.
 */
export const LOCALES = [
  { code: "en", name: "English", english: "English", dir: "ltr", bcp47: "en-IN" },
  { code: "hi", name: "हिन्दी", english: "Hindi", dir: "ltr", bcp47: "hi-IN" },
  { code: "mr", name: "मराठी", english: "Marathi", dir: "ltr", bcp47: "mr-IN" },
  { code: "gu", name: "ગુજરાતી", english: "Gujarati", dir: "ltr", bcp47: "gu-IN" },
  { code: "bn", name: "বাংলা", english: "Bengali", dir: "ltr", bcp47: "bn-IN" },
  { code: "ta", name: "தமிழ்", english: "Tamil", dir: "ltr", bcp47: "ta-IN" },
  { code: "te", name: "తెలుగు", english: "Telugu", dir: "ltr", bcp47: "te-IN" },
  { code: "kn", name: "ಕನ್ನಡ", english: "Kannada", dir: "ltr", bcp47: "kn-IN" },
  { code: "ml", name: "മലയാളം", english: "Malayalam", dir: "ltr", bcp47: "ml-IN" },
  { code: "pa", name: "ਪੰਜਾਬੀ", english: "Punjabi", dir: "ltr", bcp47: "pa-IN" },
  { code: "or", name: "ଓଡ଼ିଆ", english: "Odia", dir: "ltr", bcp47: "or-IN" },
  { code: "ur", name: "اردو", english: "Urdu", dir: "rtl", bcp47: "ur-IN" },
] as const;

export type Locale = (typeof LOCALES)[number]["code"];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "tb_lang";

const codes = new Set<string>(LOCALES.map((l) => l.code));
export const isLocale = (v: string | undefined | null): v is Locale => !!v && codes.has(v);
export const localeInfo = (code: Locale) => LOCALES.find((l) => l.code === code)!;

/** "/leaderboard" in Marathi → "/mr/leaderboard"; English stays clean. External/hash links are untouched. */
export function localePath(lang: string | undefined, path: string): string {
  if (!path.startsWith("/") || path.startsWith("//")) return path;
  if (!lang || lang === DEFAULT_LOCALE || !isLocale(lang)) return path;
  return path === "/" ? `/${lang}` : `/${lang}${path}`;
}

/** Strip a locale prefix: "/mr/leaderboard" → "/leaderboard". */
export function stripLocale(path: string): string {
  const first = path.split("/")[1];
  if (!isLocale(first)) return path;
  const rest = path.slice(first.length + 1);
  return rest === "" ? "/" : rest;
}

/** Fill {placeholders}: fmt("{n} votes", { n: 3 }) → "3 votes". */
export function fmt(s: string, vars: Record<string, string | number>) {
  return s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
}
