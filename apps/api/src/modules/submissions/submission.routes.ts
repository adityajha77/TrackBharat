import type { FastifyPluginAsync } from "fastify";
import { CreatePromiseInput, type ModerationQueue, type MyActivity, ReviewSubmissionInput } from "@trackbharat/shared";
import { parseBody, parseId } from "../../lib/validation";
import { currentUser, requireRole, requireUser } from "../auth/auth.plugin";
import type { IssueService } from "../issues/issue.service";
import type { SubmissionService } from "./submission.service";

export const submissionRoutes =
  (submissions: SubmissionService, issues: IssueService): FastifyPluginAsync =>
  async (app) => {
    app.post("/promise-submissions", { preHandler: requireUser }, async (req, reply) => {
      const id = await submissions.submit(currentUser(req), parseBody(CreatePromiseInput, req.body));
      return reply.code(201).send({ id });
    });

    app.post<{ Params: { id: string } }>("/moderation/submissions/:id", { preHandler: requireRole("VERIFIER", "ADMIN") }, async (req) =>
      submissions.review(currentUser(req), parseId(req.params.id), parseBody(ReviewSubmissionInput, req.body)),
    );

    /** One queue for all staff; each role only sees the part it can act on. */
    app.get("/moderation/queue", { preHandler: requireRole("MODERATOR", "VERIFIER", "ADMIN") }, async (req, reply): Promise<ModerationQueue> => {
      reply.header("cache-control", "private, no-store");
      const role = currentUser(req).role;
      const [reportedIssues, pending] = await Promise.all([
        role === "MODERATOR" || role === "ADMIN" ? issues.reported() : [],
        role === "VERIFIER" || role === "ADMIN" ? submissions.pending() : [],
      ]);
      return { reportedIssues, submissions: pending };
    });

    app.get("/me/activity", { preHandler: requireUser }, async (req, reply): Promise<MyActivity> => {
      reply.header("cache-control", "private, no-store");
      const user = currentUser(req);
      const [myIssues, mySubmissions] = await Promise.all([issues.mine(user), submissions.mine(user)]);
      return { user, issues: myIssues, submissions: mySubmissions };
    });
  };
