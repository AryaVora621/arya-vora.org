"use client";

import { useEffect, useRef, useState } from "react";
import { useMotionAllowed } from "@/lib/hooks/useMotionAllowed";
import type { RoboPetEyeMode } from "./createRoboPetModel";
import { shouldUseStill } from "./gpu";

const MODES = ["Curious", "Happy", "Sleepy"] as const;
type Mode = (typeof MODES)[number];
const EYES: Record<Mode, RoboPetEyeMode> = {
  Curious: "open",
  Happy: "happy",
  Sleepy: "sleepy",
};
const CAPTIONS: Record<Mode, string> = {
  Curious: "Move your pointer. I’m curious.",
  Happy: "A small change. A little personality.",
  Sleepy: "Even robots need a break.",
};

// Hero roboPet: the same procedural model as the exploded view, so the hero, film and
// teardown all show one robot. A pre-rendered still covers first paint and no-WebGL.
export function HeroRobot() {
  const motion = useMotionAllowed();
  const [mode, setMode] = useState<Mode>("Curious");
  const [ready, setReady] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef<(mode: Mode) => void>(() => {});

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let cleanup = () => {};

    (async () => {
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
      const key = new THREE.DirectionalLight("#ffead2", 2.6);
      key.position.set(-1.6, 4.2, 4.6);
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      Object.assign(key.shadow.camera, { left: -2.5, right: 2.5, top: 2.5, bottom: -2.5 });
      key.shadow.bias = -0.0004;
      const rim = new THREE.DirectionalLight("#c4b5fd", 1.6);
      rim.position.set(3.5, 2.5, -3.5);
      scene.add(key, rim, new THREE.HemisphereLight("#e8ecff", "#0a0a10", 0.25));

      // Shadow-only floor so the robot grounds itself on the page background.
      const floor = new THREE.Mesh(
        new THREE.CircleGeometry(4, 48),
        new THREE.ShadowMaterial({ opacity: 0.45 }),
      );
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      scene.add(floor);

      const model = createRoboPetModel({ eyeMode: EYES.Curious, shadows: true });
      const rig = new THREE.Group();
      rig.add(model);
      scene.add(rig);
      const baseYaw = -0.55;
      rig.rotation.y = baseYaw;

      const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 100);
      camera.position.set(0, 1.7, 5.9);
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
      const motionRef = { motion };
      const look = { x: 0, y: 0 };
      const target = { x: 0, y: 0 };
      let frame = 0;
      let blinkTimer = 0;
      let visible = true;
      let current: Mode = "Curious";
      const drawEyes = (mode: RoboPetEyeMode) => {
        setRoboPetEyes(model, mode, { x: look.x, y: -look.y });
        render();
      };

      const tick = () => {
        frame = 0;
        look.x += (target.x - look.x) * 0.08;
        look.y += (target.y - look.y) * 0.08;
        rig.rotation.y = baseYaw + look.x * 0.45;
        rig.rotation.x = look.y * 0.08;
        drawEyes(EYES[current]);
        const settling =
          Math.abs(target.x - look.x) > 0.002 || Math.abs(target.y - look.y) > 0.002;
        if (visible && motionRef.motion && settling) frame = requestAnimationFrame(tick);
      };
      const wake = () => {
        if (!frame && visible) frame = requestAnimationFrame(tick);
      };
      const scheduleBlink = () => {
        blinkTimer = window.setTimeout(() => {
          if (visible && motionRef.motion && current === "Curious") {
            drawEyes("blink");
            window.setTimeout(() => current === "Curious" && drawEyes("open"), 140);
          }
          scheduleBlink();
        }, 2600 + Math.random() * 2800);
      };
      if (motion) scheduleBlink();

      const onPointer = (event: PointerEvent) => {
        if (event.pointerType !== "mouse" || !motionRef.motion) return;
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

      modeRef.current = (next) => {
        current = next;
        drawEyes(EYES[next]);
      };
      setReady(true);

      cleanup = () => {
        cancelAnimationFrame(frame);
        window.clearTimeout(blinkTimer);
        window.removeEventListener("pointermove", onPointer);
        document.documentElement.removeEventListener("pointerleave", onLeave);
        visibility.disconnect();
        resizeObserver.disconnect();
        disposeRoboPetModel(model);
        floor.geometry.dispose();
        (floor.material as import("three").Material).dispose();
        env.dispose();
        pmrem.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    })().catch(() => {});

    return () => {
      disposed = true;
      cleanup();
      setReady(false);
    };
  }, [motion]);

  return (
    <div className={`robot-scene hero-robot mode-${mode.toLowerCase()}`}>
      <div className="scene-coordinate coordinate-top" aria-hidden="true">
        FIG. 01 / ROBOPET, PROCEDURAL MODEL
      </div>
      <div className="hero-robot-stage" data-ready={ready}>
        {/* eslint-disable-next-line @next/next/no-img-element -- first-paint still of the 3D model */}
        <img
          className="hero-robot-still"
          src="/robopet/hero-still.webp"
          alt=""
          width={1200}
          height={1000}
          fetchPriority="high"
        />
        <div ref={hostRef} className="hero-robot-canvas" aria-hidden="true" />
      </div>
      <div className="robot-mode" role="group" aria-label="Robot expression">
        {MODES.map((item) => (
          <button
            key={item}
            aria-pressed={mode === item}
            onClick={() => {
              setMode(item);
              modeRef.current(item);
            }}
          >
            {item}
          </button>
        ))}
      </div>
      <p className="scene-caption">
        {CAPTIONS[mode]} <span>Procedural 3D model, built in code</span>
      </p>
    </div>
  );
}
