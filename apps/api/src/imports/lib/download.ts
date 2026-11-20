import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Downloads a public dataset once and caches it in apps/api/.data/ (gitignored).
 * Raw datasets don't belong in git: they're large, and they can always be
 * re-downloaded from the source URL, which IS recorded in code and in the DB.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = process.env.IMPORT_DATA_DIR ?? path.resolve(here, "../../../.data");

const USER_AGENT = "TrackBharat-data-import/0.1 (+https://github.com/adityajha77/TrackBharat)";

export async function download(url: string, fileName: string, { maxAgeDays = 30 } = {}): Promise<string> {
  mkdirSync(DATA_DIR, { recursive: true });
  const file = path.join(DATA_DIR, fileName);
  if (existsSync(file)) {
    const ageDays = (Date.now() - statSync(file).mtimeMs) / 86_400_000;
    if (ageDays < maxAgeDays) {
      console.log(`  ↳ using cached ${fileName}`);
      return file;
    }
  }
  console.log(`  ↳ downloading ${url}`);
  let res: Response;
  try {
    res = await fetch(url, { headers: { "user-agent": USER_AGENT, accept: "*/*" }, signal: AbortSignal.timeout(120_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (e) {
    // Some government sites refuse servers outside India (e.g. CI). An older
    // copy is better than no import; the warning makes the staleness visible.
    if (existsSync(file)) {
      console.warn(`  ⚠ download failed (${(e as Error).message}); using the older cached ${fileName}`);
      return file;
    }
    throw new Error(`Download failed: ${(e as Error).message} for ${url}`);
  }
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  return file;
}
