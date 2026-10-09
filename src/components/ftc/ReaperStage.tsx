"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { useMotionAllowed } from "@/lib/hooks/useMotionAllowed";
import { onThemeChange, themeColor } from "@/lib/theme";
import { prefersStill, shouldUseStill } from "@/components/robopet/gpu";
import type { ReaperPartId } from "./createReaperModel";

/*
  The Reaper section's 3D model. One WebGL canvas serves every dock in the section: it sits in
  whichever dock shows most of itself in the viewport (the opener, or the sticky one beside the
  spec rows) and the other docks keep their pre-rendered still. So the page holds one context
  and one model, and the robot a visitor turned in the opener is the same robot the spec rows
  light up.

  It is built only when a dock comes within a screen of the viewport. A browser with no WebGL or
  only a software rasteriser (unless ?force3d) keeps the stills, and three.js is never downloaded.
  Once every dock has been more than two screens away for a few seconds, the scene is torn down
  and its context released, so a visitor reading on past the section is not holding a third
  WebGL context; it is rebuilt when a dock comes back near, turned the way the visitor left it.

  The robot turns as the section scrolls past and can be dragged around. Each dock has its own
  resting angle (DOCK_POSES), a three-quarter view from the front in both, and the scroll turns it
  either side of that, so the robot is never seen flat from straight ahead. Reduced motion keeps
  it still: no scroll turn, no easing, no coasting after a drag. Frames are drawn only while
  something is changing, so an idle robot costs no GPU time.
*/

type Weights = Partial<Record<ReaperPartId, number>>;

/** Turn (radians about the vertical axis) that shows each subsystem best. */
const PART_YAW: Record<ReaperPartId, number> = {
  drive: 0.7,
  intake: 0.42,
  transfer: 0.5,
  shooter: 0.75,
  aiming: 0.12,
  protection: 1.3,
  electronics: 2.6,
};

/**
 * Camera elevation, degrees, for a subsystem best seen from higher than the resting view. The
 * shooter is looked down on from the front quarter, into the open front of the hood (its back is
 * a solid curve), so the flywheel, both of its motors and the hood's pivot are all in view.
 */
const PART_ELEVATION: Partial<Record<ReaperPartId, number>> = {
  shooter: 40,
};

/** Front three-quarter from the robot's right, the angle of the team's photo. */
const BASE_YAW = 0.42;
/** Camera elevation, degrees. */
const ELEVATION = 15;
/**
 * Where each dock rests, in DOM order (the opener, then the dock beside the spec rows). `yaw` is
 * the turn at scroll progress `at` (0 with the opener centred in the viewport, 1 with the centre
 * of the last dock's track centred), and the robot turns `turn` radians per unit of progress
 * either side of it. The opener sweeps wide as the page scrolls in; the Mechanisms dock stays
 * near a three-quarter view (about 27 degrees) the whole time its rows are read.
 */
const DOCK_POSES = [
  { yaw: BASE_YAW, at: 0, turn: 0.75 },
  { yaw: 0.47, at: 1, turn: 0.3 },
] as const;
/** Docks within this margin keep the scene alive; past it for TEARDOWN_MS, it is released. */
const KEEP_MARGIN = "200% 0px";
const TEARDOWN_MS = 6000;

function whenIdle(task: () => void) {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(task, { timeout: 1500 });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(task, 200);
  return () => window.clearTimeout(id);
}

export type ReaperStageOptions = {
  /** Subsystems to light up, or null for none. */
  focus: readonly ReaperPartId[] | null;
  /** Called with the subsystem under a click on the model (null for empty space). */
  onPick?: (id: ReaperPartId | null) => void;
};

/**
 * Drives the docks (`[data-reaper-dock]`) inside `sectionRef`. Each dock holds a
 * `[data-reaper-host]` element the canvas moves into; the hook sets `data-live` on the dock
 * that has it, and `data-reaper-live` on the section while the model is drawing.
 *
 * Returns whether this browser draws the model: false until the first build succeeds (and for
 * good where it cannot, such as no WebGL or a software renderer), then true, including while the
 * scene is released far off screen, since it comes back when the docks do. Controls that act on
 * the model should exist only while this is true.
 */
