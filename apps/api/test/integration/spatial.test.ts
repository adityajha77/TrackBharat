import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { createDb } from "../../src/db/client";
import { refreshPincodeConstituencies } from "../../src/imports/lib/sources";
import { createConstituencyRepository } from "../../src/modules/constituencies/constituency.repository";

/**
 * INTEGRATION test: runs the real PostGIS spatial join against a real Postgres.
 * Unit tests with fakes can't tell us whether ST_Contains, SRIDs and indexes
 * actually work, so this one talks to a database.
 *
 * Runs only when TEST_DATABASE_URL is set (CI sets it). Use a throwaway
 * database: the refresh rebuilds pincode_constituencies.
 *
 * Geometry: two 1°×1° squares side by side in the empty Atlantic (lon -31..-29),
 * far from any real constituency.
 */
const url = process.env.TEST_DATABASE_URL;
const PIN = "999990";

describe.skipIf(!url)("PIN → constituency spatial join (PostGIS)", () => {
  const { db, pool } = createDb(url ?? "postgres://unused");

  beforeAll(async () => {
    await db.execute(sql`INSERT INTO states (name) VALUES ('Testland') ON CONFLICT DO NOTHING`);
    const square = (x: number) => `MULTIPOLYGON(((${x} 0, ${x + 1} 0, ${x + 1} 1, ${x} 1, ${x} 0)))`;
    for (const [n, name, x] of [[1, "West Seat", -31], [2, "East Seat", -30]] as const) {
      await db.execute(sql`
        INSERT INTO constituencies (house, state_id, number, name, slug, boundary)
        VALUES ('LOK_SABHA', (SELECT id FROM states WHERE name = 'Testland'), ${n}, ${name}, ${`test-${n}`},
                ST_GeomFromText(${square(x)}, 4326))
        ON CONFLICT (slug) DO NOTHING`);
    }
    // 3 offices in the west square, 1 in the east, 1 in the sea outside both
    for (const [lon, lat] of [[-30.5, 0.5], [-30.4, 0.2], [-30.9, 0.9], [-29.5, 0.5], [-10, -10]]) {
      await db.execute(sql`INSERT INTO pin_locations (pincode, office_name, location) VALUES (${PIN}, 'Test PO', ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326))`);
    }
    await refreshPincodeConstituencies(db);
  });

  afterAll(async () => {
    await db.execute(sql`DELETE FROM pin_locations WHERE pincode = ${PIN}`);
    await db.execute(sql`DELETE FROM constituencies WHERE slug IN ('test-1', 'test-2')`);
    await db.execute(sql`DELETE FROM states WHERE name = 'Testland'`);
    await refreshPincodeConstituencies(db);
    await pool.end();
  });

  it("assigns post offices to the polygon that contains them, with shares", async () => {
    const rows = await createConstituencyRepository(db).forPincode(PIN);
    expect(rows.map((r) => [r.name, Number(r.share.toFixed(2))])).toEqual([
      ["West Seat", 0.75], // 3 of the 4 offices that fall inside any seat
      ["East Seat", 0.25],
    ]);
  });

  it("draws an SVG outline from the polygon", async () => {
    const repo = createConstituencyRepository(db);
    const seat = await repo.findBySlug("test-1");
    const outline = await repo.outline(seat!.id);
    expect(outline?.path).toMatch(/^M /);
    expect(outline?.viewBox.split(" ")).toHaveLength(4);
  });
});
