import Fastify, { type FastifyServerOptions } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import type { ApiErrorBody } from "@trackbharat/shared";
import { AppError } from "./lib/errors";
import { healthRoutes } from "./modules/health/health.routes";
import { pincodeRoutes } from "./modules/pincodes/pincode.routes";
import type { PincodeService } from "./modules/pincodes/pincode.service";
import { constituencyRoutes } from "./modules/constituencies/constituency.routes";
import type { ConstituencyService } from "./modules/constituencies/constituency.service";
import { promiseRoutes } from "./modules/promises/promise.routes";
import type { PromiseService } from "./modules/promises/promise.service";
import { authPlugin } from "./modules/auth/auth.plugin";
import { authRoutes } from "./modules/auth/auth.routes";
import type { AuthService } from "./modules/auth/auth.service";
import type { AccountService } from "./modules/auth/account";
import { leaderboardRoutes } from "./modules/leaderboard/leaderboard.routes";
import type { LeaderboardService } from "./modules/leaderboard/leaderboard.service";
import { issueRoutes } from "./modules/issues/issue.routes";
import type { IssueService } from "./modules/issues/issue.service";
import type { PhotoStore } from "./modules/issues/photo-store";
import { submissionRoutes } from "./modules/submissions/submission.routes";
import type { SubmissionService } from "./modules/submissions/submission.service";
import { reportCardRoutes } from "./modules/report-cards/report-card.routes";
import type { ReportCardService } from "./modules/report-cards/report-card.service";
import type { Database } from "./db/client";

/**
 * APP FACTORY. Builds a Fastify instance from its dependencies but does NOT
 * listen on a port. server.ts wires real dependencies (Postgres, India Post);
 * tests wire fakes and call `app.inject()`, so no network, no port, fast tests.
 * This pattern is called "composition root" / dependency injection.
 */
export interface AppDeps {
  pincodeService: PincodeService;
  constituencyService: ConstituencyService;
  promiseService: PromiseService;
  authService: AuthService;
  accountService: AccountService;
  leaderboardService: LeaderboardService;
  issueService: IssueService;
  submissionService: SubmissionService;
  photoStore: PhotoStore;
  reportCardService: ReportCardService;
  /** Only used by the CSV export route (plain SQL → CSV). */
  db: Pick<Database, "execute">;
  pingDb: () => Promise<void>;
  corsOrigins: string[];
  version: string;
  logger?: FastifyServerOptions["logger"];
  rateLimitMax?: number;
}

export async function buildApp(deps: AppDeps) {
  const app = Fastify({
    logger: deps.logger ?? false,
    // Every request gets an id that appears in every log line and in error
    // responses, so one failing request can be traced end-to-end.
    genReqId: () => crypto.randomUUID(),
    trustProxy: true, // we run behind a reverse proxy / load balancer in production
  });

  // --- Security middleware -------------------------------------------------
  await app.register(helmet); // sensible security headers
  await app.register(cors, { origin: deps.corsOrigins });
  await app.register(rateLimit, {
    max: deps.rateLimitMax ?? 120, // requests per IP per minute
    timeWindow: "1 minute",
    errorResponseBuilder: (req, ctx) => {
      const body: ApiErrorBody = {
        error: { code: "RATE_LIMITED", message: `Too many requests, retry in ${ctx.after}`, requestId: req.id },
      };
      return { statusCode: 429, ...body };
    },
  });

  // Uploads: hard limits so nobody can fill our disk or memory with one request
  await app.register(multipart, { limits: { fileSize: 8 * 1024 * 1024, files: 1, fields: 10, fieldSize: 4096 } });

  // Authentication: attaches req.user on every request that carries a valid bearer token
  await app.register(authPlugin, { auth: deps.authService });

  // --- Uniform error responses --------------------------------------------
  app.setErrorHandler((err, req, reply) => {
    if (err instanceof AppError) {
      const body: ApiErrorBody = { error: { code: err.code, message: err.message, requestId: req.id } };
      return reply.code(err.statusCode).send(body);
    }
    if (typeof err === "object" && err !== null && "statusCode" in err && err.statusCode === 429) {
      return reply.code(429).send(err);
    }
    // Fastify's own client errors (malformed JSON, body too large, …) are the
    // client's fault, not a bug: answer 4xx in our standard shape.
    if (typeof err === "object" && err !== null && "statusCode" in err && typeof err.statusCode === "number" && err.statusCode >= 400 && err.statusCode < 500) {
      const message = "message" in err && typeof err.message === "string" ? err.message : "Bad request";
      const body: ApiErrorBody = { error: { code: "VALIDATION_ERROR", message, requestId: req.id } };
      return reply.code(err.statusCode).send(body);
    }
    req.log.error({ err }, "unhandled error"); // a real bug: log the stack trace
    const body: ApiErrorBody = {
      error: { code: "INTERNAL_ERROR", message: "Something went wrong", requestId: req.id },
    };
    return reply.code(500).send(body);
  });

  app.setNotFoundHandler((req, reply) => {
    const body: ApiErrorBody = {
      error: { code: "NOT_FOUND", message: `Route ${req.method} ${req.url} not found`, requestId: req.id },
    };
    return reply.code(404).send(body);
  });

  // --- Routes --------------------------------------------------------------
  await app.register(healthRoutes({ pingDb: deps.pingDb, version: deps.version }));
  // Versioned API: when we must break the contract we add /v2 and keep /v1
  // alive, because the mobile app can't be force-updated on every phone overnight.
  await app.register(pincodeRoutes(deps.pincodeService), { prefix: "/v1" });
  await app.register(constituencyRoutes(deps.constituencyService), { prefix: "/v1" });
  await app.register(promiseRoutes(deps.promiseService), { prefix: "/v1" });
  await app.register(authRoutes(deps.authService, deps.accountService), { prefix: "/v1" });
  await app.register(issueRoutes(deps.issueService, deps.photoStore), { prefix: "/v1" });
  await app.register(submissionRoutes(deps.submissionService, deps.issueService), { prefix: "/v1" });
  await app.register(reportCardRoutes(deps.reportCardService, deps.db), { prefix: "/v1" });
  await app.register(leaderboardRoutes(deps.leaderboardService), { prefix: "/v1" });

  return app;
}
