/**
 * Reaper, FTC 23786 MakEMinds' 2025-26 robot, as a procedural three.js model.
 *
 * Built with the img2threejs pipeline (assessment, spec and reviews live in
 * assets-src/reaper-img2threejs/). The structure follows the team's incomplete WorldsRobo
 * Onshape assembly (assets-src/cad-v2, the "ref" turntable) and the finish follows the one photo
 * of the finished robot (portfolio page 9). Parts the CAD does not have (hubs, battery, Limelight,
 * wiring, the second side plate) are placed by inference and are approximate.
 *
 * Everything is generated in code from primitives, extrusions, tubes and small canvas textures:
 * no mesh or image files. Output is deterministic (one seeded PRNG for the wood grain).
 *
 * Frame: millimetres inside the model, +Y up, +Z forward (the intake), the robot's own left is +X.
 * The root group is scaled by MM so the robot is about one unit across. Wheels rest on y = 0.
 *
 * Palette: neutral greys only (R = G = B). The LEDs take the theme's `eye` color and the
 * selection highlight takes `accent`, so the mono and violet themes reach the model through
 * setReaperColors without rebuilding it.
 */
import * as THREE from "three";
import { mergeGeometries, mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

export const MM = 1 / 420;

export type ReaperPartId =
  | "drive"
  | "intake"
  | "transfer"
  | "shooter"
  | "aiming"
  | "protection"
  | "electronics";

export type ReaperPartInfo = { id: ReaperPartId; label: string; detail: string };

export const REAPER_PARTS: Record<ReaperPartId, ReaperPartInfo> = {
  drive: {
    id: "drive",
    label: "Drivetrain",
    detail: "goBILDA U-channel frame on four mecanum wheels.",
  },
  intake: {
    id: "intake",
    label: "Intake",
    detail: "Full-width lifting intake. Mecanum wheels push artifacts in from the sides.",
  },
  transfer: {
    id: "transfer",
    label: "Transfer",
    detail: "A gecko wheel on an 1150 RPM motor moves artifacts up to a servo ramp.",
  },
  shooter: {
    id: "shooter",
    label: "Shooter",
    detail: "Weighted flywheel between two motors, under a hood a servo tilts.",
  },
  aiming: {
    id: "aiming",
    label: "Limelight 3A",
    detail: "Mounted under the hood. Reads AprilTags for the distance to the goal.",
  },
  protection: {
    id: "protection",
    label: "Protection",
    detail: "Wooden side plates, guard rods and acrylic shields over the hubs.",
  },
  electronics: {
    id: "electronics",
    label: "Electronics",
    detail: "Control Hub, Expansion Hub, battery, goBILDA Pinpoint and two RGB gate lights.",
  },
};

export const REAPER_PART_IDS = Object.keys(REAPER_PARTS) as ReaperPartId[];

export type ReaperColors = {
  /** Selection highlight (the theme's --accent). */
  accent: THREE.ColorRepresentation;
  /** LED emitters: Limelight status, gate lights, hub LEDs (the theme's --eye). */
  eye: THREE.ColorRepresentation;
};

export type ReaperModelOptions = {
  /** Cast and receive shadows on every mesh (default true). */
  shadows?: boolean;
  colors?: Partial<ReaperColors>;
};

/** How far each subsystem travels at explode = 1, in millimetres. */
const EXPLODE: Record<ReaperPartId, [number, number, number]> = {
  drive: [0, -70, 0],
  intake: [0, -10, 190],
  transfer: [0, 70, 70],
  shooter: [0, 230, -40],
  aiming: [0, 150, 200],
  protection: [0, 0, 0],
  electronics: [0, 30, -190],
};

/** Highlighted subsystems pop out by this fraction of their explode vector. */
const FOCUS_POP = 0.16;

/**
 * Subsystems too small to read with the whole robot in frame. The stage moves the camera in on
 * `center` (millimetres in the subsystem group's own frame, so it follows the pop and the turn)
 * and keeps `distance` of the full framing distance.
 */
export const REAPER_FOCUS_FRAMES: Partial<
  Record<ReaperPartId, { center: [number, number, number]; distance: number }>
> = {
  // The Limelight, with the housing it hangs from and the flywheel above it.
  aiming: { center: [0, 14, -20], distance: 0.68 },
  // The flywheel between its two motors, the hood over it and the hood's pivot on the axle.
  shooter: { center: [0, 330, 10], distance: 0.8 },
  // The two hubs on the back, behind their shield.
  electronics: { center: [0, 186, -180], distance: 0.84 },
};

type MatKey =
  | "alu"
  | "aluSolid"
  | "black"
  | "rubber"
  | "gecko"
  | "tread"
  | "steel"
  | "can"
  | "band"
  | "dark"
  | "wood"
  | "acrylic"
  | "emitter"
  | "lens"
  | "board"
  | "cable"
  | "cableLight"
  | "numberPlate"
  | "wordmark"
  | "hubLid"
  | "hubLabel";

type Textures = {
  holes: THREE.Texture;
  gecko: THREE.Texture;
  tread: THREE.Texture;
  wood: THREE.Texture;
  numberPlate: THREE.Texture;
  wordmark: THREE.Texture;
  hubLabel: THREE.Texture;
};

// ---------------------------------------------------------------------------------------------
// Deterministic helpers

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

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  if (!g) throw new Error("2d canvas unavailable");
  return { c, g };
}