export function useReaperStage(
  sectionRef: RefObject<HTMLElement | null>,
  options: ReaperStageOptions,
): boolean {
  const motion = useMotionAllowed();
  const motionRef = useRef(motion);
  const focusRef = useRef(options.focus);
  const pickRef = useRef(options.onPick);
  const wakeRef = useRef<() => void>(() => {});
  const [drawable, setDrawable] = useState(false);

  useEffect(() => {
    motionRef.current = motion;
    wakeRef.current();
  }, [motion]);

  useEffect(() => {
    focusRef.current = options.focus;
    wakeRef.current();
  }, [options.focus]);

  useEffect(() => {
    pickRef.current = options.onPick;
  }, [options.onPick]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const docks = Array.from(section.querySelectorAll<HTMLElement>("[data-reaper-dock]"));
    if (!docks.length || prefersStill()) return;

    let disposed = false;
    let failed = false;
    let stage: { dispose: () => void } | null = null;
    let pending: (() => void) | null = null;
    let teardownTimer = 0;
    // The visitor's drag survives a teardown, so the robot comes back the way they left it.
    const kept = { yaw: 0, pitch: 0 };

    const build = async (): Promise<{ dispose: () => void } | null> => {
      // Fetched side by side: three.js, the model and the studio are separate chunks, and one
      // after another each waits for the last to be parsed on a main thread that may be busy.
      const [THREE, model3d, studio3d] = await Promise.all([
        import("three"),
        import("./createReaperModel"),
        import("./reaperStudio"),
      ]);
      if (disposed) return null;

      let renderer: import("three").WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      } catch {
        return null;
      }
      if (shouldUseStill(renderer.getContext())) {
        renderer.dispose();
        renderer.forceContextLoss();
        return null;
      }
      const coarse = matchMedia("(pointer: coarse)").matches;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.shadowMap.enabled = !coarse;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      const canvas = renderer.domElement;
      canvas.className = "reaper-canvas";
      canvas.setAttribute("aria-hidden", "true");

      const scene = new THREE.Scene();
      const studio = studio3d.addReaperStudio(renderer, scene, {
        shadows: !coarse,
        floorColor: themeColor("--surface-soft", "#1a1a1a"),
        tint: themeColor("--accent", "#ffffff"),
      });
      const colors = () => ({
        accent: themeColor("--accent", "#ffffff"),
        eye: themeColor("--eye", "#ffffff"),
      });
      const model = model3d.createReaperModel({ shadows: !coarse, colors: colors() });
      const rig = new THREE.Group();
      rig.add(model);
      scene.add(rig);

      const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 50);
      // A square dock frames the robot at 3.4 units, with room above it for the parts that pop
      // out when they are lit and for a drag that tips it. Narrow docks back the camera off so
      // the robot's width still fits. In a wide, short dock (the Mechanisms panel on phones) the
      // height is the limit, so the camera closes in until the robot fills most of it and more
      // than half the width, instead of sitting small in the middle of a wide strip.
      let baseDistance = 3.4;
      const frameCamera = (aspect: number) => {
        if (aspect <= 1) baseDistance = 3.4 / Math.pow(aspect, 0.85);
        else baseDistance = 3.4 * (1 - 0.16 * THREE.MathUtils.smoothstep(aspect, 1, 1.4));
      };

      // State: every animated value eases toward its target. Drag offsets are the visitor's own.
      const state = {
        scrollYaw: 0,
        drag: { yaw: kept.yaw, pitch: kept.pitch, vYaw: 0 },
        partBlend: 0,
        partYaw: BASE_YAW,
        weights: {} as Weights,
        dim: 0,
        yaw: BASE_YAW,
        pitch: 0,
        elevation: ELEVATION,
        // How far the camera has moved in on a small subsystem, and which one.
        zoom: 0,
        zoomPart: null as ReaperPartId | null,
      };

      // The camera orbits at a fixed elevation from the front. For a subsystem with a focus
      // frame it moves its aim onto that subsystem and closes in, by `state.zoom`.
      const aim = new THREE.Vector3();
      const partPoint = new THREE.Vector3();
      const placeCamera = () => {
        const elevation = THREE.MathUtils.degToRad(state.elevation);
        aim.copy(studio3d.REAPER_TARGET);
        let distance = baseDistance;
        const frame = state.zoomPart ? model3d.REAPER_FOCUS_FRAMES[state.zoomPart] : undefined;
        const group = state.zoomPart ? model.getObjectByName(`reaper-${state.zoomPart}`) : undefined;
        if (frame && group && state.zoom > 0) {
          rig.updateMatrixWorld(true);
          group.localToWorld(partPoint.set(...frame.center));
          aim.lerp(partPoint, state.zoom);
          distance *= 1 + (frame.distance - 1) * state.zoom;
        }
        camera.position.set(
          aim.x,
          aim.y + Math.sin(elevation) * distance,
          aim.z + Math.cos(elevation) * distance,
        );
        camera.lookAt(aim);
      };

      let host: HTMLElement | null = null;
      // Index of the dock that holds the canvas, for its pose in DOCK_POSES.
      let dockIndex = 0;
      let frame = 0;
      let visible = true;

      const render = () => renderer.render(scene, camera);
      const resize = () => {
        if (!host) return;
        const { clientWidth: w, clientHeight: h } = host;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        model3d.setReaperViewport(model, w, h);
        camera.aspect = w / h;
        frameCamera(camera.aspect);
        camera.updateProjectionMatrix();
        placeCamera();
        render();
      };
      const resizeObserver = new ResizeObserver(resize);

      // Scroll progress between the docks: 0 with the first dock centred in the viewport, 1
      // with the centre of the last dock's track (its [data-reaper-track] ancestor, since a
      // sticky dock stops moving) centred. Clamped a little past both ends.
      const centre = (el: Element) => {
        const r = el.getBoundingClientRect();
        return r.top + r.height / 2;
      };
      const last = docks[docks.length - 1];
      const lastTrack = last.closest("[data-reaper-track]") ?? last;
      const scrollProgress = () => {
        const y0 = centre(docks[0]);
        const y1 = centre(lastTrack);
        if (Math.abs(y1 - y0) < 1) return 0;
        const p = (window.innerHeight / 2 - y0) / (y1 - y0);
        return Math.min(1.6, Math.max(-0.5, p));
      };

      const pose = () => DOCK_POSES[Math.min(dockIndex, DOCK_POSES.length - 1)];
      const targets = () => {
        const focus = focusRef.current;
        const weights: Weights = {};
        for (const id of focus ?? []) weights[id] = 1;
        const lead = focus?.[0];
        return {
          weights,
          lead,
          dim: focus && focus.length ? 1 : 0,
          partBlend: lead ? 1 : 0,
          partYaw: lead ? PART_YAW[lead] : state.partYaw,
          elevation: (lead && PART_ELEVATION[lead]) || ELEVATION,
          zoom: lead && model3d.REAPER_FOCUS_FRAMES[lead] ? 1 : 0,
          scrollYaw: motionRef.current ? -(scrollProgress() - pose().at) * pose().turn : 0,
        };
      };

      const step = () => {
        const t = targets();
        const k = motionRef.current ? 0.12 : 1;
        let moving = false;
        const ease = (from: number, to: number) => {
          const next = from + (to - from) * k;
          if (Math.abs(to - next) > 0.0005) moving = true;
          return Math.abs(to - next) > 0.0005 ? next : to;
        };
        state.scrollYaw = ease(state.scrollYaw, t.scrollYaw);
        state.partBlend = ease(state.partBlend, t.partBlend);
        if (t.partBlend > 0) state.partYaw = t.partYaw;
        // Moving from one framed part to another passes back out through the full view.
        if (t.zoom > 0 && state.zoomPart !== t.lead) {
          if (state.zoom > 0) {
            state.zoom = ease(state.zoom, 0);
            moving = true;
          } else {
            state.zoomPart = t.lead ?? null;
            state.zoom = ease(0, 1);
          }
        } else state.zoom = ease(state.zoom, t.zoom);
        state.dim = ease(state.dim, t.dim);
        state.elevation = ease(state.elevation, t.elevation);
        const weights: Weights = {};
        for (const id of model3d.REAPER_PART_IDS) {
          const w = ease(state.weights[id] ?? 0, t.weights[id] ?? 0);
          if (w) weights[id] = w;
        }
        state.weights = weights;
        // Coasting after a drag.
        if (motionRef.current && Math.abs(state.drag.vYaw) > 0.0004) {
          state.drag.yaw += state.drag.vYaw;
          state.drag.vYaw *= 0.92;
          moving = true;
        } else state.drag.vYaw = 0;

        // The part view shortens the way round to its angle from wherever the scroll left it.
        const free = pose().yaw + state.scrollYaw;
        let towardPart = state.partYaw - free;
        towardPart = Math.atan2(Math.sin(towardPart), Math.cos(towardPart));
        state.yaw = free + towardPart * state.partBlend + state.drag.yaw;
        state.pitch = state.drag.pitch;
        rig.rotation.y = state.yaw;
        rig.rotation.x = state.pitch;
        model3d.setReaperFocus(model, state.weights, state.dim);
        placeCamera();
        render();
        return moving;
      };

      const tick = () => {
        frame = 0;
        const moving = step();
        if (moving && visible) frame = requestAnimationFrame(tick);
      };
      const wake = () => {
        if (!frame && visible && host) frame = requestAnimationFrame(tick);
      };
      wakeRef.current = wake;

      // Dock choice: the dock with the largest visible share of its own height wins.
      const visibleShare = (el: HTMLElement) => {
        const r = el.getBoundingClientRect();
        if (!r.height) return 0;
        const vh = window.innerHeight;
        return Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0)) / r.height;
      };
      const chooseDock = () => {
        let best: HTMLElement | null = null;
        let bestShare = 0;
        for (const dock of docks) {
          const share = visibleShare(dock);
          if (share > bestShare + 0.001) {
            best = dock;
            bestShare = share;
          }
        }
        visible = bestShare > 0;
        if (!best || best === host?.closest("[data-reaper-dock]")) return;
        const nextHost = best.querySelector<HTMLElement>("[data-reaper-host]");
        if (!nextHost) return;
        if (host) {
          resizeObserver.unobserve(host);
          host.closest<HTMLElement>("[data-reaper-dock]")?.removeAttribute("data-live");
        }
        host = nextHost;
        dockIndex = docks.indexOf(best);
        host.appendChild(canvas);
        resizeObserver.observe(host);
        // The new dock has its own resting angle. The canvas was out of sight while it moved, so
        // the robot arrives already turned to it rather than swinging round in front of the reader.
        state.scrollYaw = targets().scrollYaw;
        resize();
        // Settle into the new dock before the still underneath fades.
        step();
        best.setAttribute("data-live", "true");
      };

      let scrollQueued = false;
      const onScroll = () => {
        if (scrollQueued) return;
        scrollQueued = true;
        requestAnimationFrame(() => {
          scrollQueued = false;
          chooseDock();
          wake();
        });
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);

      // Drag to turn. Horizontal drags turn the robot; vertical drags still scroll the page on
      // touch (touch-action: pan-y on the canvas).
      let drag: { id: number; x: number; y: number; moved: number; t: number } | null = null;
      const onDown = (event: PointerEvent) => {
        if (event.button !== 0) return;
        drag = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: 0, t: performance.now() };
        state.drag.vYaw = 0;
        canvas.setPointerCapture(event.pointerId);
        canvas.dataset.dragging = "true";
      };
      const onMove = (event: PointerEvent) => {
        if (!drag || event.pointerId !== drag.id) return;
        const dx = event.clientX - drag.x;
        const dy = event.clientY - drag.y;
        drag.x = event.clientX;
        drag.y = event.clientY;
        drag.moved += Math.abs(dx) + Math.abs(dy);
        const now = performance.now();
        const dt = Math.max(8, now - drag.t);
        drag.t = now;
        const turn = dx * 0.009;
        state.drag.yaw += turn;
        state.drag.vYaw = (turn / dt) * 16;
        if (event.pointerType === "mouse")
          state.drag.pitch = Math.max(-0.12, Math.min(0.3, state.drag.pitch + dy * 0.004));
        step();
      };
      const raycaster = new THREE.Raycaster();
      const onUp = (event: PointerEvent) => {
        if (!drag || event.pointerId !== drag.id) return;
        const click = drag.moved < 6;
        drag = null;
        delete canvas.dataset.dragging;
        if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
        if (click && pickRef.current) {
          const rect = canvas.getBoundingClientRect();
          const ndc = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1,
          );
          raycaster.setFromCamera(ndc, camera);
          const hit = raycaster.intersectObject(model, true).find((h) => h.object.visible);
          pickRef.current(hit ? (model3d.reaperPartOf(hit.object)?.id ?? null) : null);
        } else wake();
      };
      canvas.addEventListener("pointerdown", onDown);
      canvas.addEventListener("pointermove", onMove);
      canvas.addEventListener("pointerup", onUp);
      canvas.addEventListener("pointercancel", onUp);

      // The theme recolors the LEDs, the highlight, the lights and the floor in place.
      const offTheme = onThemeChange(() => {
        model3d.setReaperColors(model, colors());
        studio.setLightTint(themeColor("--accent", "#ffffff"));
        studio.setFloorColor(themeColor("--surface-soft", "#1a1a1a"));
        render();
      });

      const onLost = (event: Event) => {
        event.preventDefault();
        cancelAnimationFrame(frame);
        frame = 0;
        section.removeAttribute("data-reaper-live");
        host?.closest("[data-reaper-dock]")?.removeAttribute("data-live");
      };
      const onRestored = () => {
        step();
        section.setAttribute("data-reaper-live", "");
        host?.closest("[data-reaper-dock]")?.setAttribute("data-live", "true");
      };
      canvas.addEventListener("webglcontextlost", onLost);
      canvas.addEventListener("webglcontextrestored", onRestored);

      state.scrollYaw = targets().scrollYaw;
      chooseDock();
      section.setAttribute("data-reaper-live", "");

      return {
        dispose: () => {
          kept.yaw = state.drag.yaw;
          kept.pitch = state.drag.pitch;
          wakeRef.current = () => {};
          offTheme();
          cancelAnimationFrame(frame);
          window.removeEventListener("scroll", onScroll);
          window.removeEventListener("resize", onScroll);
          canvas.removeEventListener("pointerdown", onDown);
          canvas.removeEventListener("pointermove", onMove);
          canvas.removeEventListener("pointerup", onUp);
          canvas.removeEventListener("pointercancel", onUp);
          canvas.removeEventListener("webglcontextlost", onLost);
          canvas.removeEventListener("webglcontextrestored", onRestored);
          resizeObserver.disconnect();
          for (const dock of docks) dock.removeAttribute("data-live");
          section.removeAttribute("data-reaper-live");
          model3d.disposeReaperModel(model);
          studio.dispose();
          renderer.dispose();
          // Hand the context back now rather than whenever the canvas is collected.
          renderer.forceContextLoss();
          canvas.remove();
        },
      };
    };

    // Docks within two screens. While any is, the scene stays; once none has been for
    // TEARDOWN_MS, it is released.
    const nearDocks = new Set<Element>();
    const release = () => {
      teardownTimer = 0;
      if (nearDocks.size || !stage) return;
      stage.dispose();
      stage = null;
    };
    const scheduleRelease = () => {
      if (!teardownTimer && stage && !nearDocks.size)
        teardownTimer = window.setTimeout(release, TEARDOWN_MS);
    };

    // Build when the browser is idle. A build that finds no usable WebGL settles on the stills
    // for the rest of the visit.
    const start = () => {
      if (stage || pending || failed || disposed) return;
      let cancelled = false;
      const cancelIdle = whenIdle(() => {
        build()
          .then((built) => {
            if (cancelled || disposed) {
              built?.dispose();
              return;
            }
            pending = null;
            stage = built;
            failed = !built;
            setDrawable(!!built);
            scheduleRelease();
          })
          .catch(() => {
            if (cancelled) return;
            pending = null;
            failed = true;
            setDrawable(false);
          });
      });
      pending = () => {
        cancelled = true;
        cancelIdle();
        pending = null;
      };
    };

    const keep = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) nearDocks.add(entry.target);
          else nearDocks.delete(entry.target);
        }
        if (nearDocks.size) {
          window.clearTimeout(teardownTimer);
          teardownTimer = 0;
        } else scheduleRelease();
      },
      { rootMargin: KEEP_MARGIN },
    );
    // Build once a dock is within a screen of the viewport.
    const near = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) start();
      },
      { rootMargin: "100% 0px" },
    );
    docks.forEach((dock) => {
      keep.observe(dock);
      near.observe(dock);
    });

    return () => {
      disposed = true;
      keep.disconnect();
      near.disconnect();
      window.clearTimeout(teardownTimer);
      pending?.();
      stage?.dispose();
      stage = null;
      setDrawable(false);
    };
  }, [sectionRef]);

  return drawable;
}

