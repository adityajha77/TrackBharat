import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import type { Database } from "../db/client";
import { newsFeeds } from "../db/schema";

/**
 * IMPORT: the list of RSS feeds the news job reads (apps/api/data/news-feeds.json).
 * Only feeds that are public and allow automated reading of headlines belong here;
 * we store headline + link only, never article text (see ADR-0016).
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.resolve(here, "../../data/news-feeds.json");

const Feed = z.object({ name: z.string().min(2), url: z.url({ protocol: /^https$/ }), homepage: z.url({ protocol: /^https$/ }) });

export async function importNewsFeeds(db: Database) {
  console.log("▶ News feeds (curated list)");
  const feeds = z.array(Feed).parse(JSON.parse(readFileSync(FILE, "utf8")));
  for (const f of feeds) {
    await db.insert(newsFeeds).values(f).onConflictDoUpdate({ target: newsFeeds.url, set: { name: f.name, homepage: f.homepage, active: true } });
  }
  console.log(`  ✓ ${feeds.length} feeds (run \`pnpm job:news\` to fetch headlines)`);
}
