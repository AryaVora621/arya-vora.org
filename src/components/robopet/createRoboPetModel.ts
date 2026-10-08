/**
 * roboPet procedural model.
 *
 * Reconstructed from assets-src/robopet/robopet-reference.jpeg with the img2threejs pipeline
 * (spec + reviews live in assets-src/robopet/img2threejs/). Everything is generated in code:
 * no external meshes or texture files, only canvas textures. Output is deterministic.
 *
 * Frame: forward = +Z (OLED face), up = +Y, the robot's own left = +X. Feet rest on y = 0 and the
 * body is centered on the origin in XZ. Overall length is about 2.45 units.
 *
 * Visible geometry (shell, face, legs, servos, wires, hardware) follows the reference render.
 * The internals (Raspberry Pi Pico, Pi Zero 2W, MPU6050, 3-cell pack, 2x XL4016 buck converters,
 * hidden hip-roll servos) are NOT visible in the reference: they are inferred from the roboPet
 * hardware list and laid out plausibly so the exploded view has something true to show.
 *
 * Palette: every material is a neutral grey (R = G = B) so the model sits on the black and white
 * page. The shell is light grey, the legs graphite, the servos black, the OLED eyes and the
 * status LED white. Nothing glows: the LED is an emissive dome with no halo sprite.
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export type RoboPetEyeMode = "open" | "blink" | "happy" | "sleepy" | "off";

export type RoboPetPartId =
  | "shell-top"
  | "shell-bottom"
  | "face"
  | "camera"
  | "status-led"
  | "electronics"
  | "power"
  | "leg-fl"
  | "leg-fr"
  | "leg-rl"
  | "leg-rr";

export type RoboPetPartInfo = { id: RoboPetPartId; label: string; detail: string };

export type RoboPetModelOptions = {
  /** Emissive color of the OLED eyes and status LED core (default white). */
  eyeColor?: THREE.ColorRepresentation;
  /** Initial OLED face mode. */
  eyeMode?: RoboPetEyeMode;
  /** Cast/receive shadows on every mesh (default true). */
  shadows?: boolean;
  /** Overall nose-to-tail length in model units (default 2.45). Applied as a uniform root scale. */
  length?: number;
};

export type RoboPetLegJoints = {
  hipRoll: THREE.Object3D;
  hipPitch: THREE.Object3D;
  knee: THREE.Object3D;
};

type EyeState = {
  canvas: HTMLCanvasElement | null;
  texture: THREE.Texture;
  color: string;
  mode: RoboPetEyeMode;
  lookX: number;
  lookY: number;
};

// ---------------------------------------------------------------------------------------------
// Dimensions (model units). Scale reference: 1 mm of real hardware ~ 0.0052 units.
// ---------------------------------------------------------------------------------------------
const BODY = { w: 0.96, h: 0.75, len: 1.9, r: 0.26, wall: 0.03 };
const CAP = { depth: 0.11, bevel: 0.035, grow: 0.018 };
const HIP_Z_FRONT = 0.69;
const HIP_Z_REAR = -0.86;
const HIP_DROP = -0.1; // hip axis height relative to body center
const SERVO = { len: 0.22, wid: 0.155, hgt: 0.2 }; // slightly chunkier than MG996R to match the render // MG996R 40.7 x 19.7 x 42.9 mm
const THIGH_REST = 0.42; // rad, thigh swings down and rearward
const KNEE_REST = -1.02; // rad, shank swings down and forward (knee-back stance)
const HIP_ROLL_REST = 0.05; // rad, slight outward splay

// ---------------------------------------------------------------------------------------------
// Deterministic PRNG for procedural textures.
// ---------------------------------------------------------------------------------------------
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(w: number, h: number): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

