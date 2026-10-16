// Geometry and animation for the roboPet explainer (the planned design, modelled by hand; every
// dimension is approximate and the section's lede says so). No DOM except canvas textures: the
// eye color and the other theme colors come in through setTheme, never from the page.
//
// Everything is modelled in cm in "body space": origin at the body centre, +x robot-right,
// +y up, +z toward the face. Each part's geometry is baked in body space and its Object3D sits
// at the origin at rest, so a part's current transform is just (pitch * explode * joint chain).
// Draw calls: a part's geometry is merged per material (Builder.finish), and materials that
// differ only in color share one draw through vertex colors (MERGED below).
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { PARTS, FLOW_LABELS, type PartSpec } from "./parts";

export type Curve = THREE.Curve<THREE.Vector3>;
type Pt = THREE.Vector3 | readonly [number, number, number];
type Leg3 = "hip" | "thigh" | "knee";
type LegDef = { k: string; sx: number; zs: number };
export type FlowMode = "off" | "power" | "signal";
export type ThemeColors = {
  eye: string;
  line: string;
  muted: string;
  surface: string;
};
type MatBase = {
  emissive: THREE.Color | null;
  ei: number;
  color: THREE.Color;
  name: string;
};
export type PartMaterial = THREE.MeshStandardMaterial | THREE.MeshBasicMaterial;

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const D2R = Math.PI / 180;
const toV3 = (p: Pt) => (Array.isArray(p) ? V3(...(p as [number, number, number])) : (p as THREE.Vector3));

// ---------------------------------------------------------------------------------------------
// Procedural textures
// ---------------------------------------------------------------------------------------------
function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  if (!g) throw new Error("2d canvas unavailable");
  return { c, g };
}

