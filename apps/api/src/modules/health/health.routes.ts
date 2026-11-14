import type { FastifyPluginAsync } from "fastify";
import type { HealthResponse } from "@trackbharat/shared";

/**
 * Health check. Docker, load balancers and uptime monitors call this to decide
 * whether to send traffic to this instance (and restart it if not).
 * It reports "degraded" (HTTP 503) when the database is unreachable.
 */
export const healthRoutes =
  (deps: { pingDb: () => Promise<void>; version: string }): FastifyPluginAsync =>
  async (app) => {
    app.get("/health", async (_req, reply) => {
      let database: "up" | "down" = "up";
      try {
        await deps.pingDb();
      } catch {
        database = "down";
      }
      const body: HealthResponse = {
        status: database === "up" ? "ok" : "degraded",
        version: deps.version,
        uptimeSeconds: Math.round(process.uptime()),
        checks: { database },
      };
      return reply.code(database === "up" ? 200 : 503).send(body);
    });
  };
