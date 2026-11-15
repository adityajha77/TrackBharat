import { defineConfig, devices } from "@playwright/test";

/**
 * END-TO-END tests: a real (headless) browser clicks through the real site.
 *
 * They need the full stack running first (Postgres, API and web):
 *     pnpm db:up && pnpm dev          (web on :3000, or set E2E_BASE_URL)
 * and the seeded dev accounts (pnpm db:seed).
 *
 *     pnpm test:e2e
 *
 * Browsers are stored where PLAYWRIGHT_BROWSERS_PATH points (we use D:/.playwright
 * to keep the system drive free): `PLAYWRIGHT_BROWSERS_PATH=D:/.playwright pnpm exec playwright install chromium`
 */
export default defineConfig({
  testDir: ".",
  testMatch: "**/*.spec.ts",
  timeout: 60_000,
  // The dev server compiles pages on first visit (slow); a production build is much faster
  expect: { timeout: 20_000 },
  fullyParallel: false, // tests share one database; keep them in order
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
