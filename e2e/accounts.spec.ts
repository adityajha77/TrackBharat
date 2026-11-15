import { expect, test, type Page } from "@playwright/test";

/**
 * Sign-up, log-in, log-out and account deletion, the way a person does them.
 * Uses a fresh e-mail per run so the tests can be repeated.
 */
const email = `e2e-${Date.now()}@example.com`;
const password = "a-long-e2e-passphrase";

/** The login/signup forms are revealed by React after streaming; wait until the page is interactive. */
async function ready(page: Page) {
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("button", { name: /log in|create account/i })).toBeVisible();
}

test.describe.configure({ mode: "serial" });

test("signup: bad input shows an error and KEEPS what was typed (but never the password)", async ({ page }) => {
  await page.goto("/signup");
  await ready(page);
  await page.getByLabel("Your name").fill("Asha Verma");
  await page.getByLabel("Email").fill("citizen@trackbharat.local"); // already registered by the seed
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByRole("alert").filter({ hasText: "already exists" })).toBeVisible();
  await expect(page.getByLabel("Your name")).toHaveValue("Asha Verma");
  await expect(page.getByLabel("Email")).toHaveValue("citizen@trackbharat.local");
  await expect(page.getByLabel("Password")).toHaveValue("");
});

test("signup: a new account lands on My activity and the header shows the user", async ({ page }) => {
  await page.goto("/signup");
  await ready(page);
  await page.getByLabel("Your name").fill("Asha Verma");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/me$/);
  await expect(page.getByRole("heading", { name: /Namaste, Asha/ })).toBeVisible();
  await expect(page.locator("header summary")).toContainText("Asha");
});

test("a logged-out visitor is sent to log in, then back where they were going", async ({ page }) => {
  await page.goto("/me");
  await expect(page).toHaveURL(/\/login\?next=%2Fme|\/login\?next=\/me/);
  await ready(page);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("definitely-the-wrong-password");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Incorrect email or password" })).toBeVisible();
  await expect(page.getByLabel("Email")).toHaveValue(email); // typed email kept

  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/me$/); // returned to the page they originally wanted
});

test("logout ends the session on the server too", async ({ page, context }) => {
  await page.goto("/login");
  await ready(page);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/me$/);

  const stolen = (await context.cookies()).find((c) => c.name === "tb_session")!;
  expect(stolen.httpOnly).toBe(true); // JavaScript can't read the session cookie

  await page.locator("header summary").click();
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("header").getByRole("link", { name: "Log in" })).toBeVisible();

  // Re-using the old token after logout must NOT work: the session row is gone
  await context.addCookies([{ ...stolen }]);
  await page.goto("/me");
  await expect(page).toHaveURL(/\/login/);
});

test("delete account: wrong confirmation is refused; correct one removes the account", async ({ page }) => {
  await page.goto("/login?next=/me/settings");
  await ready(page);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/me\/settings$/);
  await page.waitForLoadState("networkidle"); // let React attach to the forms before typing

  // Find the form by a stable field, NOT by button text (the button says "Deleting…" while submitting)
  const del = page.locator("form", { has: page.getByLabel("Type DELETE to confirm") });
  await del.getByLabel("Password").fill("wrong-password-here");
  await del.getByLabel("Type DELETE to confirm").fill("DELETE");
  await del.getByRole("button", { name: /Delete my account/ }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Incorrect password" })).toBeVisible();

  // After an error React resets the form (incl. the DELETE confirmation: a deliberate safety step).
  // Wait for that reset to finish before retyping, or it would wipe what we type.
  await expect(del.getByLabel("Password")).toHaveValue("");
  await expect(del.getByLabel("Type DELETE to confirm")).toHaveValue("");
  await expect(del.getByRole("button", { name: "Delete my account forever" })).toBeEnabled();

  await del.getByLabel("Password").fill(password);
  await del.getByLabel("Type DELETE to confirm").fill("DELETE");
  await del.getByRole("button", { name: /Delete my account/ }).click();
  await expect(page).toHaveURL(/\/\?deleted=1/);

  // The account is really gone: logging in again fails
  await page.goto("/login");
  await ready(page);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Incorrect email or password" })).toBeVisible();
});
