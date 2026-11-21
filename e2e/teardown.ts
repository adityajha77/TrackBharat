import { createRequire } from "node:module";
import path from "node:path";

/**
 * After the run: delete the test accounts and the test stories the news test published ("E2E story …",
 * source example.org), so they never show up on /news of a dev database.
 * Uses the API package's Postgres driver; DATABASE_URL defaults to the local dev DB.
 */
export default async function teardown() {
  const require = createRequire(path.resolve(__dirname, "../apps/api/package.json"));
  const { Client } = require("pg") as typeof import("pg");
  const client = new Client({ connectionString: process.env.DATABASE_URL ?? "postgres://trackbharat:trackbharat@localhost:5433/trackbharat" });
  try {
    await client.connect();
    await client.query("DELETE FROM news_items WHERE source_name = 'example.org' AND headline LIKE 'E2E story %'");
    // Accounts the sign-up and password-reset tests created (their posts go with them)
    await client.query("DELETE FROM users WHERE email LIKE 'e2e-%@example.com' OR email LIKE 'reset-%@example.com'");
  } catch (e) {
    console.warn(`E2E teardown: could not remove test stories (${(e as Error).message})`);
  } finally {
    await client.end().catch(() => {});
  }
}
