// Renders the roboPet stills the page shows before WebGL is ready, and where there is none
// (software renderers, no WebGL, a lost context). There is one pair per theme, because the eyes
// and the status LED are white in mono and violet in violet:
//   mono    public/robopet/hero-still.webp         public/robopet/exploded-still.webp
//   violet  public/robopet/hero-still-violet.webp  public/robopet/exploded-still-violet.webp
//
// The stills are the live scenes themselves: the script opens the running site with the theme
// chosen, lets HeroRobot and RoboPetExploded draw, and reads their canvases back with
// preserveDrawingBuffer, so each is exactly what the page renders, on a transparent background.
// The hero is read at the size of its stage at 2x (1278 x 1066). The exploded view is read in
// the static layout (reduced motion: fully exploded, a slight turn) from a canvas much larger
// than the robot, then trimmed to the robot's outline, scaled to 1029 px wide and given 70 px of
// transparent margin on every side, which makes the 1169 x 1147 the img tags declare.
//
// Usage (the dev server must be running):
//   node scripts/capture-robopet-stills.mjs --theme violet [--url http://localhost:3417]
//   node scripts/capture-robopet-stills.mjs --theme mono --out /tmp/stills      (to compare)
// Headless Chromium has no GPU, so it runs on SwiftShader; ?force3d lets the live scenes run on it.

import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const option = (name, fallback) => {
  const at = argv.indexOf(`--${name}`);
  return at === -1 ? fallback : argv[at + 1];
};
const theme = option("theme");
const base = option("url", "http://localhost:3417");
const out = path.resolve(option("out", path.join(root, "public/robopet")));
if (theme !== "mono" && theme !== "violet") {
  console.log("usage: node scripts/capture-robopet-stills.mjs --theme mono|violet [--url <site>] [--out <folder>]");
  process.exit(1);
}
const suffix = theme === "violet" ? "-violet" : "";

const HERO = { css: 639, width: 1278, height: 1066 };
const EXPLODED = { cssWidth: 1300, cssHeight: 1280, width: 1169, height: 1147, margin: 70 };

const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});

async function open(name, { reducedMotion } = {}) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    reducedMotion: reducedMotion ? "reduce" : "no-preference",
  });
  await context.addInitScript((value) => {
    try {
      localStorage.setItem("av-theme", value);
    } catch {}
    // Keep WebGL's drawing buffer so the canvas can be read back after the frame is shown.
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, attributes) {
      if (type === "webgl" || type === "webgl2") attributes = { ...(attributes ?? {}), preserveDrawingBuffer: true };
      return getContext.call(this, type, attributes);
    };
  }, theme);
  const page = await context.newPage();
  await page.goto(`${base}/?force3d`, { waitUntil: "load" });
  const actual = await page.evaluate(() => document.documentElement.dataset.theme);
  if (actual !== theme) throw new Error(`${name}: page theme is ${actual}, expected ${theme}`);
  return page;
}

async function read(page, selector) {
  const url = await page.evaluate((s) => document.querySelector(s).toDataURL("image/png"), selector);
  return Buffer.from(url.split(",")[1], "base64");
}

async function save(image, size, file) {
  const info = await image.webp({ quality: 90, alphaQuality: 100, effort: 6 }).toFile(path.join(out, file));
  console.log(`${file}: ${size.width} x ${size.height}, ${Math.round(info.size / 1024)} KB`);
}

// The picture trimmed to where its alpha is, scaled to `inner` px wide and set in `margin` px of
// transparent border, then to exactly `size` (the aspect is the robot's, so this is within a pixel).
async function trimmed(png, size, margin) {
  const inner = size.width - 2 * margin;
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width;
  let y0 = info.height;
  let x1 = -1;
  let y1 = -1;
  for (let p = 0; p < info.width * info.height; p++) {
    if (data[4 * p + 3] <= 16) continue;
    const x = p % info.width;
    const y = (p - x) / info.width;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  const box = { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
  console.log(`robot outline ${box.width} x ${box.height} px in the canvas`);
  const height = Math.min(size.height - 2 * margin, Math.round((inner * box.height) / box.width));
  const below = size.height - height - margin;
  return sharp(png)
    .extract(box)
    .resize(inner, height, { kernel: "lanczos3" })
    .extend({ left: margin, right: size.width - inner - margin, top: margin, bottom: below, background: { r: 0, g: 0, b: 0, alpha: 0 } });
}

await mkdir(out, { recursive: true });

// Hero.
{
  const page = await open("hero");
  await page.addStyleTag({
    content: `.hero-robot-stage { width: ${HERO.css}px !important; max-width: none !important; }`,
  });
  await page.waitForSelector('.hero-robot-stage[data-ready="true"]', { timeout: 90000 });
  await page.waitForTimeout(1200);
  const canvas = await page.evaluate(() => {
    const c = document.querySelector(".hero-robot-canvas canvas");
    return [c.width, c.height];
  });
  console.log(`hero canvas ${canvas.join(" x ")}`);
  await save(sharp(await read(page, ".hero-robot-canvas canvas")), HERO, `hero-still${suffix}.webp`);
  await page.context().close();
}

// Exploded view, static layout.
{
  const page = await open("exploded", { reducedMotion: true });
  await page.addStyleTag({
    content: `.exploded-canvas { width: ${EXPLODED.cssWidth}px !important; height: ${EXPLODED.cssHeight}px !important; margin-inline: auto !important; }`,
  });
  await page.evaluate(() => document.querySelector("#exploded").scrollIntoView({ behavior: "instant" }));
  await page.waitForSelector(".exploded-canvas canvas", { timeout: 90000 });
  await page.waitForSelector(".exploded-canvas .exploded-still", { state: "detached", timeout: 90000 });
  await page.waitForTimeout(1500);
  const canvas = await page.evaluate(() => {
    const c = document.querySelector(".exploded-canvas canvas");
    return [c.width, c.height];
  });
  console.log(`exploded canvas ${canvas.join(" x ")}`);
  await save(
    await trimmed(await read(page, ".exploded-canvas canvas"), EXPLODED, EXPLODED.margin),
    EXPLODED,
    `exploded-still${suffix}.webp`,
  );
  await page.context().close();
}

await browser.close();
