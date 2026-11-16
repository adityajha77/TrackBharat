import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LOCALES, localePath, stripLocale } from "../src/i18n/locales";

/**
 * Translation checks. English is the complete reference. Other languages may be
 * partial (missing strings fall back to English at runtime), but they must never:
 *  - contain keys English doesn't have (a typo would silently never show), or
 *  - drop or rename a {placeholder} (the number or name would vanish from the sentence).
 */
const dir = path.resolve(__dirname, "../src/i18n/dictionaries");
type Dict = Record<string, Record<string, string>>;
const load = (code: string) => JSON.parse(readFileSync(path.join(dir, `${code}.json`), "utf8")) as Dict;
const en = load("en");
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("dictionaries", () => {
  it("there is a file for every language, and only those", () => {
    const files = readdirSync(dir).map((f) => f.replace(".json", "")).sort();
    expect(files).toEqual(LOCALES.map((l) => l.code).sort());
  });

  for (const { code } of LOCALES.filter((l) => l.code !== "en")) {
    it(`${code}: no unknown keys, placeholders intact, core sections fully translated`, () => {
      const d = load(code);
      let translated = 0;
      let total = 0;
      for (const [section, strings] of Object.entries(en)) {
        for (const [key, english] of Object.entries(strings)) {
          total++;
          const value = d[section]?.[key];
          if (value === undefined) continue;
          translated++;
          expect(placeholders(value), `${code}.${section}.${key}`).toEqual(placeholders(english));
        }
      }
      for (const [section, strings] of Object.entries(d)) {
        expect(en[section], `${code}: unknown section "${section}"`).toBeDefined();
        for (const key of Object.keys(strings)) expect(en[section]![key], `${code}: unknown key ${section}.${key}`).toBeDefined();
      }
      // What a visitor sees first must be in their language.
      for (const section of ["nav", "home", "vote", "causes", "status", "category"]) {
        expect(Object.keys(d[section] ?? {}).sort(), `${code}.${section}`).toEqual(Object.keys(en[section]!).sort());
      }
      expect(translated / total).toBeGreaterThan(0.85);
    });
  }
});

describe("locale paths", () => {
  it("keeps English clean and prefixes other languages", () => {
    expect(localePath("en", "/leaderboard")).toBe("/leaderboard");
    expect(localePath("mr", "/leaderboard")).toBe("/mr/leaderboard");
    expect(localePath("mr", "/")).toBe("/mr");
    expect(localePath("mr", "https://x.in")).toBe("https://x.in");
    expect(stripLocale("/ur/neta")).toBe("/neta");
    expect(stripLocale("/neta")).toBe("/neta");
  });
});
