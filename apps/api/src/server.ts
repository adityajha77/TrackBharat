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
import { createGoogleAuth } from "./modules/auth/google";
import { createIssueRepository } from "./modules/issues/issue.repository";
import { createIssueService } from "./modules/issues/issue.service";
import { createPhotoStore, createSupabasePhotoStore } from "./modules/issues/photo-store";
import { createSubmissionRepository } from "./modules/submissions/submission.repository";
import { createSubmissionService } from "./modules/submissions/submission.service";
import { createAccountService } from "./modules/auth/account";
import { createLeaderboardService } from "./modules/leaderboard/leaderboard.service";
import { createReportCardRepository } from "./modules/report-cards/report-card.repository";
import { createReportCardService } from "./modules/report-cards/report-card.service";
import { createCausesService } from "./modules/causes/causes.service";
import { createNewsService } from "./modules/news/news.service";
import { createPartiesService } from "./modules/parties/parties.service";
import { createNetaService } from "./modules/parties/neta.service";
import { createEmailLinksService } from "./modules/email/email-links";
import { createBrevoMailer, createOutboxMailer, createSmtpMailer } from "./modules/email/mailer";
import path from "node:path";

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
const supabasePhotos =
  config.SUPABASE_URL && config.SUPABASE_SERVICE_ROLE_KEY
    ? createSupabasePhotoStore({ url: config.SUPABASE_URL, serviceKey: config.SUPABASE_SERVICE_ROLE_KEY, bucket: config.SUPABASE_PHOTOS_BUCKET })
    : null;
await supabasePhotos?.ensureBucket();
const photoStore = supabasePhotos ?? createPhotoStore(config.UPLOADS_DIR);
const issueService = createIssueService(createIssueRepository(db), photoStore);
// No SMTP configured → emails go to an in-memory outbox (dev); production must set SMTP_URL.
// Without SMTP, production still starts (Google sign-in needs no email), but no emails go out:
// email sign-ups can't be verified and passwords can't be reset until SMTP_URL is set.
const emailEnabled = Boolean(config.BREVO_API_KEY || config.SMTP_URL);
if (config.NODE_ENV === "production" && !emailEnabled) console.warn("No BREVO_API_KEY or SMTP_URL: verification and password-reset emails are OFF");
const mailer = config.BREVO_API_KEY
  ? createBrevoMailer(config.BREVO_API_KEY, config.MAIL_FROM)
  : config.SMTP_URL
    ? createSmtpMailer(config.SMTP_URL, config.MAIL_FROM)
    : createOutboxMailer();

const authService = createAuthService(createAuthRepository(db));

const app = await buildApp({
  pincodeService,
  constituencyService: createConstituencyService(createConstituencyRepository(db)),
  promiseService,
  authService,
  googleAuth: createGoogleAuth(db, config, authService),
  secureCookies: config.NODE_ENV === "production",
  emailEnabled: emailEnabled || config.NODE_ENV !== "production",
  accountService: createAccountService(db, photoStore),
  leaderboardService: createLeaderboardService(db),
  issueService,
  submissionService: createSubmissionService(createSubmissionRepository(db), promiseService),
  photoStore,
  reportCardService: createReportCardService(createReportCardRepository(db)),
  causesService: createCausesService(db),
  newsService: createNewsService(db),
  partiesService: createPartiesService(db),
  netaService: createNetaService(db),
  emailLinks: createEmailLinksService(db, mailer, config.WEB_URL),
  leaderPhotos: createPhotoStore(config.LEADER_PHOTOS_DIR ?? path.join(config.UPLOADS_DIR, "leaders")),
  exposeOutbox: config.NODE_ENV !== "production" && !emailEnabled,
  db,
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
