/**
 * Text helpers for matching names across datasets. Different government
 * sources spell the same place differently ("Orissa"/"Odisha",
 * "Mahbubnagar"/"Mahabubnagar", "Jammu & Kashmir"/"Jammu and Kashmir").
 */

/** Lower-case, strip accents, brackets and punctuation: "Darrang-Udalguri" → "darrangudalguri". */
export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\(.*?\)/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z]/g, "");
}

/**
 * A deliberately LOOSE key: also drops vowels, h, y and doubled letters, so
 * common transliteration variants collide: Mahbubnagar ≈ Mahabubnagar,
 * Hardwar ≈ Haridwar. Only used as a fallback after an exact match fails.
 */
export function looseName(s: string): string {
  return normalizeName(s).replace(/[aeiouyh]/g, "").replace(/(.)\1+/g, "$1");
}

/** "Bangalore South" → "bangalore-south" */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Minimal RFC-4180 CSV line parser: handles quoted fields containing commas and "" escapes. */
export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}
