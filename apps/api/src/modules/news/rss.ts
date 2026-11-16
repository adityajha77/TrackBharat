import { XMLParser } from "fast-xml-parser";

/**
 * RSS 2.0 / Atom → a flat list of headlines. Pure function (no network), so it is
 * unit-tested with saved sample feeds.
 *
 * We keep ONLY the headline, link, id and date. Feed descriptions often contain
 * the first paragraphs of the article; storing them would be copying the article.
 */
export interface FeedEntry {
  guid: string;
  headline: string;
  url: string;
  publishedAt: Date | null;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@",
  htmlEntities: true, // decode &#8217; &amp; …
  processEntities: true,
  // Feeds are untrusted input: a tiny "billion laughs" style bomb must not take us down.
  ignoreDeclaration: true,
});

const asArray = <T>(v: T | T[] | undefined): T[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

/** Text content of a node that may be a string, a number, or { "#text": … } (CDATA / attributes). */
function text(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (typeof v === "object" && "#text" in (v as Record<string, unknown>)) return text((v as Record<string, unknown>)["#text"]);
  return "";
}

/** CDATA sections are NOT entity-decoded by the parser, yet feeds put "&#8217;" inside them. */
const NAMED: Record<string, string> = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " " };
const decode = (s: string) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&(amp|quot|apos|lt|gt|nbsp);/g, (_, n: string) => NAMED[n]!);

const clean = (s: string) =>
  decode(s)
    .replace(/<[^>]*>/g, " ") // stray HTML tags in titles
    .replace(/\s+/g, " ")
    .trim();

function date(v: unknown): Date | null {
  const s = text(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function safeUrl(s: string): string | null {
  try {
    const u = new URL(s.trim());
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export function parseFeed(xml: string, limit = 50): FeedEntry[] {
  const doc = parser.parse(xml) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const out: FeedEntry[] = [];

  // RSS 2.0: rss > channel > item
  for (const item of asArray(doc?.rss?.channel?.item)) {
    const url = safeUrl(text(item.link));
    const headline = clean(text(item.title));
    if (!url || !headline) continue;
    out.push({ guid: clean(text(item.guid)) || url, headline, url, publishedAt: date(item.pubDate ?? item["dc:date"]) });
  }

  // Atom: feed > entry, link is an attribute
  for (const entry of asArray(doc?.feed?.entry)) {
    const links = asArray(entry.link) as Record<string, string>[];
    const href = (links.find((l) => !l["@rel"] || l["@rel"] === "alternate") ?? links[0])?.["@href"] ?? "";
    const url = safeUrl(href);
    const headline = clean(text(entry.title));
    if (!url || !headline) continue;
    out.push({ guid: clean(text(entry.id)) || url, headline, url, publishedAt: date(entry.updated ?? entry.published) });
  }

  return out.slice(0, limit);
}
