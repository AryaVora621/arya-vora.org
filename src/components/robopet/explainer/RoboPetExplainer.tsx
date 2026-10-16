"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type * as THREE from "three";
import { onThemeChange, themeColor } from "@/lib/theme";
import { prefersStill, shouldUseStill } from "../gpu";
import { PartText } from "../PartText";
import { ThemeStill } from "../ThemeStill";
import {
  GROUPS,
  PARTS,
  type Fact,
  type PartSpec,
} from "./parts";
import type { FlowMode, RoboPetPart, ThemeColors } from "./model";

type LabelCandidate = {
  id: string;
  sx: number;
  sy: number;
  y: number;
  pri: number;
  r: number;
  drop: boolean;
};

// UI-side part lookup for quick metadata access.
const partSpec = new Map<string, PartSpec>(PARTS.map((p) => [p.id, p]));

// The GPU probe never changes during a visit, so nothing needs to subscribe.
const subscribeNever = () => () => {};

export type RoboPetExplainerProps = {
  /** If true, incident stories are omitted from the detail panel and line text (used on /projects/robopet). */
  brief?: boolean;
  slug?: string;
};

export function RoboPetExplainer({ brief = false }: RoboPetExplainerProps = {}) {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const leadersRef = useRef<SVGSVGElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const flabelsRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLElement>(null);

  // False on server and during hydration, then cached probe result from gpu.ts
  const stillOnly = useSyncExternalStore(subscribeNever, prefersStill, () => false);
  // False in server HTML (and so with JS off), true once hydrated
  const hydrated = useSyncExternalStore(subscribeNever, () => true, () => false);

  const [failed, setFailed] = useState(false);
  const [lost, setLost] = useState(false);
  const [ready, setReady] = useState(false);
  const [stageActive, setStageActive] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Interaction states mirrored to React for accessible button attributes
  const [exploded, setExploded] = useState(false);
  const [xray, setXray] = useState(false);
  const [flow, setFlow] = useState<"off" | "power" | "signal">("off");
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [hoveredPartId, setHoveredPartId] = useState<string | null>(null);

  // Imperative controllers wired to live 3D runtime
  const controlsRef = useRef<{
    setExplode: (v?: boolean, opts?: { instant?: boolean }) => void;
    setXray: (v?: boolean, opts?: { instant?: boolean }) => void;
    setFlow: (mode: "off" | "power" | "signal", opts?: { instant?: boolean }) => void;
    selectPart: (id: string | null, opts?: { frame?: boolean }) => void;
    setHover: (id: string | null) => void;
    resetView: () => void;
    zoomIn: () => void;
    zoomOut: () => void;
    setActive: (active: boolean) => void;
  }>({
    setExplode: (v) => setExploded((prev) => (v === undefined ? !prev : v)),
    setXray: (v) => setXray((prev) => (v === undefined ? !prev : v)),
    setFlow: (mode) => setFlow(mode),
    selectPart: (id) => setSelectedPartId(id),
    setHover: (id) => setHoveredPartId(id),
    resetView: () => {
      setSelectedPartId(null);
      setHoveredPartId(null);
    },
    zoomIn: () => {},
    zoomOut: () => {},
    setActive: () => {},
  });

  const selectedPart = selectedPartId ? partSpec.get(selectedPartId) ?? null : null;
  const noWebGL = failed || stillOnly;
  const showStill = noWebGL || lost || !ready;
  const live = !noWebGL;

  // Sync state changes with the 3D model
  const onTogglePart = (id: string) => {
    if (selectedPartId === id) {
      controlsRef.current.selectPart(null);
    } else {
      controlsRef.current.selectPart(id, { frame: true });
      if (typeof window !== "undefined" && window.matchMedia("(max-width: 760px)").matches) {
        setSheetOpen(false);
      }
    }
  };

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!section || !stage || !canvas || prefersStill()) return;

    let disposed = false;
    let cleanup = () => {};

    const start = async () => {
      const [THREE, { OrbitControls }, { RoomEnvironment }, { createRoboPet }] =
        await Promise.all([
          import("three"),
          import("three/examples/jsm/controls/OrbitControls.js"),
          import("three/examples/jsm/environments/RoomEnvironment.js"),
          import("./model"),
        ]);

      if (disposed || !section || !stage || !canvas) return;
      const sectionEl = section;
      const stageEl = stage;
      const canvasEl = canvas;

      let renderer: import("three").WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({
          canvas: canvasEl,
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        });
      } catch {
        setFailed(true);
        return;
      }

      if (shouldUseStill(renderer.getContext())) {
        renderer.dispose();
        setFailed(true);
        return;
      }

      const coarse = matchMedia("(pointer: coarse)").matches;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.78;
      renderer.setClearColor(0x000000, 0);

      const scene = new THREE.Scene();
      const pmrem = new THREE.PMREMGenerator(renderer);
      const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = envTex;
      scene.environmentIntensity = 0.7;

      const key = new THREE.DirectionalLight(0xffffff, 1.3);
      key.position.set(40, 80, 50);
      const rim = new THREE.DirectionalLight(0xffffff, 0.7);
      rim.position.set(-60, 30, -50);
      scene.add(key, rim);

      const camera = new THREE.PerspectiveCamera(32, 1, 1, 900);
      const controls = new OrbitControls(camera, canvasEl);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.minDistance = 14;
      controls.maxDistance = 320;
      controls.maxPolarAngle = Math.PI * 0.495;

      // Wheel scroll hijacking protection: mouse wheel scrolls the page unless
      // stage is explicitly activated by clicking into it.
      controls.enableZoom = false;

      const reduceMQ = matchMedia("(prefers-reduced-motion: reduce)");
      const mobileMQ = matchMedia("(max-width: 760px)");
      let reduced = reduceMQ.matches;
      controls.autoRotate = !reduced;
      controls.autoRotateSpeed = 0.9;
      controls.zoomSpeed = 0.9;

      const portrait = () => window.innerWidth < window.innerHeight * 0.9;
      const model = createRoboPet({
        explodeScale: portrait() ? [0.8, 0.85, 0.8] : 1,
        reducedMotion: reduced,
      });
      scene.add(model.root);

      // Carry-over fix: HOME_DIR angled to show all four leg chains without occlusion
      const HOME_DIR = new THREE.Vector3(1.05, 0.5, 0.72).normalize();

      const S = {
        exploded: false,
        xrayUser: false,
        xrayAuto: false,
        flow: "off" as "off" | "power" | "signal",
        hover: null as string | null,
        listHover: null as string | null,
        selected: null as string | null,
        interacted: false,
        pointer: { x: 0, y: 0, active: false },
        w: 1,
        h: 1,
        activeStage: false,
      };

      const tmpV = new THREE.Vector3();
      const worldBox = (p: RoboPetPart, out = new THREE.Box3()) => {
        out.copy(p.box).translate(p.ex.clone().multiplyScalar(S.exploded ? 1 : 0));
        out.translate(tmpV.set(0, model.root.children[0].position.y, 0));
        return out;
      };

      function bounds(isExploded: boolean) {
        const box = new THREE.Box3();
        for (const p of model.parts.values()) {
          const b = p.box.clone();
          if (isExploded) b.translate(p.ex);
          b.translate(tmpV.set(0, model.root.children[0].position.y, 0));
          box.union(b);
        }
        return box;
      }

      const fitDistance = (radius: number, fill = 1) => {
        const vf = THREE.MathUtils.degToRad(camera.fov);
        const hf = 2 * Math.atan(Math.tan(vf / 2) * camera.aspect);
        return (radius / Math.sin(Math.min(vf, hf) / 2)) * fill;
      };

      const fitCam = new THREE.PerspectiveCamera();
      function fitBox(box: THREE.Box3, dir: THREE.Vector3, fillX: number, fillY: number, points?: THREE.Vector3[]) {
        fitCam.fov = camera.fov;
        fitCam.aspect = camera.aspect;
        fitCam.near = 1;
        fitCam.far = 2000;
        fitCam.updateProjectionMatrix();
        const c = box.getCenter(new THREE.Vector3());
        const corners = points || [];
        if (!points) {
          for (let i = 0; i < 8; i++) {
            corners.push(
              new THREE.Vector3(
                i & 1 ? box.max.x : box.min.x,
                i & 2 ? box.max.y : box.min.y,
                i & 4 ? box.max.z : box.min.z,
              ),
            );
          }
        }
        const place = (d: number) => {
          fitCam.position.copy(c).addScaledVector(dir, d);
          fitCam.lookAt(c);
          fitCam.updateMatrixWorld();
        };
        const n = new THREE.Vector3();
        const fits = (d: number) => {
          place(d);
          for (const p of corners) {
            n.copy(p).project(fitCam);
            if (Math.abs(n.x) > fillX || Math.abs(n.y) > fillY) return false;
          }
          return true;
        };
        let hi = 300;
        for (let pass = 0; pass < 3; pass++) {
          let lo = 10;
          hi = 700;
          for (let i = 0; i < 22; i++) {
            const mid = (lo + hi) / 2;
            if (fits(mid)) hi = mid;
            else lo = mid;
          }
          place(hi);
          let x0 = 9,
            x1 = -9,
            y0 = 9,
            y1 = -9;
          for (const p of corners) {
            n.copy(p).project(fitCam);
            x0 = Math.min(x0, n.x);
            x1 = Math.max(x1, n.x);
            y0 = Math.min(y0, n.y);
            y1 = Math.max(y1, n.y);
          }
          const th = Math.tan(THREE.MathUtils.degToRad(fitCam.fov) / 2) * hi;
          const right = new THREE.Vector3().setFromMatrixColumn(fitCam.matrixWorld, 0);
          const up = new THREE.Vector3().setFromMatrixColumn(fitCam.matrixWorld, 1);
          c.addScaledVector(right, ((x0 + x1) / 2) * th * fitCam.aspect).addScaledVector(
            up,
            ((y0 + y1) / 2) * th,
          );
        }
        return { target: c.clone(), pos: c.clone().addScaledVector(dir, hi) };
      }

      const samples = new Map<string, THREE.Vector3[]>();
      function sampleOf(p: RoboPetPart) {
        if (samples.has(p.spec.id)) return samples.get(p.spec.id)!;
        const pts: THREE.Vector3[] = [];
        for (const m of p.meshes) {
          if ("isInstancedMesh" in m && (m as { isInstancedMesh?: boolean }).isInstancedMesh) {
            if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
            const bb = m.geometry.boundingBox;
            if (bb) {
              for (let i = 0; i < 8; i++) {
                pts.push(
                  new THREE.Vector3(
                    i & 1 ? bb.max.x : bb.min.x,
                    i & 2 ? bb.max.y : bb.min.y,
                    i & 4 ? bb.max.z : bb.min.z,
                  ),
                );
              }
            }
            continue;
          }
          const pos = m.geometry.getAttribute("position");
          const stride = Math.max(1, Math.floor(pos.count / 120));
          for (let i = 0; i < pos.count; i += stride) {
            pts.push(new THREE.Vector3().fromBufferAttribute(pos, i));
          }
        }
        samples.set(p.spec.id, pts);
        return pts;
      }

      function homeView(isExploded: boolean) {
        const b = bounds(isExploded);
        const mob = mobileMQ.matches;
        const pts: THREE.Vector3[] = [];
        const yOff = model.root.children[0].position.y;
        for (const p of model.parts.values()) {
          const off = new THREE.Vector3(0, yOff, 0);
          if (isExploded) off.add(p.ex);
          for (const q of sampleOf(p)) pts.push(q.clone().add(off));
        }
        const fy = Math.min(0.9, 1 - (mob ? 96 : 120) / (S.h / 2));
        if (isExploded) return fitBox(b, HOME_DIR, mob ? 0.96 : 0.66, mob ? Math.min(fy, 0.8) : fy, pts);
        return fitBox(b, HOME_DIR, mob ? 0.84 : 0.6, mob ? 0.5 : Math.min(fy, 0.7), pts);
      }

      let tween: {
        t0: number;
        dur: number;
        fromT: THREE.Vector3;
        toT: THREE.Vector3;
        fromP: THREE.Vector3;
        toP: THREE.Vector3;
      } | null = null;

      function flyTo(target: THREE.Vector3, pos: THREE.Vector3, dur = 0.9) {
        if (reduced) {
          controls.target.copy(target);
          camera.position.copy(pos);
          controls.update();
          tween = null;
          return;
        }
        tween = {
          t0: performance.now(),
          dur: dur * 1000,
          fromT: controls.target.clone(),
          toT: target.clone(),
          fromP: camera.position.clone(),
          toP: pos.clone(),
        };
      }

      const ease = (t: number) => 1 - Math.pow(1 - t, 3);
      function stepTween(now: number) {
        if (!tween) return;
        const k = Math.min(1, (now - tween.t0) / tween.dur);
        const e = ease(k);
        controls.target.lerpVectors(tween.fromT, tween.toT, e);
        camera.position.lerpVectors(tween.fromP, tween.toP, e);
        if (k >= 1) tween = null;
      }

      controls.addEventListener("start", () => {
        tween = null;
        if (!S.interacted) {
          S.interacted = true;
          controls.autoRotate = false;
        }
      });

      // View offset to keep model clear of the detail panel
      let shiftX = 0,
        shiftY = 0,
        shiftTX = 0,
        shiftTY = 0;
      function applyViewOffset(dt: number) {
        const k = 1 - Math.exp(-dt * 8);
        shiftX += (shiftTX - shiftX) * k;
        shiftY += (shiftTY - shiftY) * k;
        if (Math.abs(shiftX) + Math.abs(shiftY) < 0.3 && !shiftTX && !shiftTY) {
          camera.clearViewOffset();
        } else {
          camera.setViewOffset(S.w, S.h, shiftX, shiftY, S.w, S.h);
        }
      }

      function updateShiftTargets() {
        const detail = detailRef.current;
        const open = detail && !detail.hidden;
        if (!open) {
          shiftTX = shiftTY = 0;
          return;
        }
        if (mobileMQ.matches) {
          shiftTX = 0;
          shiftTY = Math.max(0, S.h / 2 - detail.offsetTop / 2 + 20);
        } else {
          shiftTX = Math.max(0, (S.w - detail.offsetLeft + 12) / 2);
          shiftTY = 0;
        }
      }

      function resize() {
        const w = stageEl.clientWidth;
        const h = stageEl.clientHeight;
        if (!w || !h) return;
        S.w = w;
        S.h = h;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        updateShiftTargets();
      }
      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(stageEl);

      // Labels & Leaders
      const labelsEl = labelsRef.current;
      const leadersEl = leadersRef.current;
      const NS = "http://www.w3.org/2000/svg";
      const labelEls = new Map<string, HTMLDivElement>();
      const lineEls = new Map<string, SVGLineElement>();
      const dotEls = new Map<string, SVGCircleElement>();

      if (labelsEl && leadersEl) {
        labelsEl.innerHTML = "";
        leadersEl.innerHTML = "";
        for (const sp of PARTS) {
          const el = document.createElement("div");
          el.className = "lab";
          el.textContent = sp.short;
          el.addEventListener("mouseenter", () => setHover(sp.id));
          el.addEventListener("mouseleave", () => setHover(null));
          el.addEventListener("click", () => selectPart(sp.id, { frame: true }));
          labelsEl.appendChild(el);
          labelEls.set(sp.id, el);

          const ln = document.createElementNS(NS, "line");
          const dot = document.createElementNS(NS, "circle");
          dot.setAttribute("r", "2");
          leadersEl.append(ln, dot);
          lineEls.set(sp.id, ln);
          dotEls.set(sp.id, dot);
        }
      }

      function hideLabel(id: string) {
        const el = labelEls.get(id);
        const ln = lineEls.get(id);
        const dot = dotEls.get(id);
        if (el) {
          el.style.opacity = "0";
          el.style.pointerEvents = "none";
        }
        if (ln) ln.style.opacity = "0";
        if (dot) dot.style.opacity = "0";
      }

      function layoutColumn(list: LabelCandidate[], yMin: number, yMax: number, rh: number) {
        list.sort((a, b) => a.sy - b.sy);
        const cap = Math.max(1, Math.floor((yMax - yMin) / rh) + 1);
        while (list.length > cap) {
          let worst = 0;
          for (let i = 1; i < list.length; i++) {
            if (
              list[i].pri < list[worst].pri ||
              (list[i].pri === list[worst].pri && list[i].r < list[worst].r)
            )
              worst = i;
          }
          list[worst].drop = true;
          list.splice(worst, 1);
        }
        list.forEach((l) => (l.y = THREE.MathUtils.clamp(l.sy - rh / 2, yMin, yMax)));
        for (let i = 1; i < list.length; i++) list[i].y = Math.max(list[i].y, list[i - 1].y + rh);
        if (list.length && list[list.length - 1].y > yMax) {
          list[list.length - 1].y = yMax;
          for (let i = list.length - 2; i >= 0; i--) list[i].y = Math.min(list[i].y, list[i + 1].y - rh);
        }
      }

      function showLabel(sp: PartSpec) {
        if (sp.pri >= 3 || sp.id === S.hover || sp.id === S.listHover || sp.id === S.selected) {
          return true;
        }
        return false;
      }

      const order = [...PARTS]
        .sort(
          (a, b) =>
            b.pri - a.pri ||
            (model.parts.get(b.id)?.radius ?? 0) - (model.parts.get(a.id)?.radius ?? 0),
        )
        .map((p) => p.id);
      const wbox = new Map<string, THREE.Box3>();
      const _ray = new THREE.Ray(),
        _hit = new THREE.Vector3(),
        _b = new THREE.Box3(),
        _c = new THREE.Vector3(),
        _a = new THREE.Vector3();

      function updateLabels() {
        if (!labelsEl) return;
        const amt = THREE.MathUtils.clamp((model.explode - 0.5) * 2.4, 0, 1);
        if (amt <= 0.02) {
          if (labelsEl.dataset.on === "1") {
            for (const sp of PARTS) hideLabel(sp.id);
            labelsEl.dataset.on = "0";
          }
          return;
        }
        labelsEl.dataset.on = "1";
        const W = S.w,
          H = S.h,
          mob = mobileMQ.matches;
        const rh = mob ? 14 : 15;
        const colW = mob ? 80 : Math.min(176, W * 0.16);
        const margin = mob ? 4 : 14;
        const yMin = mob ? 56 : 108,
          yMax = H - (mob ? 130 : 104);
        const rightLimit = W - margin - (S.selected && !mob ? 316 : 0);
        const xrayed = model.xrayAmount > 0.5;

        camera.updateMatrixWorld();
        _a.setFromMatrixPosition(camera.matrixWorld);
        const yOff = model.root.children[0].position.y;
        for (const p of model.parts.values()) {
          const b = wbox.get(p.spec.id) || new THREE.Box3();
          b.copy(p.box).applyMatrix4(p.object.matrix);
          b.translate(tmpV.set(0, yOff, 0));
          const sz = b.getSize(new THREE.Vector3()).multiplyScalar(0.2);
          b.min.add(sz);
          b.max.sub(sz);
          wbox.set(p.spec.id, b);
        }

        let sx0 = 1e9,
          sx1 = -1e9;
        for (const p of model.parts.values()) {
          _b.copy(p.box).applyMatrix4(p.object.matrix);
          _b.translate(tmpV.set(0, yOff, 0));
          for (let i = 0; i < 8; i++) {
            _c.set(
              i & 1 ? _b.max.x : _b.min.x,
              i & 2 ? _b.max.y : _b.min.y,
              i & 4 ? _b.max.z : _b.min.z,
            ).project(camera);
            const px = (_c.x * 0.5 + 0.5) * W;
            if (px < sx0) sx0 = px;
            if (px > sx1) sx1 = px;
          }
        }

        const cand: LabelCandidate[] = [];
        for (const id of order) {
          const p = model.parts.get(id);
          if (!p || !showLabel(p.spec)) {
            hideLabel(id);
            continue;
          }
          model.anchorOf(id, _c);
          const n = _c.clone().project(camera);
          const sx = (n.x * 0.5 + 0.5) * W,
            sy = (-n.y * 0.5 + 0.5) * H;
          if (n.z > 1 || n.z < -1 || sx < 2 || sx > W - 2 || sy < yMin - 16 || sy > H - 60) {
            hideLabel(id);
            continue;
          }
          _ray.origin.copy(_a);
          _ray.direction.copy(_c).sub(_a);
          const dist = _ray.direction.length();
          _ray.direction.divideScalar(dist);
          let blocked = false;
          for (const [oid, b] of wbox) {
            if (oid === id) continue;
            const o = model.parts.get(oid);
            if (!o || (o.ghost && xrayed) || o.radius < 1.3 || b.containsPoint(_c)) continue;
            if (_ray.intersectBox(b, _hit) && _hit.distanceTo(_a) < dist - 0.5) {
              blocked = true;
              break;
            }
          }
          if (blocked && p.spec.pri < 3) {
            hideLabel(id);
            continue;
          }
          cand.push({ id, sx, sy, y: sy, pri: p.spec.pri, r: p.radius, drop: false });
        }

        if (!cand.length) return;
        const maxL = mob ? 24 : 140;
        cand.sort((a, b) => b.pri - a.pri || b.r - a.r);
        const kept = cand.slice(0, maxL);
        for (const c of cand.slice(maxL)) hideLabel(c.id);

        const cx = (sx0 + sx1) / 2;
        const L = kept.filter((c) => c.sx < cx),
          R = kept.filter((c) => c.sx >= cx);
        layoutColumn(L, yMin, yMax, rh);
        layoutColumn(R, yMin, yMax, rh);
        for (const c of kept) if (c.drop) hideLabel(c.id);

        let xL = THREE.MathUtils.clamp(sx0 - colW - 14, margin, W);
        let xR = THREE.MathUtils.clamp(sx1 + 14, margin, rightLimit - colW);
        if (mob) {
          xL = margin;
          xR = W - margin - colW;
        }

        const put = (c: LabelCandidate, side: "L" | "R") => {
          const el = labelEls.get(c.id),
            ln = lineEls.get(c.id),
            dot = dotEls.get(c.id);
          if (!el || !ln || !dot) return;
          const x = side === "L" ? xL : xR;
          el.style.transform = `translate(${x}px, ${c.y}px)`;
          el.style.width = colW + "px";
          el.classList.toggle("left", side === "L");
          el.classList.toggle("right", side === "R");
          el.style.opacity = String(amt);
          el.style.pointerEvents = "auto";
          const ix = side === "L" ? x + Math.min(colW, el.scrollWidth) + 2 : x - 2;
          ln.setAttribute("x1", String(ix));
          ln.setAttribute("y1", String(c.y + rh / 2));
          ln.setAttribute("x2", String(c.sx));
          ln.setAttribute("y2", String(c.sy));
          dot.setAttribute("cx", String(c.sx));
          dot.setAttribute("cy", String(c.sy));
          ln.style.opacity = String((c.pri > 1 ? 0.45 : 0.28) * amt);
          dot.style.opacity = String(amt);
        };
        for (const c of L) if (!c.drop) put(c, "L");
        for (const c of R) if (!c.drop) put(c, "R");
      }

      // Flow labels
      const flEl = flabelsRef.current;
      let flItems: { el: HTMLDivElement; pos: THREE.Vector3 }[] = [];
      function buildFlowLabels() {
        if (!flEl) return;
        flEl.innerHTML = "";
        flItems = [];
        if (S.flow === "off") return;
        for (const l of model.flowLabels(S.flow)) {
          const el = document.createElement("div");
          el.className = "fl";
          el.textContent = l.text;
          flEl.appendChild(el);
          flItems.push({ el, pos: l.position });
        }
      }

      function updateFlowLabels() {
        const v = new THREE.Vector3();
        for (const it of flItems) {
          v.copy(it.pos).project(camera);
          const x = (v.x * 0.5 + 0.5) * S.w,
            y = (-v.y * 0.5 + 0.5) * S.h;
          it.el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, -140%)`;
          it.el.style.visibility = v.z < 1 ? "visible" : "hidden";
        }
      }

      // Picking & Hover
      const raycaster = new THREE.Raycaster();
      const ndc = new THREE.Vector2();
      const tip = tipRef.current;
      let pickDirty = false,
        pickXY: [number, number] | null = null,
        down: { x: number; y: number } | null = null,
        dragging = false,
        tipTimer: ReturnType<typeof setTimeout> | undefined = undefined;

      function pick(clientX: number, clientY: number): RoboPetPart | null {
        const r = canvasEl.getBoundingClientRect();
        ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
        raycaster.setFromCamera(ndc, camera);
        const hits = raycaster.intersectObjects(model.pickables, false);
        const xr = model.xrayAmount > 0.5;
        for (const h of hits) {
          const p = model.parts.get(h.object.userData.partId);
          if (p && p.ghost && xr) continue;
          if (p) return p;
        }
        return null;
      }

      function showTip(p: RoboPetPart | null, x: number, y: number) {
        if (!tip) return;
        if (!p) {
          tip.hidden = true;
          return;
        }
        (tip.firstElementChild as HTMLElement).textContent = p.spec.name;
        (tip.lastElementChild as HTMLElement).textContent = p.spec.line;
        tip.hidden = false;
        const r = stageEl.getBoundingClientRect();
        const tw = tip.offsetWidth,
          th = tip.offsetHeight;
        let tx = x - r.left + 16,
          ty = y - r.top + 18;
        if (tx + tw > r.width - 8) tx = x - r.left - tw - 14;
        if (ty + th > r.height - 8) ty = y - r.top - th - 14;
        tip.style.transform = `translate(${Math.max(8, tx)}px, ${Math.max(8, ty)}px)`;
      }

      function refreshHighlight() {
        const id = S.hover || S.listHover || S.selected;
        model.setHighlight(id);
        for (const [pid, el] of labelEls) {
          el.classList.toggle("hot", pid === (S.hover || S.listHover));
          el.classList.toggle("sel", pid === S.selected);
        }
      }

      function setHover(id: string | null) {
        if (S.hover !== id) {
          S.hover = id;
          setHoveredPartId(id);
          refreshHighlight();
        }
      }

      function applyXray(instant = false) {
        const on = S.xrayUser || S.xrayAuto;
        model.setXray(on, { instant });
        setXray(on);
      }

      const INTERNAL = new Set(["brains", "balance", "power", "wiring"]);

      // Carry-over fix: Focus camera on small parts cleanly along the explode vector
      function focusPart(id: string) {
        const p = model.parts.get(id);
        if (!p) return;
        model.setFocus(id);
        const sp = p.spec;
        if (
          !S.exploded &&
          !S.xrayUser &&
          !S.xrayAuto &&
          (INTERNAL.has(sp.group) ||
            sp.id === "chassis-plate" ||
            sp.id === "standoffs" ||
            sp.id === "screws" ||
            sp.id === "oled-header" ||
            sp.id === "oled-wires")
        ) {
          S.xrayAuto = true;
          applyXray();
        }

        const b = worldBox(p);
        const sph = b.getBoundingSphere(new THREE.Sphere());
        updateShiftTargets();

        const freeW = S.w - shiftTX * 2,
          freeH = S.h - shiftTY * 2;
        const fill = 1.9 * Math.max(1, S.w / freeW, S.h / freeH);
        // Distance based on part's own radius, not a fixed minimum!
        let dist = Math.max(sph.radius * 2.2, fitDistance(Math.max(sph.radius, 1.2), fill));

        // Approach along explode vector so nothing sits between camera and part
        let dir = p.ex.clone();
        if (dir.lengthSq() > 0.04) {
          dir.normalize();
          if (dir.y < 0.2) dir.y = 0.2;
          dir.normalize();
        } else {
          dir = camera.position.clone().sub(controls.target).normalize();
          if (dir.y < 0.2) dir.y = 0.2;
          dir.normalize();
        }

        // Push past shell if inside in assembled mode
        if (!S.exploded) {
          const sb = new THREE.Box3();
          const sTop = model.parts.get("shell-top");
          const sBot = model.parts.get("shell-bottom");
          if (sTop) sb.union(worldBox(sTop));
          if (sBot) sb.union(worldBox(sBot));
          sb.expandByScalar(2);
          if (sb.containsPoint(sph.center)) {
            const o = sph.center,
              mn = sb.min,
              mx = sb.max;
            let t = Infinity;
            for (const ax of ["x", "y", "z"] as const) {
              if (dir[ax] > 1e-4) t = Math.min(t, (mx[ax] - o[ax]) / dir[ax]);
              else if (dir[ax] < -1e-4) t = Math.min(t, (mn[ax] - o[ax]) / dir[ax]);
            }
            if (isFinite(t)) dist = Math.max(dist, t + 1.5);
          }
        }

        flyTo(sph.center, sph.center.clone().addScaledVector(dir, dist), 0.95);
        controls.autoRotate = false;
        S.interacted = true;
      }

      function selectPart(id: string | null, { frame = false } = {}) {
        S.selected = id;
        setSelectedPartId(id);
        refreshHighlight();
        if (!id) {
          model.setFocus(null);
          updateShiftTargets();
          return;
        }
        if (frame) focusPart(id);
      }

      function resetView() {
        S.selected = null;
        setSelectedPartId(null);
        model.setFocus(null);
        refreshHighlight();
        updateShiftTargets();
        const h = homeView(S.exploded);
        flyTo(h.target, h.pos, 0.8);
      }

      function setExplode(v?: boolean, opts: { instant?: boolean; keepCamera?: boolean } = {}) {
        const on = v === undefined ? !S.exploded : v;
        S.exploded = on;
        setExploded(on);
        sectionEl.dataset.exploded = String(on);
        model.setExplode(on ? 1 : 0, { instant: !!opts.instant || reduced });
        if (!S.selected && !opts.keepCamera) {
          const h = homeView(on);
          if (opts.instant || reduced) {
            controls.target.copy(h.target);
            camera.position.copy(h.pos);
            tween = null;
            controls.update();
          } else {
            flyTo(h.target, h.pos, 1.1);
          }
        }
      }

      function setXrayMode(on?: boolean, opts: { instant?: boolean } = {}) {
        const val = on === undefined ? !(S.xrayUser || S.xrayAuto) : on;
        S.xrayUser = val;
        S.xrayAuto = false;
        applyXray(!!opts.instant);
      }

      function setFlowMode(mode: "off" | "power" | "signal", opts: { instant?: boolean } = {}) {
        mode = mode === "power" || mode === "signal" ? mode : "off";
        S.flow = mode;
        setFlow(mode);
        model.setFlow(mode);
        if (mode !== "off") {
          if (!S.xrayUser) S.xrayAuto = true;
        } else if (S.xrayAuto) {
          S.xrayAuto = false;
        }
        applyXray(!!opts.instant);
        buildFlowLabels();
      }

      function zoomIn() {
        controls.dollyIn(1.25);
        controls.update();
      }

      function zoomOut() {
        controls.dollyOut(1.25);
        controls.update();
      }

      function setStageActiveState(active: boolean) {
        S.activeStage = active;
        setStageActive(active);
        controls.enableZoom = active;
        stageEl.dataset.active = String(active);
      }

      // Pointer / Mouse events on canvas
      const onPointerMove = (e: PointerEvent) => {
        S.pointer.active = true;
        const r = canvasEl.getBoundingClientRect();
        S.pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
        S.pointer.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
        if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) {
          dragging = true;
        }
        if (e.pointerType === "mouse" && !down) {
          pickXY = [e.clientX, e.clientY];
          pickDirty = true;
        } else if (dragging) {
          setHover(null);
          if (tip) tip.hidden = true;
        }
      };

      const onPointerLeave = () => {
        S.pointer.active = false;
        setHover(null);
        if (tip) tip.hidden = true;
      };

      const onPointerDown = (e: PointerEvent) => {
        down = { x: e.clientX, y: e.clientY };
        dragging = false;
        setStageActiveState(true);
      };

      const onPointerUp = (e: PointerEvent) => {
        const wasDrag = dragging;
        down = null;
        dragging = false;
        if (wasDrag) return;
        const p = pick(e.clientX, e.clientY);
        if (p) {
          selectPart(p.spec.id, { frame: true });
          if (e.pointerType !== "mouse") {
            setHover(p.spec.id);
            showTip(p, e.clientX, e.clientY);
            clearTimeout(tipTimer);
            tipTimer = setTimeout(() => {
              if (tip) tip.hidden = true;
              setHover(null);
            }, 2800);
          }
        } else if (S.selected) {
          selectPart(null);
        }
      };

      // Touch handling: touch-action: pan-y on canvas allows page scroll on vertical swipe;
      // horizontal swipe rotates camera.
      let touchStart: { x: number; y: number } | null = null;
      let touchRotating = false;

      const onTouchStart = (e: TouchEvent) => {
        if (e.touches.length === 1) {
          touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
          touchRotating = false;
          setStageActiveState(true);
        } else {
          touchStart = null;
          touchRotating = false;
        }
      };

      const onTouchMove = (e: TouchEvent) => {
        if (!touchStart || e.touches.length !== 1) return;
        const dx = e.touches[0].clientX - touchStart.x;
        const dy = e.touches[0].clientY - touchStart.y;
        if (!touchRotating) {
          if (Math.abs(dx) > Math.abs(dy) + 6) {
            touchRotating = true;
          } else if (Math.abs(dy) > Math.abs(dx) + 6) {
            touchStart = null;
            return;
          }
        }
        if (touchRotating) {
          e.preventDefault();
          controls.rotateLeft((2 * Math.PI * dx) / canvasEl.clientHeight);
          controls.update();
          touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
      };

      const onTouchEnd = () => {
        touchStart = null;
        touchRotating = false;
      };

      canvasEl.addEventListener("pointermove", onPointerMove);
      canvasEl.addEventListener("pointerleave", onPointerLeave);
      canvasEl.addEventListener("pointerdown", onPointerDown);
      canvasEl.addEventListener("pointerup", onPointerUp);
      canvasEl.addEventListener("touchstart", onTouchStart, { passive: true });
      canvasEl.addEventListener("touchmove", onTouchMove, { passive: false });
      canvasEl.addEventListener("touchend", onTouchEnd);

      // Outside click deactivates wheel zoom
      const onDocPointerDown = (e: MouseEvent) => {
        if (!stageEl.contains(e.target as Node)) {
          setStageActiveState(false);
        }
      };
      document.addEventListener("pointerdown", onDocPointerDown);

      // Keyboard shortcuts
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.target instanceof HTMLElement && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName))
          return;
        const k = e.key.toLowerCase();
        if (k === "e") setExplode();
        else if (k === "x") setXrayMode();
        else if (k === "p") setFlowMode(S.flow === "power" ? "off" : "power");
        else if (k === "s") setFlowMode(S.flow === "signal" ? "off" : "signal");
        else if (k === "r") resetView();
        else if (k === "+" || k === "=") zoomIn();
        else if (k === "-" || k === "_") zoomOut();
        else if (k === "escape") {
          setStageActiveState(false);
          setSheetOpen(false);
          selectPart(null);
          resetView();
        }
      };
      window.addEventListener("keydown", onKeyDown);

      // Theme sync
      const applyThemeColors = () => {
        model.setTheme({
          eye: themeColor("--eye", "#ffffff"),
          line: themeColor("--line", "#333333"),
          muted: themeColor("--muted", "#a6a6a6"),
          surface: themeColor("--surface", "#000000"),
        });
      };
      applyThemeColors();
      const offTheme = onThemeChange(applyThemeColors);

      // Reduced motion listener
      const onMotionChange = () => {
        reduced = reduceMQ.matches;
        model.setReducedMotion(reduced);
        if (reduced) controls.autoRotate = false;
      };
      reduceMQ.addEventListener("change", onMotionChange);

      // Context lost/restored
      const onLost = (e: Event) => {
        e.preventDefault();
        setLost(true);
      };
      const onRestored = () => {
        setLost(false);
      };
      canvasEl.addEventListener("webglcontextlost", onLost);
      canvasEl.addEventListener("webglcontextrestored", onRestored);

      // Rendering pause when off-screen or tab hidden
      let isVisible = true;
      const visObserver = new IntersectionObserver((entries) => {
        isVisible = entries.some((e) => e.isIntersecting);
      });
      visObserver.observe(sectionEl);

      const onVisChange = () => {
        if (document.hidden) isVisible = false;
        else isVisible = true;
      };
      document.addEventListener("visibilitychange", onVisChange);

      // Animation frame loop
      let animId = 0;
      let lastTime = performance.now();
      let firstFrameDone = false;

      function renderLoop(now: number) {
        animId = requestAnimationFrame(renderLoop);
        if (!isVisible) return;

        const dt = Math.min(0.05, (now - lastTime) / 1000);
        lastTime = now;

        stepTween(now);
        controls.update();
        applyViewOffset(dt);
        model.update(dt, now / 1000, { pointer: S.pointer });
        renderer.render(scene, camera);
        updateLabels();
        updateFlowLabels();

        if (pickDirty && pickXY) {
          pickDirty = false;
          const p = pick(pickXY[0], pickXY[1]);
          setHover(p ? p.spec.id : null);
          canvasEl.classList.toggle("pick", !!p);
          showTip(p, pickXY[0], pickXY[1]);
        }

        if (!firstFrameDone) {
          firstFrameDone = true;
          setReady(true);
          (window as unknown as { __explainerReady?: boolean }).__explainerReady = true;
        }
      }

      // Initial placement
      resize();
      const h0 = homeView(false);
      controls.target.copy(h0.target);
      camera.position.copy(h0.pos);
      controls.update();

      // Expose imperative methods to ref
      controlsRef.current = {
        setExplode: (v, o) => setExplode(v, o),
        setXray: (v, o) => setXrayMode(v, o),
        setFlow: (mode, o) => setFlowMode(mode, o),
        selectPart: (id, o) => selectPart(id, o),
        setHover: (id) => setHover(id),
        resetView,
        zoomIn,
        zoomOut,
        setActive: setStageActiveState,
      };

      // Window debug hook for tests and inspection
      (window as unknown as { explainer?: unknown }).explainer = {
        setExplode: (v?: boolean, o?: { instant?: boolean }) => setExplode(v, o),
        setFlow: (mode: FlowMode, o?: { instant?: boolean }) => setFlowMode(mode, o),
        setXray: (v?: boolean, o?: { instant?: boolean }) => setXrayMode(v, o),
        focusPart: (id: string) => selectPart(id, { frame: true }),
        setTheme: (t: ThemeColors) => model.setTheme(t),
        resetView,
        parts: model.parts,
        model,
        state: S,
        camera,
        controls,
        renderer,
      };

      animId = requestAnimationFrame(renderLoop);

      cleanup = () => {
        cancelAnimationFrame(animId);
        resizeObserver.disconnect();
        visObserver.disconnect();
        offTheme();
        reduceMQ.removeEventListener("change", onMotionChange);
        document.removeEventListener("visibilitychange", onVisChange);
        document.removeEventListener("pointerdown", onDocPointerDown);
        window.removeEventListener("keydown", onKeyDown);

        canvasEl.removeEventListener("pointermove", onPointerMove);
        canvasEl.removeEventListener("pointerleave", onPointerLeave);
        canvasEl.removeEventListener("pointerdown", onPointerDown);
        canvasEl.removeEventListener("pointerup", onPointerUp);
        canvasEl.removeEventListener("touchstart", onTouchStart);
        canvasEl.removeEventListener("touchmove", onTouchMove);
        canvasEl.removeEventListener("touchend", onTouchEnd);
        canvasEl.removeEventListener("webglcontextlost", onLost);
        canvasEl.removeEventListener("webglcontextrestored", onRestored);

        controls.dispose();
        model.dispose();
        envTex.dispose();
        pmrem.dispose();
        renderer.dispose();
        delete (window as unknown as { explainer?: unknown }).explainer;
        delete (window as unknown as { __explainerReady?: boolean }).__explainerReady;
      };
    };

    // Defer 3D loading until section approaches viewport
    const loadObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          loadObserver.disconnect();
          start().catch(() => setFailed(true));
        }
      },
      { rootMargin: "100% 0px" },
    );
    loadObserver.observe(section);

    return () => {
      disposed = true;
      loadObserver.disconnect();
      cleanup();
    };
  }, []);

  // Filter facts depending on brief mode
  const activeFacts: readonly Fact[] = selectedPart
    ? brief
      ? selectedPart.facts.filter((f) => typeof f === "string")
      : selectedPart.facts
    : [];

  return (
    <section
      ref={sectionRef}
      id="exploded"
      className="exploded"
      data-mode={live ? "live" : "static"}
      data-exploded={exploded ? "true" : "false"}
      data-part={selectedPartId ?? undefined}
      aria-labelledby="exploded-title"
    >
      <div className="exploded-stage">
        {/* Section Heading & Lede */}
        <div className="exploded-copy site-shell">
          <h2 id="exploded-title">Parts</h2>
          <p className="exploded-lede">
            The planned design in three.js. The printed MVP frame has 8 of 12 servos and does not
            walk yet; geometry is approximate.
            <span className="exploded-hint" data-ready={hydrated}>
              {live
                ? "Drag to orbit. Click into the stage to zoom with the wheel, or use the buttons below."
                : "Every subsystem and part in the planned build."}
            </span>
          </p>
        </div>

        {/* Framed Interactive Stage */}
        <div className="explainer-frame site-shell">
          <div className="explainer-app">
            {/* Parts List Sidebar / Bottom Sheet */}
            <aside
              className={`explainer-parts ${sheetOpen ? "open" : ""}`}
              id="parts"
              aria-label="Parts list"
            >
              <div className="explainer-parts-head">
                <h3>
                  Parts <span className="explainer-count">{PARTS.length}</span>
                </h3>
                <button
                  className="explainer-sheet-close"
                  type="button"
                  onClick={() => setSheetOpen(false)}
                >
                  Close
                </button>
              </div>

              <ul
                className="explainer-parts-body"
                aria-label="roboPet parts"
                data-ready={hydrated}
              >
                {GROUPS.map((group) => {
                  const groupParts = PARTS.filter((p) => p.group === group.id);
                  return (
                    <li key={group.id} className="explainer-group">
                      <details open>
                        <summary>
                          <span>{group.name}</span>
                          <small>{groupParts.length}</small>
                        </summary>
                        <ul>
                          {groupParts.map((p) => {
                            const isSelected = selectedPartId === p.id;
                            const isHovered = hoveredPartId === p.id;
                            return (
                              <li key={p.id}>
                                <button
                                  type="button"
                                  className={`explainer-part-btn ${isSelected ? "selected" : ""} ${
                                    isHovered ? "hot" : ""
                                  }`}
                                  data-id={p.id}
                                  aria-pressed={isSelected}
                                  aria-current={isSelected ? "true" : "false"}
                                  onClick={() => onTogglePart(p.id)}
                                  onMouseEnter={() => controlsRef.current.setHover(p.id)}
                                  onMouseLeave={() => controlsRef.current.setHover(null)}
                                  onFocus={() => controlsRef.current.setHover(p.id)}
                                  onBlur={() => controlsRef.current.setHover(null)}
                                >
                                  {p.name}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </details>
                    </li>
                  );
                })}
              </ul>
            </aside>

            {/* 3D Canvas Stage */}
            <div className="explainer-stage" ref={stageRef} data-active={stageActive}>
              <canvas
                id="gl"
                ref={canvasRef}
                aria-label="Interactive 3D model of roboPet. Drag to orbit, scroll to zoom."
                role="img"
              />

              {/* Static Still Fallback (when WebGL not ready/supported, or JS off) */}
              {showStill && (
                <div className="exploded-canvas-still">
                  <ThemeStill
                    theme="mono"
                    kind="exploded"
                    className="exploded-still exploded-still-mono"
                    src="/robopet/explainer/exploded-mono.webp"
                    alt="Exploded 3D view of roboPet showing all internal and external parts"
                    width={1150}
                    height={900}
                    loading="lazy"
                  />
                  <ThemeStill
                    theme="violet"
                    kind="exploded"
                    className="exploded-still exploded-still-violet"
                    src="/robopet/explainer/exploded-violet.webp"
                    alt="Exploded 3D view of roboPet showing all internal and external parts"
                    width={1150}
                    height={900}
                    loading="lazy"
                  />
                </div>
              )}

              {/* Overlay layers */}
              <svg className="explainer-leaders" ref={leadersRef} aria-hidden="true" />
              <div className="explainer-labels" ref={labelsRef} aria-hidden="true" />
              <div className="explainer-flabels" ref={flabelsRef} aria-hidden="true" />
              <div className="explainer-tip" ref={tipRef} role="tooltip" hidden>
                <b></b>
                <span></span>
              </div>

              {/* Flow legend */}
              <div className="explainer-legend" hidden={flow === "off"}>
                {flow === "power" && (
                  <p>
                    <b>Power.</b> Pack, fuse, switch, buck 1 to the servo rail (about 7.2 V) and
                    every servo. Buck 2 to the 5.0 V logic rail, the Pico and the Zero 2W. The rails
                    meet only at common ground.
                  </p>
                )}
                {flow === "signal" && (
                  <p>
                    <b>Signal.</b> UART packets bounce on the crossed wires. The OLED and the IMU
                    each have their own I2C bus. 50 Hz PWM runs from the Pico to every servo. The
                    camera ribbon feeds the Zero.
                  </p>
                )}
              </div>

              {/* Detail Panel */}
              <section
                ref={detailRef}
                className="exploded-detail explainer-detail"
                id="detail"
                aria-live="polite"
                hidden={!selectedPart}
              >
                {selectedPart && (
                  <div key={selectedPart.id} className="exploded-detail-body">
                    <button
                      className="explainer-detail-close"
                      type="button"
                      aria-label="Close part details"
                      onClick={() => controlsRef.current.selectPart(null)}
                    >
                      Close
                    </button>
                    <div className="explainer-kicker">
                      {GROUPS.find((g) => g.id === selectedPart.group)?.name}
                    </div>
                    <h3 id="dName">{selectedPart.name}</h3>
                    <p className="explainer-what">
                      <PartText
                        text={brief && selectedPart.brief ? selectedPart.brief : selectedPart.line}
                      />
                    </p>
                    <ul id="dFacts">
                      {activeFacts.map((fact, i) => (
                        <li key={i}>
                          <PartText text={typeof fact === "string" ? fact : fact.log} />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>

              {/* Mode Bar */}
              <nav className="explainer-bar" aria-label="View controls">
                <button
                  type="button"
                  id="bExplode"
                  aria-pressed={exploded}
                  onClick={() => controlsRef.current.setExplode()}
                >
                  Explode<kbd>E</kbd>
                </button>
                <button
                  type="button"
                  id="bXray"
                  aria-pressed={xray}
                  onClick={() => controlsRef.current.setXray()}
                >
                  X-ray<kbd>X</kbd>
                </button>
                <button
                  type="button"
                  id="bPower"
                  aria-pressed={flow === "power"}
                  onClick={() => controlsRef.current.setFlow(flow === "power" ? "off" : "power")}
                >
                  Power<kbd>P</kbd>
                </button>
                <button
                  type="button"
                  id="bSignal"
                  aria-pressed={flow === "signal"}
                  onClick={() => controlsRef.current.setFlow(flow === "signal" ? "off" : "signal")}
                >
                  Signal<kbd>S</kbd>
                </button>
                <button
                  type="button"
                  id="bReset"
                  onClick={() => controlsRef.current.resetView()}
                >
                  Reset<kbd>R</kbd>
                </button>
                <button
                  type="button"
                  id="bZoomIn"
                  aria-label="Zoom in"
                  onClick={() => controlsRef.current.zoomIn()}
                >
                  +<kbd>+</kbd>
                </button>
                <button
                  type="button"
                  id="bZoomOut"
                  aria-label="Zoom out"
                  onClick={() => controlsRef.current.zoomOut()}
                >
                  &minus;<kbd>&minus;</kbd>
                </button>
                <button
                  type="button"
                  id="bParts"
                  className="only-mobile"
                  aria-expanded={sheetOpen}
                  aria-controls="parts"
                  onClick={() => setSheetOpen((prev) => !prev)}
                >
                  Parts
                </button>
              </nav>
            </div>
          </div>
        </div>

        {/* Noscript accessible full text fallback */}
        <noscript>
          <dl className="exploded-all site-shell">
            {GROUPS.map((g) => (
              <div key={g.id}>
                <dt>{g.name}</dt>
                <dd>
                  {PARTS.filter((p) => p.group === g.id).map((p) => (
                    <p key={p.id}>
                      <strong>{p.name}:</strong>{" "}
                      <PartText text={brief && p.brief ? p.brief : p.line} />
                    </p>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        </noscript>
      </div>
    </section>
  );
}
