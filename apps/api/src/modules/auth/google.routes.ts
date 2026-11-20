import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { parseBody } from "../../lib/validation";
import type { GoogleAuth } from "./google";

const COOKIE = "tb_google";
const COOKIE_PATH = "/v1/auth/google";

/** Read one cookie from the raw header (we only ever need this one, so no cookie plugin). */
function readCookie(header: string | undefined, name: string) {
  for (const part of (header ?? "").split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return undefined;
}

export const googleRoutes =
  (google: GoogleAuth, { secureCookies, email }: { secureCookies: boolean; email: boolean }): FastifyPluginAsync =>
  async (app) => {
    const cookie = (value: string, maxAge: number) =>
      // SameSite=Lax: still sent when Google redirects back (a top-level GET), never on cross-site POSTs.
      `${COOKIE}=${encodeURIComponent(value)}; Path=${COOKIE_PATH}; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secureCookies ? "; Secure" : ""}`;

    /** Which sign-in methods this server offers (the website hides the Google button when it's off). */
    app.get("/auth/providers", async () => ({ google: google.enabled, email }));

    app.get<{ Querystring: { next?: string } }>("/auth/google/start", { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } }, async (req, reply) => {
      const { url, cookie: value } = google.start(req.query.next);
      reply.header("set-cookie", cookie(value, 600)); // 10 minutes to finish on Google's page
      return reply.redirect(url);
    });

    app.get<{ Querystring: { code?: string; state?: string; error?: string } }>("/auth/google/callback", async (req, reply) => {
      const to = await google.callback(req.query, readCookie(req.headers.cookie, COOKIE));
      reply.header("set-cookie", cookie("", 0)); // one use only
      return reply.redirect(to);
    });

    app.post("/auth/google/exchange", { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (req) => {
      const { code } = parseBody(z.object({ code: z.string().min(20).max(200) }), req.body);
      return google.exchange(code, req.headers["user-agent"] ?? null);
    });
  };
