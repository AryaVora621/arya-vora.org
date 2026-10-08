// Turns the roboPet turntable frames into the packed, black-and-white film the site scrubs.
//
// Input: the 240 frames scripts/build-sequence.py writes (lg/001.webp to lg/240.webp, 1920 x
// 1080). Output, in public/sequence/robopet/<hash>/:
//   lg-0.bin to lg-3.bin, sm-0.bin to sm-3.bin   every second frame (120), cropped to the robot
//                                                and packed four files per size
//   poster.webp                                  the first frame, for reduced motion and no-JS
// plus src/components/robopet/filmFrames.ts, which tells RoboPetFilm where they are. The folder
// is named after a hash of its contents, so it can be cached forever and changes whenever the
// frames do. Older hash folders are removed.
//
// Grading. The Veo turntable was rendered with violet OLED eyes on a cream shell. A plain
// luminance grayscale would leave the eyes about as bright as the shell, so the mix weights red
// and blue only: gray = 0.4 R + 0.6 B. That lifts the eyes (about 192, 176, 240 in the source)
// to roughly 221 and keeps neutral pixels where they were, then a gentle linear lift pushes the
// eyes to white and the tinted studio black down to black. Frames that are already gray are
// left as they are, so grading twice never applies the lift twice. WebP stores YUV, so decoded
// pixels can differ by one level between channels; the check allows a spread of 2.
//
// Crop and feather. The robot never leaves x 0.20 to 0.81 and y 0.20 to 0.95 of the frame
// (measured over all 240 frames), so each frame is cut to CROP, a margin around that box, and
// its edges are faded to pure black. The film plate is black, so the frame has no visible edge.
//
// Packs. Each pack is plain WebP files back to back. A WebP file is a RIFF chunk that carries
// its own length, so the page splits a pack without an index. Pack 0 holds every eighth frame,
// so a coarse turn is ready after the first request, and the later packs fill in between.
//
// Usage:
//   python scripts/build-sequence.py <clip.mp4> <weights.pth> --out /tmp/robopet-frames
//   node scripts/grade-frames-bw.mjs --from /tmp/robopet-frames     build the film
//   node scripts/grade-frames-bw.mjs --check                        check the built film for hue

import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outRoot = path.join(root, "public/sequence/robopet");
const moduleFile = path.join(root, "src/components/robopet/filmFrames.ts");

const argv = process.argv.slice(2);
const checkOnly = argv.includes("--check");
const fromIndex = argv.indexOf("--from");
const from = fromIndex === -1 ? null : path.resolve(argv[fromIndex + 1] ?? "");

const MIX = [
  [0.4, 0, 0.6],
  [0.4, 0, 0.6],
  [0.4, 0, 0.6],
];
const LIFT = [1.08, -10];
const MAX_SPREAD = 2;

// Source frame size, the crop inside it, and the share of the crop faded at each edge.
const SOURCE = { width: 1920, height: 1080 };
const CROP = { left: 288, top: 140, width: 1364, height: 940 };
const FEATHER = { side: 0.06, top: 0.07, bottom: 0.1 };
const STEP = 2;
const SIZES = [
  { name: "lg", width: CROP.width, height: CROP.height, quality: 80 },
  { name: "sm", width: CROP.width / 2, height: CROP.height / 2, quality: 76 },
];
// [offset, step] over the kept frames, in load order. Together they cover every frame once.
const PASSES = [
  [0, 8],
  [4, 8],
  [2, 4],
  [1, 2],
];

// Largest max(R,G,B) minus min(R,G,B) over every pixel of a decoded image.
async function spread(input) {
  const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const step = info.channels;
  if (step < 3) return 0;
  let worst = 0;
  for (let i = 0; i < data.length; i += step) {
    const d = Math.max(data[i], data[i + 1], data[i + 2]) - Math.min(data[i], data[i + 1], data[i + 2]);
    if (d > worst) worst = d;
  }
  return worst;
}

// One gray channel at the source size: graded if the frame still has hue, else as it is.
async function gray(file) {
  const source = await readFile(file);
  const meta = await sharp(source).metadata();
  if (meta.width !== SOURCE.width || meta.height !== SOURCE.height) {
    throw new Error(`${file} is ${meta.width} x ${meta.height}, expected ${SOURCE.width} x ${SOURCE.height}`);
  }
  const pipeline = (await spread(source)) > MAX_SPREAD ? sharp(source).recomb(MIX).linear(LIFT[0], LIFT[1]) : sharp(source);
  return pipeline.toColourspace("b-w").extract(CROP).raw().toBuffer();
}

