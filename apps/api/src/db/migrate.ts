import path from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createDb } from "./client";

/**
 * Applies every SQL file in apps/api/drizzle/ that hasn't run yet. Drizzle
 * records applied migrations in the `drizzle.__drizzle_migrations` table, so
 * running this twice is safe (idempotent). Run it in CI, locally and on every deploy.
 */
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set. See apps/api/.env.example");
  process.exit(1);
}

// Works both from src/db (tsx) and from the bundled dist/ (production).
const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = process.env.MIGRATIONS_DIR ?? path.resolve(here, here.endsWith("dist") ? "../drizzle" : "../../drizzle");

const { db, pool } = createDb(databaseUrl);
try {
  await migrate(db, { migrationsFolder });
  console.log(`Migrations applied from ${migrationsFolder}`);
} finally {
  await pool.end();
}
