/**
 * roboPet procedural model, drawn as a line drawing in the page's ink tokens.
 *
 * Proportions follow an early concept render of roboPet. The boards, battery pack and buck
 * converters inside are laid out from the hardware list in the roboPet README, so their sizes
 * and positions are approximate. Everything is generated in code: no meshes, no textures.
 *
 * Frame: forward = +Z (OLED face), up = +Y, the robot's own left = +X. Feet rest on y = 0 and the
 * body is centered on the origin in XZ. Overall length is about 2.45 units.
 *
 * After construction every part is flattened into one mesh per tone plus two sets of edges:
 * hard edges (creases sharper than CREASE_DEG), which never change, and silhouette edges, which
 * are recomputed from the camera position whenever the view changes so that curved surfaces
 * keep an outline. Colors are not set here; the stage paints them from the CSS tokens.
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import type { InstancedInterleavedBuffer, InterleavedBufferAttribute } from "three";

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

/** The three lit values a part can be drawn in. They map to --wash, --muted and --ink. */
export type RoboPetTone = "wash" | "muted" | "ink";
/** Unlit surfaces: the OLED glass (black in both themes) and lit pixels (white in both themes). */
type FaceTone = RoboPetTone | "panel" | "light";

export type RoboPetPalette = {
  paper: THREE.Color;
  ink: THREE.Color;
  muted: THREE.Color;
  wash: THREE.Color;
};

export type RoboPetModelOptions = {
  /** Overall nose-to-tail length in model units (default 2.45). Applied as a uniform root scale. */
  length?: number;
};

type PartMaterials = Record<RoboPetTone, THREE.MeshLambertMaterial> & { line: LineMaterial };

type Silhouette = {
  /** Smooth edges in part space, 12 floats each: v0, v1, n0, n1. */
  edges: Float32Array;
  geometry: LineSegmentsGeometry;
  buffer: InstancedInterleavedBuffer;
};

// ---------------------------------------------------------------------------------------------
// Dimensions (model units). Scale reference: 1 mm of real hardware is about 0.0052 units.
// ---------------------------------------------------------------------------------------------
const BODY = { w: 0.96, h: 0.75, len: 1.9, r: 0.26, wall: 0.03 };
const CAP = { depth: 0.11, bevel: 0.035, grow: 0.018 };
const HIP_Z_FRONT = 0.69;
const HIP_Z_REAR = -0.86;
const HIP_DROP = -0.1; // hip axis height relative to body center
const SERVO = { len: 0.22, wid: 0.155, hgt: 0.2 }; // MG996R is 40.7 x 19.7 x 42.9 mm; drawn a little chunkier
const THIGH_REST = 0.42; // rad, thigh swings down and rearward
const KNEE_REST = -1.02; // rad, shank swings down and forward (knee-back stance)
const HIP_ROLL_REST = 0.05; // rad, slight outward splay

/** Faces meeting at more than this angle get a hard edge; shallower ones are shaded smooth. */
const CREASE_DEG = 40;
/** Parts whose bounding sphere is smaller than this get no edges (screws, pins, chips). */
const MIN_EDGE_RADIUS = 0.03;

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

/**
 * Extrude a shape drawn in (z, y) along +X from x0 with the given thickness. No bevel: a bevel
 * split into facets draws two or three parallel lines where one crisp edge belongs.
 */
function extrudeSide(shape: THREE.Shape, x0: number, thick: number, curveSegments = 10) {
  const geo = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false, curveSegments });
  // shape x to world z, shape y to world y, extrusion z to world x
  geo.rotateY(Math.PI / 2);
  geo.scale(1, 1, -1);
  geo.computeBoundingBox();
  const bb = geo.boundingBox as THREE.Box3;
  geo.translate(x0 - bb.min.x, 0, 0);
  flipWinding(geo); // undo the winding flip caused by the mirror scale
  return geo;
}