function makeTextures(): Textures {
  // goBILDA pattern on a 48 x 24 mm tile: a 14 mm bore on the centre line every 24 mm, 4 mm holes
  // on an 8 mm grid around it and between bores. A channel at 1 keeps metal and 0 is cut: red holds
  // the 4 mm holes and green the bores, so the shader (REAPER_FRAGMENT) can fade each size out on
  // its own once it is too small on screen to cut cleanly.
  const holes = (() => {
    const k = 512 / 48;
    const { c, g } = canvas(512, 256);
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, 512, 256);
    const hole = (x: number, y: number, r: number) => {
      g.beginPath();
      g.arc(x * k, y * k, r * k, 0, Math.PI * 2);
      g.fill();
    };
    g.fillStyle = "#ff00ff";
    hole(24, 12, 7);
    g.fillStyle = "#00ffff";
    for (const [x, y] of [
      [16, 4],
      [32, 4],
      [16, 20],
      [32, 20],
      [24, 0],
      [24, 24],
      [8, 12],
      [40, 12],
      [8, 0],
      [40, 0],
      [8, 24],
      [40, 24],
    ])
      hole(x, y, 2);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    return t;
  })();

  // Gecko wheel: rows of rubber pins, as a bump map (light = raised).
  const gecko = (() => {
    const { c, g } = canvas(256, 64);
    g.fillStyle = "#202020";
    g.fillRect(0, 0, 256, 64);
    g.fillStyle = "#f0f0f0";
    for (let row = 0; row < 4; row++)
      for (let col = 0; col < 16; col++) {
        g.beginPath();
        g.arc(col * 16 + (row % 2) * 8 + 4, row * 16 + 8, 4.5, 0, Math.PI * 2);
        g.fill();
      }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(6, 1);
    return t;
  })();

  // Flywheel tread: transverse lugs with a centre groove.
  const tread = (() => {
    const { c, g } = canvas(512, 32);
    g.fillStyle = "#e8e8e8";
    g.fillRect(0, 0, 512, 32);
    g.fillStyle = "#151515";
    for (let i = 0; i < 32; i++) g.fillRect(i * 16, 0, 6, 32);
    g.fillRect(0, 14, 512, 4);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  })();

  // Plywood: soft grain streaks in grey, multiplied over the base color. The tile repeats both
  // ways (a side plate spans more than one), so it has to be seamless: every streak's wave runs
  // a whole number of periods across the 512 px width, and a streak near the top or bottom edge
  // is drawn again one tile up or down so it carries on across the wrap.
  const wood = (() => {
    const rand = mulberry32(23786);
    const W = 512;
    const H = 256;
    const { c, g } = canvas(W, H);
    g.fillStyle = "#e6e6e6";
    g.fillRect(0, 0, W, H);
    g.lineCap = "round";
    for (let i = 0; i < 70; i++) {
      const y0 = rand() * H;
      const amp = 2 + rand() * 6;
      // One long wave, sometimes with a shorter one riding on it, both periodic over W.
      const wave = (2 * Math.PI) / W;
      const ripple = rand() < 0.35 ? (2 + Math.floor(rand() * 2)) * wave : 0;
      const ripplePhase = rand() * Math.PI * 2;
      const shade = 196 + Math.floor(rand() * 34);
      g.strokeStyle = `rgb(${shade},${shade},${shade})`;
      g.lineWidth = 0.6 + rand() * 2.2;
      for (const shift of [-H, 0, H]) {
        if (y0 + shift < -12 || y0 + shift > H + 12) continue;
        g.beginPath();
        for (let x = -8; x <= W + 8; x += 8) {
          const y =
            y0 +
            shift +
            Math.sin(x * wave + i) * amp +
            (ripple ? Math.sin(x * ripple + ripplePhase) * amp * 0.3 : 0);
          if (x === -8) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        g.stroke();
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1 / 440, 1 / 220);
    return t;
  })();

  const label = (text: string, w: number, h: number, size: number, fill: string, back: string | null) => {
    const { c, g } = canvas(w, h);
    if (back) {
      g.fillStyle = back;
      g.fillRect(0, 0, w, h);
    } else g.clearRect(0, 0, w, h);
    g.fillStyle = fill;
    g.font = `700 ${size}px Arial, Helvetica, sans-serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, w / 2, h / 2 + size * 0.04);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  };

  return {
    holes,
    gecko,
    tread,
    wood,
    numberPlate: label("23786", 512, 160, 118, "#f2f2f2", "#0c0c0c"),
    wordmark: (() => {
      const { c, g } = canvas(512, 64);
      g.clearRect(0, 0, 512, 64);
      g.fillStyle = "#d9d9d9";
      g.font = "500 40px Arial, Helvetica, sans-serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      // Letter-spaced wordmark, drawn one glyph at a time.
      const word = "LIMELIGHT";
      const step = 50;
      word.split("").forEach((ch, i) => g.fillText(ch, 256 + (i - (word.length - 1) / 2) * step, 34));
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      return t;
    })(),
    // The two hubs' face labels, one per half: the Control Hub on top, the Expansion Hub below.
    hubLabel: (() => {
      const { c, g } = canvas(512, 256);
      g.fillStyle = "#242424";
      g.fillRect(0, 0, 512, 256);
      g.strokeStyle = "#4a4a4a";
      g.lineWidth = 3;
      g.font = "700 38px Arial, Helvetica, sans-serif";
      g.textAlign = "left";
      g.textBaseline = "middle";
      ["CONTROL HUB", "EXPANSION HUB"].forEach((text, i) => {
        const top = i * 128;
        g.strokeRect(10, top + 10, 492, 108);
        g.fillStyle = "#a6a6a6";
        g.fillText(text, 34, top + 50);
        // A row of port legends under the name.
        g.fillStyle = "#5e5e5e";
        for (let k = 0; k < 8; k++) g.fillRect(34 + k * 56, top + 86, 38, 6);
      });
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      return t;
    })(),
  };
}

/*
  Two additions to the standard material's fragment shader, shared by every material in the model.

  Perforations. The channel's holes are an alpha cutout, and a 4 mm hole a few metres away is
  smaller than a pixel, so cutting it per pixel turned the far channels into random speckle. Each
  hole size now cuts only while it spans about three pixels or more (measured from the UV
  derivatives, in millimetres per pixel); below that it fades to solid metal with a dark spot,
  which mipmapping averages into an even pattern. Only materials with an alphaMap run this.

  Selection. A selected part keeps its own shading. It gains the accent only where its surface
  turns edge-on to the camera (a narrow fresnel band, so the silhouettes of motors, wheels and the
  hood glow), with no even lift at all: on near-black printed parts any flat accent, even a few
  percent, reads as a matte fill. An outline (see partOutline) does the rest. `focusRim` is the accent times the
  part's highlight weight, set per material by setReaperFocus.
*/
const HOLE_FRAGMENT = /* glsl */ `
#ifdef USE_ALPHAMAP
{
  vec4 holeMask = texture2D( alphaMap, vAlphaMapUv );
  vec2 holeMm = vAlphaMapUv * vec2( 48.0, 24.0 );
  float mmPerPx = max( max( length( dFdx( holeMm ) ), length( dFdy( holeMm ) ) ), 1e-4 );
  float cutSmall = smoothstep( 1.6, 3.2, 4.0 / mmPerPx );
  float cutBore = smoothstep( 1.6, 3.2, 14.0 / mmPerPx );
  diffuseColor.a *= min( mix( 1.0, holeMask.r, cutSmall ), mix( 1.0, holeMask.g, cutBore ) );
  float holeSpot = min( mix( holeMask.r, 1.0, cutSmall ), mix( holeMask.g, 1.0, cutBore ) );
  diffuseColor.rgb *= mix( 0.3, 1.0, holeSpot );
}
#endif
`;

const RIM_FRAGMENT = /* glsl */ `
#include <emissivemap_fragment>
{
  float facing = clamp( abs( dot( normal, normalize( vViewPosition ) ) ), 0.0, 1.0 );
  totalEmissiveRadiance += focusRim * ( 1.1 * ( 1.0 - smoothstep( 0.03, 0.2, facing ) ) );
}
`;

// A plain function (not an arrow) so `this` is the material being compiled. Every material uses
// this same function, so three.js keys one program per variant, and each material brings its own
// `focusRim` uniform.
function reaperShader(this: THREE.Material, shader: THREE.WebGLProgramParametersWithUniforms) {
  shader.uniforms.focusRim = this.userData.focusRim as THREE.IUniform<THREE.Color>;
  shader.fragmentShader = shader.fragmentShader
    .replace("#include <common>", "#include <common>\nuniform vec3 focusRim;")
    .replace("#include <alphamap_fragment>", HOLE_FRAGMENT)
    .replace("#include <emissivemap_fragment>", RIM_FRAGMENT);
}

function makeMaterial(key: MatKey, tex: Textures, colors: { accent: THREE.Color; eye: THREE.Color }) {
  const std = (p: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(p);
  switch (key) {
    case "alu":
      return std({
        color: "#767676",
        metalness: 0.75,
        roughness: 0.5,
        alphaMap: tex.holes,
        alphaTest: 0.5,
        alphaToCoverage: true,
      });
    case "aluSolid":
      return std({ color: "#8c8c8c", metalness: 0.75, roughness: 0.48 });
    case "black":
      return std({ color: "#1d1d1d", metalness: 0, roughness: 0.62 });
    case "rubber":
      return std({ color: "#141414", metalness: 0, roughness: 0.9 });
    case "gecko":
      return std({ color: "#171717", metalness: 0, roughness: 0.88, bumpMap: tex.gecko, bumpScale: 2 });
    case "tread":
      return std({ color: "#1a1a1a", metalness: 0, roughness: 0.82, bumpMap: tex.tread, bumpScale: 2.5 });
    case "steel":
      return std({ color: "#a6a6a6", metalness: 1, roughness: 0.28 });
    case "can":
      return std({ color: "#c8c8c8", metalness: 0.9, roughness: 0.3 });
    case "band":
      return std({ color: "#8a8a8a", metalness: 0.35, roughness: 0.45 });
    case "dark":
      return std({ color: "#3b3b3b", metalness: 0.65, roughness: 0.42 });
    case "wood":
      return std({ color: "#6c6c6c", metalness: 0, roughness: 0.82, map: tex.wood, side: THREE.DoubleSide });
    case "acrylic":
      return std({
        color: "#ffffff",
        metalness: 0,
        roughness: 0.06,
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
      });
    case "emitter":
      // The LED shows exactly the theme's --eye: emissive only, kept out of tone mapping, which
      // would otherwise wash a bright violet out to a near-white lilac.
      return std({
        color: "#000000",
        emissive: colors.eye,
        emissiveIntensity: 1,
        roughness: 0.35,
        toneMapped: false,
      });
    case "lens":
      return std({ color: "#050505", metalness: 0.3, roughness: 0.05 });
    case "board":
      return std({ color: "#2e2e2e", metalness: 0.15, roughness: 0.55 });
    case "cable":
      return std({ color: "#242424", metalness: 0, roughness: 0.55 });
    case "cableLight":
      return std({ color: "#5c5c5c", metalness: 0, roughness: 0.55 });
    case "numberPlate":
      return std({ map: tex.numberPlate, metalness: 0, roughness: 0.6 });
    case "wordmark":
      return std({ map: tex.wordmark, transparent: true, metalness: 0, roughness: 0.6, depthWrite: false });
    case "hubLid":
      return std({ color: "#3f3f3f", metalness: 0.1, roughness: 0.45 });
    case "hubLabel":
      return std({ map: tex.hubLabel, metalness: 0, roughness: 0.5 });
  }
}

// ---------------------------------------------------------------------------------------------
// Geometry helpers. Everything is collected per (group, material) and merged once at the end,
// so a subsystem costs one draw call per material.

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

function at(x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) {
  return new THREE.Matrix4().compose(
    V(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
    V(1, 1, 1),
  );
}

function box(w: number, h: number, d: number) {
  return new THREE.BoxGeometry(w, h, d);
}

/** Cylinder whose axis runs along X. */
function cylX(r: number, len: number, seg = 24, r2 = r) {
  return new THREE.CylinderGeometry(r2, r, len, seg).rotateZ(Math.PI / 2);
}

/** Cylinder whose axis runs along Z. */
function cylZ(r: number, len: number, seg = 24) {
  return new THREE.CylinderGeometry(r, r, len, seg).rotateX(Math.PI / 2);
}

/**
 * A flat perforated plate: w across (X), t thick (Y), len long (Z). The big faces get UVs in
 * millimetres over the 48 x 24 hole tile so every plate shows the same hole size; the thin edges
 * sample a solid texel.
 */
function holePlate(w: number, t: number, len: number, uOffset = 0.5) {
  const g = new THREE.BoxGeometry(w, t, len);
  const pos = g.getAttribute("position");
  const nor = g.getAttribute("normal");
  const uv = g.getAttribute("uv");
  for (let i = 0; i < pos.count; i++) {
    if (Math.abs(nor.getY(i)) > 0.5) uv.setXY(i, pos.getX(i) / 48 + uOffset, pos.getZ(i) / 24 + 0.5);
    else uv.setXY(i, 0.02, 0.5);
  }
  return g;
}

/** goBILDA U-channel, 48 x 48 mm, length along local Z, open toward local +Y. */
function uChannel(len: number) {
  const base = holePlate(48, 2.5, len).translate(0, -22.75, 0);
  const left = holePlate(48, 2.5, len).rotateZ(Math.PI / 2).translate(-22.75, 0, 0);
  const right = holePlate(48, 2.5, len).rotateZ(Math.PI / 2).translate(22.75, 0, 0);
  return [base, left, right];
}

/** Matrix that puts a local-Z-long, local-Y-open part at `center`. */
function orient(center: THREE.Vector3, along: THREE.Vector3, open: THREE.Vector3) {
  const z = along.clone().normalize();
  const y = open.clone().normalize();
  const x = new THREE.Vector3().crossVectors(y, z).normalize();
  return new THREE.Matrix4().makeBasis(x, y, z).setPosition(center);
}

/**
 * Extrude a profile drawn in the robot's (z, y) side plane, `depth` mm thick along X, starting
 * at x = x0 and growing toward -X. (Shape x maps to robot z, shape y to robot y.) A `bevel`
 * chamfers the edges by that many millimetres inside the same outline and thickness, so a printed
 * plate catches a line of light along its edges.
 */
function sideExtrude(shape: THREE.Shape, depth: number, x0: number, curveSegments = 24, bevel = 0) {
  const g = new THREE.ExtrudeGeometry(
    shape,
    bevel > 0
      ? {
          depth: depth - 2 * bevel,
          bevelEnabled: true,
          bevelThickness: bevel,
          bevelSize: bevel,
          bevelOffset: -bevel,
          bevelSegments: 1,
          curveSegments,
        }
      : { depth, bevelEnabled: false, curveSegments },
  );
  if (bevel > 0) g.translate(0, 0, bevel);
  g.rotateY(-Math.PI / 2);
  g.translate(x0, 0, 0);
  return g;
}

/** Annular arc in the side plane around (cz, cy), angles measured from +Z toward +Y. */
function arcBand(cz: number, cy: number, rIn: number, rOut: number, a0: number, a1: number) {
  const s = new THREE.Shape();
  const n = 40;
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    const p = [cz + Math.cos(a) * rOut, cy + Math.sin(a) * rOut];
    if (i === 0) s.moveTo(p[0], p[1]);
    else s.lineTo(p[0], p[1]);
  }
  for (let i = n; i >= 0; i--) {
    const a = a0 + ((a1 - a0) * i) / n;
    s.lineTo(cz + Math.cos(a) * rIn, cy + Math.sin(a) * rIn);
  }
  return s;
}

/** Toothed sprocket outline, extruded along X. */
function sprocket(teeth: number, rOut: number, rRoot: number, thick: number) {
  const s = new THREE.Shape();
  for (let i = 0; i < teeth * 2; i++) {
    const a = (i / (teeth * 2)) * Math.PI * 2;
    const r = i % 2 === 0 ? rOut : rRoot;
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const hub = new THREE.Path();
  hub.absarc(0, 0, 4, 0, Math.PI * 2, true);
  s.holes.push(hub);
  return new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: false })
    .translate(0, 0, -thick / 2)
    .rotateY(Math.PI / 2);
}

function tube(points: [number, number, number][], r: number, seg = 64, radial = 8) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => V(x, y, z)), false, "centripetal");
  return new THREE.TubeGeometry(curve, seg, r, radial, false);
}

type Instanced = { group: THREE.Group; key: MatKey; geometry: THREE.BufferGeometry; matrices: THREE.Matrix4[] };

class Builder {
  readonly batches = new Map<THREE.Group, Map<MatKey, THREE.BufferGeometry[]>>();
  readonly instanced: Instanced[] = [];

  add(group: THREE.Group, key: MatKey, geometry: THREE.BufferGeometry | THREE.BufferGeometry[], m?: THREE.Matrix4) {
    let byKey = this.batches.get(group);
    if (!byKey) this.batches.set(group, (byKey = new Map()));
    let list = byKey.get(key);
    if (!list) byKey.set(key, (list = []));
    for (const g of Array.isArray(geometry) ? geometry : [geometry]) {
      if (m) g.applyMatrix4(m);
      list.push(g);
    }
  }

  instance(group: THREE.Group, key: MatKey, geometry: THREE.BufferGeometry, matrices: THREE.Matrix4[]) {
    this.instanced.push({ group, key, geometry, matrices });
  }
}

function normalizeForMerge(g: THREE.BufferGeometry) {
  const flat = g.index ? g.toNonIndexed() : g;
  if (flat !== g) g.dispose();
  for (const name of Object.keys(flat.attributes))
    if (name !== "position" && name !== "normal" && name !== "uv") flat.deleteAttribute(name);
  if (!flat.getAttribute("normal")) flat.computeVertexNormals();
  if (!flat.getAttribute("uv")) {
    const count = flat.getAttribute("position").count;
    flat.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(count * 2), 2));
  }
  flat.clearGroups();
  return flat;
}

// ---------------------------------------------------------------------------------------------
// Assemblies

/**
 * Mecanum wheel centred at `c`, axis along X. `hand` flips the roller angle (+1 or -1) so the
 * four corners form the usual X pattern. Hub parts go to the builder; roller transforms are
 * returned for one InstancedMesh per subsystem.
 */
function mecanum(
  b: Builder,
  group: THREE.Group,
  c: THREE.Vector3,
  radius: number,
  width: number,
  hand: 1 | -1,
  count: number,
) {
  const rollerR = radius * 0.2;
  const ring = radius - rollerR;
  // Side plates and hub.
  for (const side of [-1, 1]) {
    b.add(group, "dark", cylX(ring - 2, 2.5, 36), at(c.x + side * (width / 2 - 1), c.y, c.z));
  }
  b.add(group, "dark", cylX(radius * 0.32, width + 4, 24), at(c.x, c.y, c.z));
  b.add(group, "steel", cylX(radius * 0.12, width + 8, 12), at(c.x, c.y, c.z));
  const matrices: THREE.Matrix4[] = [];
  const up = V(0, 1, 0);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const pos = V(c.x, c.y + Math.cos(a) * ring, c.z + Math.sin(a) * ring);
    const tangent = V(0, -Math.sin(a), Math.cos(a));
    const dir = tangent.multiplyScalar(Math.SQRT1_2).add(V(hand * Math.SQRT1_2, 0, 0)).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(up, dir);
    matrices.push(new THREE.Matrix4().compose(pos, q, V(1, 1, 1)));
    // Bent tabs that hold each roller's ends.
    for (const end of [-1, 1]) {
      const tab = dir.clone().multiplyScalar(end * width * 0.62).add(pos);
      const inward = V(0, Math.cos(a), Math.sin(a)).multiplyScalar(-rollerR * 0.55);
      tab.add(inward);
      const m = new THREE.Matrix4().compose(tab, q, V(1, 1, 1));
      b.add(group, "dark", box(rollerR * 0.9, 2, rollerR * 1.2), m);
    }
  }
  return { matrices, rollerR, rollerLen: width * 1.1 };
}

function rollerGeometry(r: number, len: number) {
  const pts: THREE.Vector2[] = [];
  const n = 10;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const y = (t - 0.5) * len;
    const k = 1 - Math.pow(2 * t - 1, 2);
    pts.push(new THREE.Vector2(r * (0.55 + 0.45 * Math.sqrt(Math.max(0, k))), y));
  }
  pts[0].x = r * 0.3;
  pts[n].x = r * 0.3;
  pts.unshift(new THREE.Vector2(0, -len / 2));
  pts.push(new THREE.Vector2(0, len / 2));
  return new THREE.LatheGeometry(pts, 14);
}

/** goBILDA 5203 style gearmotor along X from x0 toward x0 + dir * len. */
function gearmotor(b: Builder, group: THREE.Group, x0: number, y: number, z: number, dir: 1 | -1, len = 110) {
  const segs: [MatKey, number, number][] = [
    ["dark", 0.32, 19],
    ["band", 0.26, 18.5],
    ["can", 0.3, 17.5],
    ["black", 0.12, 18],
  ];
  let x = x0;
  for (const [key, frac, r] of segs) {
    const l = len * frac;
    b.add(group, key, cylX(r, l, 28), at(x + (dir * l) / 2, y, z));
    x += dir * l;
  }
  // Output shaft stub and the mounting face's bolt circle.
  b.add(group, "steel", cylX(3, 14, 10), at(x0 - dir * 7, y, z));
}

/** Right-angle motor (axis along Z) with its bevel box at (x, y, z0). */
function gearmotorZ(b: Builder, group: THREE.Group, x: number, y: number, z0: number, dir: 1 | -1, len = 104) {
  b.add(group, "dark", box(40, 40, 40), at(x, y, z0));
  const segs: [MatKey, number, number][] = [
    ["dark", 0.3, 18.5],
    ["band", 0.26, 18.5],
    ["can", 0.3, 17.5],
    ["black", 0.14, 18],
  ];
  let z = z0 + dir * 20;
  for (const [key, frac, r] of segs) {
    const l = len * frac;
    b.add(group, key, cylZ(r, l, 28), at(x, y, z + (dir * l) / 2));
    z += dir * l;
  }
}

function socketHeads(positions: [number, number, number, THREE.Vector3][]) {
  const up = V(0, 1, 0);
  return positions.map(([x, y, z, normal]) =>
    new THREE.Matrix4().compose(
      V(x, y, z).addScaledVector(normal, 1.5),
      new THREE.Quaternion().setFromUnitVectors(up, normal.clone().normalize()),
      V(1, 1, 1),
    ),
  );
}

// ---------------------------------------------------------------------------------------------

type PartGroup = THREE.Group & { userData: { part?: ReaperPartInfo; explode?: THREE.Vector3; basePosition?: THREE.Vector3; sub?: ReaperPartId } };

function partGroup(id: ReaperPartId, pivot = V(0, 0, 0)): PartGroup {
  const g = new THREE.Group() as PartGroup;
  g.name = `reaper-${id}`;
  g.position.copy(pivot);
  g.userData.part = REAPER_PARTS[id];
  g.userData.sub = id;
  g.userData.explode = V(...EXPLODE[id]);
  g.userData.basePosition = pivot.clone();
  return g;
}

function childGroup(parent: THREE.Group, name: string, explode: THREE.Vector3, pivot = V(0, 0, 0)) {
  const g = new THREE.Group() as PartGroup;
  g.name = name;
  g.position.copy(pivot);
  g.userData.explode = explode;
  g.userData.basePosition = pivot.clone();
  g.userData.sub = parent.userData.sub as ReaperPartId;
  parent.add(g);
  return g;
}

/** Key dimensions, millimetres. */
const D = {
  railX: 125,
  railY: 52,
  railZ: 165,
  frontTowerZ: 120,
  rearTowerZ: -141,
  towerTop: 256,
  wheelX: 172,
  wheelZ: 125,
  wheelR: 52,
  axleY: 306,
  axleZ: 10,
  hoodTop: 456,
  housingBottom: 257,
  limelightY: 286,
  housingFront: 112,
  plateX: 201,
  pivot: V(0, 180, 90),
  transferMotor: V(0, 234, 132),
  intakeShaft: V(0, 50, 232),
};

export function createReaperModel(options: ReaperModelOptions = {}): THREE.Group {
  const shadows = options.shadows ?? true;
  const colors = {
    accent: new THREE.Color(options.colors?.accent ?? "#ffffff"),
    eye: new THREE.Color(options.colors?.eye ?? "#ffffff"),
  };
  const tex = makeTextures();
  const b = new Builder();

  const root = new THREE.Group();
  root.name = "reaper";
  root.scale.setScalar(MM);

  const drive = partGroup("drive");
  const intake = partGroup("intake", D.pivot.clone());
  const transfer = partGroup("transfer");
  const shooter = partGroup("shooter");
  const aiming = partGroup("aiming");
  const protection = partGroup("protection");
  const electronics = partGroup("electronics");
  root.add(drive, intake, transfer, shooter, aiming, protection, electronics);

  // ----- Drivetrain: U-channel rails and towers, deck plate, mecanum wheels, motors ----------
  {
    const X = V(1, 0, 0);
    const Y = V(0, 1, 0);
    const Z = V(0, 0, 1);
    for (const s of [-1, 1]) {
      const x = s * D.railX;
      // Base rail along Z, open toward the inside.
      b.add(drive, "alu", uChannel(D.railZ * 2), orient(V(x, D.railY, 0), Z, V(-s, 0, 0)));
      // Towers, base plate facing out of the robot (front towers face forward, rear face back).
      const towerLen = D.towerTop - (D.railY + 24);
      const towerY = D.railY + 24 + towerLen / 2;
      b.add(drive, "alu", uChannel(towerLen), orient(V(x, towerY, D.frontTowerZ), Y, V(0, 0, -1)));
      b.add(drive, "alu", uChannel(towerLen), orient(V(x, towerY, D.rearTowerZ), Y, V(0, 0, 1)));
      // Top rail between the towers.
      const topLen = D.frontTowerZ - 24 - (D.rearTowerZ + 24);
      const topZ = (D.frontTowerZ - 24 + D.rearTowerZ + 24) / 2;
      b.add(drive, "alu", uChannel(topLen), orient(V(x, D.towerTop - 24, topZ), Z, V(-s, 0, 0)));
    }
    const crossLen = (D.railX - 24) * 2;
    b.add(drive, "alu", uChannel(crossLen), orient(V(0, D.railY, D.rearTowerZ), X, V(0, 0, 1)));
    b.add(drive, "alu", uChannel(crossLen), orient(V(0, D.towerTop - 24, D.rearTowerZ), X, V(0, 0, 1)));
    // Belly plate between the rails for the Pinpoint, clear of the artifact path above it.
    b.add(drive, "alu", holePlate(crossLen, 3, 48), at(0, 30, 92));

    // Grid plate over the front towers.
    // Grid plates over the front towers, split to clear the transfer motor.
    for (const s of [-1, 1]) b.add(drive, "alu", holePlate(84, 3, 84), at(s * 110, D.towerTop + 1.5, 130));

    // Mecanum wheels in the X pattern.
    const rollers: THREE.Matrix4[] = [];
    let roller = { r: 10, len: 40 };
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        const hand = (sx > 0) === (sz > 0) ? 1 : -1;
        const w = mecanum(b, drive, V(sx * D.wheelX, D.wheelR, sz * D.wheelZ), D.wheelR, 38, hand as 1 | -1, 10);
        rollers.push(...w.matrices);
        roller = { r: w.rollerR, len: w.rollerLen };
        // Axle from the bevel box through the rail to the wheel.
        b.add(drive, "steel", cylX(4, D.wheelX - 80 + 22, 12), at(sx * ((D.wheelX + 80) / 2 + 6), D.wheelR, sz * D.wheelZ));
        // Bearing block on the rail.
        b.add(drive, "dark", box(5, 30, 30), at(sx * (D.railX + 26.5), D.wheelR, sz * D.wheelZ));
        gearmotorZ(b, drive, sx * 80, D.wheelR, sz * D.wheelZ, (sz > 0 ? -1 : 1) as 1 | -1);
      }
    b.instance(drive, "rubber", rollerGeometry(roller.r, roller.len), rollers);

    // Socket heads where towers meet rails and plates.
    const heads: [number, number, number, THREE.Vector3][] = [];
    for (const s of [-1, 1]) {
      for (const y of [88, 112, 220, 244]) {
        heads.push([s * (D.railX - 12), y, D.frontTowerZ + 24, V(0, 0, 1)]);
        heads.push([s * (D.railX + 12), y, D.frontTowerZ + 24, V(0, 0, 1)]);
        heads.push([s * (D.railX - 12), y, D.rearTowerZ - 24, V(0, 0, -1)]);
        heads.push([s * (D.railX + 12), y, D.rearTowerZ - 24, V(0, 0, -1)]);
      }
      for (const z of [-152, -128, 108, 132, -60, -36, 36, 60])
        heads.push([s * (D.railX + 24), D.railY + (z % 48 === 0 ? 8 : -8), z, V(s, 0, 0)]);
    }
    for (const x of [-140, -116, 116, 140]) for (const z of [100, 160]) heads.push([x, D.towerTop + 3, z, V(0, 1, 0)]);
    b.instance(drive, "dark", new THREE.CylinderGeometry(4.2, 4.2, 3.2, 10), socketHeads(heads));
  }

  // ----- Intake: lifting arms on the transfer shaft, chains, roller with mecanum and gecko wheels
  {
    const shaft = D.intakeShaft.clone().sub(D.pivot); // relative to the pivot
    // Shaft and its wheels.
    b.add(intake, "steel", cylX(4, 392, 12), at(shaft.x, shaft.y, shaft.z));
    const rollers: THREE.Matrix4[] = [];
    let roller = { r: 7, len: 28 };
    for (const s of [-1, 1]) {
      for (const x of [128, 160]) {
        const w = mecanum(b, intake, V(s * x, shaft.y, shaft.z), 40, 28, (s > 0 ? 1 : -1) as 1 | -1, 9);
        rollers.push(...w.matrices);
        roller = { r: w.rollerR, len: w.rollerLen };
      }
      for (const x of [30, 58]) {
        b.add(intake, "gecko", cylX(36, 26, 44), at(s * x, shaft.y, shaft.z));
        b.add(intake, "dark", cylX(15, 28, 20), at(s * x, shaft.y, shaft.z));
      }
    }
    // Printed bearing block between the two gecko pairs.
    b.add(intake, "black", box(30, 44, 40), at(0, shaft.y + 6, shaft.z - 6));
    b.instance(intake, "rubber", rollerGeometry(roller.r, roller.len), rollers);

    // Arms: perforated plates from the pivot to the shaft, with a chain inside each.
    const armLen = shaft.length();
    const armAngle = Math.atan2(shaft.y, shaft.z); // in the side plane
    const mid = shaft.clone().multiplyScalar(0.5);
    const linkGeo = box(4, 3.4, 7.4);
    const links: THREE.Matrix4[] = [];
    for (const s of [-1, 1]) {
      const plate = holePlate(28, 4, armLen + 44).rotateZ(Math.PI / 2);
      b.add(intake, "alu", plate, at(s * 97, mid.y, mid.z, -armAngle, 0, 0));
      // Sprockets at both ends.
      for (const p of [V(0, 0, 0), shaft]) {
        b.add(intake, "dark", sprocket(16, 17.5, 14.5, 4), at(s * 88, p.y, p.z));
        b.add(intake, "steel", cylX(5, 10, 10), at(s * 102, p.y, p.z));
      }
      // Chain around a stadium path between the sprockets.
      const r = 16;
      const dir = shaft.clone().normalize();
      const normal = V(0, dir.z, -dir.y);
      const pitch = 8;
      const total = 2 * armLen + 2 * Math.PI * r;
      const n = Math.round(total / pitch);
      for (let i = 0; i < n; i++) {
        const d = (i / n) * total;
        let p: THREE.Vector3;
        let t: THREE.Vector3;
        if (d < armLen) {
          p = normal.clone().multiplyScalar(r).addScaledVector(dir, d);
          t = dir.clone();
        } else if (d < armLen + Math.PI * r) {
          const a = (d - armLen) / r;
          p = shaft
            .clone()
            .addScaledVector(normal, Math.cos(a) * r)
            .addScaledVector(dir, Math.sin(a) * r);
          t = dir.clone().multiplyScalar(Math.cos(a)).addScaledVector(normal, -Math.sin(a));
        } else if (d < 2 * armLen + Math.PI * r) {
          const e = d - armLen - Math.PI * r;
          p = shaft.clone().addScaledVector(normal, -r).addScaledVector(dir, -e);
          t = dir.clone().negate();
        } else {
          const a = (d - 2 * armLen - Math.PI * r) / r;
          p = V(0, 0, 0)
            .addScaledVector(normal, -Math.cos(a) * r)
            .addScaledVector(dir, -Math.sin(a) * r);
          t = dir.clone().multiplyScalar(-Math.cos(a)).addScaledVector(normal, Math.sin(a));
        }
        const q = new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), t.normalize());
        links.push(new THREE.Matrix4().compose(V(s * 88, p.y, p.z), q, V(1, 1, 1)));
      }
    }
    b.instance(intake, "steel", linkGeo, links);

    // Compliant front flaps between the mecanum stacks and the arms, like the CAD's printed guides.
    for (const s of [-1, 1]) {
      const flap = new THREE.Shape();
      flap.moveTo(0, 0);
      flap.lineTo(46, -22);
      flap.lineTo(58, -6);
      flap.lineTo(12, 16);
      flap.closePath();
      b.add(intake, "black", sideExtrude(flap, 6, s * 112 + 3), at(0, shaft.y - 4, shaft.z - 30));
    }
  }

  // ----- Transfer: curved ramp, gecko wheels on the pivot shaft, 1150 RPM motor, servo gate ------
  {
    const rampY = (z: number) =>
      30 + ((205 - z) / 330) * 190 - 12 * Math.sin((Math.PI * (205 - z)) / 330);
    const top: [number, number][] = [];
    for (let i = 0; i <= 30; i++) {
      const z = 205 - (i / 30) * 330;
      top.push([z, rampY(z)]);
    }
    const band = (lift: number, thick: number) => {
      const s = new THREE.Shape();
      top.forEach(([z, y], i) => (i === 0 ? s.moveTo(z, y + lift) : s.lineTo(z, y + lift)));
      for (let i = top.length - 1; i >= 0; i--) s.lineTo(top[i][0], top[i][1] + lift - thick);
      return s;
    };
    b.add(transfer, "black", sideExtrude(band(0, 4), 130, 65));
    for (const s of [-1, 1]) b.add(transfer, "black", sideExtrude(band(26, 26), 4, s * 67 + 2));
    for (const z of [150, 60, -30, -110])
      b.add(transfer, "black", box(130, 18, 4), at(0, rampY(z) - 12, z));

    // The pivot shaft carries the transfer's gecko wheels; the intake arms hang from it.
    const p = D.pivot;
    b.add(transfer, "steel", cylX(4, 202, 12), at(0, p.y, p.z));
    for (const s of [-1, 1]) {
      b.add(transfer, "gecko", cylX(34, 30, 44), at(s * 30, p.y, p.z));
      b.add(transfer, "dark", cylX(15, 32, 20), at(s * 30, p.y, p.z));
    }
    // The 1150 RPM motor across the front, under the Limelight, belted down to the shaft.
    const m = D.transferMotor;
    gearmotor(b, transfer, 54, m.y, m.z, -1, 110);
    b.add(transfer, "dark", cylX(10, 10, 20), at(64, m.y, m.z));
    b.add(transfer, "dark", cylX(12, 10, 20), at(64, p.y, p.z));
    const beltLen = Math.hypot(m.y - p.y, m.z - p.z);
    const beltAngle = Math.atan2(m.y - p.y, m.z - p.z);
    for (const off of [-11, 11])
      b.add(
        transfer,
        "rubber",
        box(8, 2, beltLen),
        at(64, (m.y + p.y) / 2 + off * Math.cos(beltAngle), (m.z + p.z) / 2 - off * Math.sin(beltAngle), -beltAngle, 0, 0),
      );
    // Clamp blocks to the front towers.
    for (const s of [-1, 1]) b.add(transfer, "black", box(44, 40, 30), at(s * 78, m.y, m.z));

    // Servo gate at the top of the ramp.
    const gy = rampY(-118);
    b.add(transfer, "black", box(22, 40, 42), at(80, gy + 30, -118));
    b.add(transfer, "aluSolid", box(130, 3, 34), at(0, gy + 44, -126, 0.5, 0, 0));
    b.add(transfer, "steel", cylX(3, 26, 10), at(66, gy + 44, -118));

  }

  // ----- Shooter: dual weighted flywheel, two coaxial motors, printed housing, tilting hood ------
  {
    const y = D.axleY;
    const z = D.axleZ;
    b.add(shooter, "steel", cylX(4, 250, 12), at(0, y, z));
    for (const s of [-1, 1]) {
      b.add(shooter, "tread", cylX(48, 28, 64), at(s * 16, y, z));
      b.add(shooter, "dark", cylX(30, 30, 32), at(s * 16, y, z));
      // Flywheel weights on the outer faces, and shaft collars.
      b.add(shooter, "steel", cylX(36, 6, 40), at(s * 34, y, z));
      b.add(shooter, "steel", cylX(9, 8, 16), at(s * 44, y, z));
      b.add(shooter, "steel", cylX(9, 8, 16), at(s * 62, y, z));
      gearmotor(b, shooter, s * 86, y, z, s as 1 | -1, 74);
    }
    // Housing: a printed box whose top sits just above the axle, open over the flywheel. The
    // Limelight mounts on its front face.
    const hb = D.housingBottom;
    const ht = y + 10;
    const front = D.housingFront;
    const back = -90;
    const hw = 80;
    const hh = ht - hb;
    b.add(shooter, "black", box(hw * 2, hh, 6), at(0, (ht + hb) / 2, front - 3));
    b.add(shooter, "black", box(hw * 2, hh, 6), at(0, (ht + hb) / 2, back + 3));
    for (const s of [-1, 1]) {
      // Side walls with bearing bosses; bottom strips either side of the flywheel's slot.
      b.add(shooter, "black", box(22, hh, front - back), at(s * (hw - 11), (ht + hb) / 2, (front + back) / 2));
      b.add(shooter, "black", cylX(22, 6, 28), at(s * (hw + 3), y, z));
      b.add(shooter, "black", box(hw - 50, 5, front - back), at(s * (hw + 50) / 2, hb + 2.5, (front + back) / 2));
      b.add(shooter, "black", box(hw - 58, 5, front - back), at(s * (hw + 58) / 2, ht - 2.5, (front + back) / 2));
    }
    b.add(shooter, "black", box(116, 5, 34), at(0, ht - 2.5, front - 17));

    // Hood, pivoting on the flywheel axle: a thin curved plate over and behind the wheel, held
    // between two side plates that follow its curve and are bolted through into its edges, a
    // front frame with an arched opening the artifact leaves through, and a clear poly shield
    // over the top. The printed plates have chamfered edges.
    const hood = childGroup(shooter, "reaper-hood", V(0, 80, 0), V(0, y, z));
    const H = D.hoodTop - y; // hood height above the axle
    const dR = H - 16; // the curved plate's inner radius about the axle
    const deg = Math.PI / 180;
    const wallTopBack = -40; // where the side plates' flat top meets their curved back
    const wallR = Math.hypot(wallTopBack, H);
    const wall = new THREE.Shape();
    wall.moveTo(-90, -20);
    wall.lineTo(78, -20);
    wall.lineTo(84, 6);
    wall.lineTo(-8, H);
    wall.lineTo(wallTopBack, H);
    wall.absarc(0, 0, wallR, Math.atan2(H, wallTopBack), 200 * deg, false);
    wall.lineTo(-118, -52);
    wall.closePath();
    for (const s of [-1, 1]) b.add(hood, "black", sideExtrude(wall, 6, s > 0 ? 72 : -66, 40, 1));

    // The curved plate, with a raised lip along each edge where it meets the side plates and a
    // strap across the seam between its two printed halves.
    b.add(hood, "black", sideExtrude(arcBand(0, 0, dR, dR + 5, 84 * deg, 200 * deg), 132, 66, 48));
    for (const s of [-1, 1])
      b.add(hood, "black", sideExtrude(arcBand(0, 0, dR + 4, dR + 8, 86 * deg, 199 * deg), 4, s * 64 + 2, 48, 0.6));
    b.add(hood, "black", sideExtrude(arcBand(0, 0, dR + 4, dR + 7, 140 * deg, 146 * deg), 124, 62, 4, 0.6));
    // Clear shield over the top of the plate.
    b.add(hood, "acrylic", sideExtrude(arcBand(0, 0, dR + 9, dR + 11, 88 * deg, 150 * deg), 128, 64, 40));

    // Bolt heads through the side plates into the curved plate's edges, and the cross rods that
    // tie the side plates together behind the wheel.
    const hoodBolts: [number, number, number, THREE.Vector3][] = [];
    for (const s of [-1, 1]) {
      for (const a of [98, 118, 138, 158, 178, 196]) {
        const r = dR + 4;
        hoodBolts.push([s * 72, Math.sin(a * deg) * r, Math.cos(a * deg) * r, V(s, 0, 0)]);
      }
    }
    for (const [ry, rz] of [
      [-8, -110],
      [52, -116],
    ]) {
      b.add(hood, "steel", cylX(3, 152, 10), at(0, ry, rz));
      for (const s of [-1, 1]) b.add(hood, "dark", cylX(5.2, 3, 6), at(s * 77.5, ry, rz));
    }

    // Front frame in the plane of the side plates' front edges.
    const fb = V(0, 6, 84);
    const ft = V(0, H, -8);
    const along = ft.clone().sub(fb);
    const L = along.length();
    along.normalize();
    const outward = new THREE.Vector3().crossVectors(V(1, 0, 0), along);
    const archR = 52;
    const frame = new THREE.Shape();
    frame.moveTo(-72, 0);
    frame.lineTo(-72, L);
    frame.lineTo(72, L);
    frame.lineTo(72, 0);
    frame.lineTo(archR, 0);
    frame.lineTo(archR, L - 14 - archR);
    frame.absarc(0, L - 14 - archR, archR, 0, Math.PI, false);
    frame.lineTo(-archR, 0);
    frame.closePath();
    const frameGeo = new THREE.ExtrudeGeometry(frame, {
      depth: 6.4,
      bevelEnabled: true,
      bevelThickness: 0.8,
      bevelSize: 0.8,
      bevelOffset: -0.8,
      bevelSegments: 1,
      curveSegments: 32,
    }).translate(0, 0, 0.8);
    const frameMatrix = new THREE.Matrix4()
      .makeBasis(V(1, 0, 0), along, outward)
      .setPosition(fb.clone().addScaledVector(outward, -8));
    b.add(hood, "black", frameGeo, frameMatrix);
    // Bolts down each side of the frame, into the side plates' front edges.
    for (const s of [-1, 1])
      for (const t of [0.16, 0.5, 0.84])
        hoodBolts.push([s * 62, fb.y + along.y * t * L, fb.z + along.z * t * L, outward.clone()]);
    b.instance(hood, "dark", new THREE.CylinderGeometry(3.6, 3.6, 2.6, 10), socketHeads(hoodBolts));
    // Top bar behind the frame, between the side plates.
    b.add(hood, "black", box(132, 8, 32), at(0, H - 4, -24));

    // Hood servo on the right of the housing, behind the motor, with a link to the wall.
    b.add(shooter, "black", box(20, 40, 38), at(-92, ht + 4, -62));
    b.add(shooter, "steel", cylX(4, 10, 10), at(-104, ht + 14, -62));
    b.add(hood, "aluSolid", box(4, 6, 64), at(-78, 22, -56, 0.9, 0, 0));
  }

  // ----- Aiming: Limelight 3A on the housing face, under the hood, tilted up ----------------------
  {
    aiming.position.set(0, D.limelightY, D.housingFront + 12);
    aiming.userData.basePosition = aiming.position.clone();
    const holder = childGroup(aiming, "reaper-limelight-body", V(0, 0, 0));
    holder.rotation.x = -0.12;
    b.add(holder, "black", box(82, 50, 24), at(0, 0, 0));
    b.add(holder, "dark", box(76, 44, 1.5), at(0, 0, 12.4));
    b.add(holder, "dark", cylZ(11, 4, 32), at(0, 8, 13.5));
    b.add(holder, "lens", cylZ(7.5, 4, 32), at(0, 8, 15));
    b.add(holder, "emitter", box(4, 4, 2), at(30, 15, 13.5));
    b.add(holder, "wordmark", new THREE.PlaneGeometry(60, 7.5), at(0, -12, 13.3));
    for (const x of [-34, 34]) b.add(holder, "steel", cylZ(2.6, 2, 8), at(x, -19, 12.6));
    // USB lead out of the right side.
    b.add(holder, "can", box(10, 6, 12), at(46, 2, 2));
  }

  // ----- Protection: plywood side plates, standoffs, guard rods, acrylic hub shield --------------
  {
    const plateShape = () => {
      const s = new THREE.Shape();
      s.moveTo(-186, 14);
      s.lineTo(196, 14);
      s.lineTo(246, 64);
      s.lineTo(246, 150);
      s.lineTo(176, 300);
      s.lineTo(-150, 300);
      s.lineTo(-186, 266);
      s.closePath();
      const slot = new THREE.Path();
      slot.moveTo(-110, 258);
      slot.lineTo(-20, 258);
      slot.absarc(-20, 268, 10, -Math.PI / 2, Math.PI / 2, false);
      slot.lineTo(-110, 278);
      slot.absarc(-110, 268, 10, Math.PI / 2, (3 * Math.PI) / 2, false);
      s.holes.push(slot);
      return s;
    };
    for (const s of [-1, 1]) {
      const side = childGroup(protection, s > 0 ? "reaper-plate-left" : "reaper-plate-right", V(s * 170, 0, 0));
      b.add(side, "wood", sideExtrude(plateShape(), 6, s > 0 ? D.plateX + 6 : -D.plateX, 16));
      // Team number plate on the outer face.
      const label = new THREE.PlaneGeometry(150, 46);
      b.add(side, "numberPlate", label, at(s * (D.plateX + 6.6), 128, -40, 0, (s * Math.PI) / 2, 0));
      // Standoffs back to the towers.
      for (const [yy, zz] of [
        [116, D.frontTowerZ],
        [236, D.frontTowerZ],
        [116, D.rearTowerZ],
        [236, D.rearTowerZ],
        [236, -10],
      ]) {
        b.add(side, "steel", cylX(4.5, D.plateX - 149, 12), at(s * ((D.plateX + 149) / 2), yy, zz));
        b.add(side, "dark", cylX(5, 3, 10), at(s * (D.plateX + 7.5), yy, zz));
      }
      // Bent guard rod over the top and down the front edge.
      b.add(
        side,
        "black",
        tube(
          [
            [s * 214, 286, -170],
            [s * 216, 312, -40],
            [s * 217, 300, 110],
            [s * 218, 224, 210],
            [s * 214, 130, 244],
            [s * 210, 82, 248],
          ],
          4.5,
          80,
          10,
        ),
      );
      for (const [yy, zz] of [
        [292, -150],
        [300, 120],
        [140, 236],
      ])
        b.add(side, "dark", cylX(5, 18, 10), at(s * 209, yy, zz));
    }
    const shield = childGroup(protection, "reaper-shield", V(0, 40, -130));
    b.add(shield, "acrylic", box(214, 236, 3), at(0, 190, -197));
    for (const [x, yy] of [
      [-98, 80],
      [98, 80],
      [-98, 300],
      [98, 300],
    ]) {
      b.add(shield, "steel", cylZ(3.5, 24, 10), at(x, yy, -185));
      b.add(shield, "dark", cylZ(5, 2, 10), at(x, yy, -199.5));
    }
  }

  // ----- Electronics: Control Hub + Expansion Hub on the back, battery, Pinpoint, gate lights ----
  {
    // Each hub: the case, a raised lid edge round its face, the printed label sunk inside that
    // edge, a recessed port strip with its sockets, header rows along both long edges, corner
    // screws and the status LED. The small repeated parts are instanced.
    const ports: THREE.Matrix4[] = [];
    const headers: THREE.Matrix4[] = [];
    const hubScrews: [number, number, number, THREE.Vector3][] = [];
    const hub = (cy: number, label: "control" | "expansion") => {
      const face = -188;
      b.add(electronics, "board", box(143, 103, 20), at(0, cy, -178));
      for (const sy of [-1, 1]) b.add(electronics, "hubLid", box(143, 5, 2.4), at(0, cy + sy * 49, face - 1.2));
      for (const sx of [-1, 1]) b.add(electronics, "hubLid", box(5, 93, 2.4), at(sx * 69, cy, face - 1.2));
      const plate = new THREE.PlaneGeometry(96, 24);
      const uv = plate.getAttribute("uv");
      for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * 0.5 + (label === "control" ? 0.5 : 0));
      b.add(electronics, "hubLabel", plate, at(-10, cy + 20, face - 0.1, 0, Math.PI, 0));
      b.add(electronics, "black", box(126, 16, 1), at(0, cy - 22, face - 0.5));
      for (let i = 0; i < 11; i++) ports.push(at(-55 + i * 11, cy - 22, face - 1.6));
      for (const sy of [-1, 1])
        for (let i = 0; i < 9; i++) headers.push(at(-56 + i * 14, cy + sy * 52.6, -180, 0, 0, sy > 0 ? 0 : Math.PI));
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) hubScrews.push([sx * 60, cy + sy * 40, face, V(0, 0, -1)]);
      b.add(electronics, "emitter", box(4, 4, 1.5), at(56, cy - 38, face - 0.8));
    };
    hub(241, "control");
    hub(131, "expansion");
    b.instance(electronics, "black", box(8, 9, 3), ports);
    b.instance(electronics, "black", box(10, 3, 9), headers);
    b.instance(electronics, "dark", new THREE.CylinderGeometry(3, 3, 1.6, 8), socketHeads(hubScrews));
    // Battery under the ramp, laid flat.
    b.add(electronics, "board", box(78, 42, 152), at(0, 30, -40));
    b.add(electronics, "band", box(79, 18, 100), at(0, 34, -40));
    // goBILDA Pinpoint odometry computer.
    b.add(electronics, "black", box(42, 12, 42), at(0, 38, 92));
    b.add(electronics, "emitter", box(3, 2, 3), at(14, 45, 104));
    // RGB gate lights on the housing's outer faces, near the front.
    for (const s of [-1, 1]) {
      b.add(electronics, "black", box(14, 22, 22), at(s * 87, D.limelightY + 10, D.housingFront - 16));
      b.add(
        electronics,
        "emitter",
        new THREE.SphereGeometry(8, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        at(s * 94, D.limelightY + 10, D.housingFront - 16, 0, 0, -s * (Math.PI / 2)),
      );
    }
    // Wiring: dark runs and lighter (red in life) runs from the hubs out to the motors.
    const runs: [MatKey, [number, number, number][]][] = [
      ["cable", [[50, 190, -170], [96, 220, -120], [110, 300, -60], [128, 318, -20]]],
      ["cableLight", [[40, 190, -170], [-96, 214, -110], [-108, 298, -60], [-128, 318, -20]]],
      ["cable", [[-40, 90, -168], [-70, 70, -120], [-80, 70, -40]]],
      ["cableLight", [[30, 90, -168], [70, 76, -120], [80, 72, -30]]],
      ["cable", [[60, 250, -170], [120, 262, -40], [92, 290, 60], [60, 286, 100]]],
      ["cableLight", [[-60, 250, -170], [-118, 262, 20], [-132, 268, 140]]],
      ["cable", [[0, 30, 16], [20, 50, 60], [0, 60, -130], [-20, 110, -168]]],
      ["cableLight", [[10, 270, -170], [60, 276, -60], [40, 300, 60], [20, 318, 88]]],
      ["cable", [[0, 21, 92], [40, 30, 40], [40, 80, -150], [0, 120, -168]]],
    ];
    for (const [key, pts] of runs) b.add(electronics, key, tube(pts, 2.2, 48, 6));
  }

  // ----- Merge batches into meshes -------------------------------------------------------------
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  const mat = (sub: ReaperPartId, key: MatKey) => {
    const id = `${sub}:${key}`;
    let m = materials.get(id);
    if (!m) {
      m = makeMaterial(key, tex, colors);
      m.name = id;
      m.userData.key = key;
      m.userData.sub = sub;
      m.userData.baseColor = m.color.clone();
      m.userData.baseOpacity = m.opacity;
      m.userData.baseEmissive = m.emissive.clone();
      m.userData.baseEmissiveIntensity = m.emissiveIntensity;
      m.userData.focusRim = { value: new THREE.Color(0, 0, 0) };
      m.onBeforeCompile = reaperShader;
      materials.set(id, m);
    }
    return m;
  };

  for (const [group, byKey] of b.batches) {
    const sub = group.userData.sub as ReaperPartId;
    for (const [key, list] of byKey) {
      const merged = mergeGeometries(list.map(normalizeForMerge), false);
      list.forEach((g) => g.dispose());
      if (!merged) continue;
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, mat(sub, key));
      mesh.name = `${group.name}:${key}`;
      const transparent = key === "acrylic" || key === "wordmark";
      mesh.castShadow = shadows && !transparent;
      mesh.receiveShadow = shadows && !transparent;
      if (transparent) mesh.renderOrder = 2;
      group.add(mesh);
    }
  }
  for (const { group, key, geometry, matrices } of b.instanced) {
    const sub = group.userData.sub as ReaperPartId;
    const mesh = new THREE.InstancedMesh(geometry, mat(sub, key), matrices.length);
    matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.name = `${group.name}:${key}:instanced`;
    mesh.castShadow = shadows;
    mesh.receiveShadow = shadows;
    group.add(mesh);
  }

  root.userData.textures = tex;
  root.userData.materials = materials;
  root.userData.explode = 0;
  root.userData.focus = {} as Partial<Record<ReaperPartId, number>>;
  root.userData.dim = 0;
  root.userData.accent = colors.accent;
  root.userData.outlines = new Map<ReaperPartId, PartOutline>();
  root.userData.outlineViewport = { value: new THREE.Vector2(1000, 1000) };
  return root;
}

// ---------------------------------------------------------------------------------------------
// Selection outline: an inverted hull in the accent color round a highlighted subsystem. Each
// mesh's hull is a copy with its vertices welded and its normals smoothed, so pushing it out
// along them closes round corners, drawn back faces only and pushed out by a fixed number of
// CSS pixels in clip space. Hulls are built the first time a subsystem is highlighted.

/** Outline width in CSS pixels at full highlight. */
const OUTLINE_PX = 1.75;

/** Meshes left out of the hull: flat labels and glass, the LEDs, and the perforated channel
    (a solid hull behind its holes would show through every one of them). */
const NO_OUTLINE: ReadonlySet<MatKey> = new Set<MatKey>([
  "wordmark",
  "numberPlate",
  "hubLabel",
  "acrylic",
  "alu",
  "emitter",
]);

const OUTLINE_VERTEX = /* glsl */ `
uniform float outlineWidth;
uniform vec2 outlineViewport;
void main() {
  vec4 local = vec4( position, 1.0 );
  vec3 n = normal;
  #ifdef USE_INSTANCING
    local = instanceMatrix * local;
    n = mat3( instanceMatrix ) * n;
  #endif
  vec4 clip = projectionMatrix * modelViewMatrix * local;
  vec2 dir = ( normalMatrix * n ).xy;
  float len = length( dir );
  if ( len > 1e-5 ) clip.xy += dir / len * outlineWidth * 2.0 / outlineViewport * clip.w;
  gl_Position = clip;
}
`;

const OUTLINE_FRAGMENT = /* glsl */ `
uniform vec3 outlineColor;
void main() {
  gl_FragColor = vec4( outlineColor, 1.0 );
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

type PartOutline = { material: THREE.ShaderMaterial; meshes: THREE.Mesh[] };

function partOutline(model: THREE.Object3D, id: ReaperPartId): PartOutline {
  const outlines = model.userData.outlines as Map<ReaperPartId, PartOutline>;
  const existing = outlines.get(id);
  if (existing) return existing;
  const material = new THREE.ShaderMaterial({
    uniforms: {
      outlineColor: { value: new THREE.Color() },
      outlineWidth: { value: 0 },
      outlineViewport: model.userData.outlineViewport as THREE.IUniform<THREE.Vector2>,
    },
    vertexShader: OUTLINE_VERTEX,
    fragmentShader: OUTLINE_FRAGMENT,
    side: THREE.BackSide,
  });
  const sources: THREE.Mesh[] = [];
  model.getObjectByName(`reaper-${id}`)?.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || mesh.userData.outline) return;
    if (NO_OUTLINE.has((mesh.material as THREE.Material).userData.key as MatKey)) return;
    sources.push(mesh);
  });
  const meshes: THREE.Mesh[] = [];
  for (const source of sources) {
    const shell = new THREE.BufferGeometry();
    shell.setAttribute("position", source.geometry.getAttribute("position").clone());
    if (source.geometry.index) shell.setIndex(source.geometry.index.clone());
    const hull = mergeVertices(shell, 0.05);
    shell.dispose();
    hull.computeVertexNormals();
    let outline: THREE.Mesh;
    if ((source as THREE.InstancedMesh).isInstancedMesh) {
      const instanced = source as THREE.InstancedMesh;
      const copy = new THREE.InstancedMesh(hull, material, instanced.count);
      copy.instanceMatrix = instanced.instanceMatrix;
      copy.computeBoundingSphere();
      outline = copy;
    } else outline = new THREE.Mesh(hull, material);
    outline.name = `${source.name}:outline`;
    outline.userData.outline = true;
    outline.raycast = () => {};
    outline.visible = false;
    outline.position.copy(source.position);
    outline.quaternion.copy(source.quaternion);
    source.parent?.add(outline);
    meshes.push(outline);
  }
  const entry = { material, meshes };
  outlines.set(id, entry);
  return entry;
}

/** The canvas size in CSS pixels, so the outline keeps its width in pixels. */
export function setReaperViewport(model: THREE.Object3D, width: number, height: number) {
  (model.userData.outlineViewport as THREE.IUniform<THREE.Vector2> | undefined)?.value.set(
    Math.max(1, width),
    Math.max(1, height),
  );
}

// ---------------------------------------------------------------------------------------------
// Runtime controls

function materialsOf(model: THREE.Object3D) {
  return (model.userData.materials as Map<string, THREE.MeshStandardMaterial> | undefined) ?? new Map();
}

function applyPose(model: THREE.Object3D) {
  const t = (model.userData.explode as number) ?? 0;
  const focus = (model.userData.focus as Partial<Record<ReaperPartId, number>>) ?? {};
  model.traverse((obj) => {
    const explode = obj.userData.explode as THREE.Vector3 | undefined;
    const base = obj.userData.basePosition as THREE.Vector3 | undefined;
    if (!explode || !base) return;
    const sub = obj.userData.sub as ReaperPartId | undefined;
    const pop = sub ? (focus[sub] ?? 0) * FOCUS_POP : 0;
    obj.position.copy(base).addScaledVector(explode, t + pop);
  });
}

/** Spread the subsystems apart: 0 is assembled, 1 fully exploded. */
export function setReaperExplode(model: THREE.Object3D, t: number) {
  model.userData.explode = THREE.MathUtils.clamp(t, 0, 1);
  applyPose(model);
}

/**
 * Highlight subsystems. `weights` gives each subsystem's highlight from 0 to 1 (the stage eases
 * these), and `dim` (0 to 1) darkens everything that is not highlighted. A highlighted part keeps
 * its shading and takes an accent outline and a rim along its silhouette (see RIM_FRAGMENT).
 */
export function setReaperFocus(
  model: THREE.Object3D,
  weights: Partial<Record<ReaperPartId, number>>,
  dim: number,
) {
  model.userData.focus = { ...weights };
  model.userData.dim = dim;
  const accent = model.userData.accent as THREE.Color;
  for (const m of materialsOf(model).values()) {
    const sub = m.userData.sub as ReaperPartId;
    const key = m.userData.key as MatKey;
    const w = weights[sub] ?? 0;
    const shade = 1 - 0.62 * dim * (1 - w);
    m.color.copy(m.userData.baseColor as THREE.Color).multiplyScalar(shade);
    if (key === "emitter") continue;
    (m.userData.focusRim as THREE.IUniform<THREE.Color>).value.copy(accent).multiplyScalar(w);
    if (key === "acrylic")
      m.opacity = (m.userData.baseOpacity as number) * (0.4 + 0.6 * shade) + 0.12 * w;
  }
  const outlines = model.userData.outlines as Map<ReaperPartId, PartOutline> | undefined;
  if (outlines) {
    for (const id of REAPER_PART_IDS) {
      const w = weights[id] ?? 0;
      const outline = w > 0.01 ? partOutline(model, id) : outlines.get(id);
      if (!outline) continue;
      outline.material.uniforms.outlineColor.value.copy(accent);
      outline.material.uniforms.outlineWidth.value = OUTLINE_PX * w;
      for (const mesh of outline.meshes) mesh.visible = w > 0.01;
    }
  }
  applyPose(model);
}

/** Theme colors: LEDs take `eye`, the highlight takes `accent`. No rebuild. */
export function setReaperColors(model: THREE.Object3D, colors: Partial<ReaperColors>) {
  const accent = model.userData.accent as THREE.Color;
  if (colors.accent !== undefined) accent.set(colors.accent);
  for (const m of materialsOf(model).values()) {
    if (m.userData.key === "emitter" && colors.eye !== undefined) {
      m.emissive.set(colors.eye);
      m.emissiveIntensity = m.userData.baseEmissiveIntensity as number;
      m.userData.baseEmissive = m.emissive.clone();
    }
  }
  setReaperFocus(model, model.userData.focus ?? {}, model.userData.dim ?? 0);
}

/** Tilt the hood about the flywheel axle, in radians (positive raises the exit). */
export function setReaperHood(model: THREE.Object3D, angle: number) {
  const hood = model.getObjectByName("reaper-hood");
  if (hood) hood.rotation.x = -angle;
}

/** Lift the intake about the transfer shaft, 0 down to 1 fully raised. */
export function setReaperIntakeLift(model: THREE.Object3D, t: number) {
  const intake = model.getObjectByName("reaper-intake");
  if (intake) intake.rotation.x = -0.45 * THREE.MathUtils.clamp(t, 0, 1);
}

/** The subsystem a raycast hit belongs to. */
export function reaperPartOf(object: THREE.Object3D | null): ReaperPartInfo | null {
  for (let o: THREE.Object3D | null = object; o; o = o.parent) {
    const part = o.userData.part as ReaperPartInfo | undefined;
    if (part) return part;
  }
  return null;
}

export function reaperStats(model: THREE.Object3D) {
  let triangles = 0;
  let drawCalls = 0;
  model.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    drawCalls++;
    const g = mesh.geometry;
    const tris = (g.index ? g.index.count : g.getAttribute("position").count) / 3;
    triangles += tris * ((obj as THREE.InstancedMesh).isInstancedMesh ? (obj as THREE.InstancedMesh).count : 1);
  });
  return { triangles: Math.round(triangles), drawCalls };
}

export function disposeReaperModel(model: THREE.Object3D) {
  model.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh) mesh.geometry.dispose();
  });
  for (const m of materialsOf(model).values()) m.dispose();
  const outlines = model.userData.outlines as Map<ReaperPartId, PartOutline> | undefined;
  outlines?.forEach((outline) => outline.material.dispose());
  const tex = model.userData.textures as Textures | undefined;
  if (tex) Object.values(tex).forEach((t) => t.dispose());
}
