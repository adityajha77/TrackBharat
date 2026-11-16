// Dev helper: full-page screenshots at phone and laptop width, light and dark.
// PLAYWRIGHT_BROWSERS_PATH=D:/.playwright node e2e/shots.mjs <out-dir> "neta,parties/bjp"  (paths without a leading slash)
import { chromium } from "@playwright/test";
const out = process.argv[2];
const pages = (process.argv[3] ?? "").split(",").map((p) => "/" + p);
const browser = await chromium.launch();
for (const theme of ["light", "dark"]) {
  for (const [w, h, tag] of [[375, 812, "m"], [1280, 900, "d"]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    await ctx.addInitScript((t) => localStorage.setItem("theme", t), theme);
    const page = await ctx.newPage();
    for (const p of pages) {
      await page.goto(`http://localhost:3100${p}`, { waitUntil: "networkidle", timeout: 120000 });
      // Scroll through once so scroll-driven "reveal" animations have played, then back to top.
      await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } window.scrollTo(0, 0); });
      await page.waitForTimeout(800);
      const name = `${out}/${(p.replace(/[^a-z0-9]+/gi, "_") || "home")}-${tag}-${theme}.png`;
      await page.screenshot({ path: name, fullPage: tag === "d" });
    }
    await ctx.close();
  }
}
await browser.close();
