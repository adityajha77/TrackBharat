/**
 * CSV writer for open-data exports.
 *
 * Two classic bugs handled here:
 *  1. ESCAPING: values containing commas, quotes or newlines are wrapped in
 *     quotes, with inner quotes doubled ("say ""hi""").
 *  2. CSV / FORMULA INJECTION: a cell starting with = + - @ (or tab/CR) is
 *     executed as a formula by Excel/Sheets. A malicious issue title like
 *     =HYPERLINK("http://evil",…) would run on the downloader's machine, so
 *     such cells are prefixed with an apostrophe to force plain text (OWASP).
 */
export type Cell = string | number | boolean | null | undefined | Date;

export function csvCell(v: Cell): string {
  if (v === null || v === undefined) return "";
  let s = v instanceof Date ? v.toISOString() : String(v);
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: Cell[][]): string {
  // ﻿ (BOM) makes Excel open UTF-8 correctly, so Hindi names don't turn into gibberish
  return "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
