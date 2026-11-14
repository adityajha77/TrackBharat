import { sql } from "drizzle-orm";
import { buildApp } from "./app";
import { loadConfig } from "./config";
import { createDb } from "./db/client";
import { createIndiaPostClient } from "./modules/pincodes/india-post.client";
import { createPincodeRepository } from "./modules/pincodes/pincode.repository";
import { createPincodeService } from "./modules/pincodes/pincode.service";

/**
 * ENTRY POINT / composition root. The only file that creates real
 * infrastructure (DB pool, HTTP clients) and wires it together.
 */
const config = loadConfig();
const { db, pool } = createDb(config.DATABASE_URL);

const pincodeService = createPincodeService({
  repo: createPincodeRepository(db),
  directory: createIndiaPostClient(config.INDIA_POST_BASE_URL),
  cacheTtlDays: config.PINCODE_CACHE_TTL_DAYS,
});

const app = await buildApp({
  pincodeService,
  pingDb: async () => {
    await db.execute(sql`select 1`);
  },
  corsOrigins: config.CORS_ORIGINS,
  version: process.env.APP_VERSION ?? "dev",
  // Structured JSON logs in production (machines parse them); pretty logs locally (humans read them).
  logger:
    config.NODE_ENV === "development"
      ? { level: config.LOG_LEVEL, transport: { target: "pino-pretty" } }
      : { level: config.LOG_LEVEL },
});

/**
 * GRACEFUL SHUTDOWN. On deploy, the platform sends SIGTERM. We stop accepting new
 * requests, let in-flight ones finish, close DB connections, then exit.
 * Without this, every deploy would cut off some users mid-request.
 */
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, async () => {
    app.log.info({ signal }, "shutting down");
    await app.close();
    await pool.end();
    process.exit(0);
  });
}

await app.listen({ port: config.PORT, host: config.HOST });
