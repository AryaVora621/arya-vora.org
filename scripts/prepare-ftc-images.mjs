#!/usr/bin/env node
// Builds the grayscale FTC images in public/ftc/ from the sources in assets-src/.
//
// Reaper: the 2025-26 engineering portfolio places one photo of the robot on page 9. The PDF
// holds it at 600 x 800 with the team's background already removed (the photo is black outside the
// robot, with a separate mask), and both were pulled out unchanged with
// `pdfimages -png -f 10 -l 10` (the PDF page number is one higher than the portfolio's). They are
// kept as assets-src/ftc/reaper-photo.png and reaper-photo-mask.png. Re-exporting the Canva page
// at a larger size does not add detail: the team uploaded the photo at this size, and no wider
// photo of Reaper exists in the PDF.
// The page shows the photo itself, as a plain rectangle on black, not as a cut-out. The mask only
// decides which of the photo's own pixels are kept: it is grown by a few pixels so thin parts that
// it clipped (a cable, the edge of the clear side plate) come back, and everything farther out is
// set to black, which removes the stray flecks left in the background. The image has no alpha
// channel. The photo is enlarged once here, with a Lanczos kernel, and the page shows it at about
// half that width.
//
// The version photos (outtake and transfer, V1 to V4) are plain rectangular crops of
// Subsystem Iterations (portfolio p. 11, page 13 of the Canva design exported at 2400 x 3106), cut
// inside the photo edges to drop the rounded corners, the page arrows and a stray label, then
// converted to grey. The photos are 130 to 190 ppi on the page, so they are shown small and are not
// enlarged here. Outtake V1 was shot against a white wall that clips to pure white, so it gets a
// lower white point to sit with the other seven.
//
// worldsrobo-cad is an Onshape render with its own alpha, made grey.
//
// Run: node scripts/prepare-ftc-images.mjs [--debug=<dir>]
//   --debug=<dir> also writes each image composited on black to <dir> for review.
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "assets-src");
const OUT = path.join(ROOT, "public/ftc");
const DEBUG = process.argv.find((a) => a.startsWith("--debug="))?.slice(8);

// Rectangles on portfolio-d13.png (page 11), in page pixels: left, top, right, bottom.
const VERSION_PHOTOS = [
  { out: "outtake-v1", box: [75, 2282, 439, 2714], white: 200, gamma: 1.25 },
  { out: "outtake-v2", box: [529, 2670, 820, 2955] },
  { out: "outtake-v3", box: [926, 2490, 1249, 2724] },
  { out: "outtake-v4", box: [1266, 2777, 1568, 3030] },
  { out: "transfer-v1", box: [746, 1661, 1130, 2022] },
  { out: "transfer-v2", box: [1224, 1631, 1506, 1989] },
  { out: "transfer-v3", box: [1601, 1712, 1904, 1930] },
  { out: "transfer-v4", box: [1991, 1569, 2272, 1957] },
];

const LUMA = [0.2126, 0.7152, 0.0722];

// Dark-first tone: lift the blacks a little so black parts still read on #000.
const tone = (v, lift, gamma) =>
  Math.round(lift + (255 - lift) * Math.pow(Math.min(255, Math.max(0, v)) / 255, gamma));


