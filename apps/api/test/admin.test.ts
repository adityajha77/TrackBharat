import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiErrorBody, type CreatePromiseInput } from "@trackbharat/shared";
import { buildApp } from "../src/app";
import { deps } from "./helpers";

// SECURITY tests for the admin write endpoints. These are the tests that would
// have caught v1's unprotected /admin page.

const TOKEN = "a".repeat(64);
const valid: CreatePromiseInput = {
  constituencySlug: "demo-nagar",
  madeBy: { type: "REPRESENTATIVE" },
  title: "Solar street lights on all main roads",
  category: "ELECTRICITY",
  source: { url: "https://example.org/speech", title: "Ward meeting speech", publisher: "Example News", kind: "NEWS" },
};

let app: Awaited<ReturnType<typeof buildApp>>;
afterEach(() => app?.close());

async function post(body: unknown, headers: Record<string, string> = {}) {
  return app.inject({ method: "POST", url: "/v1/admin/promises", payload: body as object, headers: { "content-type": "application/json", ...headers } });
}

describe("admin auth", () => {
  it("is disabled entirely when no admin token is configured", async () => {
    app = await buildApp(deps({ adminToken: undefined }));
    const res = await post(valid, { authorization: `Bearer ${TOKEN}` });
    expect(res.statusCode).toBe(401);
    expect(ApiErrorBody.parse(res.json()).error.message).toMatch(/disabled/);
  });

  it.each([
    ["no header", {}],
    ["wrong token", { authorization: `Bearer ${"b".repeat(64)}` }],
    ["wrong scheme", { authorization: `Basic ${TOKEN}` }],
  ])("rejects %s with 401", async (_label, headers) => {
    const create = vi.fn();
    app = await buildApp(deps({ adminToken: TOKEN, promiseService: { ...deps().promiseService, create } }));
    const res = await post(valid, headers as Record<string, string>);
    expect(res.statusCode).toBe(401);
    expect(create).not.toHaveBeenCalled(); // the service is never reached
  });

  it("does NOT protect public read routes", async () => {
    app = await buildApp(deps({ adminToken: TOKEN, promiseService: { ...deps().promiseService, get: async () => ({}) as never } }));
    const res = await app.inject({ method: "GET", url: "/v1/promises/1" });
    expect(res.statusCode).toBe(200);
  });
});

describe("admin input validation (shared schema)", () => {
  const auth = { authorization: `Bearer ${TOKEN}` };

  it.each([
    ["missing source", { ...valid, source: undefined }],
    ["http:// source", { ...valid, source: { ...valid.source, url: "http://example.org/x" } }],
    ["too-short title", { ...valid, title: "Roads" }],
    ["unknown category", { ...valid, category: "SPACE_PROGRAMME" }],
    ["deadline before made-on", { ...valid, madeOn: "2025-01-01", deadline: "2024-01-01" }],
  ])("rejects %s with 400", async (_label, body) => {
    const create = vi.fn();
    app = await buildApp(deps({ adminToken: TOKEN, promiseService: { ...deps().promiseService, create } }));
    const res = await post(body, auth);
    expect(res.statusCode).toBe(400);
    expect(ApiErrorBody.parse(res.json()).error.code).toBe("VALIDATION_ERROR");
    expect(create).not.toHaveBeenCalled();
  });

  it("returns 400 (not 500) for malformed JSON", async () => {
    app = await buildApp(deps({ adminToken: TOKEN }));
    const res = await app.inject({ method: "POST", url: "/v1/admin/promises", payload: "{oops", headers: { ...auth, "content-type": "application/json" } });
    expect(res.statusCode).toBe(400);
  });

  it("creates a promise with a valid token and body", async () => {
    const create = vi.fn().mockResolvedValue(42);
    app = await buildApp(deps({ adminToken: TOKEN, promiseService: { ...deps().promiseService, create } }));
    const res = await post(valid, auth);
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ id: 42 });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ title: valid.title }));
  });
});
