/**
 * DEV TOOL: build a curated MLA CSV (data/mlas/<state>-<year>.csv) from the
 * "Results by constituency" table of a Wikipedia election article.
 *
 *   pnpm mla:wikipedia "2025_Delhi_Legislative_Assembly_election" "NCT of Delhi" 2025
 *
 * Why Wikipedia? ECI takes its results pages down after a while, and most state
 * legislatures publish members as PDFs. Wikipedia's results tables cite the ECI
 * results or national newspapers row by row, and the article URL is stored as the
 * source on every row, so anyone can check it. These are the members AS ELECTED:
 * by-elections and defections after the election must be corrected by hand.
 *
 * The output is a file for a human to review and commit, never imported blindly.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const [title, state, year] = process.argv.slice(2);
if (!title || !state || !year) {
  console.error('Usage: pnpm mla:wikipedia "<Wikipedia_article_title>" "<State name as in our DB>" <election year>');
  process.exit(1);
}

const UA = "TrackBharat-data-import/0.1 (+https://github.com/adityajha77/TrackBharat)";
const res = await fetch(`https://en.wikipedia.org/w/index.php?title=${encodeURIComponent(title)}&action=raw`, { headers: { "user-agent": UA } });
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const wikitext = await res.text();

// The section with per-seat results. Article layouts vary, so try the common headings.
const start = wikitext.search(/==+\s*(Results by constituency|By constituency|Constituency[- ]wise results?|Constituency results|Results by assembly constituency)\s*==+/i);
if (start < 0) throw new Error("No 'Results by constituency' section found");
const section = wikitext.slice(start, wikitext.indexOf("\n|}", start) + 3);

/** [[Target|Label]] → Label; strips templates and refs. */
const plain = (s: string) =>
  s
    .replace(/<ref[^>]*\/>|<ref[^>]*>[\s\S]*?<\/ref>/g, "")
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, "$1")
    .replace(/\{\{[^}]*\}\}/g, "")
    .replace(/'''?/g, "")
    .replace(/^.*?\|(?!\|)/, (m) => (/style=|rowspan=|colspan=|align=/i.test(m) ? "" : m))
    .trim();
const partyOf = (s: string) => s.match(/\{\{\s*party name with colou?r\s*\|\s*([^}|]+)/i)?.[1]?.replace(/\s+/g, " ").trim() ?? null;

// The winner's party is either {{party name with color|X}} or a colour cell
// bgcolor="{{party color|X}}" followed by a link cell. The candidate is the cell before it.
// Layouts seen: bgcolor="{{party color|X}}" and style="background(-color): {{party color|X}}".
// …and the {{Party color cell|X}} template.
const colourParty = (s: string) =>
  (s.match(/(?:bgcolor|background(?:-color)?)\s*[=:]\s*"?\{\{\s*party colou?r\s*\|\s*([^}|]+)/i) ?? s.match(/\{\{\s*party colou?r cell\s*\|\s*([^}|]+)/i))?.[1]?.replace(/\s+/g, " ").trim() ?? null;

const rows: string[][] = [];
let sequence = 0;
for (const block of section.split(/\n\|-/).slice(1)) {
  // Cells start with "|" or "||" at line start; drop header ("!") lines.
  const cells = block
    .split("\n")
    // Some tables put the seat number in a row-header cell ("!12"): keep those as cells too.
    .filter((l) => (l.startsWith("|") && !l.startsWith("|}") && !l.startsWith("|+")) || /^!\s*\d{1,3}\s*$/.test(l))
    .flatMap((l) => l.slice(1).split("||"));
  let iSeat = cells.findIndex((c) => /Assembly constituency|Vidhan Sabha constituency|constituency\|/i.test(c));
  if (iSeat < 0) {
    // Fallback layout: "<AC number> | <seat> | …" with seats linked by plain names.
    const iNum = cells.findIndex((c) => /^\s*\d{1,3}\s*$/.test(plain(c)));
    if (iNum < 0) continue;
    iSeat = iNum + 1;
  }
  sequence++;
  const iParty = cells.findIndex((c, i) => i > iSeat && (partyOf(c) || colourParty(c)));
  if (iParty < 0) continue;
  const party = partyOf(cells[iParty]!) ?? colourParty(cells[iParty]!)!;
  const mla = plain(cells[iParty - 1]!);
  const seat = plain(cells[iSeat]!).replace(/\s*\((SC|ST)\)\s*$/, "");
  // Use the official number when the table has one; otherwise the row order (the
  // tables list seats in ECI order). The import cross-checks every name against our
  // seat list, so a wrong number is caught, not silently loaded.
  const before = iSeat > 0 ? plain(cells[iSeat - 1]!) : "";
  const num = /^\d{1,3}$/.test(before) ? before : String(sequence);
  if (seat && mla && !/^\d/.test(mla)) rows.push([state, num, seat, mla, party]);
}

const esc = (v: string) => (/[",]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const url = `https://en.wikipedia.org/wiki/${title}`;
const csv = [
  "state,ac_number,ac_name,mla_name,party,election_year,source_url,source_title,source_publisher",
  `# Generated from ${url} (results tables cite the Election Commission of India / newspapers). Members as elected: check by-elections.`,
  ...rows.map((r) => [...r, year, url, `${title.replace(/_/g, " ")}: results by constituency`, "Wikipedia (citing ECI results)"].map(esc).join(",")),
].join("\n");

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, "../../data/mlas", `${state.toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "")}-${year}.csv`);
writeFileSync(out, csv + "\n");
console.log(`${rows.length} rows → ${out}`);
