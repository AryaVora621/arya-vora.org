// Turns the roboPet turntable frames into the packed film the site scrubs under the violet theme.
//
// It is the twin of scripts/grade-frames-bw.mjs and takes the same input: the 240 frames of the
// violet-eyed turntable (lg/001.webp to lg/240.webp, 1920 x 1080). Those are the frames the v6
// site shipped, and they are in git: unpack them into a scratch folder, never into public/:
//   mkdir /tmp/v6 && git archive v6-snapshot public/sequence/robopet | tar -x -C /tmp/v6
//   node scripts/grade-frames-violet.mjs --from /tmp/v6/public/sequence/robopet
//   node scripts/grade-frames-violet.mjs --check
//
// Output goes to public/sequence/robopet/violet-<hash>/ (named after a hash of its contents, so it
// can be cached forever; older violet folders are removed and the black-and-white film is never
// touched) and to src/components/robopet/filmFramesViolet.ts, which tells RoboPetFilm where the
// set lives. The set is only fetched when a visitor picks the violet theme.
//
// Grading. Every pixel gets the same gray the black-and-white film gets (the same mix, lift,
// crop and fade, see grade-frames-bw.mjs), so the shell, legs, servos, wires and floor are the
// same neutral picture in both themes. The only pixels that keep a hue are the violet OLED eyes
// and the status LED with its glow: a pixel counts as violet in proportion to how far its blue
// sits above its red and green, and is blended from its gray to EYE, the site's violet (--eye in
// portfolio.css), at the brightness the gray gives it. The eyes in the film are therefore the
// same violet as the eyes of the live 3D model.
//
// Crop and fade. As in the black-and-white film, each frame is cut to CROP and its edges are
// faded out: first with the script's own feather, then with the wider fade that was multiplied
// on top of the shipped black-and-white frames (see filmFrames.ts), so the two films have the
// same edge. The black-and-white film fades to black because its page is black. The violet
// page is SURFACE (#07070c), so black in these frames is SURFACE: each channel is mapped from
// 0..255 onto SURFACE..255 after the fade, and the edge, the stage and the floor's black are
// the page's own color and the frame has no visible rectangle. That is the one place a neutral
// pixel is not R = G = B, and by exactly the page's own offset; --check takes it off again
// before it looks for hue.
//
// Neutrals. WebP stores YUV with the chroma at half resolution, so a violet eye tints a few
// pixels around it, and a lossy macroblock spreads quantised chroma over 16 pixels. Frames are
// encoded with smart subsampling to keep the visible bleed to a pixel or two.
// --check, with the surface offset taken off, fails if more than MAX_SHARE of a frame has a channel
// spread over TINT (the film's own eyes and LED are well under 1 percent), or if a frame has more
// than MAX_ISOLATED clearly colored pixels (spread over COLORED, above what lossy chroma noise
// reaches) with no other within BLEED: a few specks are encoder noise, a patch is a stray tint.

import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outRoot = path.join(root, "public/sequence/robopet");
const moduleFile = path.join(root, "src/components/robopet/filmFramesViolet.ts");

const argv = process.argv.slice(2);
const checkOnly = argv.includes("--check");
const fromIndex = argv.indexOf("--from");
const from = fromIndex === -1 ? null : path.resolve(argv[fromIndex + 1] ?? "");

// The black-and-white film's gray: gray = 0.4 R + 0.6 B, then a linear lift.
const MIX = [
  [0.4, 0, 0.6],
  [0.4, 0, 0.6],
  [0.4, 0, 0.6],
];
const LIFT = [1.08, -10];

