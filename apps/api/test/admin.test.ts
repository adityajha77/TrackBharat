import { afterEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app";
import { bearer, deps } from "./helpers";

/** Who may use which admin route. The queries themselves are tested in integration/admin.test.ts. */
describe("admin routes: permissions", () => {
  let app: FastifyInstance;
  afterEach(async () => app?.close());

  const service = () => ({
    overview: vi.fn().mockResolvedValue({ users: { total: 1, verified: 1, blocked: 0, staff: 1, newThisWeek: 0 }, waiting: { newsSuggestions: 0, promiseSubmissions: 0, reportedIssues: 0 }, content: { issues: 0, promises: 0, publishedNews: 0 } }),
    users: vi.fn().mockResolvedValue({ users: [], total: 0 }),
    updateUser: vi.fn().mockResolvedValue(undefined),
    promises: vi.fn().mockResolvedValue({ promises: [], total: 0 }),
    audit: vi.fn().mockResolvedValue({ entries: [] }),
  });

  it("users and the audit log are for admins only", async () => {
    const adminService = service();
    app = await buildApp(deps({ adminService }));
    for (const role of ["CITIZEN", "VERIFIER", "MODERATOR"] as const) {
      expect((await app.inject({ url: "/v1/admin/users", headers: bearer(role) })).statusCode).toBe(403);
      expect((await app.inject({ url: "/v1/admin/audit", headers: bearer(role) })).statusCode).toBe(403);
    }
    expect((await app.inject({ url: "/v1/admin/users?q=asha&role=VERIFIER", headers: bearer("ADMIN") })).statusCode).toBe(200);
    expect(adminService.users).toHaveBeenCalledWith({ q: "asha", role: "VERIFIER", blocked: undefined, offset: 0 });
    expect((await app.inject({ url: "/v1/admin/users" })).statusCode).toBe(401);
  }, 30_000); // first test in the file also pays the app's cold start

  it("staff see the overview and promise list; citizens don't", async () => {
    app = await buildApp(deps({ adminService: service() }));
    expect((await app.inject({ url: "/v1/admin/overview", headers: bearer("CITIZEN") })).statusCode).toBe(403);
    expect((await app.inject({ url: "/v1/admin/overview", headers: bearer("VERIFIER") })).statusCode).toBe(200);
    expect((await app.inject({ url: "/v1/admin/promises?status=BROKEN", headers: bearer("VERIFIER") })).statusCode).toBe(200);
  });

  it("changing a user needs a reason and something to change", async () => {
    const adminService = service();
    app = await buildApp(deps({ adminService }));
    const patch = (payload: object) => app.inject({ method: "PATCH", url: "/v1/admin/users/7", headers: bearer("ADMIN"), payload });
    expect((await patch({ role: "VERIFIER" })).statusCode).toBe(400); // no note
    expect((await patch({ note: "no change at all" })).statusCode).toBe(400);
    expect((await patch({ blocked: true, note: "Posting spam" })).statusCode).toBe(204);
    expect(adminService.updateUser).toHaveBeenCalledWith(expect.objectContaining({ role: "ADMIN" }), 7, { blocked: true, note: "Posting spam" });
  });
});
