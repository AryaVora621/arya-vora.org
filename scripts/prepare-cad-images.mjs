#!/usr/bin/env node
// Turns the Onshape shaded renders in assets-src/cad-v2 into the grey WebP files the CAD
// section uses: public/cad/<key>.webp (up to 1800 px wide, see WIDTHS for the exceptions),
// public/cad/<key>-sm.webp (900 px wide) and, for the pieces that fill the page on a 2x
// screen, public/cad/<key>-xl.webp.
//
// assets-src/cad-v2/index.json lists 2000x1400 PNG renders with transparent backgrounds in the
// original Onshape colors. Each model has two "hero" candidates (azimuth 215 and 325, elevation
// 22). PICKS below names the one that shows the object best: its props and frame for a drone,
// its gantry for a printer, its keys and knob for the pad, never its back or underside.
//
// Steps for each render:
// 1. Crop to the model: find the box of pixels with alpha above ALPHA_EDGE and pad it by
//    PAD_RATIO of its longer side, so every model sits with the same breathing room.
// 2. Convert to grey. Pure luminance turns Onshape's saturated blues nearly black, which
//    disappears on the #000 page, so the grey value blends luminance with the brightest
//    channel.
// 3. Stretch the levels per render: the 0.5th percentile of the visible pixels goes to
//    FLOOR_GREY and the 99.8th to CEIL_GREY, then a gentle gamma. This gives every model the
//    same tonal range, whether Onshape drew it near black (the pad case) or near white (the
//    printer), and keeps the darkest parts visible on a black page.
// 3b. Ghost pieces (GHOST_BALL): a solid body that hides the mechanism is found by its colour
//    and drawn as clear glass, so the parts around it read first. See ghostBall() below.
// 4. Write R=G=B pixels with the original alpha, then check the decoded files: any visible
//    pixel whose channels differ by more than MAX_SPREAD fails the run. The page tints these
//    greys with a CSS filter in the violet theme, so they must stay neutral here.
//
// Resolution: the source renders are 2000x1400 and the wide models fill that whole width, so
// the cropped model is about 2140 px across at native size and never more. Pieces that show
// larger than 900 CSS px (the full-width drone, the quadruped) would be a soft upscale on a
// 2x display from a 1800 px file, which is also a downscale from the source. WIDTHS therefore
// keeps the quadruped at native size and adds a 2800 px "-xl" file for the drone, resampled
// from the native crop with Lanczos and a light sharpen (it adds pixels, not new CAD detail;
// a crisper source needs a larger Onshape export, which index.json does not hold).
//
// Usage: node scripts/prepare-cad-images.mjs              (writes files, prints sizes)
//        node scripts/prepare-cad-images.mjs --check      (only checks existing files)
//        node scripts/prepare-cad-images.mjs --only=a,b   (limits either mode to these keys)
//        node scripts/prepare-cad-images.mjs --azimuth=325 --out-dir=/some/dir
//                                                         (renders every model at the other
//                                                          candidate angle into another folder
//                                                          to compare, leaving public/cad alone)

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INDEX = path.join(ROOT, "assets-src/cad-v2/index.json");
const argOf = (name) => process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const OUT_DIR = argOf("out-dir") ?? path.join(ROOT, "public/cad");
const AZIMUTH_OVERRIDE = argOf("azimuth") ? Number(argOf("azimuth")) : null;

