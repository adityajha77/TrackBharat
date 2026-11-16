import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { CreateIssueInput, ModerationActionInput, ReportIssueInput, VoteInput } from "@trackbharat/shared";
import { AppError } from "../../lib/errors";
import { parseBody, parseId } from "../../lib/validation";
import { currentUser, requireRole, requireUser } from "../auth/auth.plugin";
import type { IssueService } from "./issue.service";
import type { PhotoStore } from "./photo-store";

/**
 * Accepts BOTH multipart/form-data (web form with an optional photo) and plain
 * JSON (e.g. the future mobile app sending a report without a photo).
 */
async function readIssueRequest(req: FastifyRequest): Promise<{ fields: Record<string, unknown>; photo: Buffer | null }> {
  if (!req.isMultipart()) return { fields: (req.body ?? {}) as Record<string, unknown>, photo: null };
  const fields: Record<string, unknown> = {};
  let photo: Buffer | null = null;
  for await (const part of req.parts()) {
    if (part.type === "file") {
      if (part.fieldname !== "photo") throw AppError.validation(`Unexpected file field "${part.fieldname}"`);
      const buf = await part.toBuffer(); // throws a 413 if it exceeds the configured fileSize limit
      if (buf.length) photo = buf;
    } else {
      fields[part.fieldname] = part.value;
    }
  }
  return { fields, photo };
}

export const issueRoutes =
  (service: IssueService, photos: PhotoStore): FastifyPluginAsync =>
  async (app) => {
    // ---- Public reads (personalised with myVote when logged in) --------
    app.get<{ Params: { slug: string }; Querystring: { sort?: string; limit?: string } }>("/constituencies/:slug/issues", async (req, reply) => {
      const sort = req.query.sort === "new" ? "new" : "top";
      const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
      // "private" when the answer depends on who's asking; otherwise a short shared cache
      reply.header("cache-control", req.user ? "private, no-store" : "public, max-age=30");
      return service.list(req.params.slug.toLowerCase(), sort, req.user, limit);
    });

    app.get<{ Params: { slug: string } }>("/constituencies/:slug/issues/highlights", async (req, reply) => {
      reply.header("cache-control", "public, max-age=300"); // changes once a week
      return service.highlights(req.params.slug.toLowerCase());
    });

    app.get<{ Params: { id: string } }>("/issues/:id", async (req, reply) => {
      reply.header("cache-control", req.user ? "private, no-store" : "public, max-age=30");
      return service.get(parseId(req.params.id), req.user);
    });

    // ---- Citizen actions --------------------------------------------------
    app.post("/issues", { preHandler: requireUser, config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (req, reply) => {
      const { fields, photo } = await readIssueRequest(req);
      const id = await service.create(currentUser(req), parseBody(CreateIssueInput, fields), photo);
      return reply.code(201).send({ id });
    });

    // Body { value: 1 | -1 } (defaults to 1, so older clients that POST without a body still work)
    const voteLimit = { rateLimit: { max: 30, timeWindow: "1 minute" } };
    app.post<{ Params: { id: string } }>("/issues/:id/vote", { preHandler: requireUser, config: voteLimit }, async (req) =>
      service.vote(currentUser(req), parseId(req.params.id), parseBody(VoteInput, req.body ?? {}).value),
    );
    app.delete<{ Params: { id: string } }>("/issues/:id/vote", { preHandler: requireUser, config: voteLimit }, async (req) => service.vote(currentUser(req), parseId(req.params.id), null));

    app.post<{ Params: { id: string } }>("/issues/:id/report", { preHandler: requireUser }, async (req, reply) => {
      await service.report(currentUser(req), parseId(req.params.id), parseBody(ReportIssueInput, req.body).reason);
      return reply.code(204).send();
    });

    // ---- Moderation -------------------------------------------------------
    app.post<{ Params: { id: string } }>("/moderation/issues/:id", { preHandler: requireRole("MODERATOR", "ADMIN") }, async (req, reply) => {
      await service.moderate(currentUser(req), parseId(req.params.id), parseBody(ModerationActionInput, req.body));
      return reply.code(204).send();
    });

    // ---- Media (re-encoded photos) ----------------------------------------
    app.get<{ Params: { key: string } }>("/media/issues/:key", async (req, reply) => {
      const stream = photos.open(req.params.key);
      if (!stream) throw AppError.notFound("Photo not found");
      // The name is random and the content never changes → cache "forever"
      return reply.header("cache-control", "public, max-age=31536000, immutable").type("image/webp").send(stream);
    });
  };
