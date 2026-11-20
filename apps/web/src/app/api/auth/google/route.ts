import { NextResponse, type NextRequest } from "next/server";
import { AuthResponse } from "@trackbharat/shared";
import { setSessionCookie } from "@/lib/session";

/**
 * Last step of "Continue with Google". The API sends the browser here with a
 * one-time code (valid 2 minutes, usable once). This server swaps it for a
 * session, server-to-server, and stores the session in our httpOnly cookie,
 * exactly like a password login. The session token never appears in a URL.
 */
const API_URL = process.env.API_URL ?? "http://localhost:4000";

/** Same-site paths only ("/causes"), never "//evil.com": no open redirects. */
const safeNext = (next: string | null) => (next && /^\/(?![/\\])[\w\-./?=&%]*$/.test(next) ? next : "/me");

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const next = safeNext(req.nextUrl.searchParams.get("next"));
  const fail = (reason: string) => NextResponse.redirect(new URL(`/login?error=${reason}`, req.url));
  if (!code) return fail("google_failed");

  let res: Response;
  try {
    res = await fetch(`${API_URL}/v1/auth/google/exchange`, {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": req.headers.get("user-agent") ?? "" },
      body: JSON.stringify({ code }),
      cache: "no-store",
    });
  } catch {
    return fail("google_failed");
  }
  if (!res.ok) return fail(res.status === 403 ? "blocked" : "google_expired");
  const parsed = AuthResponse.safeParse(await res.json().catch(() => null));
  if (!parsed.success) return fail("google_failed");

  await setSessionCookie(parsed.data.token);
  return NextResponse.redirect(new URL(next, req.url));
}