// The published models, keyed by file name in public/cad. The keys are the ones the gallery and
// tests/portfolio.spec.ts already use. "doc" and "element" match index.json; "azimuth" is the
// chosen hero angle (215 or 325, both at elevation 22).
//
// Models left out on purpose: they are not Arya's (Sesame, WorldsRobo, shown in the FTC
// section), their authorship is unconfirmed (Totebot) or the gallery dropped them (custom claw,
// two-servo head, the second CoreXY frame).
const PICKS = {
  "drone-test-frame-v2-v17": { doc: "drone-test", element: "frame-v2-v17", azimuth: 215 },
  "drone-test-india-test": { doc: "drone-test", element: "india-test", azimuth: 215 },
  "quadruped-oldv1": { doc: "quadruped", element: "oldv1", azimuth: 215 },
  "ender5corexy-topsystem": { doc: "ender5corexy", element: "topsystem", azimuth: 325 },
  // Azimuth 215 was tried and is worse: the ball sits in front of the arm and hides the sprockets
  // and one gearmotor. At 325 the arm wraps the ball and the chain parts are in the clear, but
  // the plain sphere is still the biggest and brightest thing in the section, so it is ghosted.
  "frc-mech-task-2025-assembly-1": {
    doc: "frc-mech-task-2025",
    element: "assembly-1",
    azimuth: 325,
    ghost: "green-ball",
  },
  "mediapad-assembly-1": { doc: "mediapad", element: "assembly-1", azimuth: 215 },
  "lovebox-assembly-1": { doc: "lovebox", element: "assembly-1", azimuth: 215 },
  "mycovent-part-studio-1": { doc: "mycovent", element: "part-studio-1", azimuth: 215 },
};

const ALPHA_EDGE = 8;
const ALPHA_SOLID = 200;
const PAD_RATIO = 0.035;
const FULL_MAX = 1800;
const SMALL_WIDTH = 900;
// Per-model overrides. "full" caps the main file (withoutEnlargement keeps it at the native crop
// when that is smaller); "xl" adds a <key>-xl.webp of exactly that width for 2x screens.
const WIDTHS = {
  "drone-test-frame-v2-v17": { xl: 2800 },
  "quadruped-oldv1": { full: 2200 },
};
const XL_SHARPEN = { sigma: 0.7, m1: 0.6, m2: 1.2 };
const LUMA_SHARE = 0.55;
const LOW_PERCENTILE = 0.005;
const HIGH_PERCENTILE = 0.998;
const FLOOR_GREY = 30;
const CEIL_GREY = 252;
const GAMMA = 0.9;
const MAX_SPREAD = 2;

// Ghost ball: the FRC task's ball is a bright green sphere in the Onshape render, which turns
// into the brightest, largest grey disc on the page and covers the arm and wheels the caption
// describes. Onshape gave one render per angle with the ball in place, so nothing behind it
// exists in the source; the ball is therefore drawn as glass, not removed. Inside it is almost
// clear (BALL_FILL), toward the edge it brightens (BALL_RIM over BALL_RIM_PX source pixels,
// squared), and a thin line (BALL_LINE over BALL_LINE_PX) keeps the silhouette crisp.
const BALL_GREEN_MIN = 35; // green minus red needed to count a pixel as ball
const BALL_FRINGE_PX = 2; // pixels around the ball taken as anti-aliased edge
const BALL_FILL = 0.11;
const BALL_RIM = 0.5;
const BALL_RIM_PX = 100;
const BALL_LINE = 0.55;
const BALL_LINE_PX = 3.5;
const BALL_GREY = 205;

function rawGrey(r, g, b) {
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const peak = Math.max(r, g, b);
  return LUMA_SHARE * luma + (1 - LUMA_SHARE) * peak;
}

