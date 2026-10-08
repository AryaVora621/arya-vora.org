#!/usr/bin/env node
// Turns the two app screenshots in assets-src/projects/ into the grey crops that the Software
// section shows at public/projects/<name>.webp.
//
// The screenshots come from the projects' own repositories (SmartInvest, adhdsat) and were
// taken as whole desktop windows. Shown whole at the width of an index row, the text is a few
// pixels tall, so each one is cut down to one region that stays readable. Each box is the
// bounding box of the content, so the page can set an even mat of its own color around it
// (.work-media.is-crop in projects.css) and no edge of the picture is cut through a word or a
// control.
//
// Tally: the question, its four answers and the two buttons, x=61..861, y=107..569. Every edge
// is on the app's own background.
// SmartInvest: the tabs and the first four rows of the screener. Top, left and bottom are at
// the edges of the tabs and of the fourth row. The rows run on to the right for another 750
// pixels, past a description column that would be too small to read here, so the right edge
// fades out over its last 72 pixels, to transparent, and the mat shows through.
// The Next.js dev badge in the SmartInvest corner is outside both boxes.
//
// Crop boxes are [left, top, right, bottom] in source pixels, right and bottom exclusive.
//
// Run: node scripts/prepare-project-shots.mjs
import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "assets-src/projects");
const OUT = path.join(ROOT, "public/projects");

const SHOTS = [
  {
    name: "smartinvest",
    src: "smartinvest-emerging.png",
    box: [53, 439, 626, 730],
    fadeRight: 72,
  },
  {
    name: "tally",
    src: "tally-sprint-picker.png",
    box: [61, 107, 862, 570],
  },
];

for (const shot of SHOTS) {
  const [left, top, right, bottom] = shot.box;
  const width = right - left;
  const height = bottom - top;
  const file = path.join(OUT, `${shot.name}.webp`);
  let image = sharp(path.join(SRC, shot.src))
    .extract({ left, top, width, height })
    .grayscale();
  if (shot.fadeRight) {
    // Grey plus an alpha that ramps from 1 to 0 across the last `fadeRight` columns.
    const grey = await image.raw().toBuffer();
    const pixels = Buffer.alloc(width * height * 2);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const into = Math.max(0, x - (width - shot.fadeRight)) / shot.fadeRight;
        const i = (y * width + x) * 2;
        pixels[i] = grey[y * width + x];
        pixels[i + 1] = Math.round(255 * (1 - into));
      }
    }
    image = sharp(pixels, { raw: { width, height, channels: 2 } });
  }
  await image.webp({ lossless: true, effort: 6 }).toFile(file);
  const meta = await sharp(file).metadata();
  console.log(`${shot.name}.webp ${meta.width}x${meta.height} alpha=${meta.hasAlpha}`);
}
