// Captures review screenshots of the running site: key scroll positions on desktop and
// mobile, plus a scrubbed sweep through the roboPet film. Usage:
//   node scripts/capture-review.mjs http://localhost:3417 <outDir>
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const base = process.argv[2] ?? "http://localhost:3417";
const out = process.argv[3] ?? "test-results/review";
mkdirSync(out, { recursive: true });

const settle = (page, ms = 1400) => page.waitForTimeout(ms);
async function scrollTo(page, y) {
  await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
  await settle(page);
}

const browser = await chromium.launch();
for (const [name, viewport] of [
  ["desktop", { width: 1440, height: 900 }],
  ["mobile", { width: 390, height: 844 }],
]) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 2 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base, { waitUntil: "networkidle" });
  await settle(page, 2600);
  await page.screenshot({ path: `${out}/${name}-00-hero.png` });
  const film = await page.evaluate(() => {
    const s = document.querySelector("#robopet");
    return { top: s.offsetTop, h: s.offsetHeight };
  });
  const span = film.h - viewport.height;
  for (const p of [0, 0.08, 0.22, 0.44, 0.66, 0.97]) {
    await scrollTo(page, film.top + span * p + 1);
    await page.screenshot({ path: `${out}/${name}-film-${String(Math.round(p * 100)).padStart(2, "0")}.png` });
  }
  for (const id of ["projects", "playground", "about", "contact"]) {
    const top = await page.evaluate((i) => document.getElementById(i)?.offsetTop ?? 0, id);
    await scrollTo(page, top - 40);
    await page.screenshot({ path: `${out}/${name}-${id}.png` });
  }
  await scrollTo(page, 1e6);
  await page.screenshot({ path: `${out}/${name}-zz-footer.png` });
  console.log(name, "errors:", errors.length ? errors : "none");
  await page.close();
}
await browser.close();
