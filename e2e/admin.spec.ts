import { expect, test, type Page } from "@playwright/test";

/**
 * ADMIN PANEL: an admin gives a citizen the Verifier role (with a reason that
 * lands in the audit log), then takes it back; a verifier only sees the tabs
 * their role allows. Uses the seeded dev accounts (pnpm db:seed).
 */
const API = process.env.E2E_API_URL ?? "http://localhost:4000";
const DEV_PASSWORD = "trackbharat-dev-password";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(DEV_PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/me/);
}

test.describe.configure({ mode: "serial" });

test("admin: change a user's role, see it in the audit log, change it back", async ({ page, request }) => {
  await login(page, "admin@trackbharat.local");
  await page.goto("/admin");
  const main = page.locator("#main"); // the page streams in; React briefly keeps a hidden copy outside #main
  await expect(main.getByRole("heading", { name: "Overview", level: 1 })).toBeVisible();
  await expect(main.getByText("Waiting for you")).toBeVisible();

  await page.goto("/admin/users?q=citizen%40trackbharat.local");
  const row = main.locator("li").filter({ hasText: "citizen@trackbharat.local" });
  await row.getByLabel("Role").selectOption("VERIFIER");
  await row.getByLabel(/Reason/).fill("E2E: helps verify news");
  await row.getByRole("button", { name: "Save" }).click();
  await expect(row.getByText("Saved. Recorded in the audit log.")).toBeVisible();

  // The API now treats them as a verifier
  const auth = await request.post(`${API}/v1/auth/login`, { data: { email: "citizen@trackbharat.local", password: DEV_PASSWORD } });
  expect((await auth.json()).user.role).toBe("VERIFIER");

  await page.goto("/admin/audit");
  await expect(main.getByText("E2E: helps verify news").first()).toBeVisible();

  // Put it back
  await page.goto("/admin/users?q=citizen%40trackbharat.local");
  await row.getByLabel("Role").selectOption("CITIZEN");
  await row.getByLabel(/Reason/).fill("E2E: back to citizen");
  await row.getByRole("button", { name: "Save" }).click();
  await expect(row.getByText("Saved. Recorded in the audit log.")).toBeVisible();
});

test("verifier: sees Promises but not Users or the audit log", async ({ page }) => {
  await login(page, "verifier@trackbharat.local");
  await page.goto("/admin");
  const tabs = page.locator("#main").getByRole("navigation", { name: "Admin sections" });
  await expect(tabs.getByRole("link", { name: "Promises" })).toBeVisible();
  await expect(tabs.getByRole("link", { name: "Users & roles" })).toHaveCount(0);
  await page.goto("/admin/users");
  await expect(page).toHaveURL(/\/admin$/); // sent back to the overview
});
