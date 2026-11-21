import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import type { AuthResponse, PublicUser } from "@trackbharat/shared";
import type { Config } from "../../config";
import type { Database } from "../../db/client";
import { causeVotes, emailTokens, issueVotes, users } from "../../db/schema";
import { AppError } from "../../lib/errors";
import { hashPassword } from "./password";
import type { AuthService } from "./auth.service";

/**
 * "CONTINUE WITH GOOGLE" (OAuth 2.0 authorization-code flow with PKCE, done by the API).
 *
 *   1. /auth/google/start   → a random `state` and a PKCE verifier go into a short
 *                              httpOnly cookie, and the browser goes to Google.
 *   2. Google → /auth/google/callback?code&state
 *                            → state must match the cookie (stops forged logins);
 *                              the code is swapped for tokens server-to-server (the
 *                              client secret never reaches a browser) and we read
 *                              the verified email from Google's userinfo endpoint.
 *   3. find the account (by Google id, else by email) or create one. Google has
 *      verified the email, so the account counts as verified (its votes count).
 *   4. the browser goes back to the website (/api/auth/google) with a ONE-TIME code (2 minutes, stored
 *      hashed), never the session itself. The website's server swaps it for a
 *      session via /auth/google/exchange and sets its own httpOnly cookie.
 */
const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO = "https://openidconnect.googleapis.com/v1/userinfo";
const CODE_TTL_MS = 2 * 60_000;
/** The mobile app's own address (app.json "scheme"). Fixed here, never taken from a request. */
export const APP_RETURN_URL = "trackbharat://auth";

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const b64url = (b: Buffer) => b.toString("base64url");

export type GoogleProfile = { sub: string; email: string; email_verified: boolean; name?: string };

/** Only same-site paths ("/me", "/hi/causes"), never "//evil.com" or "https://…": no open redirects. */
export const safeNext = (next: unknown) => (typeof next === "string" && /^\/(?![/\\])[\w\-./?=&%]*$/.test(next) ? next : "/me");

