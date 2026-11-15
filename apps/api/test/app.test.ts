import { afterEach, describe, expect, it } from "vitest";
import { ApiErrorBody, HealthResponse, PincodeLookupResponse } from "@trackbharat/shared";
import { buildApp } from "../src/app";
import { deps } from "./helpers";

// HTTP-level tests: `app.inject()` simulates a request in memory, so no port is
// opened. We also parse every response with the SHARED schema: this proves the
// API honours the contract the web/mobile apps rely on.

let app: Awaited<ReturnType<typeof buildApp>>;
afterEach(() => app?.close());


describe("GET /health", () => {
  it("is ok when the database is up", async () => {
    app = await buildApp(deps());
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(HealthResponse.parse(res.json()).checks.database).toBe("up");
  });

  it("is degraded (503) when the database is down", async () => {
    app = await buildApp(deps({ pingDb: async () => Promise.reject(new Error("no db")) }));
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(503);
    expect(HealthResponse.parse(res.json()).status).toBe("degraded");
  });
});

describe("GET /v1/pincodes/:pincode", () => {
  it("returns a lookup that matches the shared contract", async () => {
    app = await buildApp(deps());
    const res = await app.inject({ method: "GET", url: "/v1/pincodes/560034" });
    expect(res.statusCode).toBe(200);
    expect(PincodeLookupResponse.parse(res.json()).pincode).toBe("560034");
    expect(res.headers["cache-control"]).toContain("max-age");
  });

  it.each(["12345", "012345", "abcdef", "5600345"])("rejects invalid PIN %s with 400", async (pin) => {
    app = await buildApp(deps());
    const res = await app.inject({ method: "GET", url: `/v1/pincodes/${pin}` });
    expect(res.statusCode).toBe(400);
    expect(ApiErrorBody.parse(res.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("hides internal errors behind a generic 500 with a request id", async () => {
    app = await buildApp(deps({ pincodeService: { lookup: async () => Promise.reject(new Error("secret stack")) } }));
    const res = await app.inject({ method: "GET", url: "/v1/pincodes/560034" });
    expect(res.statusCode).toBe(500);
    const body = ApiErrorBody.parse(res.json());
    expect(body.error.message).not.toContain("secret");
    expect(body.error.requestId).toBeTruthy();
  });
});

it("rate limits abusive clients with 429", async () => {
  app = await buildApp(deps({ rateLimitMax: 2 }));
  for (let i = 0; i < 2; i++) await app.inject({ method: "GET", url: "/health" });
  const res = await app.inject({ method: "GET", url: "/health" });
  expect(res.statusCode).toBe(429);
  expect(ApiErrorBody.parse(res.json()).error.code).toBe("RATE_LIMITED");
});
