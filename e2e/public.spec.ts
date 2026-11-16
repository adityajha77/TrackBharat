import { expect, test } from "@playwright/test";

/** The main public journeys: no login needed. */

test("home: enter a PIN code and reach the constituency and MP", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Your 6-digit PIN code").first().fill("560034");
  await page.getByRole("button", { name: /Find my area/ }).first().click();
  await expect(page).toHaveURL(/\/area\/560034$/);
  await expect(page.getByText("Tejasvi Surya")).toBeVisible();

  await page.getByRole("link", { name: /Bangalore South/ }).first().click();
  await expect(page.getByRole("heading", { name: "Bangalore South", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Report card" })).toBeVisible();
  await expect(page.getByText("Questions in Parliament").first()).toBeVisible();
});

test("an invalid PIN code is explained, not sent to the server", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Your 6-digit PIN code").first().fill("012345");
  await page.getByRole("button", { name: /Find my area/ }).first().click();
  await expect(page.getByText("cannot start with 0")).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
});

test("leaderboard: Today and This week both load", async ({ page }) => {
  await page.goto("/leaderboard");
  await expect(page.getByRole("heading", { name: "What India is asking for" })).toBeVisible();
  await expect(page.getByText("New problems")).toBeVisible();
  await page.getByRole("link", { name: "This week" }).click();
  await expect(page).toHaveURL(/period=week/);
  await expect(page.getByText("Votes cast")).toBeVisible();
});

test("methodology and open-data pages work; a CSV downloads with the right shape", async ({ page, request }) => {
  await page.goto("/methodology");
  await expect(page.getByRole("heading", { name: "How report cards work" })).toBeVisible();
  await expect(page.getByText("No score is better than a misleading one")).toBeVisible();

  await page.goto("/data");
  const res = await request.get("/downloads/constituencies.csv");
  expect(res.ok()).toBe(true);
  expect(res.headers()["content-type"]).toContain("text/csv");
  const body = await res.text();
  expect(body.split("\r\n")[0]).toContain("house,state,number,name"); // all columns present
  expect(body).toContain("Bangalore South");
});

test("unknown constituency and promise pages show a proper 404", async ({ page }) => {
  const res = await page.goto("/constituency/does-not-exist");
  expect(res?.status()).toBeLessThan(500);
  await expect(page.getByText(/couldn.t find that/i)).toBeVisible();
});