// Returns { mask, edge } for the ball in an RGBA buffer: mask[i] is 1 for ball pixels and
// edge[i] is the distance in pixels to the nearest empty (transparent) pixel, so the rim only
// brightens where the ball meets the background and not where the arm sits in front of it.
function ghostBall(data, width, height) {
  const count = width * height;
  const seed = new Uint8Array(count);
  for (let i = 0; i < count; i++) {
    const o = i * 4;
    if (data[o + 3] < ALPHA_EDGE) continue;
    if (data[o + 1] - data[o] > BALL_GREEN_MIN && data[o + 1] >= data[o + 2] - 5) seed[i] = 1;
  }

  // Keep only the biggest connected piece, so stray green-tinted pixels elsewhere stay put.
  const label = new Int32Array(count);
  const stack = new Int32Array(count);
  let best = 0;
  let bestSize = 0;
  let next = 0;
  for (let start = 0; start < count; start++) {
    if (!seed[start] || label[start]) continue;
    next++;
    let size = 0;
    let top = 0;
    stack[top++] = start;
    label[start] = next;
    while (top > 0) {
      const i = stack[--top];
      size++;
      const x = i % width;
      const y = (i - x) / width;
      if (x > 0 && seed[i - 1] && !label[i - 1]) { label[i - 1] = next; stack[top++] = i - 1; }
      if (x < width - 1 && seed[i + 1] && !label[i + 1]) { label[i + 1] = next; stack[top++] = i + 1; }
      if (y > 0 && seed[i - width] && !label[i - width]) { label[i - width] = next; stack[top++] = i - width; }
      if (y < height - 1 && seed[i + width] && !label[i + width]) { label[i + width] = next; stack[top++] = i + width; }
    }
    if (size > bestSize) { bestSize = size; best = next; }
  }
  if (bestSize < count * 0.05) throw new Error("ghost ball: no large green body found");

  // Grow by the anti-aliased fringe: neighbours that are still green-leaning belong to the ball.
  let mask = new Uint8Array(count);
  for (let i = 0; i < count; i++) if (label[i] === best) mask[i] = 1;
  for (let pass = 0; pass < BALL_FRINGE_PX; pass++) {
    const grown = mask.slice();
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const i = y * width + x;
        if (mask[i] || data[i * 4 + 3] < 1) continue;
        if (!(mask[i - 1] || mask[i + 1] || mask[i - width] || mask[i + width])) continue;
        const o = i * 4;
        if (data[o + 1] - data[o] >= 6 && data[o + 1] >= data[o + 2] - 5) grown[i] = 1;
      }
    }
    mask = grown;
  }

  // Chamfer distance (3-4) to the nearest empty pixel, in pixels.
  const INF = 1 << 28;
  const dist = new Int32Array(count);
  for (let i = 0; i < count; i++) dist[i] = data[i * 4 + 3] < ALPHA_EDGE ? 0 : INF;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      let d = dist[i];
      if (x > 0) d = Math.min(d, dist[i - 1] + 3);
      if (y > 0) {
        d = Math.min(d, dist[i - width] + 3);
        if (x > 0) d = Math.min(d, dist[i - width - 1] + 4);
        if (x < width - 1) d = Math.min(d, dist[i - width + 1] + 4);
      }
      dist[i] = d;
    }
  }
  for (let y = height - 1; y >= 0; y--) {
    for (let x = width - 1; x >= 0; x--) {
      const i = y * width + x;
      let d = dist[i];
      if (x < width - 1) d = Math.min(d, dist[i + 1] + 3);
      if (y < height - 1) {
        d = Math.min(d, dist[i + width] + 3);
        if (x < width - 1) d = Math.min(d, dist[i + width + 1] + 4);
        if (x > 0) d = Math.min(d, dist[i + width - 1] + 4);
      }
      dist[i] = d;
    }
  }
  const edge = new Float32Array(count);
  for (let i = 0; i < count; i++) edge[i] = dist[i] / 3;
  return { mask, edge };
}