// The site's violet (--eye under data-theme="violet"). The gray an eye pixel reaches in the
// black-and-white film (EYE_PEAK) maps to this exact color.
const EYE = [167, 139, 250];
// The violet page's --surface, which the frames' black becomes.
const SURFACE = [7, 7, 12];
const EYE_PEAK = 225;
// A pixel is violet when blue minus the mean of red and green passes VIOLET_FROM, and fully
// violet at VIOLET_TO. The eyes measure 40 to 70 here; the tinted stage and the warm shell
// stay under 20. Only lit pixels qualify: the LED's reflection on the servo beside it is a dim
// blue smudge (brightest channel under 120), the eyes and the LED are over 180, so the gate
// between LIT_FROM and LIT_TO leaves the reflection as the neutral gray it is in the other film.
const VIOLET_FROM = 18;
const VIOLET_TO = 40;
const LIT_FROM = 110;
const LIT_TO = 170;
const TINT = 4;
const COLORED = 8;
const BLEED = 16;
const MAX_ISOLATED = 10;
const MAX_SHARE = 0.01;

const SOURCE = { width: 1920, height: 1080 };
const CROP = { left: 288, top: 140, width: 1364, height: 940 };
const FEATHERS = [
  { side: 0.06, top: 0.07, bottom: 0.1 },
  { side: 0.11, top: 0.05, bottom: 0.14 },
];
const STEP = 2;
const SIZES = [
  { name: "lg", width: CROP.width, height: CROP.height, quality: 78 },
  { name: "sm", width: CROP.width / 2, height: CROP.height / 2, quality: 74 },
];
const PASSES = [
  [0, 8],
  [4, 8],
  [2, 4],
  [1, 2],
];

