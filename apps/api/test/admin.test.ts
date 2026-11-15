import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiErrorBody, type CreatePromiseInput } from "@trackbharat/shared";
import { buildApp } from "../src/app";
import { bearer, deps } from "./helpers";

// AUTHORIZATION tests: who may call which endpoint. These are the tests that
// would have caught v1's unprotected /admin page.

const valid: CreatePromiseInput = {
  constituencySlug: "demo-nagar",
  madeBy: { type: "REPRESENTATIVE" },
  title: "Solar street lights on all main roads",
  category: "ELECTRICITY",
  source: { url: "https://example.org/speech", title: "Ward meeting speech", publisher: "Example News", kind: "NEWS" },
};

let app: Awaited<ReturnType<typeof buildApp>>;
afterEach(() => app?.close());

const post = (url: string, body: unknown, headers: Record<string, string> = {}) =>
  app.inject({ method: "POST", url, payload: body as object, headers: { "content-type": "application/json", ...headers } });

describe("promise writes need VERIFIER or ADMIN", () => {
  it.each([
    ["anonymous", {}, 401],
    ["an invalid token", { authorization: "Bearer made-up" }, 401],
    ["a citizen", bearer("CITIZEN"), 403],
    ["a moderator", bearer("MODERATOR"), 403],
  ])("rejects %s", async (_who, headers, status) => {
    const create = vi.fn();
    app = await buildApp(deps({ promiseService: { ...deps().promiseService, create } }));
    const res = await post("/v1/admin/promises", valid, headers as Record<string, string>);
    expect(res.statusCode).toBe(status);
    expect(create).not.toHaveBeenCalled(); // the service is never reached
  });

  it.each([["VERIFIER"], ["ADMIN"]] as const)("allows a %s and records who did it", async (role) => {
    const create = vi.fn().mockResolvedValue(42);
    app = await buildApp(deps({ promiseService: { ...deps().promiseService, create } }));
    const res = await post("/v1/admin/promises", valid, bearer(role));
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ id: 42 });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ title: valid.title }), role === "VERIFIER" ? 2 : 4); // actor id for the audit log
  });

  it("does NOT protect public read routes", async () => {
    app = await buildApp(deps({ promiseService: { ...deps().promiseService, get: async () => ({}) as never } }));
    expect((await app.inject({ method: "GET", url: "/v1/promises/1" })).statusCode).toBe(200);
  });
});

describe("moderation needs MODERATOR or ADMIN; review needs VERIFIER or ADMIN", () => {
  const action = { action: "HIDE", note: "Spam link" };
  const decision = { decision: "APPROVE", note: "Source checked" };

  it("a verifier cannot moderate issues, and a moderator cannot review promises", async () => {
    app = await buildApp(deps());
    expect((await post("/v1/moderation/issues/1", action, bearer("VERIFIER"))).statusCode).toBe(403);
    expect((await post("/v1/moderation/submissions/1", decision, bearer("MODERATOR"))).statusCode).toBe(403);
  });

  it("the queue only shows each role what it can act on", async () => {
    const reported = vi.fn().mockResolvedValue([]);
    const pending = vi.fn().mockResolvedValue([]);
    app = await buildApp(deps({ issueService: { ...deps().issueService, reported }, submissionService: { ...deps().submissionService, pending } }));
    await app.inject({ method: "GET", url: "/v1/moderation/queue", headers: bearer("MODERATOR") });
    expect(reported).toHaveBeenCalledTimes(1);
    expect(pending).not.toHaveBeenCalled();
    expect((await app.inject({ method: "GET", url: "/v1/moderation/queue", headers: bearer("CITIZEN") })).statusCode).toBe(403);
  });
});

describe("input validation (shared schemas)", () => {
  it.each([
    ["missing source", { ...valid, source: undefined }],
    ["http:// source", { ...valid, source: { ...valid.source, url: "http://example.org/x" } }],
    ["too-short title", { ...valid, title: "Roads" }],
    ["unknown category", { ...valid, category: "SPACE_PROGRAMME" }],
    ["deadline before made-on", { ...valid, madeOn: "2025-01-01", deadline: "2024-01-01" }],
  ])("rejects %s with 400", async (_label, body) => {
    app = await buildApp(deps());
    const res = await post("/v1/admin/promises", body, bearer("VERIFIER"));
    expect(res.statusCode).toBe(400);
    expect(ApiErrorBody.parse(res.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 (not 500) for malformed JSON", async () => {
    app = await buildApp(deps());
    const res = await app.inject({ method: "POST", url: "/v1/admin/promises", payload: "{oops", headers: { ...bearer("ADMIN"), "content-type": "application/json" } });
    expect(res.statusCode).toBe(400);
  });

  it("rejects a weak password at signup before reaching the service", async () => {
    const signup = vi.fn();
    app = await buildApp(deps({ authService: { ...deps().authService, signup } }));
    const res = await post("/v1/auth/signup", { name: "A Person", email: "a@example.org", password: "short" });
    expect(res.statusCode).toBe(400);
    expect(signup).not.toHaveBeenCalled();
  });
});
