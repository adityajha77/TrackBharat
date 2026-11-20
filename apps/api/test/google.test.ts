import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config";
import { createGoogleAuth, safeNext } from "../src/modules/auth/google";
import type { AuthService } from "../src/modules/auth/auth.service";
import type { Database } from "../src/db/client";

const config = loadConfig({
  DATABASE_URL: "postgres://unused",
  WEB_URL: "https://web.example",
  PUBLIC_API_URL: "https://api.example",
  GOOGLE_CLIENT_ID: "client-id",
  GOOGLE_CLIENT_SECRET: "secret",
});
const noDb = {} as Database;
const noAuth = {} as AuthService;

describe("Continue with Google", () => {
  it("only accepts same-site paths after sign-in (no open redirects)", () => {
    expect(safeNext("/causes")).toBe("/causes");
    expect(safeNext("/hi/news?state=Kerala")).toBe("/hi/news?state=Kerala");
    expect(safeNext("//evil.example")).toBe("/me");
    expect(safeNext("https://evil.example")).toBe("/me");
    expect(safeNext("/\\evil.example")).toBe("/me");
    expect(safeNext(undefined)).toBe("/me");
  });

  it("start: sends the browser to Google with state and PKCE, and remembers them in the cookie", () => {
    const g = createGoogleAuth(noDb, config, noAuth);
    const { url, cookie } = g.start("/causes");
    const u = new URL(url);
    const saved = JSON.parse(cookie) as { state: string; verifier: string; next: string };
    expect(u.origin + u.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(u.searchParams.get("redirect_uri")).toBe("https://api.example/v1/auth/google/callback");
    expect(u.searchParams.get("scope")).toBe("openid email profile");
    expect(u.searchParams.get("state")).toBe(saved.state);
    expect(u.searchParams.get("code_challenge_method")).toBe("S256");
    expect(u.searchParams.get("code_challenge")).not.toBe(saved.verifier); // only the hash goes to Google
    expect(saved.next).toBe("/causes");
    expect(url).not.toContain("secret");
  });

  it("is off (and says so) without a client id and secret", () => {
    const g = createGoogleAuth(noDb, loadConfig({ DATABASE_URL: "postgres://unused" }), noAuth);
    expect(g.enabled).toBe(false);
    expect(() => g.start("/me")).toThrow(/not set up/);
  });

  it("callback: a missing or forged state never reaches Google, and goes back to login", async () => {
    let called = false;
    const g = createGoogleAuth(noDb, config, noAuth, (async () => {
      called = true;
      return new Response("{}");
    }) as typeof fetch);
    const cookie = JSON.stringify({ state: "right", verifier: "v", next: "/me" });
    expect(await g.callback({ code: "c", state: "wrong" }, cookie)).toBe("https://web.example/login?error=google_state");
    expect(await g.callback({ code: "c", state: "right" }, undefined)).toBe("https://web.example/login?error=google_expired");
    expect(await g.callback({ error: "access_denied" }, cookie)).toBe("https://web.example/login?error=google_cancelled");
    expect(called).toBe(false);
  });
});
