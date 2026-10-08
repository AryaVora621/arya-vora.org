"use client";

import { useEffect, useRef, useState } from "react";
import { useMotionAllowed } from "@/lib/hooks/useMotionAllowed";
import { prefersStill, shouldUseStill } from "./gpu";
import { addStudio } from "./studio";

// Run `task` when the browser is idle, so three.js and the first model build do not compete
// with hydration. Safari has no requestIdleCallback; the timeout covers it and a busy page.
function whenIdle(task: () => void) {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(task, { timeout: 1500 });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(task, 200);
  return () => window.clearTimeout(id);
}

// Hero roboPet: the same procedural model as the exploded view, so the hero, film and
// teardown all show one robot. A pre-rendered still covers first paint, reduced-motion
// software renderers and no-WebGL. The head follows the mouse pointer and the eyes blink.
export function HeroRobot() {
  const motion = useMotionAllowed();
  const [ready, setReady] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);
  // The scene is built once. Motion preference changes reach it through this ref and
  // `onMotionRef`, so a setting flip never rebuilds the renderer.
  const motionRef = useRef(motion);
  const onMotionRef = useRef<() => void>(() => {});

  useEffect(() => {
    motionRef.current = motion;
    onMotionRef.current();
  }, [motion]);

  useEffect(() => {
    const host = hostRef.current;
    // Browsers with no WebGL, or only a software renderer, keep the still. The probe is
    // cached and shared with the exploded view, so this check costs nothing the second time
    // and three.js is never downloaded for a visitor who cannot use it.
    if (!host || prefersStill()) return;
    let disposed = false;
    let cleanup = () => {};

    const build = async () => {
      const THREE = await import("three");
      const { RoomEnvironment } = await import(
        "three/examples/jsm/environments/RoomEnvironment.js"
      );
      const { createRoboPetModel, disposeRoboPetModel, setRoboPetEyes } = await import(
        "./createRoboPetModel"
      );
      if (disposed) return;

      let renderer: import("three").WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      } catch {
        return;
      }
      if (shouldUseStill(renderer.getContext())) {
        renderer.dispose();
        return;
      }
      // Touch devices never track a pointer, so a lighter buffer is plenty.
      const coarse = matchMedia("(pointer: coarse)").matches;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const pmrem = new THREE.PMREMGenerator(renderer);
      const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = env;
      scene.environmentIntensity = 0.3;
      const studio = addStudio(THREE, scene, { shadowExtent: 2.5, floorRadius: 1.7 });

      const model = createRoboPetModel({ eyeMode: "open", shadows: true });
      const rig = new THREE.Group();
      rig.add(model);
      scene.add(rig);
      const baseYaw = -0.55;
      rig.rotation.y = baseYaw;

      const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 100);
      camera.position.set(0, 1.5, 5.2);
      camera.lookAt(0, 0.62, 0);

      const render = () => renderer.render(scene, camera);
      const resize = () => {
        const { clientWidth: w, clientHeight: h } = host;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        render();
      };
      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(host);
      resize();

      // Pointer tracking eases toward a target. Frames are only drawn while the head is
      // settling; blinks are two scheduled draws, so an idle hero costs no GPU time.
      const look = { x: 0, y: 0 };
      const target = { x: 0, y: 0 };
      let frame = 0;
      let blinkTimer = 0;
      let openTimer = 0;
      let visible = true;
      const drawEyes = (mode: "open" | "blink") => {
        setRoboPetEyes(model, mode, { x: look.x, y: -look.y });
        render();
      };

      const tick = () => {
        frame = 0;
        look.x += (target.x - look.x) * 0.08;
        look.y += (target.y - look.y) * 0.08;
        rig.rotation.y = baseYaw + look.x * 0.45;
        rig.rotation.x = look.y * 0.08;
        drawEyes("open");
        const settling =
          Math.abs(target.x - look.x) > 0.002 || Math.abs(target.y - look.y) > 0.002;
        if (visible && motionRef.current && settling) frame = requestAnimationFrame(tick);
      };
      const wake = () => {
        if (!frame && visible) frame = requestAnimationFrame(tick);
      };
      const scheduleBlink = () => {
        blinkTimer = window.setTimeout(() => {
          if (visible && motionRef.current) {
            drawEyes("blink");
            openTimer = window.setTimeout(() => drawEyes("open"), 140);
          }
          scheduleBlink();
        }, 2600 + Math.random() * 2800);
      };
      scheduleBlink();

      const onPointer = (event: PointerEvent) => {
        if (event.pointerType !== "mouse" || !motionRef.current) return;
        const rect = host.getBoundingClientRect();
        target.x = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width) * 2 - 1));
        target.y = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height) * 2 - 1));
        wake();
      };
      window.addEventListener("pointermove", onPointer, { passive: true });
      const onLeave = () => {
        target.x = 0;
        target.y = 0;
        wake();
      };
      document.documentElement.addEventListener("pointerleave", onLeave);

      const visibility = new IntersectionObserver((entries) => {
        visible = entries.some((entry) => entry.isIntersecting);
        if (visible) wake();
      });
      visibility.observe(host);

      // The pose returns to centre when motion is switched off mid-visit.
      onMotionRef.current = () => {
        if (motionRef.current) return;
        target.x = target.y = look.x = look.y = 0;
        tick();
      };

      // A lost context (backgrounded tab, GPU reset) clears the canvas. Put the still back
      // until the browser restores it, then draw again.
      const onLost = (event: Event) => {
        event.preventDefault();
        cancelAnimationFrame(frame);
        frame = 0;
        setReady(false);
      };
      const onRestored = () => {
        render();
        setReady(true);
      };
      renderer.domElement.addEventListener("webglcontextlost", onLost);
      renderer.domElement.addEventListener("webglcontextrestored", onRestored);

      setReady(true);

      cleanup = () => {
        onMotionRef.current = () => {};
        renderer.domElement.removeEventListener("webglcontextlost", onLost);
        renderer.domElement.removeEventListener("webglcontextrestored", onRestored);
        cancelAnimationFrame(frame);
        window.clearTimeout(blinkTimer);
        window.clearTimeout(openTimer);
        window.removeEventListener("pointermove", onPointer);
        document.documentElement.removeEventListener("pointerleave", onLeave);
        visibility.disconnect();
        resizeObserver.disconnect();
        disposeRoboPetModel(model);
        studio.dispose();
        env.dispose();
        pmrem.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    };

    const cancelIdle = whenIdle(() => {
      build().catch(() => {});
    });

    return () => {
      disposed = true;
      cancelIdle();
      cleanup();
      setReady(false);
    };
  }, []);

  return (
    <div className="hero-robot">
      <div
        className="hero-robot-stage"
        data-ready={ready}
        role="img"
        aria-label="A 3D model of roboPet's planned design: a small four-legged robot with a rounded light grey shell and an OLED face showing two eyes."
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- first-paint still of the 3D model */}
        <img
          className="hero-robot-still"
          src="/robopet/hero-still.webp"
          alt=""
          width={1278}
          height={1066}
          fetchPriority="high"
        />
        <div ref={hostRef} className="hero-robot-canvas" aria-hidden="true" />
      </div>
    </div>
  );
}