const LIFT_TO_SURFACE = SURFACE.map((level) => (255 - level) / 255);

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// A decoded image as raw RGB.
async function decode(input) {
  const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

// The black-and-white film's gray at the crop size, from the frame's own colors.
async function gray(source) {
  return sharp(source).recomb(MIX).linear(LIFT[0], LIFT[1]).toColourspace("b-w").extract(CROP).raw().toBuffer();
}

// Multiplier for pixel (x, y) from the edge fades, smoothstep ramps like the black-and-white film's.
function fadeTable(width, height) {
  const ramp = (d, size) => {
    const t = Math.min(1, d / size);
    return t * t * (3 - 2 * t);
  };
  const cols = new Float32Array(width).fill(1);
  const rows = new Float32Array(height).fill(1);
  for (const f of FEATHERS) {
    for (let x = 0; x < width; x++) cols[x] *= Math.min(ramp(x, f.side * width), ramp(width - 1 - x, f.side * width));
    for (let y = 0; y < height; y++) rows[y] *= Math.min(ramp(y, f.top * height), ramp(height - 1 - y, f.bottom * height));
  }
  return { cols, rows };
}
const fade = fadeTable(CROP.width, CROP.height);

// One graded, faded, three channel frame at the crop size.
async function grade(file) {
  const source = await readFile(file);
  const meta = await sharp(source).metadata();
  if (meta.width !== SOURCE.width || meta.height !== SOURCE.height) {
    throw new Error(`${file} is ${meta.width} x ${meta.height}, expected ${SOURCE.width} x ${SOURCE.height}`);
  }
  const [mono, rgb] = await Promise.all([
    gray(source),
    sharp(source).removeAlpha().extract(CROP).raw().toBuffer(),
  ]);
  const out = Buffer.alloc(CROP.width * CROP.height * 3);
  for (let y = 0; y < CROP.height; y++) {
    const fy = fade.rows[y];
    for (let x = 0; x < CROP.width; x++) {
      const p = y * CROP.width + x;
      const m = fade.cols[x] * fy;
      const Y = mono[p];
      const v = rgb[3 * p + 2] - (rgb[3 * p] + rgb[3 * p + 1]) / 2;
      const w =
        smoothstep(VIOLET_FROM, VIOLET_TO, v) *
        smoothstep(LIT_FROM, LIT_TO, Math.max(rgb[3 * p], rgb[3 * p + 1], rgb[3 * p + 2]));
      const s = Math.min(1, Y / EYE_PEAK);
      for (let c = 0; c < 3; c++) {
        const level = w === 0 ? Y : Y * (1 - w) + EYE[c] * s * w;
        out[3 * p + c] = Math.round(SURFACE[c] + level * m * LIFT_TO_SURFACE[c]);
      }
    }
  }
  return out;
}

async function encode(raw, size) {
  let image = sharp(raw, { raw: { width: CROP.width, height: CROP.height, channels: 3 } });
  if (size.width !== CROP.width) image = image.resize(size.width, size.height, { kernel: "lanczos3" });
  return image.webp({ quality: size.quality, effort: 6, smartSubsample: true }).toBuffer();
}

// Split a pack back into its WebP files by walking the RIFF headers.
function unpack(buffer) {
  const files = [];
  let offset = 0;
  while (offset + 8 <= buffer.length) {
    if (buffer.toString("ascii", offset, offset + 4) !== "RIFF") throw new Error(`bad chunk at ${offset}`);
    const length = 8 + buffer.readUInt32LE(offset + 4);
    files.push(buffer.subarray(offset, offset + length));
    offset += length;
  }
  return files;
}

async function versions() {
  const names = await readdir(outRoot).catch(() => []);
  return names.filter((name) => /^violet-[0-9a-f]{8}$/.test(name));
}

// How much of a decoded frame is tinted. `tinted` counts pixels with a visible hue (spread over
// TINT), `colored` those clearly violet (over COLORED), and `isolated` the colored ones with no other
// colored pixel within BLEED, which is lossy-encode chroma noise on a neutral surface and not an
// eye, the LED or its glow (an eye seen at a glancing angle is a cluster of dim violet pixels).
async function tint(input) {
  const { data, width, height } = await decode(input);
  const colored = new Int32Array((width + 1) * (height + 1));
  let tinted = 0;
  let count = 0;
  const flag = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    let row = 0;
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      // Take the surface offset off, so a neutral pixel measures zero.
      const r = (data[3 * p] - SURFACE[0]) / LIFT_TO_SURFACE[0];
      const g = (data[3 * p + 1] - SURFACE[1]) / LIFT_TO_SURFACE[1];
      const b = (data[3 * p + 2] - SURFACE[2]) / LIFT_TO_SURFACE[2];
      const d = Math.max(r, g, b) - Math.min(r, g, b);
      if (d > TINT) tinted++;
      if (d > COLORED) {
        flag[p] = 1;
        row++;
        count++;
      }
      colored[(y + 1) * (width + 1) + x + 1] = colored[y * (width + 1) + x + 1] + row;
    }
  }
  let isolated = 0;
  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - BLEED);
    const y1 = Math.min(height, y + BLEED + 1);
    for (let x = 0; x < width; x++) {
      if (!flag[y * width + x]) continue;
      const x0 = Math.max(0, x - BLEED);
      const x1 = Math.min(width, x + BLEED + 1);
      const sum =
        colored[y1 * (width + 1) + x1] - colored[y0 * (width + 1) + x1] - colored[y1 * (width + 1) + x0] + colored[y0 * (width + 1) + x0];
      if (sum <= 1) isolated++;
    }
  }
  return { tinted, colored: count, isolated, pixels: width * height };
}

async function check() {
  const names = await versions();
  if (names.length !== 1) throw new Error(`expected one violet film folder in ${outRoot}, found ${names.length}`);
  const dir = path.join(outRoot, names[0]);
  const files = [await readFile(path.join(dir, "poster.webp"))];
  const lg = SIZES[0].name;
  for (let pass = 0; pass < PASSES.length; pass++) {
    files.push(...unpack(await readFile(path.join(dir, `${lg}-${pass}.bin`))));
  }
  let isolated = 0;
  let tinted = 0;
  let clean = 0;
  let share = 0;
  for (const file of files) {
    const t = await tint(file);
    isolated = Math.max(isolated, t.isolated);
    tinted = Math.max(tinted, t.tinted);
    share = Math.max(share, t.tinted / t.pixels);
    if (t.colored === 0) clean++;
  }
  console.log(
    `${files.length} lg frames in ${names[0]}: ${(share * 100).toFixed(2)}% of a frame tinted at most, ` +
      `${isolated} isolated tinted pixels at most (limit ${MAX_ISOLATED}), ${clean} frames with no violet at all (check only)`,
  );
  if (isolated > MAX_ISOLATED || share > MAX_SHARE) process.exitCode = 1;
}

