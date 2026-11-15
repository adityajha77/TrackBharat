import { sql } from "drizzle-orm";
import type { Database } from "../../db/client";

export { upsertSource } from "../../db/helpers";

/**
 * Rebuild pincode_constituencies with a SPATIAL JOIN:
 * "for every post office point, which constituency polygon contains it?",
 * then count offices per (PIN, constituency) and compute each one's share.
 *
 * Why counts and shares? One PIN can straddle two constituencies, and a few
 * source coordinates are simply wrong (e.g. a Patna office placed in Tibet).
 * A majority of offices is far more reliable than any single point.
 */
export async function refreshPincodeConstituencies(db: Database): Promise<number> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`DELETE FROM pincode_constituencies`);
    const res = await tx.execute(sql`
      INSERT INTO pincode_constituencies (pincode, constituency_id, office_count, share)
      SELECT pl.pincode,
             c.id,
             count(*)                                                      AS office_count,
             count(*)::real / sum(count(*)) OVER (PARTITION BY pl.pincode) AS share
      FROM pin_locations pl
      JOIN constituencies c
        ON c.boundary IS NOT NULL
       AND ST_Contains(c.boundary, pl.location)   -- uses the GiST indexes
      GROUP BY pl.pincode, c.id
    `);
    return res.rowCount ?? 0;
  });
}
