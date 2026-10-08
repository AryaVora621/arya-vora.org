// Regenerate the raster social card from its editable SVG source.
// The card is set in Atkinson Hyperlegible Next, the site's text face, loaded from Google
// Fonts for the render, so this needs a network connection. It carries the cut-out photo of
// Reaper (public/ftc/reaper.webp); the SVG points at it by a relative path, so the file still
// opens on its own from public/, and this script swaps the path for the file's bytes.
import { chromium } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const FONT_CSS =
  "https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Next:wght@400;800&display=block";

const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  const source = await readFile(
    new URL("../public/portfolio-og.svg", import.meta.url),
    "utf8",
  );
  const reaper = await readFile(new URL("../public/ftc/reaper.webp", import.meta.url));
  const svg = source.replace(
    'href="ftc/reaper.webp"',
    `href="data:image/webp;base64,${reaper.toString("base64")}"`,
  );
  if (svg === source) throw new Error("portfolio-og.svg no longer points at ftc/reaper.webp.");
  await page.setContent(
    `<link rel="stylesheet" href="${FONT_CSS}"><style>body{margin:0;background:#000}svg{display:block}</style>${svg}`,
    { waitUntil: "networkidle" },
  );
  const loaded = await page.evaluate(async () => {
    await Promise.all([
      document.fonts.load('400 38px "Atkinson Hyperlegible Next"'),
      document.fonts.load('800 156px "Atkinson Hyperlegible Next"'),
    ]);
    await document.fonts.ready;
    return document.fonts.check('800 156px "Atkinson Hyperlegible Next"');
  });
  if (!loaded) throw new Error("Atkinson Hyperlegible Next did not load; the card would use Arial.");
  await page.screenshot({
    path: fileURLToPath(new URL("../public/portfolio-og.png", import.meta.url)),
  });
  console.log("Rendered public/portfolio-og.png (1200 x 630)");
} finally {
  await browser.close();
}
