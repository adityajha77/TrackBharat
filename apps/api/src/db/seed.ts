import { createDb } from "./client";
import { createPincodeRepository } from "../modules/pincodes/pincode.repository";

/**
 * Seed: puts known sample data into a fresh local database, so the app works
 * offline and every developer (and CI) sees the same thing. Safe to re-run:
 * `save` upserts. Phase 1 will seed sample constituencies and promises here.
 */
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set. See apps/api/.env.example");
  process.exit(1);
}

const { db, pool } = createDb(databaseUrl);
const repo = createPincodeRepository(db);

const samples = [
  {
    pincode: "110001",
    offices: [
      { name: "Connaught Place", branchType: "Sub Post Office", deliveryStatus: "Non-Delivery", block: "New Delhi", district: "Central Delhi", state: "Delhi" },
      { name: "Parliament House", branchType: "Sub Post Office", deliveryStatus: "Non-Delivery", block: "New Delhi", district: "Central Delhi", state: "Delhi" },
    ],
  },
  {
    pincode: "560034",
    offices: [
      { name: "Koramangala", branchType: "Sub Post Office", deliveryStatus: "Non-Delivery", block: "Bangalore South", district: "Bangalore", state: "Karnataka" },
      { name: "Agara", branchType: "Branch Post Office", deliveryStatus: "Delivery", block: "Bangalore South", district: "Bangalore", state: "Karnataka" },
    ],
  },
];

try {
  for (const s of samples) {
    // Epoch timestamp = always "stale": online, the API refreshes from India Post;
    // offline, it falls back to this row (stale-if-error). Illustrative sample data.
    await repo.save(s.pincode, s.offices, new Date(0));
    console.log(`seeded ${s.pincode}`);
  }
} finally {
  await pool.end();
}
