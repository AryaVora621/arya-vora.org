/**
 * Live stage for the roboPet line drawing: renderer, two white lights, a fixed camera, drag or
 * arrow keys to turn around Y, picking, and the explode / assemble tween. Loaded lazily by RoboPetFigure, and
 * by the dev capture page that renders the fallback stills.
 *
 * Nothing moves on its own. Frames are drawn only while a drag settles or the tween runs.
 */
import * as THREE from "three";
import {
  createRoboPetModel,
  disposeRoboPetModel,
  getRoboPetFaceMeshes,
  getRoboPetPartId,
  paintRoboPet,
  sampleRoboPetPoints,
  setRoboPetExplode,
  setRoboPetLineResolution,
  updateRoboPetSilhouettes,
  type RoboPetPalette,
  type RoboPetPartId,
} from "./createRoboPetModel";
import { shouldUseStill } from "./gpu";
import type { PartKey } from "./RoboPetFigure";

/** Which model parts each row of the parts table selects. */
export const PART_MODEL_IDS: Record<PartKey, readonly RoboPetPartId[]> = {
  shell: ["shell-top", "status-led"],
  face: ["face"],
  camera: ["camera"],
  electronics: ["electronics"],
  power: ["power"],
  legs: ["leg-fl", "leg-fr", "leg-rl", "leg-rr"],
  chassis: ["shell-bottom"],
};

const KEY_OF = new Map<RoboPetPartId, PartKey>(
  (Object.entries(PART_MODEL_IDS) as [PartKey, readonly RoboPetPartId[]][]).flatMap(([key, ids]) =>
    ids.map((id) => [id, key] as const),
  ),
);

export type RoboPetStageOptions = {
  exploded: boolean;
  selected: PartKey | null;
  /** Called with the part under a click or tap (null for empty space). */
  onPick?: (key: PartKey | null) => void;
  /** Accessible name for the canvas. */
  label?: string;
  /** Override the device pixel ratio (the still capture renders at a fixed size). */
  pixelRatio?: number;
  /** The GPU dropped the WebGL context (a reset, or a backgrounded phone tab). Show the still. */
  onLost?: () => void;
  /** The context came back and the model is drawn again. */
  onRestored?: () => void;
};

export type RoboPetStage = {
  canvas: HTMLCanvasElement;
  setExploded: (exploded: boolean, options?: { immediate?: boolean }) => void;
  setSelected: (key: PartKey | null) => void;
  /** Draw now and return the frame as a PNG data URL (transparent background). */
  capture: () => string;
  dispose: () => void;
};

/** Initial turn: the face points toward the reader's right, three quarters on. */
export const ROBOPET_START_YAW = 0.62;
/** Camera elevation, fixed: a polar angle of 74 degrees. */
const ELEVATION = THREE.MathUtils.degToRad(16);
const FOV = 26;
/** Share of the frame the model may fill, per axis. */
const FILL = 0.9;
const DAMPING = 0.12;
/** One press of an arrow key turns the model this far: 15 degrees, 24 presses for a full turn. */
const KEY_STEP = Math.PI / 12;
const TWEEN_MS = 500;

// cubic-bezier(0.16, 1, 0.3, 1), the site's one easing curve.
const EASE = cubicBezier(0.16, 1, 0.3, 1);

function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const bez = (t: number, a: number, b: number) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  const slope = (t: number, a: number, b: number) =>
    3 * a * (1 - t) ** 2 + 6 * (b - a) * t * (1 - t) + 3 * (1 - b) * t * t;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const d = slope(t, x1, x2);
      if (Math.abs(d) < 1e-6) break;
      t -= (bez(t, x1, x2) - x) / d;
    }
    // Newton can overshoot on the steep start of this curve; bisection settles it.
    if (!(t >= 0 && t <= 1) || Math.abs(bez(t, x1, x2) - x) > 1e-4) {
      let lo = 0;
      let hi = 1;
      for (let i = 0; i < 30; i++) {
        t = (lo + hi) / 2;
        if (bez(t, x1, x2) < x) lo = t;
        else hi = t;
      }
    }
    return bez(t, y1, y2);
  };
}

