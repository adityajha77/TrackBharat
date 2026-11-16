import { expect, test, type Page } from "@playwright/test";

/**
 * Phase 3b journeys: home flow, languages, Causes of the Week votes, sharing,
 * news review, Know Your Neta, manifestos, timeline, and password reset via the
 * dev outbox. Needs the seeded dev accounts (pnpm db:seed) and party data
 * (pnpm db:import parties).
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

test("home explains the idea in one scroll: motto, 3 steps, causes, news, manifestos", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("See what's wrong");
  await expect(page.getByText("We are not from any party or any religion")).toBeVisible();
  for (const step of ["Tell us what's wrong in your locality", "Vote on India's Causes of the Week", "Know your neta, check their promises"]) {
    await expect(page.getByRole("heading", { name: step })).toBeVisible();
  }
  await expect(page.getByRole("heading", { name: "India's Causes of the Week", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "News that needs a voice" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Promised vs done" })).toBeVisible();
});

test("languages: Marathi text and lang attribute; Urdu is right-to-left; English URLs stay clean", async ({ page }) => {
  await page.goto("/");
  await page.locator("summary[aria-label='Language']").click();
  await page.getByRole("link", { name: /मराठी/ }).click();
  await expect(page).toHaveURL(/\/mr$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "mr-IN");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("आवाज उठवा");
  // Links keep the language
  await page.locator("header nav[aria-label='Main']").getByRole("link", { name: "मुद्दे" }).click();
  await expect(page).toHaveURL(/\/mr\/causes$/);

  await page.goto("/ur");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

  // Back to English: /en/… redirects to the clean URL and remembers the choice
  await page.goto("/en/leaderboard");
  await expect(page).toHaveURL(/localhost:\d+\/leaderboard$/);
  await page.goto("/causes");
  await expect(page).toHaveURL(/\/causes$/);
});

test("Causes of the Week: vote up, switch to down, take it back; share links point here", async ({ page }) => {
  await login(page, "citizen@trackbharat.local");
  await page.goto("/causes");
  // Causes re-sort by votes after a reload, so pin the card by its title, not its position.
  const first = page.locator("li").filter({ has: page.getByRole("button", { name: /Affects me/ }) }).first();
  const title = (await first.getByRole("heading", { level: 3 }).textContent())!;
  const card = page.locator("li").filter({ has: page.getByRole("heading", { level: 3, name: title, exact: true }) });
  const up = card.getByRole("button", { name: /Affects me/ });
  const down = card.getByRole("button", { name: /Not my issue/ });

  await up.click();
  await expect(up).toHaveAttribute("aria-pressed", "true");
  await down.click();
  await expect(down).toHaveAttribute("aria-pressed", "true");
  await expect(up).toHaveAttribute("aria-pressed", "false");
  await page.reload();
  await expect(card.getByRole("button", { name: /Not my issue/ })).toHaveAttribute("aria-pressed", "true"); // saved
  await card.getByRole("button", { name: /Not my issue/ }).click(); // clicking again takes the vote back
  await expect(card.getByRole("button", { name: /Not my issue/ })).toHaveAttribute("aria-pressed", "false");

  const x = card.getByRole("link", { name: /Share on X/ });
  await expect(x).toHaveAttribute("href", /twitter\.com\/intent\/tweet\?.*url=http.*%2Fcauses.*hashtags=TrackBharat/);
  await expect(card.getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", /^https:\/\/wa\.me\/\?text=/);
});

test("news: a citizen suggests a story, a verifier publishes it, it appears on /news", async ({ page, request }) => {
  const headline = `E2E story ${Date.now()}: village school without a teacher`;
  // Suggest through the API as the citizen (the form is covered by the page test below)
  const auth = await request.post(`${API}/v1/auth/login`, { data: { email: "citizen@trackbharat.local", password: DEV_PASSWORD } });
  const { token } = await auth.json();
  const created = await request.post(`${API}/v1/news`, {
    headers: { authorization: `Bearer ${token}` },
    data: { url: `https://example.org/e2e/${Date.now()}`, headline },
  });
  expect(created.status()).toBe(201);

  await login(page, "verifier@trackbharat.local");
  await page.goto("/moderation/news");
  const item = page.locator("li").filter({ hasText: headline });
  await item.getByText("Review this story").click();
  await item.getByLabel(/Your summary/).fill("A government primary school has had no teacher for two months, so about 60 children have stopped attending. Parents have written to the district education office.");
  await item.getByLabel("State").selectOption("Odisha");
  await item.getByLabel("District (optional)").fill("Koraput");
  await item.getByLabel(/Who is responsible/).fill("District Education Officer, Koraput");
  await item.getByLabel("Category").selectOption("EDUCATION");
  await item.getByRole("button", { name: "Publish" }).click();
  await expect(item).toHaveCount(0); // published: it leaves the review queue

  await page.goto("/news?state=Odisha");
  const story = page.locator("article").filter({ hasText: headline });
  await expect(story.first()).toBeVisible(); // .first(): React may keep a hidden streamed copy in the DOM
  await expect(story.first().getByText("Koraput, Odisha")).toBeVisible();
  await expect(story.first().getByText("District Education Officer, Koraput")).toBeVisible();
});

test("Know Your Neta: filter MPs by party and search; MLA tab loads", async ({ page }) => {
  await page.goto("/neta");
  await page.waitForLoadState("networkidle");
  await page.getByPlaceholder("Search a name or seat").fill("Tejasvi");
  await expect(page.getByRole("link", { name: /Tejasvi Surya/ })).toBeVisible();
  await expect(page.getByText(/^1 results$/)).toBeVisible();
  await page.getByPlaceholder("Search a name or seat").fill("");
  await page.getByRole("button", { name: /^INC \d+/ }).click();
  await expect(page.getByRole("link", { name: /Tejasvi Surya/ })).toHaveCount(0);
  await page.getByRole("link", { name: "MLAs (Vidhan Sabha)" }).click();
  await expect(page).toHaveURL(/house=mla/);
  await expect(page.getByRole("heading", { name: "Karnataka" })).toBeVisible();
});

test("manifestos and timeline: verdicts carry evidence; out-of-power promises are never 'broken'", async ({ page }) => {
  await page.goto("/parties/inc");
  await expect(page.getByRole("heading", { name: "Indian National Congress", level: 1 })).toBeVisible();
  await expect(page.getByText("Didn't form government").first()).toBeVisible();
  await expect(page.getByText(/^Broken$/)).toHaveCount(0);

  await page.goto("/parties/bjp");
  const fulfilled = page.locator("li").filter({ hasText: "Annul Article 370" });
  await expect(fulfilled.getByRole("link", { name: /Evidence/ })).toHaveAttribute("href", /^https:\/\//);

  await page.goto("/timeline");
  await expect(page.getByText("The Constitution comes into force")).toBeVisible();
  await page.getByRole("button", { name: /^AAP$/ }).click();
  await expect(page.getByText("Recognised as a national party")).toBeVisible();
  await expect(page.getByText("Purna Swaraj resolution")).toHaveCount(0); // INC event hidden by the filter
});

test("forgot password: the emailed link (dev outbox) sets a new password", async ({ page, request }) => {
  const email = `reset-${Date.now()}@example.com`;
  const signup = await request.post(`${API}/v1/auth/signup`, { data: { name: "Reset Tester", email, password: "the-original-passphrase" } });
  expect(signup.status()).toBe(201);

  await page.goto("/forgot-password");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send link" }).click();
  await expect(page.getByText(/reset link is on its way/)).toBeVisible();

  const outbox = await (await request.get(`${API}/v1/dev/outbox`)).json();
  const mail = outbox.emails.find((e: { to: string; subject: string }) => e.to === email && /Reset/.test(e.subject));
  const link = mail.text.match(/https?:\/\/\S+\/reset-password\?token=[\w-]+/)[0] as string;
  await page.goto(new URL(link).pathname + new URL(link).search);
  await page.waitForLoadState("networkidle");
  await page.locator("input[name=newPassword]").fill("a-brand-new-passphrase");
  await page.locator("input[name=confirm]").fill("a-brand-new-passphrase");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Password changed")).toBeVisible();

  const ok = await request.post(`${API}/v1/auth/login`, { data: { email, password: "a-brand-new-passphrase" } });
  expect(ok.status()).toBe(200);
  const old = await request.post(`${API}/v1/auth/login`, { data: { email, password: "the-original-passphrase" } });
  expect(old.status()).toBe(401);
});
