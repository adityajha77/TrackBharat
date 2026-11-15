import { sql } from "drizzle-orm";
import { buildApp } from "./app";
import { loadConfig } from "./config";
import { createDb } from "./db/client";
import { createIndiaPostClient } from "./modules/pincodes/india-post.client";
import { createPincodeRepository } from "./modules/pincodes/pincode.repository";
import { createPincodeService } from "./modules/pincodes/pincode.service";
import { createConstituencyRepository } from "./modules/constituencies/constituency.repository";
import { createConstituencyService } from "./modules/constituencies/constituency.service";
import { createPromiseRepository } from "./modules/promises/promise.repository";
import { createPromiseService } from "./modules/promises/promise.service";
import { createAuthRepository } from "./modules/auth/auth.repository";
import { createAuthService } from "./modules/auth/auth.service";
import { createIssueRepository } from "./modules/issues/issue.repository";
import { createIssueService } from "./modules/issues/issue.service";
import { createPhotoStore } from "./modules/issues/photo-store";
import { createSubmissionRepository } from "./modules/submissions/submission.repository";
import { createSubmissionService } from "./modules/submissions/submission.service";

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

const promiseService = createPromiseService(createPromiseRepository(db));
const photoStore = createPhotoStore(config.UPLOADS_DIR);
const issueService = createIssueService(createIssueRepository(db), photoStore);

const app = await buildApp({
  pincodeService,
  constituencyService: createConstituencyService(createConstituencyRepository(db)),
  promiseService,
  authService: createAuthService(createAuthRepository(db)),
  issueService,
  submissionService: createSubmissionService(createSubmissionRepository(db), promiseService),
  photoStore,
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