/** Read the color tokens from :root. Called again whenever the color scheme flips. */
function readPalette(): RoboPetPalette {
  const css = getComputedStyle(document.documentElement);
  const token = (name: string, fallback: THREE.Color) => {
    const value = css.getPropertyValue(name).trim();
    if (!value) return fallback;
    return new THREE.Color().setStyle(value);
  };
  const dark = matchMedia("(prefers-color-scheme: dark)").matches;
  const black = new THREE.Color(0, 0, 0);
  const white = new THREE.Color(1, 1, 1);
  const paper = token("--paper", dark ? black : white);
  const ink = token("--ink", dark ? white : black);
  return {
    paper,
    ink,
    muted: token("--muted", ink.clone().lerp(paper, 0.5)),
    wash: token("--wash", paper.clone()),
  };
}

type Fit = { distance: number; targetY: number };

/**
 * Camera distance and aim that keep every sample point inside the frame at any yaw, so the
 * model never pops out of frame while it is turned and the camera never breathes in and out.
 */
function fitPoints(points: THREE.Vector3[], aspect: number): Fit {
  const tanV = Math.tan(THREE.MathUtils.degToRad(FOV) / 2) * FILL;
  const tanH = tanV * aspect;
  const back = new THREE.Vector3(0, Math.sin(ELEVATION), Math.cos(ELEVATION));
  const up = new THREE.Vector3(0, Math.cos(ELEVATION), -Math.sin(ELEVATION));
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  let targetY = (minY + maxY) / 2;
  let distance = 1;
  const q = new THREE.Vector3();
  for (let pass = 0; pass < 3; pass++) {
    distance = 0;
    let lo = Infinity;
    let hi = -Infinity;
    // Two passes over the yaw samples: the first sizes the frame, the second centers it.
    for (let step = 0; step < 24; step++) {
      const yaw = (step / 24) * Math.PI * 2;
      const c = Math.cos(yaw);
      const s = Math.sin(yaw);
      for (const p of points) {
        q.set(p.x * c + p.z * s, p.y - targetY, -p.x * s + p.z * c);
        const depth = q.dot(back);
        const x = q.x;
        const y = q.dot(up);
        distance = Math.max(distance, depth + Math.abs(x) / tanH, depth + Math.abs(y) / tanV);
      }
    }
    for (let step = 0; step < 24; step++) {
      const yaw = (step / 24) * Math.PI * 2;
      const c = Math.cos(yaw);
      const s = Math.sin(yaw);
      for (const p of points) {
        q.set(p.x * c + p.z * s, p.y - targetY, -p.x * s + p.z * c);
        const ratio = q.dot(up) / (distance - q.dot(back));
        lo = Math.min(lo, ratio);
        hi = Math.max(hi, ratio);
      }
    }
    // Shift the aim so the projected extent is centered vertically, then size again.
    targetY += (((lo + hi) / 2) * distance) / Math.cos(ELEVATION);
  }
  return { distance, targetY };
}

/**
 * Mount the stage into host. Returns null when WebGL is missing or the GPU is a software
 * rasterizer (unless ?force3d), so the caller keeps showing the still.
 */