async function build() {
  const lg = path.join(from, "lg");
  const names = (await readdir(lg)).filter((name) => name.endsWith(".webp")).sort();
  if (names.length < 2) throw new Error(`no frames in ${lg}`);
  const kept = names.filter((_, index) => index % STEP === 0);

  const encoded = Object.fromEntries(SIZES.map((size) => [size.name, new Array(kept.length)]));
  let poster = null;
  let next = 0;
  const worker = async () => {
    while (next < kept.length) {
      const index = next++;
      const raw = await grade(path.join(lg, kept[index]));
      for (const size of SIZES) encoded[size.name][index] = await encode(raw, size);
      if (index === 0) poster = await encode(raw, { ...SIZES[0], quality: 82 });
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));

  const files = new Map([["poster.webp", poster]]);
  for (const size of SIZES) {
    PASSES.forEach(([offset, step], pass) => {
      const chunks = [];
      for (let i = offset; i < kept.length; i += step) chunks.push(encoded[size.name][i]);
      files.set(`${size.name}-${pass}.bin`, Buffer.concat(chunks));
    });
  }

  const hash = createHash("sha256");
  for (const [name, data] of files) hash.update(name).update(data);
  const version = `violet-${hash.digest("hex").slice(0, 8)}`;
  const dir = path.join(outRoot, version);

  for (const old of await versions()) if (old !== version) await rm(path.join(outRoot, old), { recursive: true });
  await mkdir(dir, { recursive: true });
  for (const [name, data] of files) await writeFile(path.join(dir, name), data);

  const kb = (bytes) => `${Math.round(bytes / 1024)} KB`;
  for (const size of SIZES) {
    const total = PASSES.reduce((sum, _, pass) => sum + files.get(`${size.name}-${pass}.bin`).length, 0);
    console.log(`${size.name}: ${kept.length} frames at ${size.width} x ${size.height}, ${kb(total)}`);
  }
  console.log(`poster: ${kb(poster.length)}`);

  const source = `// Written by scripts/grade-frames-violet.mjs. Run it again instead of editing this file.
// The violet twin of filmFrames.ts: the same crop, frame count and packs, with the eyes and the
// status LED in the theme's violet. RoboPetFilm fetches it only when the violet theme is chosen.

/** Where the packed violet film frames live. Same shape as FILM_FRAMES. */
export const FILM_FRAMES_VIOLET = {
  base: "/sequence/robopet/${version}",
  count: ${kept.length},
  /** [offset, step] over the frames, one pack each, in load order. */
  passes: ${JSON.stringify(PASSES)},
  sizes: {
${SIZES.map((size) => `    ${size.name}: { width: ${size.width}, height: ${size.height} },`).join("\n")}
  },
  poster: "/sequence/robopet/${version}/poster.webp",
} as const;
`;
  await writeFile(moduleFile, source);
  console.log(`wrote public/sequence/robopet/${version} and ${path.relative(root, moduleFile)}`);

  if (from === outRoot || from.startsWith(outRoot + path.sep)) {
    console.log(`note: ${path.relative(root, from)} is inside public/ and would ship; remove it once the film looks right`);
  }
  await check();
}

if (checkOnly) await check();
else if (from) await build();
else {
  console.log("usage: node scripts/grade-frames-violet.mjs --from <folder with lg/001.webp...> | --check");
  process.exitCode = 1;
}