async function readRaw(file) {
  const { data, info } = await sharp(path.join(SRC, file))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

function bounds(alpha, w, h, pad) {
  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (alpha[y * w + x] > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  x0 = Math.max(0, x0 - pad);
  y0 = Math.max(0, y0 - pad);
  x1 = Math.min(w - 1, x1 + pad);
  y1 = Math.min(h - 1, y1 + pad);
  return { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

async function save(name, ga, w, h, box) {
  const image = sharp(ga, { raw: { width: w, height: h, channels: 2 } }).extract(box);
  const file = path.join(OUT, `${name}.webp`);
  await image
    .clone()
    .webp({ quality: 90, alphaQuality: 100, effort: 6, smartSubsample: true })
    .toFile(file);
  if (DEBUG) {
    await mkdir(DEBUG, { recursive: true });
    await image
      .clone()
      .flatten({ background: "#000000" })
      .png()
      .toFile(path.join(DEBUG, `${name}-on-black.png`));
  }
  const meta = await sharp(file).metadata();
  return `${name}.webp ${meta.width}x${meta.height}`;
}

// Rectangle of reaper-photo.png that is kept: left, top, width, height. It holds the robot with a
// little black around it, at a fixed aspect.
const REAPER_BOX = { left: 40, top: 10, width: 520, height: 590 };
// How far the mask is grown, in photo pixels.
const REAPER_GROW = 6;

// Grayscale max filter: each pixel becomes the largest value within r pixels, one axis at a time.
function grow(src, w, h, r) {
  const tmp = new Uint8Array(w * h);
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let m = 0;
      for (let k = Math.max(0, x - r); k <= Math.min(w - 1, x + r); k++)
        m = Math.max(m, src[y * w + k]);
      tmp[y * w + x] = m;
    }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let m = 0;
      for (let k = Math.max(0, y - r); k <= Math.min(h - 1, y + r); k++)
        m = Math.max(m, tmp[k * w + x]);
      out[y * w + x] = m;
    }
  return out;
}

async function reaper() {
  const scale = 2;
  const photo = sharp(path.join(SRC, "ftc/reaper-photo.png"));
  const { width: pw, height: ph } = await photo.metadata();
  const grey = await photo.greyscale().raw().toBuffer();

  const maskRaw = await sharp(path.join(SRC, "ftc/reaper-photo-mask.png"))
    .greyscale()
    .threshold(20)
    .raw()
    .toBuffer();
  const grown = grow(maskRaw, pw, ph, REAPER_GROW);
  const soft = await sharp(Buffer.from(grown), { raw: { width: pw, height: ph, channels: 1 } })
    .blur(1.2)
    .extractChannel(0)
    .raw()
    .toBuffer();

  // Black stays black; the shadows are lifted so the black parts still read.
  const kept = Buffer.alloc(pw * ph);
  for (let i = 0; i < pw * ph; i++) {
    const v = (grey[i] * soft[i]) / 255;
    kept[i] = Math.round(255 * Math.pow(Math.min(255, v) / 255, 0.82));
  }

  const file = path.join(OUT, "reaper.webp");
  const image = sharp(kept, { raw: { width: pw, height: ph, channels: 1 } })
    .extract(REAPER_BOX)
    .resize(REAPER_BOX.width * scale, REAPER_BOX.height * scale, { kernel: "lanczos3" })
    .sharpen({ sigma: 1, m1: 0.6, m2: 1.4 })
    .toColourspace("b-w");
  await image.clone().webp({ quality: 90, effort: 6, smartSubsample: true }).toFile(file);
  if (DEBUG) {
    await mkdir(DEBUG, { recursive: true });
    await image.clone().png().toFile(path.join(DEBUG, "reaper-on-black.png"));
  }
  const meta = await sharp(file).metadata();
  return `reaper.webp ${meta.width}x${meta.height}`;
}

async function worldsRobo() {
  const { data, w, h } = await readRaw("cad/worldsrobo-assembly-1-1-.png");
  const ga = Buffer.alloc(w * h * 2);
  const alpha = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const lum =
      LUMA[0] * data[i * 4] + LUMA[1] * data[i * 4 + 1] + LUMA[2] * data[i * 4 + 2];
    ga[i * 2] = tone(lum, 0, 1);
    ga[i * 2 + 1] = data[i * 4 + 3];
    alpha[i] = data[i * 4 + 3];
  }
  return save("worldsrobo-cad", ga, w, h, bounds(alpha, w, h, 6));
}

async function versionPhoto({ out, box: [left, top, right, bottom], white, gamma }) {
  const file = path.join(OUT, `${out}.webp`);
  let image = sharp(path.join(SRC, "ftc/portfolio-d13.png"))
    .extract({ left, top, width: right - left, height: bottom - top })
    .grayscale();
  if (white) {
    // Re-level: pull the white point down to `white` and darken the middle by `gamma`.
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
    const lut = Array.from({ length: 256 }, (_, v) =>
      Math.round(white * Math.pow(v / 255, gamma)),
    );
    const out8 = Buffer.alloc(data.length);
    for (let i = 0; i < data.length; i++) out8[i] = lut[data[i]];
    image = sharp(out8, { raw: { width: info.width, height: info.height, channels: 1 } });
  } else {
    image = image.linear(1.05, -4);
  }
  await image.webp({ quality: 90, effort: 6 }).toFile(file);
  const meta = await sharp(file).metadata();
  return `${out}.webp ${meta.width}x${meta.height}`;
}

await mkdir(OUT, { recursive: true });
console.log(await reaper());
console.log(await worldsRobo());
for (const photo of VERSION_PHOTOS) console.log(await versionPhoto(photo));
