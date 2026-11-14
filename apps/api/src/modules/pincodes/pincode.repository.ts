import { eq } from "drizzle-orm";
import type { PostOffice } from "@trackbharat/shared";
import type { Database } from "../../db/client";
import { pincodes, postOffices } from "../../db/schema";

/**
 * REPOSITORY: the only place that knows how PIN code data is stored in SQL.
 * Services ask for "the cached lookup for 560034"; they never write queries.
 */
export interface CachedPincode {
  pincode: string;
  district: string;
  state: string;
  fetchedAt: Date;
  postOffices: PostOffice[];
}

export interface PincodeRepository {
  find(pincode: string): Promise<CachedPincode | null>;
  save(pincode: string, offices: PostOffice[], fetchedAt?: Date): Promise<CachedPincode>;
}

export function createPincodeRepository(db: Database): PincodeRepository {
  return {
    async find(pincode) {
      // Relational query: Drizzle turns this into one SQL query with a JOIN-like
      // lateral subquery, not N+1 queries like the old Vote.tsx did.
      const row = await db.query.pincodes.findFirst({
        where: eq(pincodes.pincode, pincode),
        with: { postOffices: true },
      });
      if (!row) return null;
      return {
        pincode: row.pincode,
        district: row.district,
        state: row.state,
        fetchedAt: row.fetchedAt,
        postOffices: row.postOffices.map(({ name, branchType, deliveryStatus, block, district, state }) => ({
          name,
          branchType,
          deliveryStatus,
          block,
          district,
          state,
        })),
      };
    },

    async save(pincode, offices, fetchedAt = new Date()) {
      const first = offices[0];
      if (!first) throw new Error("Cannot cache a PIN code with no post offices");

      // TRANSACTION: the upsert + delete + insert succeed or fail together, so a
      // crash halfway can never leave a PIN code with half its post offices.
      await db.transaction(async (tx) => {
        await tx
          .insert(pincodes)
          .values({ pincode, district: first.district, state: first.state, fetchedAt })
          .onConflictDoUpdate({
            target: pincodes.pincode,
            set: { district: first.district, state: first.state, fetchedAt },
          });
        await tx.delete(postOffices).where(eq(postOffices.pincode, pincode));
        await tx.insert(postOffices).values(offices.map((o) => ({ ...o, pincode })));
      });

      return { pincode, district: first.district, state: first.state, fetchedAt, postOffices: offices };
    },
  };
}