/** Horizontal FDM layer-line height field (independent from albedo). */
function layerLineTexture(seed: number, stripes: number): THREE.Texture | null {
  const c = makeCanvas(8, stripes * 8);
  if (!c) return null;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  const rnd = mulberry32(seed);
  for (let i = 0; i < stripes; i++) {
    const jitter = 0.85 + rnd() * 0.15;
    for (let k = 0; k < 8; k++) {
      // rounded bead profile: bright crest, dark valley between layers
      const s = Math.sin((k / 8) * Math.PI);
      const v = Math.round(255 * (0.25 + 0.75 * s * jitter));
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(0, i * 8 + k, 8, 1);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

/** Low-frequency albedo mottling so the PLA does not read as a flat CG fill. */
function mottleTexture(seed: number, base: string, amp: number): THREE.Texture | null {
  const size = 128;
  const c = makeCanvas(size, size);
  if (!c) return null;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  const rnd = mulberry32(seed);
  for (let i = 0; i < 220; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = 6 + rnd() * 22;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const dark = rnd() > 0.5;
    const a = amp * (0.3 + rnd() * 0.7);
    g.addColorStop(0, dark ? `rgba(50,50,50,${a})` : `rgba(255,255,255,${a})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Diagonal infill-like print texture for the graphite leg plates. */
function printHatchTexture(seed: number): THREE.Texture | null {
  const size = 64;
  const c = makeCanvas(size, size);
  if (!c) return null;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, size, size);
  const rnd = mulberry32(seed);
  ctx.lineWidth = 2;
  for (let i = -size; i < size * 2; i += 4) {
    const v = 150 + Math.round(rnd() * 60);
    ctx.strokeStyle = `rgb(${v},${v},${v})`;
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + size, size);
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

// ---------------------------------------------------------------------------------------------
// OLED face (SSD1306-style pixel grid drawn to a canvas, nearest-filtered).
// ---------------------------------------------------------------------------------------------
const OLED_GRID = { w: 64, h: 48, px: 8 };

function superellipse(x: number, y: number, rx: number, ry: number, n: number) {
  return Math.pow(Math.abs(x / rx), n) + Math.pow(Math.abs(y / ry), n) <= 1;
}

function drawEyes(state: EyeState) {
  const c = state.canvas;
  if (!c) return;
  const ctx = c.getContext("2d");
  if (!ctx) return;
  const { w, h, px } = OLED_GRID;
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, c.width, c.height);
  // faint unlit pixel matrix, visible only up close
  ctx.fillStyle = "rgba(255,255,255,0.025)";
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) ctx.fillRect(x * px + 1, y * px + 1, px - 2, px - 2);
  if (state.mode === "off") {
    state.texture.needsUpdate = true;
    return;
  }
  ctx.fillStyle = state.color;
  const eyes = [
    { cx: 18.5, cy: 23.5 },
    { cx: 45.5, cy: 23.5 },
  ];
  for (const e of eyes) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = x + 0.5 - e.cx;
        const dy = y + 0.5 - e.cy;
        let lit = false;
        if (state.mode === "open" || state.mode === "sleepy") {
          const outer = superellipse(dx, dy, 8.8, 9.4, 2.5);
          const pupil = superellipse(dx - state.lookX, dy - state.lookY, 2.9, 3.9, 2.1);
          lit = outer && !pupil;
          if (state.mode === "sleepy" && dy < -2) lit = false;
        } else if (state.mode === "blink") {
          lit = Math.abs(dy) <= 1 && Math.abs(dx) <= 8;
        } else if (state.mode === "happy") {
          const r = Math.hypot(dx, dy + 3);
          lit = r >= 6 && r <= 8.4 && dy + 3 <= 0.5;
        }
        if (lit) ctx.fillRect(x * px, y * px, px, px);
      }
    }
  }
  state.texture.needsUpdate = true;
}

// ---------------------------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------------------------
function roundedRectPath<T extends THREE.Path>(p: T, w: number, h: number, r: number, cx = 0, cy = 0): T {
  const x0 = cx - w / 2;
  const y0 = cy - h / 2;
  const rr = Math.min(r, w / 2, h / 2);
  p.moveTo(x0 + rr, y0);
  p.lineTo(x0 + w - rr, y0);
  p.absarc(x0 + w - rr, y0 + rr, rr, -Math.PI / 2, 0, false);
  p.lineTo(x0 + w, y0 + h - rr);
  p.absarc(x0 + w - rr, y0 + h - rr, rr, 0, Math.PI / 2, false);
  p.lineTo(x0 + rr, y0 + h);
  p.absarc(x0 + rr, y0 + h - rr, rr, Math.PI / 2, Math.PI, false);
  p.lineTo(x0, y0 + rr);
  p.absarc(x0 + rr, y0 + rr, rr, Math.PI, Math.PI * 1.5, false);
  return p;
}

/** Stadium / slot outline between two circle centers on the local Y axis. */
function slotPath<T extends THREE.Path>(p: T, yTop: number, yBot: number, halfW: number, cx = 0): T {
  p.moveTo(cx - halfW, yTop);
  p.lineTo(cx - halfW, yBot);
  p.absarc(cx, yBot, halfW, Math.PI, Math.PI * 2, false);
  p.lineTo(cx + halfW, yTop);
  p.absarc(cx, yTop, halfW, 0, Math.PI, false);
  return p;
}

/** U-shaped half of the hollow body tube (sign +1 = upper half, -1 = lower half). */
function halfShellShape(sign: 1 | -1) {
  const { w, h, r, wall: t } = BODY;
  const s = new THREE.Shape();
  const hx = w / 2;
  const hy = h / 2;
  const pts: THREE.Vector2[] = [];
  const arc = (cx: number, cy: number, rad: number, a0: number, a1: number, n = 14) => {
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      pts.push(new THREE.Vector2(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad));
    }
  };
  pts.push(new THREE.Vector2(-hx, 0));
  arc(-hx + r, hy - r, r, Math.PI, Math.PI / 2);
  arc(hx - r, hy - r, r, Math.PI / 2, 0);
  pts.push(new THREE.Vector2(hx, 0));
  pts.push(new THREE.Vector2(hx - t, 0));
  arc(hx - r, hy - r, r - t, 0, Math.PI / 2);
  arc(-hx + r, hy - r, r - t, Math.PI / 2, Math.PI);
  pts.push(new THREE.Vector2(-hx + t, 0));
  pts.forEach((p, i) => {
    const y = p.y * sign;
    if (i === 0) s.moveTo(p.x, y);
    else s.lineTo(p.x, y);
  });
  s.closePath();
  return s;
}

/** Object-space UVs: u wraps around, v follows world Y so layer lines stay horizontal. */
function layerUV(geo: THREE.BufferGeometry, vScale: number, uScale = 1) {
  const pos = geo.getAttribute("position");
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = (pos.getX(i) + pos.getZ(i)) * uScale;
    uv[i * 2 + 1] = pos.getY(i) * vScale;
  }
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return geo;
}

/** Extrude a shape drawn in (z, y) along +X from x0 with the given thickness. */
function extrudeSide(shape: THREE.Shape, x0: number, thick: number, bevel = 0.008, curveSegments = 10) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.001, thick - bevel * 2),
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments,
  });
  // shape x -> world z, shape y -> world y, extrusion z -> world x
  geo.rotateY(Math.PI / 2);
  geo.scale(1, 1, -1);
  geo.computeBoundingBox();
  const bb = geo.boundingBox as THREE.Box3;
  geo.translate(x0 - bb.min.x, 0, 0);
  // undo the winding flip caused by the mirror scale
  const idx = geo.getIndex();
  if (idx) {
    const a = idx.array as Uint16Array | Uint32Array;
    for (let i = 0; i < a.length; i += 3) {
      const tmp = a[i + 1];
      a[i + 1] = a[i + 2];
      a[i + 2] = tmp;
    }
  } else {
    const p = geo.getAttribute("position");
    const n = geo.getAttribute("normal");
    const uvA = geo.getAttribute("uv");
    for (let i = 0; i < p.count; i += 3) {
      for (const attr of [p, n, uvA]) {
        if (!attr) continue;
        for (let k = 0; k < attr.itemSize; k++) {
          const tmp = attr.getComponent(i + 1, k);
          attr.setComponent(i + 1, k, attr.getComponent(i + 2, k));
          attr.setComponent(i + 2, k, tmp);
        }
      }
    }
  }
  geo.computeVertexNormals();
  return geo;
}

function countTriangles(root: THREE.Object3D) {
  let tris = 0;
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !m.geometry) return;
    const g = m.geometry;
    const n = g.index ? g.index.count / 3 : g.getAttribute("position").count / 3;
    const inst = (o as THREE.InstancedMesh).isInstancedMesh ? (o as THREE.InstancedMesh).count : 1;
    tris += n * inst;
  });
  return Math.round(tris);
}

// ---------------------------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------------------------
export function createRoboPetModel(options: RoboPetModelOptions = {}): THREE.Group {
  const eyeColor = new THREE.Color(options.eyeColor ?? "#ffffff");
  const shadows = options.shadows ?? true;

  const root = new THREE.Group();
  root.name = "roboPet";

  // ---------------- materials (shared) ----------------
  const layerBump = layerLineTexture(7, 32);
  const LAYER_PITCH = 0.0085;
  const vLayer = 1 / (32 * LAYER_PITCH);
  // very low-amplitude albedo breakup; the layer-line bump carries most of the surface read
  const shellMap = mottleTexture(11, "#ffffff", 0.006);
  if (shellMap) shellMap.repeat.set(0.35, 0.35);
  const pla = new THREE.MeshPhysicalMaterial({
    name: "pla-shell",
    // Tuned under the site key light so the shell reads as light grey, not blown-out white.
    color: "#c6c6c6",
    roughness: 0.74,
    metalness: 0,
    sheen: 0.15,
    sheenRoughness: 0.8,
    sheenColor: new THREE.Color("#ffffff"),
    map: shellMap,
    bumpMap: layerBump,
    bumpScale: 0.35,
  });
  const hatch = printHatchTexture(5);
  if (hatch) hatch.repeat.set(1, 1);
  const graphite = new THREE.MeshStandardMaterial({
    name: "pla-graphite",
    color: "#5c5c5c",
    roughness: 0.66,
    metalness: 0,
    bumpMap: hatch,
    bumpScale: 0.25,
  });
  const graphiteDark = new THREE.MeshStandardMaterial({ name: "pla-graphite-dark", color: "#474747", roughness: 0.7 });
  const servoBlack = new THREE.MeshPhysicalMaterial({
    name: "servo-black",
    color: "#151515",
    roughness: 0.42,
    clearcoat: 0.25,
    clearcoatRoughness: 0.5,
  });
  const servoLabel = new THREE.MeshStandardMaterial({ name: "servo-label", color: "#202020", roughness: 0.6 });
  const brass = new THREE.MeshStandardMaterial({ name: "brass", color: "#a6a6a6", roughness: 0.32, metalness: 1 });
  const steel = new THREE.MeshStandardMaterial({ name: "steel", color: "#a6a6a6", roughness: 0.36, metalness: 1 });
  const rubber = new THREE.MeshStandardMaterial({ name: "rubber-black", color: "#1b1b1b", roughness: 0.7 });
  const wireMats = ["#2b2b2b", "#5c5c5c", "#8c8c8c"].map(
    (c, i) => new THREE.MeshStandardMaterial({ name: `wire-${i}`, color: c, roughness: 0.45 }),
  );
  const pcbGreen = new THREE.MeshStandardMaterial({ name: "pcb-green", color: "#2e2e2e", roughness: 0.5 });
  const pcbBlue = new THREE.MeshStandardMaterial({ name: "pcb-blue", color: "#3a3a3a", roughness: 0.5 });
  const pcbDark = new THREE.MeshStandardMaterial({ name: "pcb-dark", color: "#1c1c1c", roughness: 0.5 });
  const chip = new THREE.MeshStandardMaterial({ name: "chip-black", color: "#111111", roughness: 0.45 });
  const gold = new THREE.MeshStandardMaterial({ name: "header-gold", color: "#bfbfbf", roughness: 0.3, metalness: 1 });
  const aluminium = new THREE.MeshStandardMaterial({ name: "heatsink", color: "#1a1a1a", roughness: 0.5, metalness: 0.6 });
  const silver = new THREE.MeshStandardMaterial({ name: "tin", color: "#c8c8c8", roughness: 0.3, metalness: 1 });
  const cellWrap = [
    new THREE.MeshStandardMaterial({ name: "cell-wrap", color: "#404040", roughness: 0.35 }),
    new THREE.MeshStandardMaterial({ name: "cell-cap", color: "#b8b8b8", roughness: 0.3, metalness: 1 }),
  ];
  const copper = new THREE.MeshStandardMaterial({ name: "copper", color: "#8c8c8c", roughness: 0.35, metalness: 1 });
  const capBody = new THREE.MeshStandardMaterial({ name: "electrolytic", color: "#222222", roughness: 0.4 });
  const lensGlass = new THREE.MeshPhysicalMaterial({
    name: "lens-glass",
    color: "#070707",
    roughness: 0.05,
    clearcoat: 1,
    metalness: 0.2,
  });
  const ledMat = new THREE.MeshStandardMaterial({
    name: "led-emissive",
    color: eyeColor,
    emissive: eyeColor,
    emissiveIntensity: 1,
    roughness: 0.2,
    // Skip tone mapping so the LED reaches pure white instead of ACES grey.
    toneMapped: false,
  });

  // OLED canvas texture
  const oledCanvas = makeCanvas(OLED_GRID.w * OLED_GRID.px, OLED_GRID.h * OLED_GRID.px);
  const oledTex: THREE.Texture = oledCanvas ? new THREE.CanvasTexture(oledCanvas) : new THREE.Texture();
  oledTex.magFilter = THREE.LinearFilter;
  oledTex.minFilter = THREE.LinearMipmapLinearFilter;
  oledTex.colorSpace = THREE.SRGBColorSpace;
  oledTex.anisotropy = 4;
  const eyeState: EyeState = {
    canvas: oledCanvas,
    texture: oledTex,
    color: `#${eyeColor.getHexString()}`,
    mode: options.eyeMode ?? "open",
    lookX: -2.4,
    lookY: 0.2,
  };
  drawEyes(eyeState);
  const oledMat = new THREE.MeshPhysicalMaterial({
    name: "oled-glass",
    color: "#000000",
    roughness: 0.14,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    emissive: "#ffffff",
    emissiveMap: oledTex,
    emissiveIntensity: 1,
    // The eyes are lit pixels, not lit surfaces: tone mapping would grey them out.
    toneMapped: false,
  });

  // ---------------- shared geometry ----------------
  const screwGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.01, 10).rotateZ(Math.PI / 2);
  const bushingGeo = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.008, -0.006),
      new THREE.Vector2(0.021, -0.006),
      new THREE.Vector2(0.023, 0.004),
      new THREE.Vector2(0.018, 0.008),
      new THREE.Vector2(0.008, 0.008),
      new THREE.Vector2(0.008, -0.006),
    ],
    14,
  ).rotateZ(-Math.PI / 2);
  const servoCaseGeo = new RoundedBoxGeometry(SERVO.hgt, SERVO.wid, SERVO.len, 2, 0.008);
  const servoTabGeo = new RoundedBoxGeometry(0.012, SERVO.wid * 0.92, SERVO.len + 0.08, 1, 0.003);
  const servoBossGeo = new THREE.CylinderGeometry(0.03, 0.032, 0.02, 18).rotateZ(Math.PI / 2);
  const splineGeo = new THREE.CylinderGeometry(0.011, 0.011, 0.012, 12).rotateZ(Math.PI / 2);
  const labelGeo = new THREE.BoxGeometry(SERVO.hgt * 0.6, 0.002, SERVO.len * 0.55);

  const meshes: THREE.Mesh[] = [];
  const mk = (geo: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[], parent: THREE.Object3D, name?: string) => {
    const m = new THREE.Mesh(geo, mat);
    if (name) m.name = name;
    parent.add(m);
    meshes.push(m);
    return m;
  };
  const screw = (parent: THREE.Object3D, x: number, y: number, z: number, dir: 1 | -1 = 1) => {
    const s = mk(screwGeo, brass, parent, "brass-screw");
    s.position.set(x + dir * 0.005, y, z);
    return s;
  };

  /** One MG996R servo. Shaft axis = +X, case centered so the shaft sits at the origin. */
  const buildServo = (name: string) => {
    const g = new THREE.Group();
    g.name = name;
    const shaftOffsetZ = SERVO.len / 2 - 0.05; // shaft is ~10 mm from one end
    const body = new THREE.Group();
    body.position.set(-SERVO.hgt / 2 - 0.012, 0, shaftOffsetZ);
    g.add(body);
    mk(servoCaseGeo, servoBlack, body, `${name}-case`);
    const tab = mk(servoTabGeo, servoBlack, body, `${name}-tabs`);
    tab.position.x = SERVO.hgt * 0.22;
    for (const dz of [-1, 1]) for (const dy of [-1, 1]) screw(body, SERVO.hgt * 0.22 + 0.006, dy * 0.028, dz * (SERVO.len / 2 + 0.024));
    const label = mk(labelGeo, servoLabel, body, `${name}-label`);
    label.position.set(-0.01, SERVO.wid / 2 + 0.0005, 0);
    const boss = mk(servoBossGeo, servoBlack, g, `${name}-boss`);
    boss.position.x = -0.012 + 0.01;
    const spline = mk(splineGeo, steel, g, `${name}-spline`);
    spline.position.x = 0.012;
    g.userData.wireExit = new THREE.Vector3(-SERVO.hgt * 0.75, -SERVO.wid * 0.2, shaftOffsetZ - SERVO.len / 2 - 0.004);
    return g;
  };

  // ---------------- part registry ----------------
  const parts: THREE.Group[] = [];
  const part = (id: RoboPetPartId, label: string, detail: string, explode: THREE.Vector3) => {
    const g = new THREE.Group();
    g.name = id;
    g.userData.part = { id, label, detail } satisfies RoboPetPartInfo;
    g.userData.explode = explode;
    root.add(g);
    parts.push(g);
    return g;
  };

  const yC = 1.0; // body center height before the final ground snap

  // ---------------- shell top / bottom ----------------
  const shellTop = part(
    "shell-top",
    "Upper shell",
    "A rounded top cover with one WS2812 LED for status and mood. It has not been printed.",
    new THREE.Vector3(0, 1.45, 0),
  );
  const shellBottom = part(
    "shell-bottom",
    "Chassis",
    "The printed PLA frame for the MVP, with mounts for the servos, the IMU and both boards.",
    new THREE.Vector3(0, -0.05, 0),
  );
  const extrudeOpts = { depth: BODY.len, bevelEnabled: false, curveSegments: 14 };
  const topGeo = layerUV(new THREE.ExtrudeGeometry(halfShellShape(1), extrudeOpts).translate(0, 0, -BODY.len / 2), vLayer);
  const botGeo = layerUV(new THREE.ExtrudeGeometry(halfShellShape(-1), extrudeOpts).translate(0, 0, -BODY.len / 2), vLayer);
  shellTop.position.set(0, yC, 0);
  shellBottom.position.set(0, yC, 0);
  mk(topGeo, pla, shellTop, "shell-top-tube");
  mk(botGeo, pla, shellBottom, "shell-bottom-tube");

  // caps: rounded-rect slab, slightly proud of the tube so the seam reads as a step
  const capW = BODY.w + CAP.grow * 2 - CAP.bevel * 2;
  const capH = BODY.h + CAP.grow * 2 - CAP.bevel * 2;
  const capR = BODY.r + CAP.grow - CAP.bevel;
  const capOpts = {
    depth: CAP.depth,
    bevelEnabled: true,
    bevelThickness: CAP.bevel,
    bevelSize: CAP.bevel,
    bevelSegments: 5,
    curveSegments: 16,
  };
  const rearShape = roundedRectPath(new THREE.Shape(), capW, capH, capR);
  const rearGeo = layerUV(new THREE.ExtrudeGeometry(rearShape, capOpts), vLayer);
  rearGeo.computeBoundingBox();
  rearGeo.translate(0, 0, -(rearGeo.boundingBox as THREE.Box3).max.z);
  const rearCap = mk(rearGeo, pla, shellBottom, "rear-cap");
  rearCap.position.z = -BODY.len / 2 + 0.03;
  // internal standoffs / board rails (printed into the chassis)
  const railGeo = new THREE.BoxGeometry(0.04, 0.05, 1.5);
  for (const sx of [-1, 1]) {
    const rail = mk(railGeo, pla, shellBottom, "board-rail");
    rail.position.set(sx * 0.2, -BODY.h / 2 + BODY.wall + 0.025, 0);
  }

  // ---------------- face (cap + OLED) ----------------
  const face = part(
    "face",
    "Face plate + OLED",
    "An SSD1306 OLED for the face. So far it has drawn test faces and the IMU orientation cube.",
    new THREE.Vector3(0, 0, 0.85),
  );
  face.position.set(0, yC, BODY.len / 2 - 0.03);
  const SCREEN = { w: 0.44, h: 0.33, y: -0.04 };
  const CAMSLOT = { w: 0.2, h: 0.085, y: 0.235 };
  const faceShape = roundedRectPath(new THREE.Shape(), capW, capH, capR);
  faceShape.holes.push(roundedRectPath(new THREE.Path(), SCREEN.w + CAP.bevel * 2, SCREEN.h + CAP.bevel * 2, 0.03, 0, SCREEN.y));
  faceShape.holes.push(roundedRectPath(new THREE.Path(), CAMSLOT.w + CAP.bevel * 2, CAMSLOT.h + CAP.bevel * 2, 0.045, 0, CAMSLOT.y));
  const faceGeo = layerUV(new THREE.ExtrudeGeometry(faceShape, capOpts), vLayer);
  faceGeo.computeBoundingBox();
  faceGeo.translate(0, 0, -(faceGeo.boundingBox as THREE.Box3).min.z);
  mk(faceGeo, pla, face, "face-cap");
  const capFront = CAP.depth + CAP.bevel * 2;
  // OLED module: black glass panel + thin bezel + PCB edge, recessed into the cap
  const oledPcb = mk(new THREE.BoxGeometry(SCREEN.w + 0.08, SCREEN.h + 0.07, 0.012), pcbDark, face, "oled-pcb");
  oledPcb.position.set(0, SCREEN.y, capFront - 0.06);
  const oledBezel = mk(new THREE.BoxGeometry(SCREEN.w + 0.03, SCREEN.h + 0.03, 0.02), chip, face, "oled-bezel");
  oledBezel.position.set(0, SCREEN.y, capFront - 0.045);
  const oledPanel = mk(new THREE.PlaneGeometry(SCREEN.w, SCREEN.h), oledMat, face, "oled-panel");
  oledPanel.position.set(0, SCREEN.y, capFront - 0.034);
  face.userData.eyes = eyeState;

  // ---------------- camera ----------------
  const camera = part(
    "camera",
    "PiCam",
    "Camera module for the Pi Zero 2W, which has not been tested yet.",
    new THREE.Vector3(0, 0, 1.35),
  );
  camera.position.set(0, yC + CAMSLOT.y, BODY.len / 2 - 0.03 + capFront - 0.05);
  const camPcb = mk(new RoundedBoxGeometry(CAMSLOT.w - 0.012, CAMSLOT.h - 0.012, 0.01, 1, 0.003), pcbDark, camera, "cam-pcb");
  camPcb.position.z = 0;
  const camHousing = mk(new RoundedBoxGeometry(0.062, 0.062, 0.026, 2, 0.006), chip, camera, "cam-housing");
  camHousing.position.set(0, 0, 0.016);
  const lensRing = mk(new THREE.TorusGeometry(0.021, 0.0045, 8, 24), silver, camera, "lens-ring");
  lensRing.position.set(0, 0, 0.03);
  const lens = mk(new THREE.SphereGeometry(0.021, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2), lensGlass, camera, "lens");
  lens.position.set(0, 0, 0.026);
  lens.scale.set(1, 1, 0.45);
  const camChipGeo = new THREE.BoxGeometry(0.018, 0.012, 0.006);
  for (const [x, y] of [
    [0.055, 0.012],
    [0.055, -0.014],
    [-0.055, 0.0],
  ]) {
    const c = mk(camChipGeo, x > 0 ? silver : chip, camera, "cam-smd");
    c.position.set(x, y, 0.008);
  }

  // ---------------- status LED ----------------
  const statusLed = part(
    "status-led",
    "Status LED",
    "One WS2812 LED for status and mood.",
    new THREE.Vector3(0, 1.45, 0),
  );
  {
    const a = Math.asin(0.07 / BODY.r);
    const nx = Math.cos(a);
    const ny = Math.sin(a);
    const px = BODY.w / 2 - BODY.r + BODY.r * nx;
    const py = BODY.h / 2 - BODY.r + BODY.r * ny;
    statusLed.position.set(px, yC + py, -BODY.len / 2 + 0.24);
    statusLed.rotation.z = -(Math.PI / 2 - a);
    const ring = mk(new THREE.CylinderGeometry(0.03, 0.032, 0.008, 20), graphiteDark, statusLed, "led-bezel");
    ring.position.y = 0.002;
    const dome = mk(new THREE.SphereGeometry(0.022, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), ledMat, statusLed, "led-dome");
    dome.position.y = 0.005;
    dome.scale.set(1, 0.6, 1);
  }

  // ---------------- electronics (inferred internals) ----------------
  const electronics = part(
    "electronics",
    "Pico + Zero 2W + IMU",
    "A Raspberry Pi Pico running MicroPython drives servo PWM and reads the MPU6050 IMU. The Pi Zero 2W will take the camera, audio and RC.",
    new THREE.Vector3(0, 0.95, 0),
  );
  electronics.position.set(0, yC + 0.02, 0);
  {
    const PCB_T = 0.012;
    const board = (w: number, d: number, mat: THREE.Material, x: number, z: number, name: string) => {
      const b = mk(new RoundedBoxGeometry(w, PCB_T, d, 1, 0.004), mat, electronics, name);
      b.position.set(x, 0, z);
      return b;
    };
    // mounting plate
    const plate = mk(new THREE.BoxGeometry(0.5, 0.01, 1.2), graphiteDark, electronics, "board-plate");
    plate.position.set(0, -0.03, -0.02);
    // Pi Zero 2W: 65 x 30 mm
    board(0.155, 0.34, pcbGreen, -0.08, 0.28, "zero2w-pcb");
    const soc = mk(new THREE.BoxGeometry(0.06, 0.008, 0.06), chip, electronics, "zero2w-rp3a0");
    soc.position.set(-0.08, 0.01, 0.27);
    const sd = mk(new THREE.BoxGeometry(0.06, 0.008, 0.06), silver, electronics, "zero2w-sd");
    sd.position.set(-0.08, 0.01, 0.42);
    // 2x20 header pins as one InstancedMesh
    const pinGeo = new THREE.BoxGeometry(0.006, 0.04, 0.006);
    const pins = new THREE.InstancedMesh(pinGeo, gold, 40);
    pins.name = "zero2w-header";
    const tmp = new THREE.Object3D();
    for (let i = 0; i < 40; i++) {
      tmp.position.set(-0.08 - 0.065 + (i % 2) * 0.013, 0.022, 0.13 + Math.floor(i / 2) * 0.0132);
      tmp.updateMatrix();
      pins.setMatrixAt(i, tmp.matrix);
    }
    electronics.add(pins);
    meshes.push(pins);
    const headerBase = mk(new THREE.BoxGeometry(0.028, 0.012, 0.27), chip, electronics, "zero2w-header-base");
    headerBase.position.set(-0.139, 0.01, 0.255);
    // Raspberry Pi Pico: 51 x 21 mm
    board(0.11, 0.265, pcbGreen, 0.1, -0.32, "pico-pcb");
    const rp2040 = mk(new THREE.BoxGeometry(0.036, 0.007, 0.036), chip, electronics, "pico-rp2040");
    rp2040.position.set(0.1, 0.009, -0.32);
    const usb = mk(new THREE.BoxGeometry(0.042, 0.016, 0.03), silver, electronics, "pico-usb");
    usb.position.set(0.1, 0.012, -0.44);
    const castGeo = new THREE.BoxGeometry(0.006, 0.014, 0.006);
    const cast = new THREE.InstancedMesh(castGeo, gold, 40);
    cast.name = "pico-castellations";
    for (let i = 0; i < 40; i++) {
      tmp.position.set(0.1 + (i % 2 ? 0.05 : -0.05), 0.004, -0.42 + Math.floor(i / 2) * 0.0132);
      tmp.updateMatrix();
      cast.setMatrixAt(i, tmp.matrix);
    }
    electronics.add(cast);
    meshes.push(cast);
    // MPU6050 (GY-521): 21 x 16 mm
    board(0.085, 0.11, pcbBlue, 0.1, 0.02, "mpu6050-pcb");
    const imu = mk(new THREE.BoxGeometry(0.022, 0.006, 0.022), chip, electronics, "mpu6050-chip");
    imu.position.set(0.1, 0.009, 0.02);
    // ribbon / jumper bundle between boards
    const ribbon = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.08, 0.03, 0.13),
      new THREE.Vector3(0.0, 0.06, -0.05),
      new THREE.Vector3(0.1, 0.02, -0.2),
    ]);
    mk(new THREE.TubeGeometry(ribbon, 16, 0.008, 5), wireMats[1], electronics, "i2c-bundle");
  }

  // ---------------- power (inferred internals) ----------------
  const power = part(
    "power",
    "Battery + buck converters",
    "A salvaged 3-cell laptop pack feeds two XL4016 buck converters: about 7.2 V for the servos and 5.0 V for logic.",
    new THREE.Vector3(0, 0.45, 0),
  );
  power.position.set(0, yC - BODY.h / 2 + BODY.wall + 0.06, 0);
  {
    // 3 x 18650 cells (18 x 65 mm) in a printed tray
    const cellGeo = new THREE.CylinderGeometry(0.047, 0.047, 0.34, 20, 1).rotateX(Math.PI / 2);
    const cellCapGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.006, 16).rotateX(Math.PI / 2);
    for (let i = 0; i < 3; i++) {
      const x = (i - 1) * 0.1;
      const c = mk(cellGeo, cellWrap[0], power, `cell-${i}`);
      c.position.set(x, 0.0, -0.45);
      const cap = mk(cellCapGeo, cellWrap[1], power, `cell-cap-${i}`);
      cap.position.set(x, 0.0, -0.45 + 0.172);
    }
    const tray = mk(new THREE.BoxGeometry(0.33, 0.03, 0.38), graphiteDark, power, "cell-tray");
    tray.position.set(0, -0.045, -0.45);
    // 2 x XL4016 modules (approx 60 x 51 mm)
    for (const sx of [-1, 1]) {
      const g = new THREE.Group();
      g.name = sx > 0 ? "buck-servo-rail" : "buck-logic-rail";
      g.position.set(sx * 0.165, -0.03, 0.32);
      power.add(g);
      const pcb = mk(new RoundedBoxGeometry(0.26, 0.012, 0.3, 1, 0.004), pcbBlue, g, "xl4016-pcb");
      pcb.position.y = 0;
      for (const hz of [-0.08, 0.08]) {
        const hs = mk(new THREE.BoxGeometry(0.07, 0.07, 0.06), aluminium, g, "xl4016-heatsink");
        hs.position.set(-0.07, 0.04, hz);
      }
      const inductor = mk(new THREE.TorusGeometry(0.038, 0.018, 10, 20).rotateX(Math.PI / 2), copper, g, "xl4016-inductor");
      inductor.position.set(0.05, 0.024, -0.05);
      for (const cz of [0.05, 0.11]) {
        const cap = mk(new THREE.CylinderGeometry(0.022, 0.022, 0.07, 14), capBody, g, "xl4016-cap");
        cap.position.set(0.06, 0.041, cz);
      }
      const pot = mk(new THREE.BoxGeometry(0.02, 0.02, 0.04), pcbBlue, g, "xl4016-trimpot");
      pot.position.set(-0.0, 0.016, 0.12);
    }
  }

  // ---------------- legs ----------------
  const legJoints = new Map<string, RoboPetLegJoints>();
  const legDefs: Array<{ id: RoboPetPartId; label: string; side: 1 | -1; z: number }> = [
    { id: "leg-fl", label: "Front-left leg", side: 1, z: HIP_Z_FRONT },
    { id: "leg-fr", label: "Front-right leg", side: -1, z: HIP_Z_FRONT },
    { id: "leg-rl", label: "Rear-left leg", side: 1, z: HIP_Z_REAR },
    { id: "leg-rr", label: "Rear-right leg", side: -1, z: HIP_Z_REAR },
  ];

  // shared leg geometry (built for a left leg, x = outward; right legs mirror by scale.x = -1)
  const cupGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.11, 32).rotateZ(Math.PI / 2).translate(0.025, 0, 0);
  const cupLipGeo = new THREE.TorusGeometry(0.172, 0.013, 8, 32).rotateY(Math.PI / 2);
  const bracketShape = roundedRectPath(new THREE.Shape(), 0.34, SERVO.wid + 0.09, 0.04, 0.035, 0.015);
  bracketShape.holes.push(roundedRectPath(new THREE.Path(), SERVO.len + 0.008, SERVO.wid + 0.008, 0.01, 0.035, 0.015));
  const bracketGeo = extrudeSide(bracketShape, 0.07, 0.1, 0.01);

  const hornShape = slotPath(new THREE.Shape(), 0, -0.075, 0.022);
  const hornGeo = extrudeSide(hornShape, 0, 0.01, 0.002);
  const linkShape = slotPath(new THREE.Shape(), -0.035, -0.135, 0.015);
  const linkGeo = extrudeSide(linkShape, 0.011, 0.007, 0.0015);
  const THIGH_TOP = -0.11;
  const THIGH_BOT = -0.44;
  const thighShape = slotPath(new THREE.Shape(), THIGH_TOP, THIGH_BOT, 0.068);
  const thighGeo = layerUV(extrudeSide(thighShape, 0.02, 0.04, 0.008, 14), 40, 40);

  // shank: bracket with a servo window, bar down to the foot with a printed step notch
  const shankBracketShape = new THREE.Shape();
  roundedRectPath(shankBracketShape, 0.29, 0.22, 0.03, 0.06, -0.005);
  shankBracketShape.holes.push(roundedRectPath(new THREE.Path(), 0.21, 0.14, 0.012, 0.065, -0.002));
  const shankBracketGeo = extrudeSide(shankBracketShape, -0.035, 0.03, 0.006);
  const shankInnerGeo = extrudeSide(roundedRectPath(new THREE.Shape(), 0.29, 0.22, 0.03, 0.06, -0.005), -0.245, 0.025, 0.006);
  const SHANK_LEN = 0.58;
  const shankBar = new THREE.Shape();
  shankBar.moveTo(-0.005, -0.09);
  shankBar.lineTo(0.08, -0.09);
  shankBar.lineTo(0.08, -0.17);
  shankBar.lineTo(0.068, -0.19);
  shankBar.lineTo(0.068, -SHANK_LEN + 0.07);
  shankBar.quadraticCurveTo(0.075, -SHANK_LEN + 0.02, 0.05, -SHANK_LEN);
  shankBar.lineTo(-0.025, -SHANK_LEN);
  shankBar.quadraticCurveTo(-0.03, -SHANK_LEN + 0.04, -0.005, -SHANK_LEN + 0.08);
  shankBar.lineTo(-0.005, -0.2);
  shankBar.lineTo(0.012, -0.2);
  shankBar.lineTo(0.012, -0.16);
  shankBar.lineTo(-0.005, -0.16);
  shankBar.closePath();
  const shankBarGeo = layerUV(
    extrudeSide(shankBar, -0.11, 0.07, 0.012, 8).translate(0.075, 0, 0).scale(1.2, 1, 1.25).translate(-0.075, 0, 0),
    40,
    40,
  );
  const shankBottomGeo = new RoundedBoxGeometry(0.2, 0.016, 0.2, 1, 0.005);
  const footGeo = new RoundedBoxGeometry(0.104, 0.1, 0.15, 3, 0.042);

  /** Sagging tri-colour servo loom: three parallel strands following one centre curve. */
  const loom = (parent: THREE.Object3D, pts: THREE.Vector3[], name: string) => {
    const centre = new THREE.CatmullRomCurve3(pts, false, "centripetal");
    const n = 28;
    const frames = centre.computeFrenetFrames(n, false);
    const g = new THREE.Group();
    g.name = name;
    parent.add(g);
    for (let s = 0; s < 3; s++) {
      const off = (s - 1) * 0.0105;
      const strand: THREE.Vector3[] = [];
      for (let i = 0; i <= n; i++) {
        const p = centre.getPointAt(i / n);
        strand.push(p.add(frames.binormals[i].clone().multiplyScalar(off)));
      }
      const curve = new THREE.CatmullRomCurve3(strand);
      mk(new THREE.TubeGeometry(curve, n, 0.0055, 5, false), wireMats[s], g, `${name}-${s}`);
    }
    return g;
  };

  for (const def of legDefs) {
    const leg = part(
      def.id,
      def.label,
      "Printed PLA leg driven by MG996R servos. The plan is three per leg; the MVP frame has two.",
      // Straight out on the lateral axis only, so the teardown reads as engineered.
      new THREE.Vector3(def.side * 0.8, 0, 0),
    );
    leg.position.set(def.side * (BODY.w / 2 - 0.01), yC + HIP_DROP, def.z);
    if (def.side < 0) leg.scale.x = -1; // reflection, not rotation (renderer flips winding)

    const hipRoll = new THREE.Group();
    hipRoll.name = `${def.id}-hip-roll`;
    hipRoll.rotation.z = HIP_ROLL_REST;
    leg.add(hipRoll);

    // hip cup + servo bracket (graphite PLA)
    mk(cupGeo, graphite, hipRoll, `${def.id}-hip-cup`);
    const lip = mk(cupLipGeo, graphite, hipRoll, `${def.id}-hip-cup-lip`);
    lip.position.x = 0.08;
    mk(bracketGeo, graphite, hipRoll, `${def.id}-servo-bracket`);
    for (const [sy, sz] of [
      [0.075, 0.17],
      [-0.075, 0.17],
      [-0.075, -0.11],
    ])
      screw(hipRoll, 0.17, sy, sz);

    // hip-roll servo: hidden inside the cup/body, shaft along Z (inferred)
    const servoHip = buildServo(`${def.id}-servo-hip`);
    servoHip.rotation.y = -Math.PI / 2;
    servoHip.position.set(-0.12, 0, 0.12);
    hipRoll.add(servoHip);

    // hip-pitch ("upper") servo: black case in the bracket, shaft pointing outward
    const servoUpper = buildServo(`${def.id}-servo-upper`);
    const PITCH = new THREE.Vector3(0.235, 0.015, -0.02);
    servoUpper.position.copy(PITCH);
    hipRoll.add(servoUpper);

    const hipPitch = new THREE.Group();
    hipPitch.name = `${def.id}-hip-pitch`;
    hipPitch.position.copy(PITCH);
    hipPitch.rotation.x = THIGH_REST;
    hipRoll.add(hipPitch);

    // horn + steel link + thigh plate
    mk(hornGeo, brass, hipPitch, `${def.id}-horn`);
    screw(hipPitch, 0.01, 0, 0);
    screw(hipPitch, 0.01, -0.06, 0);
    mk(linkGeo, steel, hipPitch, `${def.id}-link`);
    screw(hipPitch, 0.018, -0.125, 0);
    mk(thighGeo, graphite, hipPitch, `${def.id}-thigh`);
    for (const ty of [THIGH_TOP, THIGH_BOT]) {
      const b = mk(bushingGeo, brass, hipPitch, `${def.id}-bushing`);
      b.position.set(0.062, ty, 0);
    }

    // knee: shank bracket holds the knee ("lower") servo; shaft drives through the thigh plate
    const knee = new THREE.Group();
    knee.name = `${def.id}-knee`;
    knee.position.set(0, THIGH_BOT, 0);
    knee.rotation.x = KNEE_REST;
    hipPitch.add(knee);
    const servoLower = buildServo(`${def.id}-servo-lower`);
    servoLower.position.set(-0.03, 0, 0); // shaft faces the thigh plate, case extends forward
    knee.add(servoLower);
    mk(shankBracketGeo, graphite, knee, `${def.id}-shank-bracket`);
    mk(shankInnerGeo, graphite, knee, `${def.id}-shank-inner`);
    const sb = mk(shankBottomGeo, graphite, knee, `${def.id}-shank-floor`);
    sb.position.set(-0.13, -0.098, 0.06);
    mk(shankBarGeo, graphite, knee, `${def.id}-shank`);
    for (const [sy, sz] of [
      [0.06, -0.06],
      [0.06, 0.18],
      [-0.09, 0.18],
    ])
      screw(knee, -0.005, sy, sz);
    const foot = mk(footGeo, rubber, knee, `${def.id}-foot`);
    foot.position.set(-0.075, -SHANK_LEN + 0.03, 0.016);

    // wire looms (rest pose). Upper servo loom loops down outside, lower one rises to the belly.
    leg.updateMatrixWorld(true);
    const toHip = (o: THREE.Object3D, v: THREE.Vector3) => hipRoll.worldToLocal(o.localToWorld(v.clone()));
    const upperExit = toHip(servoUpper, servoUpper.userData.wireExit as THREE.Vector3);
    // entry hole just inside the belly of the lower shell
    const belly = new THREE.Vector3(-0.14, -BODY.h / 2 - HIP_DROP + 0.03, 0);
    loom(
      hipRoll,
      [
        upperExit,
        upperExit.clone().add(new THREE.Vector3(0.05, -0.06, -0.06)),
        new THREE.Vector3(0.2, -0.24, -0.14),
        new THREE.Vector3(0.1, -0.3, -0.05),
        belly.clone().add(new THREE.Vector3(0.06, -0.02, -0.03)),
        belly.clone().add(new THREE.Vector3(-0.02, 0.06, -0.03)),
      ],
      `${def.id}-loom-upper`,
    );
    const lowerExit = toHip(servoLower, servoLower.userData.wireExit as THREE.Vector3);
    loom(
      hipRoll,
      [
        lowerExit,
        // leave through the open rear end of the shank bracket, between its two side plates
        toHip(servoLower, (servoLower.userData.wireExit as THREE.Vector3).clone().add(new THREE.Vector3(0, -0.01, -0.07))),
        toHip(servoLower, (servoLower.userData.wireExit as THREE.Vector3).clone().add(new THREE.Vector3(-0.03, 0.03, -0.13))),
        lowerExit.clone().lerp(belly, 0.55).add(new THREE.Vector3(-0.02, -0.05, 0.02)),
        belly.clone().add(new THREE.Vector3(0.02, -0.04, 0.05)),
        belly.clone().add(new THREE.Vector3(-0.03, 0.04, 0.05)),
      ],
      `${def.id}-loom-lower`,
    );

    leg.userData.joints = { hipRoll, hipPitch, knee } satisfies RoboPetLegJoints;
    leg.userData.restJoints = { hipRoll: HIP_ROLL_REST, hipPitch: THIGH_REST, knee: KNEE_REST };
    legJoints.set(def.id, { hipRoll, hipPitch, knee });
  }

  // ---------------- finalize ----------------
  for (const m of meshes) {
    m.castShadow = shadows;
    m.receiveShadow = shadows;
  }
  // snap feet to y = 0 and center XZ on the body
  root.updateMatrixWorld(true);
  const box = new THREE.Box3();
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && !(o as THREE.InstancedMesh).isInstancedMesh) box.expandByObject(m, true);
  });
  // only meshes are expanded; sprites are ignored by design
  const dy = -box.min.y;
  const dz = -(box.min.z + box.max.z) / 2;
  for (const p of parts) {
    p.position.y += dy;
    p.position.z += dz;
    p.userData.restPosition = p.position.clone();
  }
  root.userData.parts = parts.map((p) => p.userData.part as RoboPetPartInfo);
  root.userData.triangles = countTriangles(root);
  // uniform scale so the overall length matches options.length; feet stay on y = 0
  const naturalLength = box.max.z - box.min.z;
  const k = (options.length ?? 2.45) / naturalLength;
  root.scale.setScalar(k);
  root.userData.bounds = {
    length: naturalLength * k,
    height: (box.max.y - box.min.y) * k,
    width: (box.max.x - box.min.x) * k,
  };
  root.userData.eyes = eyeState;
  root.userData.legJoints = legJoints;
  root.userData.explodeT = 0;
  return root;
}

