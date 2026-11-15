import "server-only";
import { cookies } from "next/headers";

/**
 * The web app's side of authentication.
 *
 * The API hands out an opaque session token. We keep it in an httpOnly cookie:
 *  - httpOnly: JavaScript in the page can't read it, so an XSS bug can't steal it.
 *  - sameSite=lax: the browser won't send it on cross-site POSTs (CSRF protection).
 *  - secure (production): only sent over HTTPS.
 * The browser never talks to the API directly; Next.js server code reads the
 * cookie and forwards it as "Authorization: Bearer …".
 */
export const SESSION_COOKIE = "tb_session";
const THIRTY_DAYS = 60 * 60 * 24 * 30;

export async function getSessionToken(): Promise<string | null> {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

/** Only callable from Server Actions / Route Handlers (HTTP can't set cookies after streaming starts). */
export async function setSessionCookie(token: string) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: THIRTY_DAYS,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}
