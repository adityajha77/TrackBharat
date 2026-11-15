import type { FastifyPluginAsync } from "fastify";
import { sql } from "drizzle-orm";
import type { Database } from "../../db/client";
import { type Cell, toCsv } from "../../lib/csv";
import { AppError } from "../../lib/errors";
import { CURRENT_LOK_SABHA } from "../../lib/legislatures";
import type { ReportCardService } from "./report-card.service";

/**
 * Report cards, national insights and OPEN-DATA exports.
 * Exports are plain SQL → CSV: everything public on the site is downloadable.
 * Demo data is always excluded.
 */
const DATASETS: Record<string, { description: string; header: string[]; query: ReturnType<typeof sql> }> = {
  constituencies: {
    description: "All Lok Sabha and Vidhan Sabha constituencies",
    header: ["house", "state", "number", "name", "name_hi", "reservation", "lok_sabha_seat", "boundary_approximate", "slug"],
    query: sql`
      SELECT c.house, s.name, c.number, c.name, c.name_hi, c.reservation, p.name, c.boundary_outdated, c.slug
      FROM constituencies c JOIN states s ON s.id = c.state_id LEFT JOIN constituencies p ON p.id = c.parent_id
      WHERE NOT c.is_demo ORDER BY c.house, s.name, c.number`,
  },
  representatives: {
    description: "Members of the current Lok Sabha and curated MLAs, with questions asked",
    header: ["house", "state", "constituency", "name", "party", "legislature", "status", "terms_served", "questions_asked", "source_url"],
    query: sql`
      SELECT c.house, s.name, c.name, r.full_name, p.name, t.legislature, t.status, t.terms_served,
             (SELECT count(*) FROM parliament_questions q WHERE q.representative_id = r.id AND q.legislature = t.legislature),
             src.url
      FROM terms t JOIN representatives r ON r.id = t.representative_id JOIN constituencies c ON c.id = t.constituency_id
      JOIN states s ON s.id = c.state_id LEFT JOIN parties p ON p.id = t.party_id JOIN sources src ON src.id = t.source_id
      WHERE NOT r.is_demo AND (c.house = 'VIDHAN_SABHA' OR t.legislature = ${CURRENT_LOK_SABHA})
      ORDER BY c.house, s.name, c.number`,
  },
  promises: {
    description: "Every tracked promise with its current status and source",
    header: ["id", "constituency", "state", "made_by", "title", "category", "status", "made_on", "deadline", "source_url", "source_publisher", "updated_at"],
    query: sql`
      SELECT pr.id, c.name, s.name, coalesce(r.full_name, pa.name), pr.title, pr.category, pr.status, pr.made_on, pr.deadline, src.url, src.publisher, pr.updated_at
      FROM promises pr JOIN sources src ON src.id = pr.source_id
      LEFT JOIN constituencies c ON c.id = pr.constituency_id LEFT JOIN states s ON s.id = c.state_id
      LEFT JOIN terms t ON t.id = pr.term_id LEFT JOIN representatives r ON r.id = t.representative_id
      LEFT JOIN parties pa ON pa.id = pr.party_id
      WHERE NOT pr.is_demo ORDER BY pr.id`,
  },
  "weekly-highlights": {
    description: "Top citizen issues per constituency, frozen every week",
    header: ["week_start", "constituency", "state", "rank", "votes", "issue_title", "category", "issue_status"],
    query: sql`
      SELECT w.week_start, c.name, s.name, w.rank, w.votes, i.title, i.category, i.status
      FROM weekly_issue_rankings w JOIN issues i ON i.id = w.issue_id JOIN constituencies c ON c.id = w.constituency_id
      JOIN states s ON s.id = c.state_id
      WHERE NOT c.is_demo AND i.status <> 'HIDDEN' ORDER BY w.week_start DESC, c.name, w.rank`,
  },
};

export const reportCardRoutes =
  (service: ReportCardService, db: Pick<Database, "execute">): FastifyPluginAsync =>
  async (app) => {
    app.get<{ Params: { slug: string } }>("/constituencies/:slug/report-card", async (req, reply) => {
      reply.header("cache-control", "public, max-age=600");
      return service.reportCard(req.params.slug.toLowerCase());
    });

    app.get("/insights", async (_req, reply) => {
      reply.header("cache-control", "public, max-age=600");
      return service.insights();
    });

    app.get("/export", async () => Object.entries(DATASETS).map(([name, d]) => ({ name, description: d.description, url: `/v1/export/${name}.csv` })));

    app.get<{ Params: { file: string } }>("/export/:file", { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } }, async (req, reply) => {
      const name = req.params.file.replace(/\.csv$/, "");
      const ds = DATASETS[name];
      if (!ds) throw AppError.notFound(`No dataset called "${name}"`);
      const { rows } = await db.execute(ds.query);
      const body = toCsv(ds.header, rows.map((r) => Object.values(r) as Cell[]));
      return reply
        .header("content-type", "text/csv; charset=utf-8")
        .header("content-disposition", `attachment; filename="trackbharat-${name}.csv"`)
        .header("cache-control", "public, max-age=3600")
        .header("x-data-license", "Our compilation: CC BY 4.0. Underlying sources keep their own licences; see /data.")
        .send(body);
    });
  };