// FDM layer lines: a soft ridge profile repeated along v (one period = LAYER cm).
const LAYER = 0.22;
function layerTexture() {
  const { c, g } = canvas(8, 32);
  for (let y = 0; y < 32; y++) {
    const s = 0.5 + 0.5 * Math.cos((y / 32) * Math.PI * 2);
    const v = Math.round(150 + 105 * s);
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.fillRect(0, y, 8, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

// A faint trace pattern so the boards read as circuit boards, not flat slabs.
function pcbTexture(seed = 3) {
  const { c, g } = canvas(256, 256);
  g.fillStyle = "#2a2d32";
  g.fillRect(0, 0, 256, 256);
  let s = seed * 9301 + 49297;
  const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  g.strokeStyle = "#3f444b";
  g.lineWidth = 2;
  for (let i = 0; i < 70; i++) {
    let x = Math.floor(rnd() * 32) * 8,
      y = Math.floor(rnd() * 32) * 8;
    g.beginPath();
    g.moveTo(x, y);
    for (let k = 0; k < 4; k++) {
      if (rnd() < 0.5) x += (rnd() < 0.5 ? -1 : 1) * Math.floor(rnd() * 8 + 2) * 8;
      else y += (rnd() < 0.5 ? -1 : 1) * Math.floor(rnd() * 8 + 2) * 8;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  g.fillStyle = "#6b7078";
  for (let i = 0; i < 60; i++) g.fillRect(Math.floor(rnd() * 64) * 4, Math.floor(rnd() * 64) * 4, 3, 3);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function radialTexture(stops: [number, number][]) {
  const { c, g } = canvas(256, 256);
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  for (const [o, a] of stops) gr.addColorStop(o, `rgba(255,255,255,${a})`);
  g.fillStyle = gr;
  g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

// ---------------------------------------------------------------------------------------------
// Materials (white / grey / graphite / black / bare metal only; the eye colour is the only hue)
// ---------------------------------------------------------------------------------------------
type Templates = Record<string, PartMaterial>;
function makeMaterialTemplates(): { templates: Templates; textures: THREE.Texture[] } {
  const layer = layerTexture();
  const pcb = pcbTexture();
  const std = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(o);
  const pla = (color: number, rough = 0.55) =>
    std({ color, roughness: rough, metalness: 0, bumpMap: layer, bumpScale: 0.8, roughnessMap: layer });
  const templates: Templates = {
    pla: pla(0xdededc, 0.5),
    plaLight: pla(0xa9acb0, 0.55),
    plaGrey: pla(0x6a6d72, 0.55),
    graphite: std({ color: 0x2b2d31, roughness: 0.5, metalness: 0.1 }),
    black: std({ color: 0x0c0c0d, roughness: 0.6, metalness: 0.05 }),
    rubber: std({ color: 0x141415, roughness: 0.92 }),
    metal: std({ color: 0xd2d5d9, roughness: 0.28, metalness: 1 }),
    metalDark: std({ color: 0x8e9298, roughness: 0.42, metalness: 1 }),
    pcb: std({ color: 0xffffff, map: pcb, roughness: 0.5, metalness: 0.1 }),
    chip: std({ color: 0x151517, roughness: 0.35, metalness: 0.15 }),
    silk: std({ color: 0xcfd1d4, roughness: 0.7 }),
    label: std({ color: 0x9da0a5, roughness: 0.85 }),
    horn: std({ color: 0xc4c7cb, roughness: 0.45, metalness: 0.1 }),
    glass: std({ color: 0x050506, roughness: 0.08, metalness: 0.2 }),
    cell: std({ color: 0x5a5e64, roughness: 0.45, metalness: 0.3 }),
    wrap: std({ color: 0x18191b, roughness: 0.38, metalness: 0.05 }),
    wireW: std({ color: 0xa4a7ac, roughness: 0.55 }),
    wireG: std({ color: 0x6c6f74, roughness: 0.5 }),
    wireK: std({ color: 0x1b1b1d, roughness: 0.55 }),
    ribbon: std({ color: 0xb7b9bd, roughness: 0.6, side: THREE.DoubleSide }),
    // Emissive ones are recoloured by setTheme.
    led: std({ color: 0xdddddd, roughness: 0.4, emissive: 0xffffff, emissiveIntensity: 1.4 }),
  };
  return { templates, textures: [layer, pcb] };
}
const LAYERED = new Set(["pla", "plaLight", "plaGrey"]);

// Materials that differ from another template only in color (same roughness, metalness and
// maps), so a part's meshes in either one can be a single draw with the color in a vertex
// attribute (only the targets in MERGED_INTO carry one). The three PLA tints share the layered bump map; the two wire tints share a roughness.
// The mesh then wears the target template with vertexColors on and its own color left white, so
// dimming a part (a multiply on material.color) still works. Nothing visible changes.
const MERGED: Record<string, { into: string; color: number }> = {
  plaLight: { into: "pla", color: 0xa9acb0 },
  plaGrey: { into: "pla", color: 0x6a6d72 },
  wireK: { into: "wireW", color: 0x1b1b1d },
};

const MERGED_INTO = new Set(Object.values(MERGED).map((v) => v.into));

// ---------------------------------------------------------------------------------------------
// Part builder: collects baked geometry per material, merges, builds meshes
// ---------------------------------------------------------------------------------------------
function MX(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s: number | THREE.Vector3 = 1) {
  return new THREE.Matrix4().compose(
    V3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
    typeof s === "number" ? V3(s, s, s) : s,
  );
}
// Matrix whose columns are the images of local x, y, z, with origin o.
function basis(o: THREE.Vector3, ex: THREE.Vector3, ey: THREE.Vector3, ez: THREE.Vector3) {
  return new THREE.Matrix4().makeBasis(ex, ey, ez).setPosition(o);
}

function flipWinding(g: THREE.BufferGeometry) {
  for (const name of ["position", "normal", "uv"]) {
    const a = g.getAttribute(name);
    if (!a) continue;
    const n = a.itemSize;
    const arr = a.array as Float32Array;
    for (let i = 0; i < a.count; i += 3) {
      for (let k = 0; k < n; k++) {
        const t = arr[(i + 1) * n + k];
        arr[(i + 1) * n + k] = arr[(i + 2) * n + k];
        arr[(i + 2) * n + k] = t;
      }
    }
    a.needsUpdate = true;
  }
}

type Inst = { geo: THREE.BufferGeometry; matName: string; matrices: THREE.Matrix4[] };
export type Built = {
  group: THREE.Group;
  meshes: (THREE.Mesh | THREE.InstancedMesh)[];
  materials: THREE.Material[];
};

class Builder {
  private stack = [new THREE.Matrix4()];
  private byMat = new Map<string, THREE.BufferGeometry[]>();
  private insts: Inst[] = [];
  private mats = new Map<string, PartMaterial>();
  constructor(
    readonly id: string,
    private templates: Templates,
  ) {}
  private get top() {
    return this.stack[this.stack.length - 1];
  }
  push(m: THREE.Matrix4) {
    this.stack.push(this.top.clone().multiply(m));
    return this;
  }
  pop() {
    this.stack.pop();
    return this;
  }
  material(name: string): PartMaterial {
    const target = MERGED[name]?.into ?? name;
    if (!this.mats.has(target)) {
      const m = this.templates[target].clone();
      if (MERGED_INTO.has(target)) m.color.set(0xffffff);
      const emissive = (m as THREE.MeshStandardMaterial).emissive;
      m.userData.base = {
        emissive: emissive ? emissive.clone() : null,
        ei: (m as THREE.MeshStandardMaterial).emissiveIntensity,
        color: m.color.clone(),
        name: target,
      } satisfies MatBase;
      if (MERGED_INTO.has(target)) m.vertexColors = true;
      this.mats.set(target, m);
    }
    return this.mats.get(target)!;
  }
  add(geo: THREE.BufferGeometry, matName: string, m?: THREE.Matrix4) {
    const M = m ? this.top.clone().multiply(m) : this.top;
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    geo.dispose();
    for (const k of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(k)) g.deleteAttribute(k);
    if (!g.getAttribute("uv")) g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(g.getAttribute("position").count * 2), 2));
    g.applyMatrix4(M);
    if (M.determinant() < 0) flipWinding(g);
    if (LAYERED.has(matName)) {
      const p = g.getAttribute("position"),
        uv = g.getAttribute("uv");
      for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + p.getZ(i)) * 0.35, p.getY(i) / LAYER);
    }
    // Every mesh in a vertex-colored material needs the attribute, tinted or not.
    const tint = MERGED[matName];
    const target = tint?.into ?? matName;
    if (MERGED_INTO.has(target)) {
      const c = new THREE.Color(tint ? tint.color : (this.templates[target].color as THREE.Color));
      const count = g.getAttribute("position").count;
      const colors = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) c.toArray(colors, i * 3);
      g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    }
    if (!this.byMat.has(target)) this.byMat.set(target, []);
    this.byMat.get(target)!.push(g);
    return this;
  }
  // primitives; (x,y,z) position, (rx,ry,rz) euler radians
  box(w: number, h: number, d: number, r: number, mat: string, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
    const g = r > 0 ? new RoundedBoxGeometry(w, h, d, r >= 0.2 ? 3 : 2, r) : new THREE.BoxGeometry(w, h, d);
    return this.add(g, mat, MX(x, y, z, rx, ry, rz));
  }
  cyl(rt: number, rb: number, h: number, mat: string, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, seg = 20) {
    return this.add(new THREE.CylinderGeometry(rt, rb, h, seg), mat, MX(x, y, z, rx, ry, rz));
  }
  sph(r: number, mat: string, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, seg = 16) {
    return this.add(new THREE.SphereGeometry(r, seg, Math.max(8, seg >> 1)), mat, MX(x, y, z, 0, 0, 0, V3(sx, sy, sz)));
  }
  torus(R: number, r: number, mat: string, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
    return this.add(new THREE.TorusGeometry(R, r, 10, 28), mat, MX(x, y, z, rx, ry, rz));
  }
  // profile: [[r, y], ...] revolved about local y
  lathe(profile: [number, number][], mat: string, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, seg = 28) {
    return this.add(new THREE.LatheGeometry(profile.map(([r, yy]) => new THREE.Vector2(r, yy)), seg), mat, MX(x, y, z, rx, ry, rz));
  }
  extrude(shape: THREE.Shape, opts: THREE.ExtrudeGeometryOptions, mat: string, m?: THREE.Matrix4) {
    return this.add(new THREE.ExtrudeGeometry(shape, opts), mat, m);
  }
  tube(curve: Curve, radius: number, mat: string, tseg?: number, rseg = 5) {
    const n = tseg || Math.max(10, Math.ceil(curve.getLength() * 3));
    return this.add(new THREE.TubeGeometry(curve, n, radius, rseg, false), mat);
  }
  // instanced geometry (pins, screws, standoffs): matrices relative to the current stack
  inst(geo: THREE.BufferGeometry, matName: string, matrices: THREE.Matrix4[]) {
    this.insts.push({ geo, matName, matrices: matrices.map((m) => this.top.clone().multiply(m)) });
    return this;
  }
  finish(): Built {
    const group = new THREE.Group();
    group.name = this.id;
    const meshes: Built["meshes"] = [];
    for (const [name, list] of this.byMat) {
      const geo = list.length > 1 ? mergeGeometries(list, false) : list[0];
      if (list.length > 1) list.forEach((g) => g.dispose());
      const mesh = new THREE.Mesh(geo, this.material(name));
      mesh.userData.partId = this.id;
      mesh.castShadow = false;
      group.add(mesh);
      meshes.push(mesh);
    }
    for (const it of this.insts) {
      const im = new THREE.InstancedMesh(it.geo, this.material(it.matName), it.matrices.length);
      it.matrices.forEach((m, i) => im.setMatrixAt(i, m));
      im.instanceMatrix.needsUpdate = true;
      im.userData.partId = this.id;
      im.computeBoundingBox();
      im.computeBoundingSphere();
      group.add(im);
      meshes.push(im);
    }
    return { group, meshes, materials: [...this.mats.values()] };
  }
}

// ---------------------------------------------------------------------------------------------
// Shape helpers
// ---------------------------------------------------------------------------------------------
// Rounded-rectangle outline as two arcs of points: upper half (right-mid -> top -> left-mid)
// and lower half (left-mid -> bottom -> right-mid), CCW, so a shell can be split on y = 0.
function rrHalves(w: number, h: number, r: number, n = 10) {
  const hw = w / 2,
    hh = h / 2;
  const arc = (cx: number, cy: number, a0: number, a1: number) => {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= n; i++) {
      const a = (a0 + (a1 - a0) * (i / n)) * D2R;
      pts.push(new THREE.Vector2(cx + r * Math.cos(a), cy + r * Math.sin(a)));
    }
    return pts;
  };
  const upper = [new THREE.Vector2(hw, 0), ...arc(hw - r, hh - r, 0, 90), ...arc(-(hw - r), hh - r, 90, 180), new THREE.Vector2(-hw, 0)];
  const lower = [new THREE.Vector2(-hw, 0), ...arc(-(hw - r), -(hh - r), 180, 270), ...arc(hw - r, -(hh - r), 270, 360), new THREE.Vector2(hw, 0)];
  return { upper, lower };
}
function rrShape(w: number, h: number, r: number, cx = 0, cy = 0) {
  const s = new THREE.Shape();
  const x = cx - w / 2,
    y = cy - h / 2;
  r = Math.min(r, w / 2, h / 2);
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r);
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h);
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r);
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}
function circlePath(cx: number, cy: number, r: number) {
  const p = new THREE.Path();
  p.absarc(cx, cy, r, 0, Math.PI * 2, true);
  return p;
}
// Stadium link in XY: from (0,0) to (0,len), width w, end holes. Extrude along +z.
function stadium(len: number, w: number, holeR: number) {
  const r = w / 2;
  const s = new THREE.Shape();
  s.moveTo(r, 0);
  s.lineTo(r, len);
  s.absarc(0, len, r, 0, Math.PI, false);
  s.lineTo(-r, 0);
  s.absarc(0, 0, r, Math.PI, Math.PI * 2, false);
  s.holes.push(circlePath(0, 0, holeR), circlePath(0, len, holeR));
  return s;
}
// Flat ribbon cable along a curve (width along x).
function ribbonGeometry(curve: Curve, width: number, thick: number, seg = 40) {
  const pos: number[] = [];
  const idx: number[] = [];
  const side = V3(1, 0, 0);
  for (let i = 0; i <= seg; i++) {
    const t = i / seg;
    const p = curve.getPoint(t);
    const tan = curve.getTangent(t);
    const n = new THREE.Vector3().crossVectors(tan, side).normalize();
    for (const [sx, sn] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const q = p.clone().addScaledVector(side, (sx * width) / 2).addScaledVector(n, (sn * thick) / 2);
      pos.push(q.x, q.y, q.z);
    }
  }
  for (let i = 0; i < seg; i++) {
    const a = i * 4,
      b = (i + 1) * 4;
    for (let k = 0; k < 4; k++) {
      const k2 = (k + 1) % 4;
      idx.push(a + k, b + k, b + k2, a + k, b + k2, a + k2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------------------------------------
// Layout constants (body space, cm)
// ---------------------------------------------------------------------------------------------
const W = 11, H = 9, R = 2.6, WALL = 0.55, Z_REAR = -12, Z_FRONT = 10.2;
const PLATE_TOP = -3.2;
const ZERO = { y: 0.55, z: 0.5, w: 3.0, d: 6.5 };
const PICO = { y: 0.55, z: 6.4, w: 2.1, d: 5.1 };
const BUCK = { y: -2.6, z: -0.4, w: 2.6, d: 4.4 };
const BUCK_X: Record<number, number> = { 1: -3.0, 2: 3.0 };
const padZ = (i: number) => 8.55 - 0.235 * i;
const PAD_X = 0.98;

// Leg key points, front-right frame (x outward, z forward)
const HP = V3(5.9, 0.2, 6.8);
const TP = V3(8.2, -2.6, 8.35);
const KP = V3(8.95, -7.49, 6.57);
const D_THIGH = V3(0, KP.y - TP.y, KP.z - TP.z).normalize();
const FOOT_D = V3(0, -0.906, 0.423).normalize();
const SHANK_LEN = 6.0;
const FOOT = KP.clone().addScaledVector(FOOT_D, SHANK_LEN).setX(9.9);
const FOOT_R = 0.82;
export const GROUND_Y = FOOT.y - FOOT_R; // robot stands on y = GROUND_Y in body space
const PIVOT_PITCH = V3(0, GROUND_Y, 0);

const LEG_DEFS: LegDef[] = [
  { k: "fl", sx: -1, zs: 1 },
  { k: "fr", sx: 1, zs: 1 },
  { k: "rl", sx: -1, zs: -1 },
  { k: "rr", sx: 1, zs: -1 },
];
const LEG_LEVEL: Record<string, number> = {
  "hip-bracket": 0, "hip-servo": 0, "hip-lead": 0,
  "hip-cup": 1, "thigh-servo": 1, "thigh-lead": 1,
  "thigh-link": 2, "knee-servo": 2, "knee-lead": 2,
  "shank-link": 3, foot: 3,
};

// Servo-lead / harness entry points inside the flank (front-right frame)
const ENTRY: Record<Leg3, THREE.Vector3> = { hip: V3(4.2, -2.5, 5.4), thigh: V3(4.1, -3.2, 7.0), knee: V3(4.0, -3.4, 8.4) };
const mapP = (p: THREE.Vector3, L: LegDef) => V3(p.x * L.sx, p.y, p.z * L.zs);

// ---------------------------------------------------------------------------------------------
// Curves: one registry, shared by wire meshes and by the flow pulses
// ---------------------------------------------------------------------------------------------
const CR = (pts: Pt[]): Curve => new THREE.CatmullRomCurve3(pts.map(toV3), false, "centripetal");
const LINE = (a: Pt, b: Pt): Curve => new THREE.LineCurve3(toV3(a), toV3(b));

function strandsOf(pts: Pt[], offs: number[]) {
  const P = pts.map(toV3);
  return offs.map((off) =>
    CR(
      P.map((p, i) => {
        const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)];
        const t = b.clone().sub(a).normalize();
        let n = new THREE.Vector3().crossVectors(t, V3(0, 1, 0));
        if (n.lengthSq() < 0.05) n = new THREE.Vector3().crossVectors(t, V3(1, 0, 0));
        return p.clone().addScaledVector(n.normalize(), off);
      }),
    ),
  );
}

function makeCurves() {
  const C: Record<string, Curve> = {};
  // power chain
  C.pack_plus = CR([[-1.9, -2.3, -3.78], [-1.9, -2.0, -3.4], [-1.5, -2.2, -3.3], [-1.28, -2.6, -3.3]]);
  C.pack_minus = CR([[1.9, -2.3, -3.78], [1.9, -2.8, -3.9], [1.9, -3.05, -3.9]]);
  C.fuse_body = LINE([-1.28, -2.6, -3.3], [1.28, -2.6, -3.3]);
  C.fuse_r = CR([[1.28, -2.6, -3.3], [2.0, -2.7, -3.3], [2.9, -2.65, -3.25]]);
  C.switch_body = LINE([2.9, -2.65, -3.25], [4.1, -2.6, -3.25]);
  C.sw_b2 = CR([[4.1, -2.6, -3.25], [3.9, -2.6, -2.9], [3.55, -2.35, -2.55]]);
  C.sw_b1 = CR([[4.1, -2.6, -3.25], [4.1, -2.1, -3.3], [3.0, -1.1, -3.5], [0, -0.9, -3.5], [-3.0, -1.3, -3.4], [-3.55, -2.0, -2.9], [-3.55, -2.35, -2.55]]);
  C.buck1_in_out = LINE([-3.55, -2.35, -2.5], [-3.55, -2.35, 1.7]);
  C.buck2_in_out = LINE([3.55, -2.35, -2.5], [2.45, -2.35, 1.7]);
  // ground
  C.gnd_main1 = CR([[1.9, -3.05, -3.9], [0.5, -3.1, -3.95], [-1.2, -3.1, -3.95], [-2.45, -3.0, -3.85], [-2.45, -2.6, -2.9], [-2.45, -2.35, -2.5]]);
  C.gnd_main2 = CR([[1.9, -3.05, -3.9], [2.2, -3.05, -3.5], [2.45, -2.8, -3.0], [2.45, -2.35, -2.5]]);
  C.gnd_out = CR([[3.55, -2.35, 1.7], [3.1, -3.05, 2.0], [1.0, -3.1, 2.0], [-1.0, -3.1, 2.0], [-2.45, -3.0, 2.0], [-2.45, -2.35, 1.7]]);
  C.gnd_pico = CR([[-1.7, -3.1, 2.0], [-1.85, -2.0, 3.0], [-1.85, -0.2, 4.2], [-1.5, 0.5, 4.5], [-PAD_X, 0.6, padZ(17)]]);
  C.gnd_zero = CR([[1.7, -3.1, 2.0], [1.95, -1.6, 2.4], [1.75, 0.2, 2.5], [1.45, 0.9, 2.45], [1.254, 0.95, 2.39]]);
  // logic rail
  C.logic_pico = CR([[2.45, -2.35, 1.7], [2.4, -1.9, 2.9], [1.85, -0.6, 4.1], [1.3, 0.35, 4.3], [PAD_X, 0.6, padZ(18)]]);
  C.logic_zero = CR([[2.45, -2.35, 1.7], [2.55, -1.3, 2.3], [2.1, 0.2, 2.9], [1.6, 1.3, 3.1], [1.254, 1.0, 2.9]]);
  // servo rail trunks and branches (right side; left is mirrored in x)
  C.rail_trunk_r = CR([[-3.55, -2.35, 1.7], [-3.7, -2.5, 2.4], [-3.6, -2.85, 2.6], [0, -3.05, 2.6], [3.6, -3.0, 2.6], [4.3, -2.6, 2.6]]);
  C.rail_trunk_l = CR([[-3.55, -2.35, 1.7], [-3.7, -2.5, 2.2], [-4.3, -2.6, 2.6]]);
  C.cap_a = CR([[-4.3, -2.6, 2.6], [-3.6, -2.4, 3.2], [-3.0, -2.0, 3.4]]);
  C.cap_b = CR([[-3.0, -2.0, 3.4], [-3.0, -1.9, 4.1], [-3.0, -2.0, 4.8]]);
  const J_R = V3(4.3, -2.6, 2.6), J_L = V3(-4.3, -2.6, 2.6);
  const via = (L: LegDef, e: Leg3) => {
    const E = mapP(ENTRY[e], L);
    const J = L.sx > 0 ? J_R : J_L;
    const mid: THREE.Vector3[] = [];
    if (L.zs > 0) mid.push(V3(J.x * 1.05, -2.8, J.z + (E.z - J.z) * 0.5));
    else mid.push(V3(J.x * 1.08, -2.9, 0), V3(J.x * 1.08, -3.0, -3.5 + E.z * 0.2));
    return CR([J, ...mid, E]);
  };
  for (const L of LEG_DEFS) for (const e of ["hip", "thigh", "knee"] as Leg3[]) C[`rail.${L.k}.${e}`] = via(L, e);
  // pwm lines: Pico pads -> entry (left legs use the left pad column, right legs the right)
  const padCount: Record<number, number> = { "-1": 0, 1: 0 };
  for (const L of LEG_DEFS) {
    for (const e of ["hip", "thigh", "knee"] as Leg3[]) {
      const side = L.sx;
      const zp = padZ(10 + padCount[side]++);
      const E = mapP(ENTRY[e], L);
      C[`pwm.${L.k}.${e}`] = CR([
        V3(side * PAD_X, 0.6, zp), V3(side * 1.55, 0.8, zp), V3(side * 2.7, 0.55, zp * 0.6 + E.z * 0.4),
        V3(side * 3.6, -0.6, E.z * 0.8), V3(E.x + side * 0.15, E.y + 0.5, E.z), E,
      ]);
    }
  }
  // uart (crossed): A = Zero GPIO14 -> Pico GP1, B = Pico GP0 -> Zero GPIO15 (drawn Zero -> Pico)
  C.uartA = CR([[1.254, 1.0, 2.138], [1.5, 1.35, 2.8], [1.3, 1.6, 4.8], [1.0, 1.75, 6.8], [0.2, 1.8, 7.9], [-0.6, 1.4, 8.35], [-PAD_X, 0.7, padZ(1)]]);
  C.uartB = CR([[1.254, 1.0, 1.884], [0.9, 1.25, 2.6], [-0.1, 1.3, 4.0], [-0.8, 1.25, 5.6], [-1.2, 1.1, 7.2], [-1.15, 0.95, 8.2], [-PAD_X, 0.68, padZ(0)]]);
  // i2c
  const oled: Curve[] = [];
  for (let i = 0; i < 4; i++) {
    const zp = padZ(4 + i);
    const hx = -0.57 + i * 0.38;
    oled.push(CR([[-PAD_X, 0.6, zp], [-1.3, 0.5, zp + 0.5 + i * 0.05], [-1.25 + i * 0.15, -1.0, 8.9], [-0.9 + i * 0.35, -2.4, 9.3], [hx, -3.0, 9.55], [hx, -3.02, 9.78]]));
  }
  const oledWires = oled;
  const imu: Curve[] = [];
  for (let i = 0; i < 4; i++) {
    const zp = -1.37 + i * 0.254;
    const dx = i * 0.08;
    imu.push(CR([[-0.55, -2.62, zp], [-0.55, -2.4, zp + 0.5], [-0.35 + dx, -2.45 + i * 0.05, 1.7], [1.85 + dx, -2.5, 2.2], [1.85 + dx, -2.3, 4.4], [1.5 + dx, -0.9, 6.2], [1.25, 0.3, 7.1 + i * 0.1], [PAD_X, 0.58, padZ(4 + i)]]));
  }
  const imuWires = imu;
  C.ribbon = CR([[0, 2.2, 9.2], [0, 2.2, 8.4], [0, 1.9, 7.0], [0, 1.5, 5.0], [0, 1.1, 3.9], [0, 0.82, 3.45]]);
  // servo leads, three strands each (power, signal, ground), per leg
  const leadPts: Record<Leg3, number[][]> = {
    hip: [[7.2, -2.85, 3.5], [6.6, -3.6, 3.5], [5.6, -3.6, 3.9], [4.9, -3.0, 4.8], [ENTRY.hip.x, ENTRY.hip.y, ENTRY.hip.z]],
    thigh: [[6.3, -5.65, 8.35], [5.7, -5.4, 8.1], [5.0, -4.4, 7.6], [4.5, -3.6, 7.2], [ENTRY.thigh.x, ENTRY.thigh.y, ENTRY.thigh.z]],
    knee: [[7.05, -10.54, 6.57], [6.2, -9.6, 5.8], [5.5, -7.4, 5.3], [5.0, -5.4, 5.7], [4.5, -4.2, 7.0], [ENTRY.knee.x, ENTRY.knee.y, ENTRY.knee.z]],
  };
  for (const L of LEG_DEFS) {
    for (const e of ["hip", "thigh", "knee"] as Leg3[]) {
      const mapped = leadPts[e].map(([x, y, z]) => V3(x * L.sx, y, z * L.zs));
      strandsOf(mapped, [0.12, 0, -0.12]).forEach((c, i) => (C[`lead.${L.k}.${e}.${i}`] = c));
    }
  }
  return { C, oledWires, imuWires };
}

// ---------------------------------------------------------------------------------------------
// Part definitions: id -> (P: Builder, ctx) => void
// ---------------------------------------------------------------------------------------------
function servoCase(P: Builder, o: { horn?: boolean; arm?: number; armAng?: number } = {}) {
  P.box(4.07, 3.7, 2.0, 0.12, "black", -0.965, -2.15, 0);
  P.box(4.12, 0.5, 2.06, 0.1, "black", -0.965, -0.25, 0);
  P.box(4.12, 0.5, 2.06, 0.1, "black", -0.965, -4.05, 0);
  P.box(5.4, 0.25, 2.0, 0.06, "black", -0.95, -1.4, 0);
  for (const x of [-3.4, 1.5]) for (const z of [-0.55, 0.55]) P.cyl(0.14, 0.14, 0.34, "metal", x, -1.4, z, 0, 0, 0, 10);
  P.cyl(0.95, 0.95, 0.45, "black", 0, 0.225, 0, 0, 0, 0, 28);
  P.cyl(0.6, 0.6, 0.3, "black", -1.7, 0.15, 0, 0, 0, 0, 20);
  P.cyl(0.3, 0.3, 0.6, "metal", 0, 0.75, 0, 0, 0, 0, 12);
  // label: a pale plate inside a darker recess on the +z face
  P.box(2.6, 2.5, 0.05, 0.03, "graphite", -1.3, -2.2, 1.0);
  P.box(2.35, 2.25, 0.04, 0.02, "label", -1.3, -2.2, 1.025);
  P.box(1.7, 0.12, 0.045, 0.01, "graphite", -1.3, -1.7, 1.05);
  P.box(1.2, 0.1, 0.045, 0.01, "graphite", -1.3, -2.1, 1.05);
  P.box(1.5, 0.1, 0.045, 0.01, "graphite", -1.3, -2.5, 1.05);
  P.cyl(0.22, 0.22, 0.3, "black", -3.05, -3.3, 0, 0, 0, Math.PI / 2, 12);
  if (o.horn) {
    P.cyl(1.0, 1.0, 0.2, "horn", 0, 0.62, 0, 0, 0, 0, 28);
    P.cyl(0.25, 0.25, 0.14, "metal", 0, 0.8, 0, 0, 0, 0, 12);
    if (o.arm) {
      const a = o.armAng || 0;
      P.box(o.arm, 0.2, 0.8, 0.1, "horn", Math.cos(a) * o.arm * 0.5, 0.62, -Math.sin(a) * o.arm * 0.5, 0, a, 0);
    }
  }
}

function linkMatrix(origin: THREE.Vector3, d: THREE.Vector3) {
  const ex = V3(1, 0, 0);
  const n1 = new THREE.Vector3().crossVectors(d, ex).normalize();
  return basis(origin, n1, d, ex);
}

function buildDefs() {
  const defs: Record<string, (P: Builder) => void> = {};
  const { C, oledWires, imuWires } = makeCurves();

  // ---- Shell ------------------------------------------------------------------------------
  const outer = rrHalves(W - 0.3, H - 0.3, R - 0.15, 12);
  const inner = rrHalves(W - 2 * WALL + 0.3, H - 2 * WALL + 0.3, R - WALL + 0.15, 12);
  const halfShape = (o: THREE.Vector2[], i: THREE.Vector2[], cutY: number) => {
    const fix = (pts: THREE.Vector2[]) => pts.map((p, idx) => (idx === 0 || idx === pts.length - 1 ? new THREE.Vector2(p.x, cutY) : p));
    const s = new THREE.Shape();
    const O = fix(o), I = fix(i).reverse();
    s.moveTo(O[0].x, O[0].y);
    for (let k = 1; k < O.length; k++) s.lineTo(O[k].x, O[k].y);
    for (const p of I) s.lineTo(p.x, p.y);
    s.closePath();
    return s;
  };
  const capShape = (o: THREE.Vector2[], cutY: number) => {
    const s = new THREE.Shape();
    o.forEach((p: THREE.Vector2, k: number) => {
      const y = k === 0 || k === o.length - 1 ? cutY : p.y;
      if (k === 0) s.moveTo(p.x, y); else s.lineTo(p.x, y);
    });
    s.closePath();
    return s;
  };
  const bev = { bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.15, bevelSegments: 3, curveSegments: 12 };
  defs["shell-top"] = (P: Builder) => {
    P.extrude(halfShape(outer.upper, inner.upper, 0.2), { ...bev, depth: Z_FRONT - Z_REAR - 0.3 }, "pla", MX(0, 0, Z_REAR + 0.15));
    P.extrude(capShape(outer.upper, 0.2), { ...bev, depth: 0.3 }, "pla", MX(0, 0, Z_REAR + 0.15));
  };
  defs["shell-bottom"] = (P: Builder) => {
    P.extrude(halfShape(outer.lower, inner.lower, -0.2), { ...bev, depth: Z_FRONT - Z_REAR - 0.3 }, "pla", MX(0, 0, Z_REAR + 0.15));
    P.extrude(capShape(outer.lower, -0.2), { ...bev, depth: 0.3 }, "pla", MX(0, 0, Z_REAR + 0.15));
  };
  defs["face-bezel"] = (P: Builder) => {
    const s = rrShape(W, H, R);
    s.holes.push(rrShape(6.4, 3.8, 0.5, 0, -0.7));
    s.holes.push(rrShape(3.2, 1.7, 0.45, 0, 2.8));
    P.extrude(s, { bevelEnabled: true, bevelThickness: 0.2, bevelSize: 0.2, bevelSegments: 3, curveSegments: 12, depth: 0.8 }, "pla", MX(0, 0, Z_FRONT + 0.2));
  };
  defs["status-led"] = (P: Builder) => {
    P.box(1.3, 0.2, 1.3, 0.08, "graphite", 2.0, 4.52, -7.5);
    P.add(new THREE.SphereGeometry(0.5, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), "led", MX(2.0, 4.62, -7.5, 0, 0, 0, V3(1, 0.7, 1)));
  };

  // ---- Face -------------------------------------------------------------------------------
  defs["oled"] = (P: Builder) => {
    P.box(6.6, 4.4, 0.14, 0.1, "pcb", 0, -0.7, 9.97);
    P.box(5.8, 3.2, 0.3, 0.1, "glass", 0, -0.7, 10.2);
    P.add(new THREE.PlaneGeometry(5.5, 2.75), "screen", MX(0, -0.7, 10.356));
    P.box(0.9, 0.5, 0.12, 0.02, "chip", 2.2, -2.2, 9.86);
    P.box(0.5, 0.3, 0.08, 0.02, "silk", -2.3, -2.3, 9.88);
  };
  defs["oled-header"] = (P: Builder) => {
    P.box(1.7, 0.25, 0.3, 0.03, "black", 0, -2.72, 9.76);
    P.inst(new THREE.BoxGeometry(0.07, 0.45, 0.07), "metal", [0, 1, 2, 3].map((i) => MX(-0.57 + i * 0.38, -2.9, 9.78)));
  };
  defs["oled-wires"] = (P: Builder) => oledWires.forEach((c: Curve, i: number) => P.tube(c, 0.055, ["wireW", "wireK", "wireG", "wireW"][i], 36, 5));
  defs["picam"] = (P: Builder) => {
    P.box(2.4, 2.0, 0.12, 0.08, "pcb", 0, 2.8, 9.5);
    P.cyl(0.62, 0.62, 0.5, "black", 0, 2.8, 9.81, Math.PI / 2, 0, 0, 24);
    P.cyl(0.5, 0.5, 1.1, "graphite", 0, 2.8, 10.45, Math.PI / 2, 0, 0, 24);
    P.cyl(0.53, 0.53, 0.09, "metal", 0, 2.8, 10.98, Math.PI / 2, 0, 0, 24);
    P.cyl(0.36, 0.36, 0.06, "glass", 0, 2.8, 11.02, Math.PI / 2, 0, 0, 24);
    P.box(1.2, 0.35, 0.3, 0.03, "silk", 0, 2.1, 9.3);
    P.box(0.4, 0.4, 0.08, 0.02, "chip", -0.75, 3.35, 9.58);
    P.box(0.3, 0.3, 0.08, 0.02, "chip", 0.8, 3.35, 9.58);
  };
  defs["picam-ribbon"] = (P: Builder) => {
    P.add(ribbonGeometry(C.ribbon, 1.1, 0.04, 48), "ribbon");
  };

  // ---- Zero 2W ----------------------------------------------------------------------------
  defs["zero-2w"] = (P: Builder) => {
    P.box(ZERO.w, 0.12, ZERO.d, 0.18, "pcb", 0, ZERO.y, ZERO.z);
    // ports on the long edge
    P.box(1.1, 0.3, 0.35, 0.03, "metal", -1.35, 0.76, -1.2); // mini HDMI
    P.box(0.75, 0.28, 0.55, 0.03, "metal", -1.32, 0.75, 0.2);
    P.box(0.75, 0.28, 0.55, 0.03, "metal", -1.32, 0.75, 1.3);
    P.box(1.2, 0.2, 0.4, 0.03, "silk", 0, 0.7, 3.5); // camera FFC
    P.box(0.5, 0.12, 0.5, 0.02, "chip", 0.9, 0.67, 1.4);
    P.box(0.6, 0.12, 0.45, 0.02, "chip", -0.7, 0.67, 2.7);
    P.box(0.4, 0.1, 0.3, 0.02, "chip", 0.5, 0.66, -0.1);
    for (let i = 0; i < 6; i++) P.box(0.2, 0.08, 0.12, 0.01, "silk", -0.3 + (i % 3) * 0.35, 0.65, 2.8 + (i > 2 ? 0.25 : 0));
  };
  defs["zero-soc"] = (P: Builder) => {
    P.box(1.6, 0.24, 1.6, 0.05, "metal", 0.2, 0.74, 1.3);
    P.box(1.0, 0.2, 1.0, 0.04, "metalDark", 0.35, 0.72, -0.7);
    P.box(0.5, 0.05, 0.5, 0.01, "chip", 0.2, 0.88, 1.3);
  };
  defs["zero-sd"] = (P: Builder) => {
    P.box(1.25, 0.3, 1.4, 0.04, "metal", -0.3, 0.76, -2.15);
    P.box(1.1, 0.07, 0.75, 0.01, "chip", -0.3, 0.74, -3.0);
  };
  defs["zero-gpio"] = (P: Builder) => {
    P.box(0.62, 0.26, 5.2, 0.03, "black", 1.127, 0.74, 0.487);
    const m = [];
    for (let i = 0; i < 20; i++) for (const x of [1.0, 1.254]) m.push(MX(x, 1.0, 2.9 - i * 0.254));
    P.inst(new THREE.BoxGeometry(0.07, 0.5, 0.07), "metal", m);
  };

  // ---- Pico -------------------------------------------------------------------------------
  defs["pico"] = (P: Builder) => {
    P.box(PICO.w, 0.12, PICO.d, 0.14, "pcb", 0, PICO.y, PICO.z);
    P.box(0.5, 0.1, 0.8, 0.02, "chip", 0.45, 0.66, 7.3); // flash
    P.box(0.28, 0.14, 0.28, 0.03, "silk", -0.6, 0.67, 7.9); // BOOTSEL
    P.box(0.3, 0.1, 0.3, 0.02, "chip", 0.6, 0.66, 5.2);
    P.box(0.5, 0.1, 0.3, 0.02, "metalDark", -0.5, 0.66, 5.2);
    P.box(0.5, 0.06, 0.2, 0.01, "silk", 0, 0.64, 4.2);
  };
  defs["pico-rp2040"] = (P: Builder) => P.box(0.7, 0.1, 0.7, 0.02, "chip", 0, 0.66, 6.1);
  defs["pico-pins"] = (P: Builder) => {
    const m = [];
    for (let i = 0; i < 20; i++) for (const s of [-1, 1]) m.push(MX(s * (PICO.w / 2 - 0.02), 0.56, padZ(i)));
    P.inst(new THREE.BoxGeometry(0.16, 0.15, 0.17), "metal", m);
  };
  defs["pico-usb"] = (P: Builder) => {
    P.box(0.9, 0.3, 0.9, 0.03, "metal", 0, 0.73, 8.62);
    P.box(0.55, 0.1, 0.5, 0.02, "chip", 0, 0.73, 8.9);
  };
  defs["uart-zero-tx"] = (P: Builder) => P.tube(C.uartA, 0.065, "wireW", 56, 6);
  defs["uart-pico-tx"] = (P: Builder) => P.tube(C.uartB, 0.065, "wireG", 56, 6);

  // ---- IMU --------------------------------------------------------------------------------
  defs["imu"] = (P: Builder) => {
    P.box(1.6, 0.13, 2.1, 0.1, "pcb", 0, -3.13, -0.5);
    P.box(0.45, 0.1, 0.45, 0.02, "chip", 0.1, -3.02, -0.4);
    P.box(0.3, 0.1, 0.2, 0.02, "chip", 0.4, -3.02, -1.1);
    P.box(0.25, 0.08, 0.15, 0.02, "silk", -0.1, -3.03, 0.3);
  };
  defs["imu-header"] = (P: Builder) => {
    P.box(0.26, 0.24, 2.1, 0.03, "black", -0.55, -2.95, -0.5);
    P.inst(new THREE.BoxGeometry(0.07, 0.42, 0.07), "metal", Array.from({ length: 8 }, (_, i) => MX(-0.55, -2.7, -1.37 + i * 0.254)));
  };
  defs["imu-wires"] = (P: Builder) => imuWires.forEach((c: Curve, i: number) => P.tube(c, 0.055, ["wireW", "wireK", "wireG", "wireW"][i], 56, 5));

  // ---- Power ------------------------------------------------------------------------------
  [-1.9, 0, 1.9].forEach((x, i) => {
    defs[`cell-${i + 1}`] = (P: Builder) => {
      P.cyl(0.9, 0.9, 6.6, "cell", x, -2.3, -7.2, Math.PI / 2, 0, 0, 28);
      P.cyl(0.74, 0.74, 0.06, "metal", x, -2.3, -3.88, Math.PI / 2, 0, 0, 24);
      P.cyl(0.3, 0.3, 0.14, "metal", x, -2.3, -3.82, Math.PI / 2, 0, 0, 16);
      P.cyl(0.88, 0.88, 0.06, "metalDark", x, -2.3, -10.5, Math.PI / 2, 0, 0, 24);
      P.cyl(0.92, 0.92, 0.5, "black", x, -2.3, -4.4, Math.PI / 2, 0, 0, 28);
    };
  });
  defs["pack-wrap"] = (P: Builder) => {
    P.box(5.95, 2.05, 3.2, 0.45, "wrap", 0, -2.3, -7.2);
    P.box(5.0, 0.04, 1.4, 0.01, "silk", 0, -1.26, -7.2);
  };
  defs["pack-leads"] = (P: Builder) => {
    P.box(2.1, 0.06, 0.5, 0.01, "metal", 0.95, -2.3, -3.78);
    P.box(2.1, 0.06, 0.5, 0.01, "metal", -0.95, -2.3, -10.62);
    P.tube(C.pack_plus, 0.1, "wireW", 30, 6);
    P.tube(C.pack_minus, 0.1, "wireK", 16, 6);
  };
  defs["fuse"] = (P: Builder) => {
    const rz = Math.PI / 2;
    P.cyl(0.46, 0.46, 0.55, "graphite", -0.82, -2.6, -3.3, 0, 0, rz, 20);
    P.cyl(0.46, 0.46, 0.55, "graphite", 0.82, -2.6, -3.3, 0, 0, rz, 20);
    P.cyl(0.3, 0.3, 1.1, "glass", 0, -2.6, -3.3, 0, 0, rz, 18);
    P.cyl(0.04, 0.04, 1.2, "metal", 0, -2.6, -3.3, 0, 0, rz, 6);
    for (const s of [-1, 1]) P.cyl(0.32, 0.32, 0.18, "metal", s * 1.18, -2.6, -3.3, 0, 0, rz, 16);
    P.tube(C.fuse_r, 0.1, "wireW", 24, 6);
  };
  defs["switch"] = (P: Builder) => {
    P.box(1.7, 1.5, 1.15, 0.15, "graphite", 3.5, -2.3, -3.25);
    P.box(1.0, 0.35, 0.8, 0.08, "black", 3.5, -1.5, -3.25, 0.22, 0, 0);
    P.sph(0.07, "metal", 3.5, -1.36, -3.1);
    P.box(0.3, 0.1, 0.3, 0.02, "metal", 2.9, -2.65, -3.25);
    P.box(0.3, 0.1, 0.3, 0.02, "metal", 4.1, -2.6, -3.25);
    P.tube(C.sw_b1, 0.1, "wireW", 80, 6);
    P.tube(C.sw_b2, 0.1, "wireW", 16, 6);
  };
  const buckLocal = (n: number) => {
    const cx = BUCK_X[n], zc = BUCK.z, yT = BUCK.y + 0.06;
    const inPlus = n === 1 ? cx - 0.55 : cx + 0.55;
    const inMinus = n === 1 ? cx + 0.55 : cx - 0.55;
    const outPlus = cx - 0.55;
    const outMinus = cx + 0.55;
    return { cx, zc, yT, inPlus, inMinus, outPlus, outMinus };
  };
  for (const n of [1, 2]) {
    const b = buckLocal(n);
    defs[`buck${n}-board`] = (P: Builder) => {
      P.box(BUCK.w, 0.12, BUCK.d, 0.08, "pcb", b.cx, BUCK.y, b.zc);
      for (const [x, z] of [[b.inPlus, -1.9], [b.inMinus, -1.9], [b.outPlus, 1.9], [b.outMinus, 1.9]]) {
        P.box(0.5, 0.45, 0.5, 0.05, "graphite", x, BUCK.y + 0.3, b.zc + z);
        P.cyl(0.15, 0.15, 0.06, "metal", x, BUCK.y + 0.55, b.zc + z, 0, 0, 0, 12);
      }
      for (const [x, z] of [[-0.95, -0.9], [0.95, 0.75]]) {
        P.cyl(0.34, 0.34, 0.8, "black", b.cx + x, BUCK.y + 0.46, b.zc + z, 0, 0, 0, 20);
        P.cyl(0.3, 0.3, 0.03, "metalDark", b.cx + x, BUCK.y + 0.87, b.zc + z, 0, 0, 0, 20);
        P.cyl(0.345, 0.345, 0.5, "silk", b.cx + x, BUCK.y + 0.4, b.zc + z, 0, 0, 0, 20);
      }
      P.box(0.5, 0.1, 0.35, 0.02, "chip", b.cx - 0.2, BUCK.y + 0.1, b.zc - 0.2);
      P.box(0.4, 0.1, 0.25, 0.02, "chip", b.cx + 0.4, BUCK.y + 0.1, b.zc + 0.2);
    };
    defs[`buck${n}-inductor`] = (P: Builder) => {
      P.torus(0.45, 0.23, "graphite", b.cx - 0.1, BUCK.y + 0.4, b.zc + 0.85, Math.PI / 2, 0, 0);
      P.torus(0.45, 0.07, "metalDark", b.cx - 0.1, BUCK.y + 0.62, b.zc + 0.85, Math.PI / 2, 0, 0);
    };
    defs[`buck${n}-heatsink`] = (P: Builder) => {
      const cx = b.cx + 0.35, cz = b.zc - 0.9;
      P.box(1.1, 0.14, 1.2, 0.03, "metal", cx, BUCK.y + 0.13, cz);
      for (let i = 0; i < 5; i++) P.box(0.07, 0.75, 1.2, 0.01, "metal", cx - 0.42 + i * 0.21, BUCK.y + 0.52, cz);
    };
    defs[`buck${n}-pot`] = (P: Builder) => {
      P.box(0.45, 0.35, 0.45, 0.05, "metalDark", b.cx - 0.95, BUCK.y + 0.24, b.zc + 0.2);
      P.box(0.3, 0.04, 0.07, 0.01, "black", b.cx - 0.95, BUCK.y + 0.43, b.zc + 0.2);
    };
  }
  defs["bulk-caps"] = (P: Builder) => {
    for (const z of [3.4, 4.8]) {
      P.cyl(0.6, 0.6, 1.2, "black", -3.0, -2.6, z, 0, 0, 0, 24);
      P.cyl(0.55, 0.55, 0.04, "metalDark", -3.0, -1.99, z, 0, 0, 0, 24);
      P.cyl(0.605, 0.605, 0.7, "silk", -3.0, -2.75, z, 0, 0, 0, 24);
    }
  };

  // ---- Wiring -----------------------------------------------------------------------------
  defs["rail-servo-l"] = (P: Builder) => {
    P.tube(C.rail_trunk_l, 0.11, "wireW", 20, 6);
    P.tube(C.cap_a, 0.09, "wireW", 12, 6);
    P.tube(C.cap_b, 0.09, "wireW", 10, 6);
    for (const L of LEG_DEFS) if (L.sx < 0) for (const e of ["hip", "thigh", "knee"] as Leg3[]) P.tube(C[`rail.${L.k}.${e}`], 0.08, "wireW", 40, 5);
  };
  defs["rail-servo-r"] = (P: Builder) => {
    P.tube(C.rail_trunk_r, 0.11, "wireW", 60, 6);
    for (const L of LEG_DEFS) if (L.sx > 0) for (const e of ["hip", "thigh", "knee"] as Leg3[]) P.tube(C[`rail.${L.k}.${e}`], 0.08, "wireW", 40, 5);
  };
  defs["rail-logic-pico"] = (P: Builder) => P.tube(C.logic_pico, 0.09, "wireW", 36, 6);
  defs["rail-logic-zero"] = (P: Builder) => P.tube(C.logic_zero, 0.09, "wireW", 36, 6);
  defs["common-ground"] = (P: Builder) => {
    for (const k of ["gnd_main1", "gnd_main2", "gnd_out", "gnd_pico", "gnd_zero"]) P.tube(C[k], 0.09, "wireK", 48, 6);
  };
  const pwmPart = (side: number) => (P: Builder) => {
    for (const L of LEG_DEFS) if (L.sx === side) for (const e of ["hip", "thigh", "knee"] as Leg3[]) P.tube(C[`pwm.${L.k}.${e}`], 0.05, "wireG", 44, 4);
  };
  defs["pwm-l"] = pwmPart(-1);
  defs["pwm-r"] = pwmPart(1);

  // ---- Chassis ----------------------------------------------------------------------------
  const standoffs: { x: number; z: number; y0: number; y1: number }[] = [];
  for (const x of [-1.15, 1.15]) for (const z of [-2.4, 3.4]) standoffs.push({ x, z, y0: PLATE_TOP, y1: ZERO.y - 0.06 });
  for (const x of [-0.57, 0.57]) for (const z of [PICO.z - 2.35, PICO.z + 2.35]) standoffs.push({ x, z, y0: PLATE_TOP, y1: PICO.y - 0.06 });
  for (const n of [1, 2]) for (const dx of [-1, 1]) for (const dz of [-1.7, 1.7]) standoffs.push({ x: BUCK_X[n] + dx, z: BUCK.z + dz, y0: PLATE_TOP, y1: BUCK.y - 0.06 });
  defs["chassis-plate"] = (P: Builder) => {
    const s = rrShape(7.4, 20.7, 0.9, 0, 0.95);
    for (const so of standoffs) s.holes.push(circlePath(so.x, -so.z, 0.2));
    for (const [x, z] of [[-3.2, -10.8], [3.2, -10.8], [-3.2, 8.8], [3.2, 8.8]]) s.holes.push(circlePath(x, -z, 0.22));
    for (const x of [-2.4, 2.4]) s.holes.push(rrShape(0.9, 2.8, 0.4, x, 8.0));
    P.extrude(s, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2, curveSegments: 16 }, "plaLight", MX(0, PLATE_TOP - 0.35, 0, -Math.PI / 2, 0, 0));
  };
  defs["standoffs"] = (P: Builder) => {
    P.inst(new THREE.CylinderGeometry(0.25, 0.25, 1, 6), "metalDark", standoffs.map((s) => MX(s.x, (s.y0 + s.y1) / 2, s.z, 0, 0, 0, V3(1, s.y1 - s.y0, 1))));
  };
  defs["screws"] = (P: Builder) => {
    const m: THREE.Matrix4[] = [];
    for (const s of standoffs) m.push(MX(s.x, s.y1 + 0.05, s.z));
    for (const [x, z] of [[-3.2, -10.8], [3.2, -10.8], [-3.2, 8.8], [3.2, 8.8]]) m.push(MX(x, PLATE_TOP + 0.05, z));
    P.inst(new THREE.CylinderGeometry(0.27, 0.27, 0.1, 14), "metal", m);
  };

  // ---- Legs -------------------------------------------------------------------------------
  const hipM = basis(HP, V3(0, 1, 0), V3(0, 0, 1), V3(1, 0, 0));
  const thighM = basis(TP, V3(0, 1, 0), V3(1, 0, 0), V3(0, 0, -1));
  const kneeM = basis(V3(10.35, KP.y, KP.z), V3(0, 1, 0), V3(1, 0, 0), V3(0, 0, -1));
  const linkOpts = { depth: 0.5, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2, curveSegments: 20 };
  for (const L of LEG_DEFS) {
    const S = new THREE.Matrix4().makeScale(L.sx, 1, L.zs);
    const id = (k: string) => `${L.k}-${k}`;
    defs[id("hip-bracket")] = (P: Builder) => {
      P.push(S);
      P.box(0.8, 4.6, 4.6, 0.25, "plaGrey", 5.8, -0.75, 4.65);
      for (const [y, z] of [[-2.4, 3.0], [-2.4, 6.2], [0.9, 3.0], [0.9, 6.2]]) P.cyl(0.2, 0.2, 0.1, "metal", 6.25, y, z, 0, 0, Math.PI / 2, 12);
      P.pop();
    };
    defs[id("hip-servo")] = (P: Builder) => {
      P.push(S).push(hipM);
      servoCase(P);
      P.pop().pop();
    };
    defs[id("hip-cup")] = (P: Builder) => {
      P.push(S);
      P.lathe([[0, 0], [1.5, 0], [1.7, 0.18], [1.7, 1.82], [1.52, 2.0], [0.6, 2.0], [0.6, 1.7], [0, 1.7]], "plaGrey", HP.x, HP.y, HP.z + 0.55, Math.PI / 2, 0, 0, 36);
      P.cyl(0.25, 0.25, 0.1, "metal", HP.x, HP.y, HP.z + 2.3, Math.PI / 2, 0, 0, 12);
      P.cyl(1.0, 1.0, 0.18, "horn", HP.x, HP.y, HP.z + 0.62, Math.PI / 2, 0, 0, 28);
      // mounting tab under the cup where the thigh servo's flange bolts on
      P.box(1.6, 0.35, 2.1, 0.1, "plaGrey", 8.0, -1.35, TP.z);
      for (const z of [TP.z - 0.55, TP.z + 0.55]) P.cyl(0.14, 0.14, 0.1, "metal", 8.3, -1.1, z, 0, 0, 0, 10);
      P.pop();
    };
    defs[id("thigh-servo")] = (P: Builder) => {
      P.push(S).push(thighM);
      servoCase(P);
      P.pop().pop();
    };
    defs[id("thigh-link")] = (P: Builder) => {
      P.push(S);
      const len = Math.hypot(KP.y - TP.y, KP.z - TP.z);
      P.extrude(stadium(len, 1.9, 0.28), linkOpts, "plaGrey", linkMatrix(V3(10.35, TP.y, TP.z), D_THIGH));
      P.cyl(1.0, 1.0, 0.2, "horn", 11.05, TP.y, TP.z, 0, 0, Math.PI / 2, 28);
      P.cyl(0.22, 0.22, 0.14, "metal", 11.2, TP.y, TP.z, 0, 0, Math.PI / 2, 12);
      P.pop();
    };
    defs[id("knee-servo")] = (P: Builder) => {
      P.push(S).push(kneeM);
      servoCase(P);
      P.pop().pop();
    };
    defs[id("shank-link")] = (P: Builder) => {
      P.push(S);
      P.extrude(stadium(SHANK_LEN, 1.8, 0.28), linkOpts, "plaGrey", linkMatrix(V3(11.05, KP.y, KP.z), FOOT_D));
      P.cyl(0.95, 0.95, 0.2, "horn", 11.75, KP.y, KP.z, 0, 0, Math.PI / 2, 28);
      P.cyl(0.22, 0.22, 0.14, "metal", 11.9, KP.y, KP.z, 0, 0, Math.PI / 2, 12);
      P.pop();
    };
    defs[id("foot")] = (P: Builder) => {
      P.push(S);
      const q = new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), FOOT_D.clone().negate());
      const sock = FOOT.clone().addScaledVector(FOOT_D, -0.35);
      P.add(new THREE.CylinderGeometry(0.62, 0.62, 1.0, 20), "graphite", new THREE.Matrix4().compose(sock, q, V3(1, 1, 1)));
      P.sph(FOOT_R, "rubber", FOOT.x, FOOT.y, FOOT.z, 1, 1, 1, 24);
      P.pop();
    };
    for (const [e, pre] of [["hip", "hip"], ["thigh", "thigh"], ["knee", "knee"]]) {
      defs[id(`${pre}-lead`)] = (P: Builder) => {
        const mats = ["wireW", "wireG", "wireK"];
        for (let i = 0; i < 3; i++) P.tube(C[`lead.${L.k}.${e}.${i}`], 0.075, mats[i], 40, 5);
      };
    }
  }
  return { defs, C, oledWires, imuWires };
}

