import { afterAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { loadConfig } from "../../src/config";
import { createDb } from "../../src/db/client";
import { createAuthRepository } from "../../src/modules/auth/auth.repository";
import { createAuthService } from "../../src/modules/auth/auth.service";
import { createAccountService } from "../../src/modules/auth/account";
import { createGoogleAuth } from "../../src/modules/auth/google";

/**
 * INTEGRATION: the whole Google flow against a real Postgres, with Google's two
 * endpoints faked. Covers: new account, linking to an existing email account,
 * and the one-time code (works once, then never again).
 */
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("Continue with Google (Postgres)", () => {
  const { db, pool } = createDb(url ?? "postgres://unused");
  const config = loadConfig({ DATABASE_URL: url ?? "postgres://unused", WEB_URL: "https://web.example", GOOGLE_CLIENT_ID: "id", GOOGLE_CLIENT_SECRET: "secret" });
  const auth = createAuthService(createAuthRepository(db));
  const fakeGoogle = (profile: object) =>
    (async (input: string | URL | Request) =>
      String(input).includes("/token") ? new Response(JSON.stringify({ access_token: "at" })) : new Response(JSON.stringify(profile))) as typeof fetch;

  afterAll(async () => {
    await db.execute(sql`DELETE FROM users WHERE email LIKE 'google-%@test.local'`);
    await pool.end();
  });

  async function signIn(profile: object) {
    const g = createGoogleAuth(db, config, auth, fakeGoogle(profile));
    const { cookie } = g.start("/causes");
    const { state } = JSON.parse(cookie) as { state: string };
    const to = new URL(await g.callback({ code: "google-code", state }, cookie));
    expect(to.pathname).toBe("/api/auth/google");
    expect(to.searchParams.get("next")).toBe("/causes");
    return { g, code: to.searchParams.get("code")! };
  }

  it("creates a verified account, and the one-time code works exactly once", async () => {
    const { g, code } = await signIn({ sub: "g-new-1", email: "Google-New@test.local", email_verified: true, name: "Asha" });
    const session = await g.exchange(code, "test");
    expect(session.user).toMatchObject({ name: "Asha", emailVerified: true });
    expect(await auth.resolve(session.token)).toMatchObject({ id: session.user.id });
    await expect(g.exchange(code, "test")).rejects.toThrow(/expired/);
    const { rows } = await db.execute<{ google_sub: string; verified: boolean }>(sql`SELECT google_sub, email_verified_at IS NOT NULL AS verified FROM users WHERE email = 'google-new@test.local'`);
    expect(rows[0]).toEqual({ google_sub: "g-new-1", verified: true });
  });

  it("links Google to an existing account with the same email, and verifies it", async () => {
    await db.execute(sql`INSERT INTO users (email, name, password_hash) VALUES ('google-old@test.local', 'Ravi', 'x')`);
    const { g, code } = await signIn({ sub: "g-old-1", email: "google-old@test.local", email_verified: true, name: "Ravi K" });
    const session = await g.exchange(code, null);
    expect(session.user.name).toBe("Ravi"); // existing account kept as it was
    const { rows } = await db.execute<{ n: number }>(sql`SELECT count(*)::int AS n FROM users WHERE email = 'google-old@test.local' AND google_sub = 'g-old-1' AND email_verified_at IS NOT NULL`);
    expect(rows[0]!.n).toBe(1);
  });

  it("a Google-linked account can be deleted without a password; a password account cannot", async () => {
    const { g, code } = await signIn({ sub: "g-del-1", email: "google-del@test.local", email_verified: true, name: "Del" });
    const session = await g.exchange(code, null);
    const account = createAccountService(db, { remove: async () => {} } as never);
    await account.deleteAccount(session.user, "");
    const { rows } = await db.execute<{ n: number }>(sql`SELECT count(*)::int AS n FROM users WHERE email = 'google-del@test.local'`);
    expect(rows[0]!.n).toBe(0);

    const [pw] = (await db.execute<{ id: number }>(sql`INSERT INTO users (email, name, password_hash) VALUES ('google-pw@test.local', 'Pw', 'x') RETURNING id`)).rows;
    await expect(account.deleteAccount({ id: pw!.id, name: "Pw", role: "CITIZEN" }, "")).rejects.toThrow(/Incorrect password/);
  });

  it("started from the mobile app, the one-time code goes back to the app's fixed address", async () => {
    const g = createGoogleAuth(db, config, auth, fakeGoogle({ sub: "g-app-1", email: "google-app@test.local", email_verified: true, name: "App" }));
    const { cookie } = g.start("/me", true);
    const { state } = JSON.parse(cookie) as { state: string };
    const to = await g.callback({ code: "c", state }, cookie);
    expect(to).toMatch(/^trackbharat:\/\/auth\?code=/);
    const session = await g.exchange(new URL(to).searchParams.get("code")!, "TrackBharat app");
    expect(session.user.name).toBe("App");
    expect(await g.callback({ error: "access_denied" }, cookie)).toBe("trackbharat://auth?error=google_cancelled");
  });

  it("refuses an email Google hasn't verified", async () => {
    const g = createGoogleAuth(db, config, auth, fakeGoogle({ sub: "g-x", email: "google-unverified@test.local", email_verified: false }));
    const { cookie } = g.start("/me");
    const { state } = JSON.parse(cookie) as { state: string };
    expect(await g.callback({ code: "c", state }, cookie)).toBe("https://web.example/login?error=google_unverified");
  });
});