/**
 * A place the live model can sit. Until the canvas arrives it shows a still of the model, one per
 * theme (ftc.css picks the one that matches <html data-theme>, so only that one is fetched). The
 * opener's dock sits right at the fold, inside the distance at which browsers start lazy images,
 * so the still is held back until this sets `data-still`: once the page has loaded, or sooner if
 * the dock comes on screen first. So it never competes with the hero for bandwidth during the
 * first load. Without script, ftc.css shows it from the start. `label` describes the robot for
 * screen readers; the still and the canvas are hidden from them.
 */
export function ReaperDock({ className, label }: { className?: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [wanted, setWanted] = useState(false);

  useEffect(() => {
    const dock = ref.current;
    if (!dock) return;
    const want = () => {
      setWanted(true);
      stop();
    };
    const frame = document.readyState === "complete" ? requestAnimationFrame(want) : 0;
    const onScreen = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) want();
    });
    const stop = () => {
      cancelAnimationFrame(frame);
      onScreen.disconnect();
      window.removeEventListener("load", want);
    };
    onScreen.observe(dock);
    window.addEventListener("load", want);
    return stop;
  }, []);

  return (
    <div
      ref={ref}
      className={`reaper-dock${className ? ` ${className}` : ""}`}
      data-reaper-dock
      data-still={wanted || undefined}
      role="img"
      aria-label={label}
    >
      <div className="reaper-still" aria-hidden="true" />
      <div className="reaper-host" data-reaper-host />
    </div>
  );
}
