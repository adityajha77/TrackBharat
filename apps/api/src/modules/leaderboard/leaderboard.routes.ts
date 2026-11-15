import type { FastifyPluginAsync } from "fastify";
import { LeaderboardPeriod } from "@trackbharat/shared";
import { AppError } from "../../lib/errors";
import type { LeaderboardService } from "./leaderboard.service";

export const leaderboardRoutes =
  (service: LeaderboardService): FastifyPluginAsync =>
  async (app) => {
    app.get<{ Querystring: { period?: string } }>("/leaderboard", async (req, reply) => {
      const parsed = LeaderboardPeriod.safeParse(req.query.period ?? "day");
      if (!parsed.success) throw AppError.validation('period must be "day" or "week"');
      reply.header("cache-control", "public, max-age=60"); // near-live, but cheap under load
      return service.get(parsed.data);
    });
  };