async function prepare(entry) {
  const source = path.join(ROOT, entry.file);
  const { data, info } = await sharp(source)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const ghost = entry.ghost === "green-ball" ? ghostBall(data, width, height) : null;

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

  // Levels come from the solid pixels only, so soft edges and the black outline lines do not
  // drag the percentiles around. A ghost ball is left out, so the parts it used to dominate
  // get the whole tonal range.
  const histogram = new Uint32Array(256);
  let solid = 0;
  for (let y = 0; y < boxH; y++) {
    for (let x = 0; x < boxW; x++) {
      const si = ((minY + y) * width + (minX + x)) * 4;
      if (data[si + 3] < ALPHA_SOLID) continue;
      if (ghost && ghost.mask[(minY + y) * width + (minX + x)]) continue;
      histogram[Math.round(rawGrey(data[si], data[si + 1], data[si + 2]))]++;
      solid++;
    }
  }
  const percentile = (share) => {
    let seen = 0;
    for (let v = 0; v < 256; v++) {
      seen += histogram[v];
      if (seen >= solid * share) return v;
    }
    return 255;
  };
  const lo = percentile(LOW_PERCENTILE);
  const hi = Math.max(lo + 24, percentile(HIGH_PERCENTILE));
  const toGrey = (r, g, b) => {
    const t = Math.max(0, Math.min(1, (rawGrey(r, g, b) - lo) / (hi - lo)));
    return Math.round(FLOOR_GREY + (CEIL_GREY - FLOOR_GREY) * Math.pow(t, GAMMA));
  };

  const grey = Buffer.alloc(outW * outH * 4);
  for (let y = 0; y < boxH; y++) {
    for (let x = 0; x < boxW; x++) {
      const si = ((minY + y) * width + (minX + x)) * 4;
      const di = ((pad + y) * outW + (pad + x)) * 4;
      let a = data[si + 3];
      if (a === 0) continue;
      let v;
      if (ghost && ghost.mask[(minY + y) * width + (minX + x)]) {
        const d = ghost.edge[(minY + y) * width + (minX + x)];
        const rim = Math.pow(Math.max(0, 1 - d / BALL_RIM_PX), 2);
        const line = Math.max(0, 1 - d / BALL_LINE_PX);
        const clear = Math.min(0.95, BALL_FILL + BALL_RIM * rim + BALL_LINE * line);
        a = Math.round(a * clear);
        v = BALL_GREY;
      } else {
        v = toGrey(data[si], data[si + 1], data[si + 2]);
      }
      grey[di] = v;
      grey[di + 1] = v;
      grey[di + 2] = v;
      grey[di + 3] = a;
    }
  }

  const base = sharp(grey, { raw: { width: outW, height: outH, channels: 4 } });
  const webp = { quality: 84, alphaQuality: 100, effort: 6, smartSubsample: true };

  const fullPath = path.join(OUT_DIR, `${entry.key}.webp`);
  const widths = WIDTHS[entry.key] ?? {};
  const fullMax = widths.full ?? FULL_MAX;
  const full = await base
    .clone()
    .resize({ width: fullMax, height: fullMax, fit: "inside", withoutEnlargement: true })
    .webp(webp)
    .toFile(fullPath);

  const smallPath = path.join(OUT_DIR, `${entry.key}-sm.webp`);
  const small = await base
    .clone()
    .resize({ width: SMALL_WIDTH, withoutEnlargement: true })
    .webp(webp)
    .toFile(smallPath);

  let xl = null;
  if (widths.xl) {
    xl = await base
      .clone()
      .resize({ width: widths.xl, kernel: "lanczos3" })
      .sharpen(XL_SHARPEN)
      .webp(webp)
      .toFile(path.join(OUT_DIR, `${entry.key}-xl.webp`));
  }

  return {
    key: entry.key,
    width: full.width,
    height: full.height,
    smWidth: small.width,
    bytes: full.size,
    smBytes: small.size,
    xl,
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
    const names = [`${entry.key}.webp`, `${entry.key}-sm.webp`];
    if (WIDTHS[entry.key]?.xl) names.push(`${entry.key}-xl.webp`);
    for (const name of names) {
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

const index = JSON.parse(await fs.readFile(INDEX, "utf8"));
const entries = Object.entries(PICKS).map(([key, pick]) => {
  const azimuth = AZIMUTH_OVERRIDE ?? pick.azimuth;
  const found = index.find(
    (row) =>
      row.kind === "hero" &&
      row.doc === pick.doc &&
      row.element === pick.element &&
      row.azimuth === azimuth,
  );
  if (!found) throw new Error(`${key}: no hero render at azimuth ${azimuth} in ${INDEX}`);
  return { key, file: found.file, ghost: pick.ghost };
});
const only = argOf("only");
const selected = only ? entries.filter((entry) => only.split(",").includes(entry.key)) : entries;

if (!process.argv.includes("--check")) {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const rows = [];
  for (const entry of selected) rows.push(await prepare(entry));
  for (const row of rows) {
    console.log(
      `${row.key.padEnd(34)} ${String(row.width).padStart(4)}x${String(row.height).padEnd(5)} sm ${row.smWidth}w  ${(row.bytes / 1024).toFixed(0)} KB / ${(row.smBytes / 1024).toFixed(0)} KB` +
        (row.xl ? `  xl ${row.xl.width}x${row.xl.height} ${(row.xl.size / 1024).toFixed(0)} KB` : ""),
    );
  }
}

const ok = await check(selected);
console.log(ok ? "Grey check passed." : "Grey check failed.");
process.exit(ok ? 0 : 1);
