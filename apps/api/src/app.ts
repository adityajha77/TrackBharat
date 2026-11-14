import Fastify, { type FastifyServerOptions } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import type { ApiErrorBody } from "@trackbharat/shared";
import { AppError } from "./lib/errors";
import { healthRoutes } from "./modules/health/health.routes";
import { pincodeRoutes } from "./modules/pincodes/pincode.routes";
import type { PincodeService } from "./modules/pincodes/pincode.service";

/**
 * APP FACTORY. Builds a Fastify instance from its dependencies but does NOT
 * listen on a port. server.ts wires real dependencies (Postgres, India Post);
 * tests wire fakes and call `app.inject()`, so no network, no port, fast tests.
 * This pattern is called "composition root" / dependency injection.
 */
export interface AppDeps {
  pincodeService: PincodeService;
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

  // --- Uniform error responses --------------------------------------------
  app.setErrorHandler((err, req, reply) => {
    if (err instanceof AppError) {
      const body: ApiErrorBody = { error: { code: err.code, message: err.message, requestId: req.id } };
      return reply.code(err.statusCode).send(body);
    }
    if (typeof err === "object" && err !== null && "statusCode" in err && err.statusCode === 429) {
      return reply.code(429).send(err);
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

  return app;
}