export function mountRoboPetStage(host: HTMLElement, options: RoboPetStageOptions): RoboPetStage | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  } catch {
    return null;
  }
  if (shouldUseStill(renderer.getContext())) {
    renderer.dispose();
    renderer.forceContextLoss();
    return null;
  }
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearAlpha(0);
  renderer.setPixelRatio(options.pixelRatio ?? Math.min(window.devicePixelRatio || 1, 2));

  const canvas = renderer.domElement;
  canvas.setAttribute("role", "img");
  canvas.setAttribute("tabindex", "0");
  canvas.setAttribute(
    "aria-label",
    options.label ?? "roboPet 3D model. Drag sideways or press the arrow keys to turn it. Home resets the view.",
  );
  Object.assign(canvas.style, {
    display: "block",
    width: "100%",
    height: "100%",
    touchAction: "pan-y",
    cursor: "grab",
  });
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  // One soft ambient and one white key from the upper right front. Faces facing the key reach
  // the token value; faces turned away keep three quarters of it.
  scene.add(new THREE.AmbientLight(undefined, Math.PI * 0.74));
  const key = new THREE.DirectionalLight(undefined, Math.PI * 0.3);
  key.position.set(2, 3, 2);
  scene.add(key);

  const model = createRoboPetModel();
  const pivot = new THREE.Group();
  pivot.add(model);
  scene.add(pivot);

  // Sample both poses once, unrotated, for framing.
  setRoboPetExplode(model, 0);
  scene.updateMatrixWorld(true);
  const assembledPoints = sampleRoboPetPoints(model);
  setRoboPetExplode(model, 1);
  scene.updateMatrixWorld(true);
  const explodedPoints = sampleRoboPetPoints(model);

  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.5, 60);
  let fits: [Fit, Fit] = [
    { distance: 8, targetY: 0.6 },
    { distance: 10, targetY: 1 },
  ];

  const state = {
    yaw: ROBOPET_START_YAW,
    targetYaw: ROBOPET_START_YAW,
    explode: options.exploded ? 1 : 0,
    tween: null as null | { from: number; to: number; start: number },
    selected: options.selected,
    palette: readPalette(),
    width: 0,
    height: 0,
  };

  const paint = () => {
    const ids = new Set<RoboPetPartId>(state.selected ? PART_MODEL_IDS[state.selected] : []);
    paintRoboPet(model, state.palette, ids);
  };
  paint();

  const target = new THREE.Vector3();
  const draw = () => {
    setRoboPetExplode(model, state.explode);
    pivot.rotation.y = state.yaw;
    const e = state.explode;
    const distance = THREE.MathUtils.lerp(fits[0].distance, fits[1].distance, e);
    target.set(0, THREE.MathUtils.lerp(fits[0].targetY, fits[1].targetY, e), 0);
    camera.position.set(0, target.y + distance * Math.sin(ELEVATION), distance * Math.cos(ELEVATION));
    camera.lookAt(target);
    scene.updateMatrixWorld();
    camera.updateMatrixWorld();
    updateRoboPetSilhouettes(model, camera.position);
    renderer.render(scene, camera);
  };

  // ---------------- frame loop (on demand) ----------------
  let dragging = false;
  let pointerId = -1;
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let travel = 0;
  let frame = 0;
  let last = 0;
  const tick = (now: number) => {
    frame = 0;
    const dt = last ? Math.min(64, now - last) : 16.7;
    last = now;
    let busy = false;

    const gap = state.targetYaw - state.yaw;
    if (Math.abs(gap) > 1e-4) {
      state.yaw += gap * (1 - Math.pow(1 - DAMPING, dt / 16.7));
      busy = true;
    } else state.yaw = state.targetYaw;

    if (state.tween) {
      const p = Math.min(1, (now - state.tween.start) / TWEEN_MS);
      state.explode = THREE.MathUtils.lerp(state.tween.from, state.tween.to, EASE(p));
      if (p >= 1) state.tween = null;
      else busy = true;
    }

    draw();
    if (busy || dragging) frame = requestAnimationFrame(tick);
    else last = 0;
  };
  const invalidate = () => {
    if (!frame) frame = requestAnimationFrame(tick);
  };

  // ---------------- size ----------------
  const resize = () => {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (!w || !h || (w === state.width && h === state.height)) return;
    state.width = w;
    state.height = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    fits = [fitPoints(assembledPoints, camera.aspect), fitPoints(explodedPoints, camera.aspect)];
    setRoboPetLineResolution(model, w, h);
    draw();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  resize();

  // ---------------- color scheme ----------------
  const scheme = matchMedia("(prefers-color-scheme: dark)");
  let schemeFrame = 0;
  const onScheme = () => {
    // Wait a frame so :root has recomputed its custom properties.
    cancelAnimationFrame(schemeFrame);
    schemeFrame = requestAnimationFrame(() => {
      state.palette = readPalette();
      paint();
      invalidate();
    });
  };
  scheme.addEventListener("change", onScheme);

  // ---------------- drag to turn, click to pick ----------------
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  const pick = (clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(getRoboPetFaceMeshes(model), false)[0];
    const id = hit ? getRoboPetPartId(hit.object) : null;
    return id ? (KEY_OF.get(id) ?? null) : null;
  };

  const onDown = (event: PointerEvent) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (dragging) return;
    dragging = true;
    pointerId = event.pointerId;
    startX = lastX = event.clientX;
    startY = event.clientY;
    travel = 0;
    canvas.setPointerCapture(event.pointerId);
    canvas.style.cursor = "grabbing";
  };
  const onMove = (event: PointerEvent) => {
    if (!dragging || event.pointerId !== pointerId) return;
    const dx = event.clientX - lastX;
    lastX = event.clientX;
    travel = Math.max(travel, Math.hypot(event.clientX - startX, event.clientY - startY));
    // A drag across the whole canvas turns the robot about three quarters of the way round.
    state.targetYaw += (dx / Math.max(1, state.width)) * Math.PI * 1.5;
    invalidate();
  };
  const endDrag = () => {
    dragging = false;
    pointerId = -1;
    canvas.style.cursor = "grab";
  };
  const onUp = (event: PointerEvent) => {
    if (!dragging || event.pointerId !== pointerId) return;
    endDrag();
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    if (travel < 5) options.onPick?.(pick(event.clientX, event.clientY));
    invalidate();
  };
  const onCancel = (event: PointerEvent) => {
    if (event.pointerId === pointerId) endDrag();
  };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onCancel);

  // ---------------- arrow keys ----------------
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const onKey = (event: KeyboardEvent) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === "ArrowLeft") state.targetYaw -= KEY_STEP;
    else if (event.key === "ArrowRight") state.targetYaw += KEY_STEP;
    else if (event.key === "Home") {
      // Back to the start by the shortest way round, so a model turned several times does not
      // spin back through all of them.
      const turns = Math.round((state.targetYaw - ROBOPET_START_YAW) / (Math.PI * 2));
      state.targetYaw = ROBOPET_START_YAW + turns * Math.PI * 2;
    } else return;
    event.preventDefault();
    // With reduced motion the turn is a step, not a glide.
    if (reducedMotion.matches) state.yaw = state.targetYaw;
    invalidate();
  };
  canvas.addEventListener("keydown", onKey);

  // ---------------- context loss ----------------
  // three.js listens first: it marks the context lost and, on restore, rebuilds its GL state so
  // every buffer and shader uploads again on the next render. preventDefault asks the browser
  // to restore at all.
  const onContextLost = (event: Event) => {
    event.preventDefault();
    cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
    endDrag();
    options.onLost?.();
  };
  const onContextRestored = () => {
    state.width = 0;
    state.height = 0;
    resize();
    draw();
    options.onRestored?.();
  };
  canvas.addEventListener("webglcontextlost", onContextLost);
  canvas.addEventListener("webglcontextrestored", onContextRestored);

  return {
    canvas,
    setExploded(exploded, opts) {
      const to = exploded ? 1 : 0;
      if (opts?.immediate || reducedMotion.matches) {
        state.tween = null;
        state.explode = to;
        invalidate();
        return;
      }
      if (state.explode === to && !state.tween) return;
      state.tween = { from: state.explode, to, start: performance.now() };
      invalidate();
    },
    setSelected(key) {
      if (key === state.selected) return;
      state.selected = key;
      paint();
      invalidate();
    },
    capture() {
      draw();
      return canvas.toDataURL("image/png");
    },
    dispose() {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(schemeFrame);
      resizeObserver.disconnect();
      scheme.removeEventListener("change", onScheme);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onCancel);
      canvas.removeEventListener("keydown", onKey);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      disposeRoboPetModel(model);
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
