// Regenerate the raster social card from its editable SVG source.
import { chromium } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  const svg = await readFile(
    new URL("../public/portfolio-og.svg", import.meta.url),
    "utf8",
  );
  await page.setContent(
    `<style>body{margin:0}svg{display:block}</style>${svg}`,
  );
  await page.screenshot({
    path: fileURLToPath(new URL("../public/portfolio-og.png", import.meta.url)),
  });
  console.log("Rendered public/portfolio-og.png (1200 × 630)");
} finally {
  await browser.close();
}
