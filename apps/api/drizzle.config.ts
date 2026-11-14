import { defineConfig } from "drizzle-kit";

// drizzle-kit compares src/db/schema.ts with the previous migrations and writes
// the SQL needed to get from one to the other into ./drizzle. Those .sql files
// are committed to git: they are the true history of the database.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://trackbharat:trackbharat@localhost:5433/trackbharat",
  },
  strict: true,
  verbose: true,
});