// ---------------------------------------------------------------------------------------------
// The living face: a 128x64 canvas drawn like an SSD1306 (pixel eyes, blink, gaze)
// ---------------------------------------------------------------------------------------------
export type Pointer = { x: number; y: number; active: boolean };

function makeFace() {
  const { c: cv, g } = canvas(128, 64);
  const tex = new THREE.CanvasTexture(cv);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  const st = { nextBlink: 1.5, blinkStart: -9, gx: 0, gy: 0, double: false, sx: 0, sy: 0, nextSaccade: 2 };

  const eye = (cx: number, cy: number, w: number, h: number, c: number) => {
    const top = Math.round(cy - h / 2);
    const hh = Math.max(2, Math.round(h));
    for (let i = 0; i < hh; i++) {
      const d = Math.min(i, hh - 1 - i);
      const inset = d >= c ? 0 : c - d;
      g.fillRect(Math.round(cx - w / 2) + inset, top + i, w - inset * 2, 1);
    }
  };

  function draw(time: number, dt: number, pointer?: Pointer) {
    // blink schedule
    if (time >= st.nextBlink) {
      st.blinkStart = time;
      st.double = Math.random() < 0.2;
      st.nextBlink = time + 2.2 + Math.random() * 3.2;
    }
    let b = 0;
    const bt = (time - st.blinkStart) / 0.2;
    if (bt >= 0 && bt <= 1) b = 1 - Math.abs(bt * 2 - 1);
    if (st.double) {
      const b2 = (time - st.blinkStart - 0.28) / 0.2;
      if (b2 >= 0 && b2 <= 1) b = Math.max(b, 1 - Math.abs(b2 * 2 - 1));
    }
    // gaze: toward the cursor, else idle saccades
    let tx: number, ty: number;
    if (pointer && pointer.active) {
      tx = THREE.MathUtils.clamp(pointer.x, -1, 1);
      ty = THREE.MathUtils.clamp(-pointer.y, -1, 1);
    } else {
      if (time >= st.nextSaccade) {
        st.sx = (Math.random() * 2 - 1) * 0.7;
        st.sy = (Math.random() * 2 - 1) * 0.4;
        st.nextSaccade = time + 1.2 + Math.random() * 2.5;
      }
      tx = st.sx;
      ty = st.sy;
    }
    const k = 1 - Math.exp(-dt * 14);
    st.gx += (tx - st.gx) * k;
    st.gy += (ty - st.gy) * k;

    g.fillStyle = "#000";
    g.fillRect(0, 0, 128, 64);
    g.fillStyle = "#fff";
    const ox = Math.round(st.gx * 4),
      oy = Math.round(st.gy * 3);
    const h = 30 * (1 - b) + 2;
    for (const cx of [36, 92]) {
      eye(cx + ox, 31 + oy, 28, h, 5);
      if (b < 0.45) {
        g.fillStyle = "#000";
        const ph = Math.round(12 * (1 - b));
        g.fillRect(cx + ox + Math.round(st.gx * 5) - 5, 31 + oy + Math.round(st.gy * 5) - ph / 2, 10, ph);
        g.fillStyle = "#fff";
      }
    }
    tex.needsUpdate = true;
  }
  return { tex, draw };
}

