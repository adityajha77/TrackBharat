import { readFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { PINCODE_REGEX } from "@trackbharat/shared";
import type { Database } from "../db/client";
import { download } from "./lib/download";
import { refreshPincodeConstituencies, upsertSource } from "./lib/sources";
import { parseCsvLine } from "./lib/text";

/**
 * IMPORT: ~144k post office coordinates → which constituency each PIN is in.
 * Source: Department of Posts "All India Pincode Directory" (via the IndiaPIN
 * package, Dec 2021), Government Open Data License – India.
 */
export const PIN_DIRECTORY = {
  url: "https://raw.githubusercontent.com/harshvardhaniimi/IndiaPIN/main/data-raw/pincode.csv",
  page: "https://github.com/harshvardhaniimi/IndiaPIN",
  file: "india_pincode_directory.csv",
};

// Rough bounding box of India. Points outside are data errors and are skipped.
const inIndia = (lat: number, lon: number) => lat > 6 && lat < 37.5 && lon > 68 && lon < 97.5;

export async function importPinLocations(db: Database) {
  console.log("▶ PIN code locations (post offices)");
  const file = await download(PIN_DIRECTORY.url, PIN_DIRECTORY.file, { maxAgeDays: 365 });
  await upsertSource(db, {
    url: PIN_DIRECTORY.page,
    title: "All India Pincode Directory with latitude and longitude",
    publisher: "Department of Posts, Government of India (packaged by IndiaPIN)",
    kind: "DATASET",
    license: "Government Open Data License – India",
  });

  const [header, ...lines] = readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean);
  const cols = parseCsvLine(header!);
  const iPin = cols.indexOf("Pincode");
  const iName = cols.indexOf("OfficeName");
  const iLat = cols.indexOf("Latitude");
  const iLon = cols.indexOf("Longitude");
  if ([iPin, iName, iLat, iLon].includes(-1)) throw new Error(`Unexpected CSV columns: ${cols.join(", ")}`);

  const pins: string[] = [];
  const names: string[] = [];
  const lats: number[] = [];
  const lons: number[] = [];
  let skipped = 0;
  for (const line of lines) {
    const c = parseCsvLine(line);
    const pin = c[iPin]!.trim();
    const lat = Number(c[iLat]);
    const lon = Number(c[iLon]);
    if (!PINCODE_REGEX.test(pin) || !inIndia(lat, lon)) {
      skipped++;
      continue;
    }
    pins.push(pin);
    names.push(c[iName]!.trim());
    lats.push(lat);
    lons.push(lon);
  }

  // BULK INSERT: each batch of 10,000 rows travels as ONE JSON parameter that
  // Postgres unpacks with json_to_recordset(), instead of 144,000 separate
  // INSERTs (seconds instead of minutes, and one round trip per batch).
  const BATCH = 10_000;
  await db.transaction(async (tx) => {
    await tx.execute(sql`TRUNCATE pin_locations RESTART IDENTITY`);
    for (let i = 0; i < pins.length; i += BATCH) {
      const batch = pins.slice(i, i + BATCH).map((p, j) => ({ p, n: names[i + j], lon: lons[i + j], lat: lats[i + j] }));
      await tx.execute(sql`
        INSERT INTO pin_locations (pincode, office_name, location)
        SELECT r.p, r.n, ST_SetSRID(ST_MakePoint(r.lon, r.lat), 4326)
        FROM json_to_recordset(${JSON.stringify(batch)}::json) AS r(p text, n text, lon float8, lat float8)
      `);
    }
  });
  console.log(`  ✓ ${pins.length} post office locations (${skipped} skipped: missing or out-of-India coordinates)`);

  const t0 = Date.now();
  const links = await refreshPincodeConstituencies(db);
  const [{ n } = { n: 0 }] = (await db.execute<{ n: number }>(sql`SELECT count(DISTINCT pincode)::int AS n FROM pincode_constituencies`)).rows;
  console.log(`  ✓ spatial join: ${n} PIN codes mapped to constituencies (${links} links) in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