export function createGoogleAuth(db: Database, config: Config, auth: AuthService, fetchImpl: typeof fetch = fetch) {
  const enabled = Boolean(config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET);
  const redirectUri = `${config.PUBLIC_API_URL}/v1/auth/google/callback`;
  const web = (path: string) => `${config.WEB_URL}${path}`;

  /** Find or create the account for a verified Google profile. */
  async function upsertUser(p: GoogleProfile): Promise<PublicUser & { isBlocked: boolean }> {
    if (!p.email_verified) throw AppError.forbidden("Google says this email address isn't verified");
    const email = p.email.toLowerCase();
    return db.transaction(async (tx) => {
      const cols = { id: users.id, name: users.name, role: users.role, isBlocked: users.isBlocked };
      let [u] = await tx.select(cols).from(users).where(eq(users.googleSub, p.sub));
      if (!u) [u] = await tx.select(cols).from(users).where(eq(users.email, email));
      if (!u) {
        // No password: a random, unknowable one. They can set a real one with "forgot password".
        const passwordHash = await hashPassword(b64url(randomBytes(32)));
        [u] = await tx
          .insert(users)
          .values({ email, name: (p.name ?? email.split("@")[0]!).slice(0, 80), passwordHash, googleSub: p.sub, emailVerifiedAt: sql`now()` })
          .returning(cols);
      } else {
        // Link Google to the existing account; Google has verified this email.
        await tx.update(users).set({ googleSub: p.sub }).where(and(eq(users.id, u.id), isNull(users.googleSub)));
        await tx.update(users).set({ emailVerifiedAt: sql`now()` }).where(and(eq(users.id, u.id), isNull(users.emailVerifiedAt)));
      }
      // Same as clicking the email link: earlier votes now count.
      await tx.update(issueVotes).set({ counted: true }).where(eq(issueVotes.userId, u!.id));
      await tx.update(causeVotes).set({ counted: true }).where(eq(causeVotes.userId, u!.id));
      return { id: u!.id, name: u!.name, role: u!.role, emailVerified: true, isBlocked: u!.isBlocked };
    });
  }

  return {
    enabled,

    /** Step 1: where to send the browser, plus what to keep in the short-lived cookie. */
    /** `app`: started from the mobile app, so the one-time code goes back to the app, not the website. */
    start(next: unknown, app = false) {
      if (!enabled) throw AppError.notFound("Google sign-in is not set up on this server");
      const state = b64url(randomBytes(24));
      const verifier = b64url(randomBytes(32));
      const challenge = createHash("sha256").update(verifier).digest("base64url");
      const url = new URL(GOOGLE_AUTH);
      url.search = new URLSearchParams({
        client_id: config.GOOGLE_CLIENT_ID!,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "openid email profile",
        state,
        code_challenge: challenge,
        code_challenge_method: "S256",
        prompt: "select_account",
      }).toString();
      return { url: url.toString(), cookie: JSON.stringify({ state, verifier, next: safeNext(next), app }) };
    },

    /** Steps 2–4: returns where to send the browser (the website, with a one-time code). */
    async callback(query: { code?: string; state?: string; error?: string }, cookie: string | undefined): Promise<string> {
      let saved: { state: string; verifier: string; next: string; app?: boolean } | null = null;
      try {
        saved = JSON.parse(cookie ?? "");
      } catch {
        saved = null;
      }
      // Errors go back to where the sign-in started: the app or the website's login page.
      const fail = (reason: string) => (saved?.app ? `${APP_RETURN_URL}?error=${reason}` : web(`/login?error=${reason}`));
      if (query.error) return fail("google_cancelled");
      if (!saved) return fail("google_expired");
      if (!query.code || !query.state || query.state !== saved.state) return fail("google_state");

      const tokenRes = await fetchImpl(GOOGLE_TOKEN, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: query.code,
          client_id: config.GOOGLE_CLIENT_ID!,
          client_secret: config.GOOGLE_CLIENT_SECRET!,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
          code_verifier: saved.verifier,
        }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!tokenRes.ok) return fail("google_failed");
      const { access_token } = (await tokenRes.json()) as { access_token?: string };
      const infoRes = await fetchImpl(GOOGLE_USERINFO, { headers: { authorization: `Bearer ${access_token}` }, signal: AbortSignal.timeout(15_000) });
      if (!infoRes.ok) return fail("google_failed");
      const profile = (await infoRes.json()) as GoogleProfile;

      const user = await upsertUser(profile).catch(() => null);
      if (!user) return fail("google_unverified");
      if (user.isBlocked) return fail("blocked");

      const code = b64url(randomBytes(32));
      await db.insert(emailTokens).values({ userId: user.id, purpose: "GOOGLE_LOGIN", tokenHash: sha256(code), expiresAt: new Date(Date.now() + CODE_TTL_MS) });
      if (saved.app) return `${APP_RETURN_URL}?code=${encodeURIComponent(code)}`; // the app swaps it via /auth/google/exchange
      return web(`/api/auth/google?code=${encodeURIComponent(code)}&next=${encodeURIComponent(saved.next)}`);
    },

    /** The website's server swaps the one-time code for a session (once, within 2 minutes). */
    async exchange(code: string, userAgent: string | null): Promise<AuthResponse> {
      const [row] = await db
        .update(emailTokens)
        .set({ usedAt: sql`now()` })
        .where(and(eq(emailTokens.tokenHash, sha256(code)), eq(emailTokens.purpose, "GOOGLE_LOGIN"), isNull(emailTokens.usedAt), gt(emailTokens.expiresAt, sql`now()`)))
        .returning({ userId: emailTokens.userId });
      if (!row) throw AppError.unauthorized("This sign-in link has expired. Please try again.");
      const [u] = await db.select({ id: users.id, name: users.name, role: users.role, isBlocked: users.isBlocked }).from(users).where(eq(users.id, row.userId));
      if (!u || u.isBlocked) throw AppError.forbidden("This account has been blocked");
      return auth.sessionFor({ id: u.id, name: u.name, role: u.role, emailVerified: true }, userAgent);
    },

    upsertUser,
  };
}

export type GoogleAuth = ReturnType<typeof createGoogleAuth>;