// ---------------------------------------------------------------------------------------------
// createRoboPet
// ---------------------------------------------------------------------------------------------
const X_AXIS = V3(1, 0, 0),
  Z_AXIS = V3(0, 0, 1);
const _rot = new THREE.Matrix4(),
  _t1 = new THREE.Matrix4(),
  _t2 = new THREE.Matrix4();
function rotAbout(out: THREE.Matrix4, p: THREE.Vector3, axis: THREE.Vector3, ang: number) {
  _rot.makeRotationAxis(axis, ang);
  out.copy(_t1.makeTranslation(p.x, p.y, p.z)).multiply(_rot).multiply(_t2.makeTranslation(-p.x, -p.y, -p.z));
  return out;
}
const WIRE_RE = /(-lead|-leads|-wires|-ribbon|^uart-|^common-ground$)/;
const GHOST_IDS = new Set(["shell-top", "shell-bottom", "face-bezel"]);
// What every part but the focused one is drawn at.
const FOCUS_GHOST_OPACITY = 0.1;

type Seg = { c: Curve; o: RoboPetPart; rev: boolean; len: number; start: number; line?: THREE.Line };
type FlowPath = {
  kind: "power" | "signal";
  segs: Seg[];
  total: number;
  speed: number;
  spacing: number;
  pingpong: boolean;
  scale: number;
  phase: number;
  n: number;
};
export type RoboPetPart = {
  spec: PartSpec;
  object: THREE.Group;
  meshes: Built["meshes"];
  materials: THREE.Material[];
  /** Body-space box of the part at rest (assembled). */
  box: THREE.Box3;
  center: THREE.Vector3;
  radius: number;
  leg: LegDef | null;
  level: number;
  /** Explode displacement in cm; the part sits at (ex * x) from its rest pose. */
  ex: THREE.Vector3;
  x: number;
  v: number;
  tgt: number;
  delay: number;
  rank: number;
  hl: number;
  dim: number;
  /** 0..1: how far the part has faded out because another part is focused. */
  fg: number;
  wire: boolean;
  wireOp: number;
  ghost: boolean;
  edges: THREE.Group | null;
  hlLines: THREE.Group | null;
};