// Fade the crop's edges to black with a smoothstep ramp, so no edge pixel survives.
function feather(data, width, height) {
  const ramp = (d, size) => {
    const t = Math.min(1, d / size);
    return t * t * (3 - 2 * t);
  };
  const out = Buffer.alloc(width * height);
  for (let y = 0; y < height; y++) {
    const fy = Math.min(ramp(y, FEATHER.top * height), ramp(height - 1 - y, FEATHER.bottom * height));
    for (let x = 0; x < width; x++) {
      const fx = Math.min(ramp(x, FEATHER.side * width), ramp(width - 1 - x, FEATHER.side * width));
      out[y * width + x] = Math.round(data[y * width + x] * fx * fy);
    }
  }
  return out;
}

async function encode(raw, size) {
  let image = sharp(raw, { raw: { width: CROP.width, height: CROP.height, channels: 1 } });
  if (size.width !== CROP.width) image = image.resize(size.width, size.height, { kernel: "lanczos3" });
  return image.webp({ quality: size.quality, effort: 6 }).toBuffer();
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

async function currentVersion() {
  const names = await readdir(outRoot).catch(() => []);
  return names.filter((name) => /^[0-9a-f]{8}$/.test(name));
}

async function check() {
  const versions = await currentVersion();
  if (versions.length !== 1) throw new Error(`expected one film folder in ${outRoot}, found ${versions.length}`);
  const dir = path.join(outRoot, versions[0]);
  let worst = await spread(path.join(dir, "poster.webp"));
  let count = 0;
  for (const size of SIZES) {
    for (let pass = 0; pass < PASSES.length; pass++) {
      for (const file of unpack(await readFile(path.join(dir, `${size.name}-${pass}.bin`)))) {
        worst = Math.max(worst, await spread(file));
        count++;
      }
    }
  }
  console.log(`${count} frames and the poster in ${versions[0]}, worst channel spread ${worst} (check only)`);
  if (worst > MAX_SPREAD) process.exitCode = 1;
}

async function build() {
  const lg = path.join(from, "lg");
  const names = (await readdir(lg)).filter((name) => name.endsWith(".webp")).sort();
  if (names.length < 2) throw new Error(`no frames in ${lg}`);
  const kept = names.filter((_, index) => index % STEP === 0);

  // Encoded frames per size, in frame order. Six workers keep memory flat on the 1920px frames.
  const encoded = Object.fromEntries(SIZES.map((size) => [size.name, new Array(kept.length)]));
  let poster = null;
  let next = 0;
  const worker = async () => {
    while (next < kept.length) {
      const index = next++;
      const raw = feather(await gray(path.join(lg, kept[index])), CROP.width, CROP.height);
      for (const size of SIZES) encoded[size.name][index] = await encode(raw, size);
      if (index === 0) poster = await encode(raw, { ...SIZES[0], quality: 82 });
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));

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
  const version = hash.digest("hex").slice(0, 8);
  const dir = path.join(outRoot, version);

  for (const old of await currentVersion()) if (old !== version) await rm(path.join(outRoot, old), { recursive: true });
  await mkdir(dir, { recursive: true });
  for (const [name, data] of files) await writeFile(path.join(dir, name), data);

  const kb = (bytes) => `${Math.round(bytes / 1024)} KB`;
  for (const size of SIZES) {
    const total = PASSES.reduce((sum, _, pass) => sum + files.get(`${size.name}-${pass}.bin`).length, 0);
    console.log(`${size.name}: ${kept.length} frames at ${size.width} x ${size.height}, ${kb(total)}`);
  }
  console.log(`poster: ${kb(poster.length)}`);

  const source = `// Written by scripts/grade-frames-bw.mjs. Run it again instead of editing this file.

/** Where the packed film frames live and how they were cut. See the script for the format. */
export const FILM_FRAMES = {
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
  console.log("usage: node scripts/grade-frames-bw.mjs --from <folder with lg/001.webp...> | --check");
  process.exitCode = 1;
}
