#!/usr/bin/env node
// Turns the Onshape shaded renders in assets-src/cad into the grey WebP files the CAD
// section uses: public/cad/<key>.webp (up to 1800 px wide) and public/cad/<key>-sm.webp
// (900 px wide). The key comes from assets-src/cad/index.json.
//
// Steps for each render:
// 1. Crop to the model: find the box of pixels with alpha above ALPHA_EDGE and pad it by
//    PAD_RATIO of its longer side, so every model sits with the same breathing room.
// 2. Convert to grey. Pure luminance turns Onshape's saturated blues nearly black, which
//    disappears on the #000 page, so the grey value blends luminance with the brightest
//    channel. A small gamma lift and a little contrast keep the shading readable.
// 3. Write R=G=B pixels with the original alpha, then check the decoded files: any visible
//    pixel whose channels differ by more than MAX_SPREAD fails the run.
//
// Usage: node scripts/prepare-cad-images.mjs              (writes files, prints sizes)
//        node scripts/prepare-cad-images.mjs --check      (only checks existing files)
//        node scripts/prepare-cad-images.mjs --only=a,b   (limits either mode to these keys)

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INDEX = path.join(ROOT, "assets-src/cad/index.json");
const OUT_DIR = path.join(ROOT, "public/cad");

// Renders that stay in assets-src/cad/ but are not published: they are not Arya's models
// (Sesame, WorldsRobo), their authorship is unconfirmed (Totebot) or the gallery dropped them
// (custom claw, two-servo head, the second CoreXY frame).
const NOT_PUBLISHED = new Set([
  "worldsrobo-assembly-1-1-",
  "quadruped-sesame-esp32-v123",
  "quadruped-totebot-r08-assembly",
  "custom-claw-assembly-1",
  "2-servo-ting-assembly-1",
  "acccorexy-v1-diy-corexy",
]);

const ALPHA_EDGE = 8;
const PAD_RATIO = 0.035;
const FULL_MAX = 1800;
const SMALL_WIDTH = 900;
const LUMA_SHARE = 0.55;
const GAMMA = 0.92;
const CONTRAST = 1.08;
const MAX_SPREAD = 2;

// Per-render gamma where the shared curve leaves a model too dark on #000. The drone frame
// is mid green in Onshape, which lands darker than every other model once it is grey.
const GAMMA_BY_KEY = {
  "drone-test-frame-v2-v17": 0.74,
};

function toGrey(r, g, b, gamma) {
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const peak = Math.max(r, g, b);
  let y = LUMA_SHARE * luma + (1 - LUMA_SHARE) * peak;
  y = 255 * Math.pow(y / 255, gamma);
  y = (y - 128) * CONTRAST + 128;
  return Math.max(0, Math.min(255, Math.round(y)));
}

async function prepare(entry) {
  const source = path.join(ROOT, entry.file);
  const { data, info } = await sharp(source)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > ALPHA_EDGE) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) throw new Error(`${entry.key}: render is empty`);

  const boxW = maxX - minX + 1;
  const boxH = maxY - minY + 1;
  const pad = Math.max(24, Math.round(Math.max(boxW, boxH) * PAD_RATIO));
  const outW = boxW + pad * 2;
  const outH = boxH + pad * 2;

  const gamma = GAMMA_BY_KEY[entry.key] ?? GAMMA;
  const grey = Buffer.alloc(outW * outH * 4);
  for (let y = 0; y < boxH; y++) {
    for (let x = 0; x < boxW; x++) {
      const si = ((minY + y) * width + (minX + x)) * 4;
      const di = ((pad + y) * outW + (pad + x)) * 4;
      const a = data[si + 3];
      if (a === 0) continue;
      const v = toGrey(data[si], data[si + 1], data[si + 2], gamma);
      grey[di] = v;
      grey[di + 1] = v;
      grey[di + 2] = v;
      grey[di + 3] = a;
    }
  }

  const base = sharp(grey, { raw: { width: outW, height: outH, channels: 4 } });
  const webp = { quality: 84, alphaQuality: 100, effort: 6, smartSubsample: true };

  const fullPath = path.join(OUT_DIR, `${entry.key}.webp`);
  const full = await base
    .clone()
    .resize({ width: FULL_MAX, height: FULL_MAX, fit: "inside", withoutEnlargement: true })
    .webp(webp)
    .toFile(fullPath);

  const smallPath = path.join(OUT_DIR, `${entry.key}-sm.webp`);
  const small = await base
    .clone()
    .resize({ width: SMALL_WIDTH, withoutEnlargement: true })
    .webp(webp)
    .toFile(smallPath);

  return {
    key: entry.key,
    width: full.width,
    height: full.height,
    smWidth: small.width,
    bytes: full.size,
    smBytes: small.size,
  };
}

async function spreadOf(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let worst = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i + 3] === 0) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const s = Math.max(r, g, b) - Math.min(r, g, b);
    if (s > worst) worst = s;
  }
  return worst;
}

async function check(entries) {
  let failed = false;
  for (const entry of entries) {
    for (const name of [`${entry.key}.webp`, `${entry.key}-sm.webp`]) {
      const file = path.join(OUT_DIR, name);
      try {
        const spread = await spreadOf(file);
        if (spread > MAX_SPREAD) {
          failed = true;
          console.error(`FAIL ${name}: channel spread ${spread}`);
        }
      } catch {
        failed = true;
        console.error(`FAIL ${name}: missing or unreadable`);
      }
    }
  }
  return !failed;
}

const entries = JSON.parse(await fs.readFile(INDEX, "utf8")).filter(
  (entry) => !NOT_PUBLISHED.has(entry.key),
);
const only = process.argv.find((arg) => arg.startsWith("--only="))?.slice("--only=".length);
const selected = only ? entries.filter((entry) => only.split(",").includes(entry.key)) : entries;

if (!process.argv.includes("--check")) {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const rows = [];
  for (const entry of selected) rows.push(await prepare(entry));
  for (const row of rows) {
    console.log(
      `${row.key.padEnd(34)} ${String(row.width).padStart(4)}x${String(row.height).padEnd(5)} sm ${row.smWidth}w  ${(row.bytes / 1024).toFixed(0)} KB / ${(row.smBytes / 1024).toFixed(0)} KB`,
    );
  }
}

const ok = await check(selected);
console.log(ok ? "Grey check passed." : "Grey check failed.");
process.exit(ok ? 0 : 1);