// ---------------------------------------------------------------------------------------------
// Runtime helpers
// ---------------------------------------------------------------------------------------------
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Move every named part from its rest position along userData.explode. t is clamped to 0..1. */
export function setRoboPetExplode(model: THREE.Object3D, t: number) {
  const k = easeInOutCubic(THREE.MathUtils.clamp(t, 0, 1));
  for (const child of model.children) {
    const rest = child.userData.restPosition as THREE.Vector3 | undefined;
    const ex = child.userData.explode as THREE.Vector3 | undefined;
    if (!rest || !ex) continue;
    child.position.copy(rest).addScaledVector(ex, k);
  }
  model.userData.explodeT = t;
}

/** Redraw the OLED face. look shifts the pupils in OLED pixels (x negative = robot's right). */
export function setRoboPetEyes(model: THREE.Object3D, mode: RoboPetEyeMode, look?: { x?: number; y?: number }) {
  const s = model.userData.eyes as EyeState | undefined;
  if (!s) return;
  s.mode = mode;
  if (look?.x !== undefined) s.lookX = look.x;
  if (look?.y !== undefined) s.lookY = look.y;
  drawEyes(s);
}

/** Set joint angles (radians, added to the rest pose) for one leg. */
export function setRoboPetLegPose(
  model: THREE.Object3D,
  legId: "leg-fl" | "leg-fr" | "leg-rl" | "leg-rr",
  pose: { hipRoll?: number; hipPitch?: number; knee?: number },
) {
  const leg = model.getObjectByName(legId);
  if (!leg) return;
  const j = leg.userData.joints as RoboPetLegJoints;
  const rest = leg.userData.restJoints as { hipRoll: number; hipPitch: number; knee: number };
  j.hipRoll.rotation.z = rest.hipRoll + (pose.hipRoll ?? 0);
  j.hipPitch.rotation.x = rest.hipPitch + (pose.hipPitch ?? 0);
  j.knee.rotation.x = rest.knee + (pose.knee ?? 0);
}

/** Look up a part group by id. */
export function getRoboPetPart(model: THREE.Object3D, id: RoboPetPartId) {
  return model.getObjectByName(id) as THREE.Group | undefined;
}

/** Dispose all geometries, materials and canvas textures owned by the model. */
export function disposeRoboPetModel(model: THREE.Object3D) {
  const geos = new Set<THREE.BufferGeometry>();
  const mats = new Set<THREE.Material>();
  model.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry) geos.add(m.geometry);
    const mm = (o as THREE.Mesh | THREE.Sprite).material;
    if (Array.isArray(mm)) mm.forEach((x) => mats.add(x));
    else if (mm) mats.add(mm);
  });
  geos.forEach((g) => g.dispose());
  mats.forEach((mat) => {
    for (const v of Object.values(mat)) if (v instanceof THREE.Texture) v.dispose();
    mat.dispose();
  });
}