function flipWinding(geo: THREE.BufferGeometry) {
  const idx = geo.getIndex();
  if (idx) {
    const a = idx.array as Uint16Array | Uint32Array;
    for (let i = 0; i < a.length; i += 3) {
      const tmp = a[i + 1];
      a[i + 1] = a[i + 2];
      a[i + 2] = tmp;
    }
    return;
  }
  for (const attr of Object.values(geo.attributes) as THREE.BufferAttribute[]) {
    for (let i = 0; i < attr.count; i += 3) {
      for (let k = 0; k < attr.itemSize; k++) {
        const tmp = attr.getComponent(i + 1, k);
        attr.setComponent(i + 1, k, attr.getComponent(i + 2, k));
        attr.setComponent(i + 2, k, tmp);
      }
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Geometry analysis: creased normals plus hard and smooth edges, cached per source geometry.
// ---------------------------------------------------------------------------------------------
type Analysis = {
  /** Triangle soup positions, 9 floats per triangle. */
  position: Float32Array;
  /** Creased vertex normals matching position. */
  normal: Float32Array;
  edges?: { hard: Float32Array; soft: Float32Array };
};

const analysisCache = new WeakMap<THREE.BufferGeometry, Analysis>();

function analyze(geo: THREE.BufferGeometry, withEdges: boolean): Analysis {
  let a = analysisCache.get(geo);
  if (a && (!withEdges || a.edges)) return a;

  const src = geo.getAttribute("position");
  const index = geo.getIndex();
  const corners = index ? index.count : src.count;
  const position = new Float32Array(corners * 3);
  for (let i = 0; i < corners; i++) {
    const v = index ? index.getX(i) : i;
    position[i * 3] = src.getX(v);
    position[i * 3 + 1] = src.getY(v);
    position[i * 3 + 2] = src.getZ(v);
  }
  const faces = corners / 3;

  // Weld corners by quantized position so faces from separate strips still share edges.
  const ids = new Int32Array(corners);
  const lookup = new Map<string, number>();
  for (let i = 0; i < corners; i++) {
    const key = `${Math.round(position[i * 3] * 1e4)},${Math.round(position[i * 3 + 1] * 1e4)},${Math.round(position[i * 3 + 2] * 1e4)}`;
    let id = lookup.get(key);
    if (id === undefined) {
      id = lookup.size;
      lookup.set(key, id);
    }
    ids[i] = id;
  }
  const welded = lookup.size;

  // Face normals (unit) and areas.
  const fn = new Float32Array(faces * 3);
  const area = new Float32Array(faces);
  for (let f = 0; f < faces; f++) {
    const o = f * 9;
    const ux = position[o + 3] - position[o];
    const uy = position[o + 4] - position[o + 1];
    const uz = position[o + 5] - position[o + 2];
    const vx = position[o + 6] - position[o];
    const vy = position[o + 7] - position[o + 1];
    const vz = position[o + 8] - position[o + 2];
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz);
    area[f] = len;
    if (len > 1e-12) {
      fn[f * 3] = nx / len;
      fn[f * 3 + 1] = ny / len;
      fn[f * 3 + 2] = nz / len;
    }
  }

  // Creased normals: average the faces around a corner that lie within CREASE_DEG of it.
  const crease = Math.cos(THREE.MathUtils.degToRad(CREASE_DEG));
  const around: number[][] = Array.from({ length: welded }, () => []);
  for (let i = 0; i < corners; i++) if (area[(i / 3) | 0] > 1e-12) around[ids[i]].push((i / 3) | 0);
  const normal = new Float32Array(corners * 3);
  for (let i = 0; i < corners; i++) {
    const f = (i / 3) | 0;
    let x = 0;
    let y = 0;
    let z = 0;
    for (const g of around[ids[i]]) {
      const d = fn[f * 3] * fn[g * 3] + fn[f * 3 + 1] * fn[g * 3 + 1] + fn[f * 3 + 2] * fn[g * 3 + 2];
      if (d < crease) continue;
      x += fn[g * 3] * area[g];
      y += fn[g * 3 + 1] * area[g];
      z += fn[g * 3 + 2] * area[g];
    }
    const len = Math.hypot(x, y, z) || 1;
    normal[i * 3] = x / len;
    normal[i * 3 + 1] = y / len;
    normal[i * 3 + 2] = z / len;
  }

  a = { position, normal };
  if (withEdges) {
    const hard: number[] = [];
    const soft: number[] = [];
    const open = new Map<number, { f: number; c0: number; c1: number }>();
    const pushPos = (out: number[], c: number) => out.push(position[c * 3], position[c * 3 + 1], position[c * 3 + 2]);
    for (let f = 0; f < faces; f++) {
      if (area[f] <= 1e-12) continue;
      for (let e = 0; e < 3; e++) {
        const c0 = f * 3 + e;
        const c1 = f * 3 + ((e + 1) % 3);
        const i0 = ids[c0];
        const i1 = ids[c1];
        if (i0 === i1) continue;
        const key = Math.min(i0, i1) * welded + Math.max(i0, i1);
        const first = open.get(key);
        if (!first) {
          open.set(key, { f, c0, c1 });
          continue;
        }
        open.delete(key);
        const g = first.f;
        const d = fn[f * 3] * fn[g * 3] + fn[f * 3 + 1] * fn[g * 3 + 1] + fn[f * 3 + 2] * fn[g * 3 + 2];
        if (d < crease) {
          pushPos(hard, c0);
          pushPos(hard, c1);
        } else if (d < 0.9999) {
          // Curved surface: drawn only while it is a silhouette (one face toward the camera).
          pushPos(soft, c0);
          pushPos(soft, c1);
          soft.push(fn[g * 3], fn[g * 3 + 1], fn[g * 3 + 2], fn[f * 3], fn[f * 3 + 1], fn[f * 3 + 2]);
        }
      }
    }
    // Open boundaries (a plane's rim, the end of a tube) are always drawn.
    for (const { c0, c1 } of open.values()) {
      pushPos(hard, c0);
      pushPos(hard, c1);
    }
    a.edges = { hard: new Float32Array(hard), soft: new Float32Array(soft) };
  }
  analysisCache.set(geo, a);
  return a;
}

// ---------------------------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------------------------
export function createRoboPetModel(options: RoboPetModelOptions = {}): THREE.Group {
  const root = new THREE.Group();
  root.name = "roboPet";
  // Meshes are only carriers for geometry, tone and transform until the parts are flattened.
  const placeholder = new THREE.MeshBasicMaterial();

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
  const servoCaseGeo = new THREE.BoxGeometry(SERVO.hgt, SERVO.wid, SERVO.len);
  const servoTabGeo = new THREE.BoxGeometry(0.012, SERVO.wid * 0.92, SERVO.len + 0.08);
  const servoBossGeo = new THREE.CylinderGeometry(0.03, 0.032, 0.02, 18).rotateZ(Math.PI / 2);
  const splineGeo = new THREE.CylinderGeometry(0.011, 0.011, 0.012, 12).rotateZ(Math.PI / 2);

  type MeshOptions = { edges?: boolean };
  const mk = (geo: THREE.BufferGeometry, tone: FaceTone, parent: THREE.Object3D, name: string, opts: MeshOptions = {}) => {
    const m = new THREE.Mesh(geo, placeholder);
    m.name = name;
    m.userData.tone = tone;
    m.userData.edges = opts.edges ?? true;
    parent.add(m);
    return m;
  };
  const screw = (parent: THREE.Object3D, x: number, y: number, z: number, dir: 1 | -1 = 1) => {
    const s = mk(screwGeo, "ink", parent, "screw");
    s.position.set(x + dir * 0.005, y, z);
    return s;
  };

  /** One MG996R servo. Shaft axis = +X, case centered so the shaft sits at the origin. */
  const buildServo = (name: string) => {
    const g = new THREE.Group();
    g.name = name;
    const shaftOffsetZ = SERVO.len / 2 - 0.05; // shaft is about 10 mm from one end
    const body = new THREE.Group();
    body.position.set(-SERVO.hgt / 2 - 0.012, 0, shaftOffsetZ);
    g.add(body);
    mk(servoCaseGeo, "muted", body, `${name}-case`);
    const tab = mk(servoTabGeo, "muted", body, `${name}-tabs`);
    tab.position.x = SERVO.hgt * 0.22;
    for (const dz of [-1, 1]) for (const dy of [-1, 1]) screw(body, SERVO.hgt * 0.22 + 0.006, dy * 0.028, dz * (SERVO.len / 2 + 0.024));
    const boss = mk(servoBossGeo, "muted", g, `${name}-boss`);
    boss.position.x = -0.002;
    const spline = mk(splineGeo, "ink", g, `${name}-spline`);
    spline.position.x = 0.012;
    return g;
  };

  // ---------------- part registry ----------------
  const parts: THREE.Group[] = [];
  const part = (id: RoboPetPartId, explode: THREE.Vector3) => {
    const g = new THREE.Group();
    g.name = id;
    g.userData.partId = id;
    g.userData.explode = explode;
    root.add(g);
    parts.push(g);
    return g;
  };

  const yC = 1.0; // body center height before the final ground snap

  // ---------------- shell top / bottom ----------------
  const shellTop = part("shell-top", new THREE.Vector3(0, 1.45, 0));
  const shellBottom = part("shell-bottom", new THREE.Vector3(0, -0.05, 0));
  const extrudeOpts = { depth: BODY.len, bevelEnabled: false, curveSegments: 14 };
  const topGeo = new THREE.ExtrudeGeometry(halfShellShape(1), extrudeOpts).translate(0, 0, -BODY.len / 2);
  const botGeo = new THREE.ExtrudeGeometry(halfShellShape(-1), extrudeOpts).translate(0, 0, -BODY.len / 2);
  shellTop.position.set(0, yC, 0);
  shellBottom.position.set(0, yC, 0);
  mk(topGeo, "wash", shellTop, "shell-top-tube");
  mk(botGeo, "wash", shellBottom, "shell-bottom-tube");

  // Caps: rounded-rect slab with one 45 degree chamfer, a little proud of the tube so the seam
  // reads as a step. A single chamfer facet gives two deliberate lines instead of a smeared bevel.
  const capW = BODY.w + CAP.grow * 2 - CAP.bevel * 2;
  const capH = BODY.h + CAP.grow * 2 - CAP.bevel * 2;
  const capR = BODY.r + CAP.grow - CAP.bevel;
  const capOpts = {
    depth: CAP.depth,
    bevelEnabled: true,
    bevelThickness: CAP.bevel,
    bevelSize: CAP.bevel,
    bevelSegments: 1,
    curveSegments: 16,
  };
  const rearShape = roundedRectPath(new THREE.Shape(), capW, capH, capR);
  const rearGeo = new THREE.ExtrudeGeometry(rearShape, capOpts);
  rearGeo.computeBoundingBox();
  rearGeo.translate(0, 0, -(rearGeo.boundingBox as THREE.Box3).max.z);
  const rearCap = mk(rearGeo, "wash", shellBottom, "rear-cap");
  rearCap.position.z = -BODY.len / 2 + 0.03;
  // internal standoffs / board rails (printed into the chassis)
  const railGeo = new THREE.BoxGeometry(0.04, 0.05, 1.5);
  for (const sx of [-1, 1]) {
    const rail = mk(railGeo, "wash", shellBottom, "board-rail");
    rail.position.set(sx * 0.2, -BODY.h / 2 + BODY.wall + 0.025, 0);
  }

  // ---------------- face (cap + OLED) ----------------
  const face = part("face", new THREE.Vector3(0, 0, 0.62));
  face.position.set(0, yC, BODY.len / 2 - 0.03);
  const SCREEN = { w: 0.44, h: 0.33, y: -0.04 };
  const CAMSLOT = { w: 0.2, h: 0.085, y: 0.235 };
  const faceShape = roundedRectPath(new THREE.Shape(), capW, capH, capR);
  faceShape.holes.push(roundedRectPath(new THREE.Path(), SCREEN.w + CAP.bevel * 2, SCREEN.h + CAP.bevel * 2, 0.03, 0, SCREEN.y));
  faceShape.holes.push(roundedRectPath(new THREE.Path(), CAMSLOT.w + CAP.bevel * 2, CAMSLOT.h + CAP.bevel * 2, 0.045, 0, CAMSLOT.y));
  const faceGeo = new THREE.ExtrudeGeometry(faceShape, capOpts);
  faceGeo.computeBoundingBox();
  faceGeo.translate(0, 0, -(faceGeo.boundingBox as THREE.Box3).min.z);
  mk(faceGeo, "wash", face, "face-cap");
  const capFront = CAP.depth + CAP.bevel * 2;
  // OLED module: black glass panel, thin bezel and PCB edge, recessed into the cap
  const oledPcb = mk(new THREE.BoxGeometry(SCREEN.w + 0.08, SCREEN.h + 0.07, 0.012), "muted", face, "oled-pcb");
  oledPcb.position.set(0, SCREEN.y, capFront - 0.06);
  const oledBezel = mk(new THREE.BoxGeometry(SCREEN.w + 0.03, SCREEN.h + 0.03, 0.02), "ink", face, "oled-bezel");
  oledBezel.position.set(0, SCREEN.y, capFront - 0.045);
  const oledPanel = mk(new THREE.PlaneGeometry(SCREEN.w, SCREEN.h), "panel", face, "oled-panel");
  oledPanel.position.set(0, SCREEN.y, capFront - 0.034);
  // The eyes follow the concept animation on the page: two round white eyes, a little taller than
  // wide, each with a black pupil set toward the nose, a touch above the middle of the panel.
  const EYE = { rx: 0.054, ry: 0.065, x: 0.1, y: 0.012 };
  const PUPIL = { rx: 0.02, ry: 0.03, inset: 0.016 };
  const ellipse = (cx: number, cy: number, rx: number, ry: number) =>
    new THREE.Shape().absellipse(cx, cy, rx, ry, 0, Math.PI * 2, false, 0);
  const eyes = mk(
    new THREE.ShapeGeometry([ellipse(-EYE.x, EYE.y, EYE.rx, EYE.ry), ellipse(EYE.x, EYE.y, EYE.rx, EYE.ry)], 32),
    "light",
    face,
    "oled-eyes",
    { edges: false },
  );
  eyes.position.set(0, SCREEN.y, capFront - 0.0325);
  const pupils = mk(
    new THREE.ShapeGeometry(
      [
        ellipse(-EYE.x + PUPIL.inset, EYE.y, PUPIL.rx, PUPIL.ry),
        ellipse(EYE.x - PUPIL.inset, EYE.y, PUPIL.rx, PUPIL.ry),
      ],
      24,
    ),
    "panel",
    face,
    "oled-pupils",
    { edges: false },
  );
  pupils.position.set(0, SCREEN.y, capFront - 0.031);

  // ---------------- camera ----------------
  const camera = part("camera", new THREE.Vector3(0, 0, 1.0));
  camera.position.set(0, yC + CAMSLOT.y, BODY.len / 2 - 0.03 + capFront - 0.05);
  mk(new THREE.BoxGeometry(CAMSLOT.w - 0.012, CAMSLOT.h - 0.012, 0.01), "muted", camera, "cam-pcb");
  const camHousing = mk(new THREE.BoxGeometry(0.062, 0.062, 0.026), "ink", camera, "cam-housing");
  camHousing.position.set(0, 0, 0.016);
  const lensRing = mk(new THREE.TorusGeometry(0.021, 0.0045, 8, 24), "ink", camera, "lens-ring");
  lensRing.position.set(0, 0, 0.03);
  const lens = mk(new THREE.SphereGeometry(0.021, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2), "ink", camera, "lens");
  lens.position.set(0, 0, 0.026);
  lens.scale.set(1, 1, 0.45);
  const camChipGeo = new THREE.BoxGeometry(0.018, 0.012, 0.006);
  for (const [x, y] of [
    [0.055, 0.012],
    [0.055, -0.014],
    [-0.055, 0.0],
  ]) {
    const c = mk(camChipGeo, "ink", camera, "cam-smd");
    c.position.set(x, y, 0.008);
  }

  // ---------------- status LED ----------------
  // One WS2812, drawn as a flat lit dot in a dark bezel.
  const statusLed = part("status-led", new THREE.Vector3(0, 1.45, 0));
  {
    const a = Math.asin(0.07 / BODY.r);
    const px = BODY.w / 2 - BODY.r + BODY.r * Math.cos(a);
    const py = BODY.h / 2 - BODY.r + BODY.r * Math.sin(a);
    statusLed.position.set(px, yC + py, -BODY.len / 2 + 0.24);
    statusLed.rotation.z = -(Math.PI / 2 - a);
    const ring = mk(new THREE.CylinderGeometry(0.03, 0.032, 0.008, 20), "ink", statusLed, "led-bezel");
    ring.position.y = 0.002;
    const dot = mk(new THREE.CircleGeometry(0.019, 20).rotateX(-Math.PI / 2), "light", statusLed, "led-dot", { edges: false });
    dot.position.y = 0.0065;
  }

  // ---------------- electronics (layout approximate) ----------------
  const electronics = part("electronics", new THREE.Vector3(0, 0.95, 0));
  electronics.position.set(0, yC + 0.02, 0);
  {
    const PCB_T = 0.012;
    const board = (w: number, d: number, x: number, z: number, name: string) => {
      const b = mk(new THREE.BoxGeometry(w, PCB_T, d), "muted", electronics, name);
      b.position.set(x, 0, z);
      return b;
    };
    // mounting plate
    const plate = mk(new THREE.BoxGeometry(0.5, 0.01, 1.2), "wash", electronics, "board-plate");
    plate.position.set(0, -0.03, -0.02);
    // Pi Zero 2W: 65 x 30 mm
    board(0.155, 0.34, -0.08, 0.28, "zero2w-pcb");
    const soc = mk(new THREE.BoxGeometry(0.06, 0.008, 0.06), "ink", electronics, "zero2w-rp3a0");
    soc.position.set(-0.08, 0.01, 0.27);
    const sd = mk(new THREE.BoxGeometry(0.06, 0.008, 0.06), "ink", electronics, "zero2w-sd");
    sd.position.set(-0.08, 0.01, 0.42);
    // 2x20 header pins as one InstancedMesh
    const tmp = new THREE.Object3D();
    const pins = new THREE.InstancedMesh(new THREE.BoxGeometry(0.006, 0.04, 0.006), placeholder, 40);
    pins.name = "zero2w-header";
    pins.userData.tone = "ink";
    for (let i = 0; i < 40; i++) {
      tmp.position.set(-0.08 - 0.065 + (i % 2) * 0.013, 0.022, 0.13 + Math.floor(i / 2) * 0.0132);
      tmp.updateMatrix();
      pins.setMatrixAt(i, tmp.matrix);
    }
    electronics.add(pins);
    const headerBase = mk(new THREE.BoxGeometry(0.028, 0.012, 0.27), "ink", electronics, "zero2w-header-base");
    headerBase.position.set(-0.139, 0.01, 0.255);
    // Raspberry Pi Pico: 51 x 21 mm
    board(0.11, 0.265, 0.1, -0.32, "pico-pcb");
    const rp2040 = mk(new THREE.BoxGeometry(0.036, 0.007, 0.036), "ink", electronics, "pico-rp2040");
    rp2040.position.set(0.1, 0.009, -0.32);
    const usb = mk(new THREE.BoxGeometry(0.042, 0.016, 0.03), "ink", electronics, "pico-usb");
    usb.position.set(0.1, 0.012, -0.44);
    const cast = new THREE.InstancedMesh(new THREE.BoxGeometry(0.006, 0.014, 0.006), placeholder, 40);
    cast.name = "pico-castellations";
    cast.userData.tone = "ink";
    for (let i = 0; i < 40; i++) {
      tmp.position.set(0.1 + (i % 2 ? 0.05 : -0.05), 0.004, -0.42 + Math.floor(i / 2) * 0.0132);
      tmp.updateMatrix();
      cast.setMatrixAt(i, tmp.matrix);
    }
    electronics.add(cast);
    // MPU6050 (GY-521): 21 x 16 mm
    board(0.085, 0.11, 0.1, 0.02, "mpu6050-pcb");
    const imu = mk(new THREE.BoxGeometry(0.022, 0.006, 0.022), "ink", electronics, "mpu6050-chip");
    imu.position.set(0.1, 0.009, 0.02);
  }

  // ---------------- power (layout approximate) ----------------
  const power = part("power", new THREE.Vector3(0, 0.45, 0));
  power.position.set(0, yC - BODY.h / 2 + BODY.wall + 0.06, 0);
  {
    // 3 cells (18 x 65 mm) in a printed tray
    const cellGeo = new THREE.CylinderGeometry(0.047, 0.047, 0.34, 20, 1).rotateX(Math.PI / 2);
    const cellCapGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.006, 16).rotateX(Math.PI / 2);
    for (let i = 0; i < 3; i++) {
      const x = (i - 1) * 0.1;
      const c = mk(cellGeo, "muted", power, `cell-${i}`);
      c.position.set(x, 0.0, -0.45);
      const cap = mk(cellCapGeo, "ink", power, `cell-cap-${i}`);
      cap.position.set(x, 0.0, -0.45 + 0.172);
    }
    const tray = mk(new THREE.BoxGeometry(0.33, 0.03, 0.38), "wash", power, "cell-tray");
    tray.position.set(0, -0.045, -0.45);
    // 2 x XL4016 modules (approx 60 x 51 mm)
    for (const sx of [-1, 1]) {
      const g = new THREE.Group();
      g.name = sx > 0 ? "buck-servo-rail" : "buck-logic-rail";
      g.position.set(sx * 0.165, -0.03, 0.32);
      power.add(g);
      mk(new THREE.BoxGeometry(0.26, 0.012, 0.3), "muted", g, "xl4016-pcb");
      for (const hz of [-0.08, 0.08]) {
        const hs = mk(new THREE.BoxGeometry(0.07, 0.07, 0.06), "ink", g, "xl4016-heatsink");
        hs.position.set(-0.07, 0.04, hz);
      }
      const inductor = mk(new THREE.TorusGeometry(0.038, 0.018, 10, 20).rotateX(Math.PI / 2), "ink", g, "xl4016-inductor");
      inductor.position.set(0.05, 0.024, -0.05);
      for (const cz of [0.05, 0.11]) {
        const cap = mk(new THREE.CylinderGeometry(0.022, 0.022, 0.07, 14), "ink", g, "xl4016-cap");
        cap.position.set(0.06, 0.041, cz);
      }
      const pot = mk(new THREE.BoxGeometry(0.02, 0.02, 0.04), "ink", g, "xl4016-trimpot");
      pot.position.set(0, 0.016, 0.12);
    }
  }

  // ---------------- legs ----------------
  const legDefs: Array<{ id: RoboPetPartId; side: 1 | -1; z: number }> = [
    { id: "leg-fl", side: 1, z: HIP_Z_FRONT },
    { id: "leg-fr", side: -1, z: HIP_Z_FRONT },
    { id: "leg-rl", side: 1, z: HIP_Z_REAR },
    { id: "leg-rr", side: -1, z: HIP_Z_REAR },
  ];

  // shared leg geometry (built for a left leg, x = outward; right legs mirror by scale.x = -1)
  const cupGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.11, 32).rotateZ(Math.PI / 2).translate(0.025, 0, 0);
  const cupLipGeo = new THREE.TorusGeometry(0.172, 0.013, 8, 32).rotateY(Math.PI / 2);
  const bracketShape = roundedRectPath(new THREE.Shape(), 0.34, SERVO.wid + 0.09, 0.04, 0.035, 0.015);
  bracketShape.holes.push(roundedRectPath(new THREE.Path(), SERVO.len + 0.008, SERVO.wid + 0.008, 0.01, 0.035, 0.015));
  const bracketGeo = extrudeSide(bracketShape, 0.07, 0.1);

  const hornGeo = extrudeSide(slotPath(new THREE.Shape(), 0, -0.075, 0.022), 0, 0.01);
  const linkGeo = extrudeSide(slotPath(new THREE.Shape(), -0.035, -0.135, 0.015), 0.011, 0.007);
  const THIGH_TOP = -0.11;
  const THIGH_BOT = -0.44;
  const thighGeo = extrudeSide(slotPath(new THREE.Shape(), THIGH_TOP, THIGH_BOT, 0.068), 0.02, 0.04, 14);

  // shank: bracket with a servo window, bar down to the foot with a printed step notch
  const shankBracketShape = new THREE.Shape();
  roundedRectPath(shankBracketShape, 0.29, 0.22, 0.03, 0.06, -0.005);
  shankBracketShape.holes.push(roundedRectPath(new THREE.Path(), 0.21, 0.14, 0.012, 0.065, -0.002));
  const shankBracketGeo = extrudeSide(shankBracketShape, -0.035, 0.03);
  const shankInnerGeo = extrudeSide(roundedRectPath(new THREE.Shape(), 0.29, 0.22, 0.03, 0.06, -0.005), -0.245, 0.025);
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
  const shankBarGeo = extrudeSide(shankBar, -0.11, 0.07, 8).translate(0.075, 0, 0).scale(1.2, 1, 1.25).translate(-0.075, 0, 0);
  const shankBottomGeo = new THREE.BoxGeometry(0.2, 0.016, 0.2);
  const footGeo = new RoundedBoxGeometry(0.104, 0.1, 0.15, 3, 0.042);


  for (const def of legDefs) {
    // Straight out on the lateral axis only, so the teardown reads as engineered.
    const leg = part(def.id, new THREE.Vector3(def.side * 0.8, 0, 0));
    leg.position.set(def.side * (BODY.w / 2 - 0.01), yC + HIP_DROP, def.z);
    if (def.side < 0) leg.scale.x = -1; // reflection, not rotation (the renderer flips winding)

    const hipRoll = new THREE.Group();
    hipRoll.name = `${def.id}-hip-roll`;
    hipRoll.rotation.z = HIP_ROLL_REST;
    leg.add(hipRoll);

    // hip cup and servo bracket (printed PLA)
    mk(cupGeo, "wash", hipRoll, `${def.id}-hip-cup`);
    const lip = mk(cupLipGeo, "wash", hipRoll, `${def.id}-hip-cup-lip`);
    lip.position.x = 0.08;
    mk(bracketGeo, "wash", hipRoll, `${def.id}-servo-bracket`);
    for (const [sy, sz] of [
      [0.075, 0.17],
      [-0.075, 0.17],
      [-0.075, -0.11],
    ])
      screw(hipRoll, 0.17, sy, sz);

    // hip-roll servo, hidden inside the cup and body, shaft along Z (planned 12-servo layout)
    const servoHip = buildServo(`${def.id}-servo-hip`);
    servoHip.rotation.y = -Math.PI / 2;
    servoHip.position.set(-0.12, 0, 0.12);
    hipRoll.add(servoHip);

    // hip-pitch ("upper") servo in the bracket, shaft pointing outward
    const servoUpper = buildServo(`${def.id}-servo-upper`);
    const PITCH = new THREE.Vector3(0.235, 0.015, -0.02);
    servoUpper.position.copy(PITCH);
    hipRoll.add(servoUpper);

    const hipPitch = new THREE.Group();
    hipPitch.name = `${def.id}-hip-pitch`;
    hipPitch.position.copy(PITCH);
    hipPitch.rotation.x = THIGH_REST;
    hipRoll.add(hipPitch);

    // horn, steel link and thigh plate
    mk(hornGeo, "ink", hipPitch, `${def.id}-horn`);
    screw(hipPitch, 0.01, 0, 0);
    screw(hipPitch, 0.01, -0.06, 0);
    mk(linkGeo, "ink", hipPitch, `${def.id}-link`);
    screw(hipPitch, 0.018, -0.125, 0);
    mk(thighGeo, "wash", hipPitch, `${def.id}-thigh`);
    for (const ty of [THIGH_TOP, THIGH_BOT]) {
      const b = mk(bushingGeo, "ink", hipPitch, `${def.id}-bushing`);
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
    mk(shankBracketGeo, "wash", knee, `${def.id}-shank-bracket`);
    mk(shankInnerGeo, "wash", knee, `${def.id}-shank-inner`);
    const sb = mk(shankBottomGeo, "wash", knee, `${def.id}-shank-floor`);
    sb.position.set(-0.13, -0.098, 0.06);
    mk(shankBarGeo, "wash", knee, `${def.id}-shank`);
    for (const [sy, sz] of [
      [0.06, -0.06],
      [0.06, 0.18],
      [-0.09, 0.18],
    ])
      screw(knee, -0.005, sy, sz);
    const foot = mk(footGeo, "muted", knee, `${def.id}-foot`);
    foot.position.set(-0.075, -SHANK_LEN + 0.03, 0.016);

  }

  // ---------------- finalize ----------------
  // snap feet to y = 0 and center XZ on the body
  root.updateMatrixWorld(true);
  const box = new THREE.Box3();
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && !(o as THREE.InstancedMesh).isInstancedMesh) box.expandByObject(m, true);
  });
  const dy = -box.min.y;
  const dz = -(box.min.z + box.max.z) / 2;
  for (const p of parts) {
    p.position.y += dy;
    p.position.z += dz;
    p.userData.restPosition = p.position.clone();
  }
  const naturalLength = box.max.z - box.min.z;
  root.scale.setScalar((options.length ?? 2.45) / naturalLength);
  root.updateMatrixWorld(true);

  const sources = new Set<THREE.BufferGeometry>();
  const faceMeshes: THREE.Mesh[] = [];
  const unlit = {
    panel: new THREE.MeshBasicMaterial({ color: new THREE.Color(0, 0, 0), toneMapped: false }),
    light: new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1), toneMapped: false }),
  };
  for (const p of parts) flattenPart(p, unlit, sources, faceMeshes);
  sources.forEach((g) => g.dispose());
  placeholder.dispose();

  root.userData.parts = parts;
  root.userData.faceMeshes = faceMeshes;
  root.userData.unlit = unlit;
  return root;
}