export type RoboPetOptions = {
  explodeScale?: number | readonly [number, number, number];
  reducedMotion?: boolean;
};

export function createRoboPet(opts: RoboPetOptions = {}) {
  const { templates, textures } = makeMaterialTemplates();
  const face = makeFace();
  templates.screen = new THREE.MeshBasicMaterial({ map: face.tex, toneMapped: false });
  const { defs, C, oledWires, imuWires } = buildDefs();

  const root = new THREE.Group();
  root.name = "roboPet";
  const robot = new THREE.Group();
  robot.position.y = -GROUND_Y;
  root.add(robot);

  const theme = {
    eye: new THREE.Color(0xffffff),
    line: new THREE.Color(0x333333),
    muted: new THREE.Color(0xa6a6a6),
    surface: new THREE.Color(0x000000),
  };

  // ---- build parts ----------------------------------------------------------------------
  const parts = new Map<string, RoboPetPart>();
  const list: RoboPetPart[] = [];
  let triangles = 0;
  for (const spec of PARTS) {
    const def = defs[spec.id];
    if (!def) continue;
    const P = new Builder(spec.id, templates);
    def(P);
    const { group, meshes, materials } = P.finish();
    group.matrixAutoUpdate = false;
    robot.add(group);
    const box = new THREE.Box3();
    for (const m of meshes) {
      if (m instanceof THREE.InstancedMesh) {
        if (m.boundingBox) box.union(m.boundingBox);
      } else {
        m.geometry.computeBoundingBox();
        if (m.geometry.boundingBox) box.union(m.geometry.boundingBox);
      }
      const n = m.geometry.index ? m.geometry.index.count : m.geometry.getAttribute("position").count;
      triangles += (n / 3) * (m instanceof THREE.InstancedMesh ? m.count : 1);
    }
    const leg = spec.group.startsWith("leg-") ? (LEG_DEFS.find((l) => l.k === spec.group.slice(4)) ?? null) : null;
    const kind = leg ? spec.id.slice(3) : null;
    const part: RoboPetPart = {
      spec, object: group, meshes, materials, box,
      center: box.getCenter(new THREE.Vector3()),
      radius: box.getBoundingSphere(new THREE.Sphere()).radius,
      leg, level: kind ? LEG_LEVEL[kind] : 0,
      ex: V3(),
      x: 0, v: 0, tgt: 0, delay: 0, rank: 0, hl: 0, dim: 0, fg: 0,
      wire: WIRE_RE.test(spec.id) || spec.group === "wiring",
      wireOp: 1, ghost: GHOST_IDS.has(spec.id), edges: null, hlLines: null,
    };
    parts.set(spec.id, part);
    list.push(part);
  }
  // resolve explode vectors: absolute targets, parent-relative offsets, or plain vectors
  const exScale = opts.explodeScale ?? 1;
  const resolved = new Set<string>();
  const resolveEx = (p: RoboPetPart): THREE.Vector3 => {
    if (resolved.has(p.spec.id)) return p.ex;
    const e = p.spec.exSpec;
    if (e.at) p.ex.set(...e.at).sub(p.center);
    else if (e.rel) {
      const par = parts.get(e.rel[0])!;
      resolveEx(par);
      p.ex.copy(par.ex).add(V3(e.rel[1], e.rel[2], e.rel[3]));
    } else p.ex.set(...e.ex);
    resolved.add(p.spec.id);
    return p.ex;
  };
  for (const p of list) resolveEx(p);
  for (const p of list) {
    if (typeof exScale === "number") p.ex.multiplyScalar(exScale);
    else p.ex.multiply(V3(...exScale));
  }
  // staggered order: higher parts move first on explode
  const byHeight = [...list].sort((a, b) => b.center.y + b.ex.y - (a.center.y + a.ex.y));
  byHeight.forEach((p, i) => (p.rank = i / Math.max(1, byHeight.length - 1)));

  // pickable meshes
  const pickables: THREE.Object3D[] = [];
  for (const p of list) for (const m of p.meshes) pickables.push(m);

  // ---- floor ------------------------------------------------------------------------------
  const floor = new THREE.Group();
  root.add(floor);
  const fadeTex = radialTexture([[0, 1], [0.55, 0.65], [1, 0]]);
  const floorDisc = new THREE.Mesh(
    new THREE.PlaneGeometry(150, 150),
    new THREE.MeshBasicMaterial({ color: 0x111111, map: fadeTex, transparent: true, depthWrite: false, opacity: 0.9 }),
  );
  floorDisc.rotation.x = -Math.PI / 2;
  floorDisc.position.y = -0.04;
  floor.add(floorDisc);
  const shadowTex = radialTexture([[0, 0.85], [0.5, 0.45], [1, 0]]);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ color: 0x000000, map: shadowTex, transparent: true, depthWrite: false, opacity: 0.8 }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.02;
  floor.add(shadow);
  const rings: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>[] = [];
  for (const r of [18, 34, 52]) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(r - 0.06, r + 0.06, 128),
      new THREE.MeshBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.55, depthWrite: false }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.03;
    floor.add(ring);
    rings.push(ring);
  }

  // ---- flows ------------------------------------------------------------------------------
  const flowLines: THREE.Line[] = [];
  const paths: FlowPath[] = [];
  const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 });
  const segOf = (curve: Curve, owner: string, rev = false): Seg => ({
    c: curve, o: parts.get(owner)!, rev, len: curve.getLength(), start: 0,
  });
  const addPath = (
    kind: FlowPath["kind"], segs: Seg[], speed: number, spacing: number,
    pingpong = false, scale = 1, phase = 0,
  ) => {
    let t = 0;
    for (const s of segs) {
      s.start = t;
      t += s.len;
    }
    paths.push({ kind, segs, total: t, speed, spacing, pingpong, scale, phase, n: Math.max(1, Math.round(t / spacing)) });
    for (const s of segs) {
      if (s.line) continue;
      const pts = s.c.getPoints(Math.max(8, Math.ceil(s.len * 2)));
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat);
      line.visible = false;
      line.userData.flowKind = kind;
      line.frustumCulled = false;
      s.o.object.add(line);
      s.line = line;
      flowLines.push(line);
    }
  };
  // power: pack -> fuse -> switch -> buck 1 -> servo rail -> every servo; switch -> buck 2 -> logic rail
  addPath("power", [segOf(C.pack_plus, "pack-leads"), segOf(C.fuse_body, "fuse"), segOf(C.fuse_r, "fuse"), segOf(C.switch_body, "switch"), segOf(C.sw_b1, "switch"), segOf(C.buck1_in_out, "buck1-board")], 8, 3.4);
  addPath("power", [segOf(C.sw_b2, "switch"), segOf(C.buck2_in_out, "buck2-board"), segOf(C.logic_pico, "rail-logic-pico")], 8, 3.4, false, 1, 0.4);
  addPath("power", [segOf(C.sw_b2, "switch"), segOf(C.buck2_in_out, "buck2-board"), segOf(C.logic_zero, "rail-logic-zero")], 8, 3.4, false, 1, 1.1);
  addPath("power", [segOf(C.rail_trunk_r, "rail-servo-r")], 8, 3.4);
  addPath("power", [segOf(C.rail_trunk_l, "rail-servo-l")], 8, 3.4);
  // Pulse phases come from a fixed seed, so the same flow looks the same on every load.
  let phaseSeed = 7;
  const phase = (span: number) => ((phaseSeed = (phaseSeed * 9301 + 49297) % 233280) / 233280) * span;
  for (const L of LEG_DEFS) {
    for (const e of ["hip", "thigh", "knee"] as Leg3[]) {
      const rail = L.sx > 0 ? "rail-servo-r" : "rail-servo-l";
      addPath("power", [segOf(C[`rail.${L.k}.${e}`], rail), segOf(C[`lead.${L.k}.${e}.0`], `${L.k}-${e}-lead`, true)], 8, 3.2, false, 0.9, phase(3));
      addPath("signal", [segOf(C[`pwm.${L.k}.${e}`], L.sx > 0 ? "pwm-r" : "pwm-l"), segOf(C[`lead.${L.k}.${e}.1`], `${L.k}-${e}-lead`, true)], 24, 2.4, false, 0.65, phase(2));
    }
  }
  // signal: UART packets bounce on the crossed wires, I2C on two separate buses, camera ribbon
  addPath("signal", [segOf(C.uartA, "uart-zero-tx")], 10, 2.2, true, 1.05);
  addPath("signal", [segOf(C.uartB, "uart-pico-tx")], 10, 2.2, true, 1.05, 1.1);
  addPath("signal", [segOf(oledWires[0], "oled-wires")], 9, 2.2, true, 0.8);
  addPath("signal", [segOf(oledWires[1], "oled-wires")], 9, 2.2, true, 0.8, 0.9);
  addPath("signal", [segOf(imuWires[0], "imu-wires")], 9, 2.4, true, 0.8);
  addPath("signal", [segOf(imuWires[1], "imu-wires")], 9, 2.4, true, 0.8, 1.3);
  addPath("signal", [segOf(C.ribbon, "picam-ribbon")], 12, 1.6, false, 0.8);

  // parts that take part in each flow; everything else dims while the flow is shown
  const involved: Record<"power" | "signal", Set<string>> = { power: new Set(), signal: new Set() };
  for (const path of paths) for (const s of path.segs) involved[path.kind].add(s.o.spec.id);
  for (const p of list) {
    if (/-(hip|thigh|knee)-servo$/.test(p.spec.id)) {
      involved.power.add(p.spec.id);
      involved.signal.add(p.spec.id);
    }
  }
  ["cell-1", "cell-2", "cell-3", "pack-wrap", "pico", "zero-2w", "buck1-board", "buck2-board"].forEach((id) => involved.power.add(id));
  ["pico", "zero-2w", "imu", "oled", "picam", "imu-header", "oled-header", "pico-pins", "zero-gpio"].forEach((id) => involved.signal.add(id));

  const maxPulses =
    Math.max(
      paths.filter((p) => p.kind === "power").reduce((a, p) => a + p.n, 0),
      paths.filter((p) => p.kind === "signal").reduce((a, p) => a + p.n, 0),
    ) + 8;
  const pulseCoreMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const pulseHaloMat = new THREE.MeshBasicMaterial({
    color: 0xffffff, toneMapped: false, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const pulseCore = new THREE.InstancedMesh(new THREE.SphereGeometry(0.15, 8, 6), pulseCoreMat, maxPulses);
  const pulseHalo = new THREE.InstancedMesh(new THREE.SphereGeometry(0.34, 8, 6), pulseHaloMat, maxPulses);
  for (const m of [pulseCore, pulseHalo]) {
    m.count = 0;
    m.frustumCulled = false;
    m.renderOrder = 5;
    robot.add(m);
  }

  let flowMode: FlowMode = "off";
  let reduced = !!opts.reducedMotion;
  const _p = new THREE.Vector3(),
    _m = new THREE.Matrix4(),
    _q = new THREE.Quaternion(),
    _s = new THREE.Vector3();
  function updatePulses(time: number) {
    let n = 0;
    if (flowMode !== "off") {
      const t = reduced ? 0 : time;
      for (const path of paths) {
        if (path.kind !== flowMode) continue;
        for (let j = 0; j < path.n; j++) {
          // Reduced motion: the same pulses, frozen at even spacing along the path.
          let s = reduced ? (j + 0.5) * path.spacing : t * path.speed + j * path.spacing + path.phase * 3;
          if (path.pingpong) {
            s = ((s % (2 * path.total)) + 2 * path.total) % (2 * path.total);
            if (s > path.total) s = 2 * path.total - s;
          } else {
            s = ((s % path.total) + path.total) % path.total;
          }
          let seg = path.segs[path.segs.length - 1];
          for (const sg of path.segs) {
            if (s <= sg.start + sg.len) {
              seg = sg;
              break;
            }
          }
          let u = THREE.MathUtils.clamp((s - seg.start) / seg.len, 0, 1);
          if (seg.rev) u = 1 - u;
          seg.c.getPointAt(u, _p);
          _p.applyMatrix4(seg.o.object.matrix);
          _s.setScalar(path.scale);
          _m.compose(_p, _q, _s);
          pulseCore.setMatrixAt(n, _m);
          pulseHalo.setMatrixAt(n, _m);
          n++;
          if (n >= maxPulses) break;
        }
      }
    }
    pulseCore.count = pulseHalo.count = n;
    pulseCore.instanceMatrix.needsUpdate = pulseHalo.instanceMatrix.needsUpdate = true;
  }

  // ---- lazily built outlines --------------------------------------------------------------
  const hlLineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthTest: true });
  const ghostLineMat = new THREE.LineBasicMaterial({ color: 0xa6a6a6, transparent: true, opacity: 0 });
  function buildEdges(part: RoboPetPart, mat: THREE.LineBasicMaterial, angle: number) {
    const g = new THREE.Group();
    for (const m of part.meshes) {
      if (m instanceof THREE.InstancedMesh) continue;
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, angle), mat);
      e.frustumCulled = false;
      g.add(e);
    }
    part.object.add(g);
    return g;
  }

  // ---- animation state --------------------------------------------------------------------
  let highlightId: string | null = null;
  let focusId: string | null = null;
  let xrayOn = false,
    xr = 0;
  let avgX = 0;
  const legPivots = LEG_DEFS.map((l) => ({ l, hp: mapP(HP, l), tp: mapP(TP, l), kp: mapP(KP, l) }));
  const identity = new THREE.Matrix4();
  const legChains = new Map(LEG_DEFS.map((l) => [l.k, [new THREE.Matrix4(), new THREE.Matrix4(), new THREE.Matrix4(), new THREE.Matrix4()]]));
  const Mh = new THREE.Matrix4(), Mt = new THREE.Matrix4(), Mk = new THREE.Matrix4(), Pm = new THREE.Matrix4(), Tm = new THREE.Matrix4();

  function setExplode(t: number, o: { instant?: boolean } = {}) {
    for (const p of list) {
      if (o.instant) {
        p.x = t;
        p.v = 0;
        p.tgt = t;
        p.delay = 0;
      } else {
        p.tgt = t;
        p.delay = t > p.x ? p.rank * 0.32 : (1 - p.rank) * 0.1;
      }
    }
  }

  function applyMaterialState(p: RoboPetPart) {
    for (const m of p.materials) {
      const emissive = (m as THREE.MeshStandardMaterial).emissive;
      if (emissive) {
        const b = m.userData.base as MatBase;
        emissive.copy(b.emissive!).lerp(theme.eye, p.hl * 0.5);
        (m as THREE.MeshStandardMaterial).emissiveIntensity = b.ei;
      }
    }
  }

  // One place decides a part's opacity, because three things fade it: the wires thin out as the
  // robot explodes, the shell goes see-through under x-ray, and every part but the focused one
  // steps back. They multiply. A part drawn below full opacity does not write depth (so the
  // parts behind it show), except the x-ray shell while it is still mostly solid.
  function applyOpacity(p: RoboPetPart) {
    const ghostOp = p.ghost ? 1 - 0.9 * xr : 1;
    const focusOp = 1 - (1 - FOCUS_GHOST_OPACITY) * p.fg;
    const op = p.wireOp * ghostOp * focusOp;
    const tr = op < 0.999;
    const write = p.ghost ? xr < 0.35 && p.fg < 0.35 : !tr;
    for (const m of p.materials) {
      if (m.transparent !== tr) {
        m.transparent = tr;
        m.needsUpdate = true; // OPAQUE is a shader define
      }
      m.opacity = op;
      m.depthWrite = write;
    }
  }

  function update(dt: number, time: number, o: { pointer?: Pointer } = {}) {
    dt = Math.min(Math.max(dt, 0), 1 / 20);
    face.draw(time, dt, o.pointer);

    // explode springs (staggered, slight overshoot out, snappy back)
    let sum = 0;
    for (const p of list) {
      if (p.delay > 0) p.delay -= dt;
      else {
        const out = p.tgt > p.x;
        const k = out ? 110 : 230,
          c = out ? 15 : 27;
        const steps = 2;
        for (let i = 0; i < steps; i++) {
          const h = dt / steps;
          p.v += (k * (p.tgt - p.x) - c * p.v) * h;
          p.x += p.v * h;
        }
        if (Math.abs(p.tgt - p.x) < 1e-4 && Math.abs(p.v) < 1e-3) {
          p.x = p.tgt;
          p.v = 0;
        }
      }
      sum += p.x;
    }
    avgX = sum / list.length;

    // idle balance loop: IMU + PID holding the body level; sampled at 50 Hz like the servo frame
    const amp = reduced ? 0 : Math.max(0, 1 - avgX * 1.5);
    const tq = Math.floor(time * 50) / 50;
    let pitch = (1.1 * Math.sin(tq * 0.9) + 0.6 * Math.sin(tq * 2.1 + 1.3)) * D2R * 0.95;
    pitch = Math.round(pitch / (0.04 * D2R)) * (0.04 * D2R) * amp;
    rotAbout(Pm, PIVOT_PITCH, X_AXIS, pitch);
    for (const lp of legPivots) {
      const ch = legChains.get(lp.l.k)!;
      const jitter = amp * 0.18 * D2R * Math.sin(tq * 31 + lp.l.sx * 2 + lp.l.zs);
      rotAbout(Mh, lp.hp, Z_AXIS, jitter);
      rotAbout(Mt, lp.tp, X_AXIS, -pitch * 1.0 + amp * 0.35 * D2R * Math.sin(tq * 1.7 + lp.l.zs));
      rotAbout(Mk, lp.kp, X_AXIS, pitch * 0.55);
      ch[0].identity();
      ch[1].copy(Mh);
      ch[2].copy(Mh).multiply(Mt);
      ch[3].copy(ch[2]).multiply(Mk);
    }
    // ghosting
    const xrTarget = xrayOn ? 1 : 0;
    const xrBefore = xr;
    xr += (xrTarget - xr) * (1 - Math.exp(-dt * 8));
    if (Math.abs(xrTarget - xr) < 0.002) xr = xrTarget;
    const xrMoved = xr !== xrBefore;

    for (const p of list) {
      const ch = p.leg ? legChains.get(p.leg.k)![p.level] : identity;
      Tm.makeTranslation(p.ex.x * p.x, p.ex.y * p.x, p.ex.z * p.x);
      p.object.matrix.copy(Pm).multiply(Tm).multiply(ch);
      p.object.matrixWorldNeedsUpdate = true;

      // dim parts that are not on the active flow; with a focused part the others ghost instead
      const off = flowMode !== "off" && !p.ghost && !involved[flowMode].has(p.spec.id);
      const dimWant = off ? 1 : highlightId && !focusId && highlightId !== p.spec.id && !p.ghost ? 0.6 : 0;
      if (p.dim !== dimWant) {
        p.dim += (dimWant - p.dim) * (1 - Math.exp(-dt * 10));
        if (Math.abs(dimWant - p.dim) < 0.01) p.dim = dimWant;
        for (const m of p.materials) {
          const base = m.userData.base as MatBase;
          if (base.name === "screen" || base.name === "led") continue;
          (m as THREE.MeshStandardMaterial).color.copy(base.color).multiplyScalar(1 - 0.62 * p.dim);
        }
      }
      // highlight easing
      const want = p.spec.id === highlightId ? 1 : 0;
      if (p.hl !== want) {
        p.hl += (want - p.hl) * (1 - Math.exp(-dt * 14));
        if (Math.abs(want - p.hl) < 0.01) p.hl = want;
        applyMaterialState(p);
        if (p.hl > 0.01 && !p.hlLines) p.hlLines = buildEdges(p, hlLineMat, 28);
        if (p.hlLines) p.hlLines.visible = p.hl > 0.01;
      }
      // focus ghosting: everything but the focused part fades out
      const fgWant = focusId && focusId !== p.spec.id ? 1 : 0;
      let opacityChanged = false;
      if (p.fg !== fgWant) {
        p.fg += (fgWant - p.fg) * (1 - Math.exp(-dt * 9));
        if (Math.abs(fgWant - p.fg) < 0.01) p.fg = fgWant;
        opacityChanged = true;
      }
      if (p.wire) {
        const op = 1 - 0.82 * Math.min(1, p.x);
        if (Math.abs(op - p.wireOp) > 0.003) {
          p.wireOp = op;
          opacityChanged = true;
        }
      }
      if (p.ghost && xrMoved) opacityChanged = true;
      if (opacityChanged) applyOpacity(p);
      if (p.ghost) {
        if (xr > 0.001 && !p.edges) p.edges = buildEdges(p, ghostLineMat, 32);
        if (p.edges) p.edges.visible = xr > 0.001;
      }
    }
    hlLineMat.opacity = highlightId ? 0.95 : 0.0;
    ghostLineMat.opacity = xr * 0.38;

    // floor: contact shadow breathes with the explode
    const spread = 1 + avgX * 0.5;
    shadow.scale.set(30 * spread, 40 * spread, 1);
    shadow.material.opacity = 1 * (1 - 0.55 * Math.min(1, avgX));

    updatePulses(time);
  }

  // ---- public API -------------------------------------------------------------------------
  function setHighlight(id: string | null) {
    highlightId = id && parts.has(id) ? id : null;
    hlLineMat.opacity = highlightId ? 0.95 : 0;
  }
  /** Every part but this one fades to a ghost. Null brings them back. */
  function setFocus(id: string | null) {
    focusId = id && parts.has(id) ? id : null;
  }
  function setXray(on: boolean, o: { instant?: boolean } = {}) {
    xrayOn = on;
    if (o.instant || reduced) xr = xrayOn ? 1 : 0;
  }
  function setFlow(mode: FlowMode) {
    flowMode = mode === "power" || mode === "signal" ? mode : "off";
    for (const l of flowLines) l.visible = l.userData.flowKind === flowMode;
  }
  function setTheme(t: Partial<ThemeColors> = {}) {
    if (t.eye) theme.eye.set(t.eye);
    if (t.line) theme.line.set(t.line);
    if (t.muted) theme.muted.set(t.muted);
    if (t.surface) theme.surface.set(t.surface);
    const eye = theme.eye;
    for (const p of list) {
      for (const m of p.materials) {
        const base = m.userData.base as MatBase;
        if (base.name === "led") {
          base.emissive!.copy(eye);
          (m as THREE.MeshStandardMaterial).emissive.copy(eye);
          (m as THREE.MeshStandardMaterial).color.set(0x222222).lerp(eye, 0.15);
        }
        // The face texture is white pixels on black, so the screen's own color is the eye color.
        if (base.name === "screen") (m as THREE.MeshBasicMaterial).color.copy(eye);
      }
      applyMaterialState(p);
    }
    pulseCoreMat.color.copy(eye);
    pulseHaloMat.color.copy(eye);
    lineMat.color.copy(eye);
    hlLineMat.color.copy(eye);
    ghostLineMat.color.copy(theme.muted).lerp(new THREE.Color(0xffffff), 0.35);
    floorDisc.material.color.copy(theme.surface).lerp(theme.line, 0.9);
    for (const r of rings) r.material.color.copy(theme.line);
  }

  function anchorOf(id: string, out = new THREE.Vector3()) {
    const p = parts.get(id)!;
    out.copy(p.center).applyMatrix4(p.object.matrix);
    out.y += robot.position.y;
    return out;
  }
  function flowLabels(mode: "power" | "signal") {
    return (FLOW_LABELS[mode] || []).map((l) => ({ text: l.text, position: V3(l.at[0], l.at[1] + robot.position.y, l.at[2]) }));
  }
  function dispose() {
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      mesh.geometry?.dispose();
      const m = mesh.material;
      if (m) (Array.isArray(m) ? m : [m]).forEach((mat) => mat.dispose());
    });
    for (const t of textures) t.dispose();
    for (const t of Object.values(templates)) t.dispose();
    face.tex.dispose();
    fadeTex.dispose();
    shadowTex.dispose();
    pulseCoreMat.dispose();
    pulseHaloMat.dispose();
    pulseCore.geometry.dispose();
    pulseHalo.geometry.dispose();
    lineMat.dispose();
    hlLineMat.dispose();
    ghostLineMat.dispose();
  }

  setTheme({ eye: "#ffffff", line: "#333333", muted: "#a6a6a6", surface: "#000000" });
  setExplode(0, { instant: true });
  update(0, 0, {});

  return {
    root, parts, list, pickables, setExplode, setHighlight, setFocus, setXray, setFlow, setTheme, update, dispose,
    anchorOf, flowLabels, groundY: GROUND_Y,
    /** Y offset of the robot inside `root`: body-space y plus this is world y. */
    yOffset: robot.position.y,
    get explode() { return avgX; },
    get xray() { return xrayOn; },
    get xrayAmount() { return xr; },
    get flow() { return flowMode; },
    setReducedMotion(v: boolean) { reduced = v; },
    stats: { parts: list.length, triangles: Math.round(triangles) },
  };
}

export type RoboPet = ReturnType<typeof createRoboPet>;