/**
 * Replace a part's hierarchy with one mesh per tone (in part space) plus its edge lines.
 * Joint groups are static now that the robot never walks on the page, so baking is safe.
 */
function flattenPart(
  part: THREE.Group,
  unlit: { panel: THREE.MeshBasicMaterial; light: THREE.MeshBasicMaterial },
  sources: Set<THREE.BufferGeometry>,
  faceMeshes: THREE.Mesh[],
) {
  const toPart = part.matrixWorld.clone().invert();
  const meshes: THREE.Mesh[] = [];
  part.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh);
  });

  const buckets = new Map<FaceTone, { position: number[]; normal: number[] }>();
  const hard: number[] = [];
  const soft: number[] = [];
  const m4 = new THREE.Matrix4();
  const n3 = new THREE.Matrix3();
  const v = new THREE.Vector3();
  const n = new THREE.Vector3();

  for (const mesh of meshes) {
    const geo = mesh.geometry;
    sources.add(geo);
    if (!geo.boundingSphere) geo.computeBoundingSphere();
    const tone = mesh.userData.tone as FaceTone;
    const base = new THREE.Matrix4().multiplyMatrices(toPart, mesh.matrixWorld);
    const instanced = (mesh as THREE.InstancedMesh).isInstancedMesh ? (mesh as THREE.InstancedMesh) : null;
    const transforms: THREE.Matrix4[] = [];
    if (instanced) {
      for (let i = 0; i < instanced.count; i++) {
        instanced.getMatrixAt(i, m4);
        transforms.push(base.clone().multiply(m4));
      }
    } else transforms.push(base);

    const radius = (geo.boundingSphere as THREE.Sphere).radius * base.getMaxScaleOnAxis();
    const wantEdges = !instanced && mesh.userData.edges !== false && radius >= MIN_EDGE_RADIUS;
    const data = analyze(geo, wantEdges);

    let bucket = buckets.get(tone);
    if (!bucket) buckets.set(tone, (bucket = { position: [], normal: [] }));
    for (const t of transforms) {
      n3.getNormalMatrix(t);
      const flip = t.determinant() < 0;
      const { position, normal } = data;
      for (let i = 0; i < position.length; i += 9) {
        for (let c = 0; c < 3; c++) {
          // A mirrored transform reverses winding, so swap the last two corners back.
          const k = i + (flip && c > 0 ? (3 - c) * 3 : c * 3);
          v.set(position[k], position[k + 1], position[k + 2]).applyMatrix4(t);
          n.set(normal[k], normal[k + 1], normal[k + 2]).applyMatrix3(n3).normalize();
          bucket.position.push(v.x, v.y, v.z);
          bucket.normal.push(n.x, n.y, n.z);
        }
      }
      if (!wantEdges || !data.edges) continue;
      const { hard: h, soft: s } = data.edges;
      for (let i = 0; i < h.length; i += 3) {
        v.set(h[i], h[i + 1], h[i + 2]).applyMatrix4(t);
        hard.push(v.x, v.y, v.z);
      }
      for (let i = 0; i < s.length; i += 12) {
        v.set(s[i], s[i + 1], s[i + 2]).applyMatrix4(t);
        soft.push(v.x, v.y, v.z);
        v.set(s[i + 3], s[i + 4], s[i + 5]).applyMatrix4(t);
        soft.push(v.x, v.y, v.z);
        n.set(s[i + 6], s[i + 7], s[i + 8]).applyMatrix3(n3).normalize();
        soft.push(n.x, n.y, n.z);
        n.set(s[i + 9], s[i + 10], s[i + 11]).applyMatrix3(n3).normalize();
        soft.push(n.x, n.y, n.z);
      }
    }
  }

  part.clear();
  part.updateMatrixWorld(true);

  // Lit faces sit slightly behind their own edges so the lines are never half buried.
  const lambert = () =>
    new THREE.MeshLambertMaterial({ polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  const materials: PartMaterials = {
    wash: lambert(),
    muted: lambert(),
    ink: lambert(),
    // Double sided: the mirrored legs flip winding, which would cull every line quad.
    line: new LineMaterial({ linewidth: 1, worldUnits: false, side: THREE.DoubleSide }),
  };
  part.userData.materials = materials;

  const samples: number[] = [];
  for (const [tone, data] of buckets) {
    if (!data.position.length) continue;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(data.position, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(data.normal, 3));
    g.computeBoundingSphere();
    const mat = tone === "panel" || tone === "light" ? unlit[tone] : materials[tone];
    const mesh = new THREE.Mesh(g, mat);
    mesh.name = `${part.name}-${tone}`;
    part.add(mesh);
    faceMeshes.push(mesh);
    // A sparse vertex sample is enough for the stage to frame the camera.
    const step = Math.max(1, Math.floor(data.position.length / 3 / 600)) * 3;
    for (let i = 0; i < data.position.length; i += step) samples.push(data.position[i], data.position[i + 1], data.position[i + 2]);
  }
  part.userData.samples = new Float32Array(samples);

  if (hard.length) {
    const g = new LineSegmentsGeometry();
    g.setPositions(new Float32Array(hard));
    const lines = new LineSegments2(g, materials.line);
    lines.name = `${part.name}-edges`;
    lines.raycast = () => {};
    part.add(lines);
  }
  if (soft.length) {
    const edges = new Float32Array(soft);
    const count = edges.length / 12;
    const g = new LineSegmentsGeometry();
    g.setPositions(new Float32Array(count * 6));
    g.instanceCount = 0;
    const lines = new LineSegments2(g, materials.line);
    lines.name = `${part.name}-silhouette`;
    lines.frustumCulled = false; // the buffer is rewritten per view, so its bounds are meaningless
    lines.raycast = () => {};
    part.add(lines);
    const buffer = (g.getAttribute("instanceStart") as InterleavedBufferAttribute).data as InstancedInterleavedBuffer;
    part.userData.silhouette = { edges, geometry: g, buffer } satisfies Silhouette;
  }
}

// ---------------------------------------------------------------------------------------------
// Runtime helpers
// ---------------------------------------------------------------------------------------------
const partsOf = (model: THREE.Object3D) => (model.userData.parts ?? []) as THREE.Group[];

/** Move every part from its rest position along its explode offset. t is clamped to 0..1, linear. */
export function setRoboPetExplode(model: THREE.Object3D, t: number) {
  const k = THREE.MathUtils.clamp(t, 0, 1);
  for (const child of partsOf(model)) {
    const rest = child.userData.restPosition as THREE.Vector3;
    const ex = child.userData.explode as THREE.Vector3;
    child.position.copy(rest).addScaledVector(ex, k);
  }
}

/** Paint every part from the palette. Selected parts invert: ink faces, paper edges. */
export function paintRoboPet(model: THREE.Object3D, palette: RoboPetPalette, selected: ReadonlySet<RoboPetPartId>) {
  for (const p of partsOf(model)) {
    const mats = p.userData.materials as PartMaterials;
    const on = selected.has(p.userData.partId as RoboPetPartId);
    mats.wash.color.copy(on ? palette.ink : palette.wash);
    mats.muted.color.copy(on ? palette.ink : palette.muted);
    mats.ink.color.copy(palette.ink);
    mats.line.color.copy(on ? palette.paper : palette.ink);
  }
}

/** LineMaterial widths are in units of this resolution; pass the canvas size in CSS pixels. */
export function setRoboPetLineResolution(model: THREE.Object3D, width: number, height: number) {
  for (const p of partsOf(model)) (p.userData.materials as PartMaterials).line.resolution.set(width, height);
}

const _inv = new THREE.Matrix4();
const _cam = new THREE.Vector3();

/**
 * Rebuild the silhouette lines for the current camera position (world space). An edge between
 * two smooth faces is part of the outline when one face looks toward the camera and the other
 * looks away. World matrices must be current.
 */
export function updateRoboPetSilhouettes(model: THREE.Object3D, cameraPosition: THREE.Vector3) {
  for (const p of partsOf(model)) {
    const s = p.userData.silhouette as Silhouette | undefined;
    if (!s) continue;
    _cam.copy(cameraPosition).applyMatrix4(_inv.copy(p.matrixWorld).invert());
    const src = s.edges;
    const out = s.buffer.array as Float32Array;
    let count = 0;
    for (let i = 0; i < src.length; i += 12) {
      const x = _cam.x - src[i];
      const y = _cam.y - src[i + 1];
      const z = _cam.z - src[i + 2];
      const a = src[i + 6] * x + src[i + 7] * y + src[i + 8] * z;
      const b = src[i + 9] * x + src[i + 10] * y + src[i + 11] * z;
      if (a * b >= 0) continue;
      const o = count * 6;
      out[o] = src[i];
      out[o + 1] = src[i + 1];
      out[o + 2] = src[i + 2];
      out[o + 3] = src[i + 3];
      out[o + 4] = src[i + 4];
      out[o + 5] = src[i + 5];
      count++;
    }
    s.geometry.instanceCount = count;
    s.buffer.clearUpdateRanges();
    s.buffer.addUpdateRange(0, Math.max(1, count) * 6);
    s.buffer.needsUpdate = true;
  }
}

/** World-space sample points of every part under the current matrices, for camera framing. */
export function sampleRoboPetPoints(model: THREE.Object3D): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  for (const p of partsOf(model)) {
    const s = p.userData.samples as Float32Array;
    for (let i = 0; i < s.length; i += 3) out.push(new THREE.Vector3(s[i], s[i + 1], s[i + 2]).applyMatrix4(p.matrixWorld));
  }
  return out;
}

/** The face meshes, for picking. Edge lines are never hit. */
export function getRoboPetFaceMeshes(model: THREE.Object3D) {
  return (model.userData.faceMeshes ?? []) as THREE.Mesh[];
}

/** Walk up from a picked object to the part it belongs to. */
export function getRoboPetPartId(object: THREE.Object3D | null): RoboPetPartId | null {
  for (let o = object; o; o = o.parent) if (o.userData.partId) return o.userData.partId as RoboPetPartId;
  return null;
}

/** Dispose all geometries and materials owned by the model. */
export function disposeRoboPetModel(model: THREE.Object3D) {
  const geos = new Set<THREE.BufferGeometry>();
  const mats = new Set<THREE.Material>();
  model.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry) geos.add(m.geometry);
    const mm = m.material;
    if (Array.isArray(mm)) mm.forEach((x) => mats.add(x));
    else if (mm) mats.add(mm);
  });
  geos.forEach((g) => g.dispose());
  mats.forEach((mat) => mat.dispose());
}
