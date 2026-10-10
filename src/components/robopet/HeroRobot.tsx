"use client";

import { useEffect, useRef, useState } from "react";
import { useMotionAllowed } from "@/lib/hooks/useMotionAllowed";
import { onThemeChange, themeColor } from "@/lib/theme";
import { prefersStill, shouldUseStill } from "./gpu";
import { addStudio } from "./studio";
import { ThemeStill } from "./ThemeStill";
import { useThemeStills } from "./themeStills";
import { EYE_WORD, useThemeName } from "./useThemeName";

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
// software renderers and no-WebGL. The head follows the mouse pointer and the eyes blink. A
// touch screen has no pointer to follow, so there the head turns toward a finger on the robot,
// and while nothing touches it, it looks slowly from side to side (TOUCH_* and SWEEP_* below).
// The eyes and the status LED take the theme's --eye color (white, or violet) and change with
// it live; there is one still per theme and CSS shows the one that matches <html data-theme>.
//
// Which still a visit needs is only known once the inline theme script has run, and that script
// waits behind the stylesheets, after the preload scanner has already read the markup. So both
// stills are lazy and carry no preload: a lazy image under display: none is never requested, the
// visible one is requested as soon as the first layout places it, and neither theme downloads the
// other's still. A plain high-priority img would be fetched for every visitor, and React would
// add a preload for it to the head. (With scripting off lazy loading is ignored, and ThemeStill
// keeps the violet one from being fetched there.) Each still has an 800 px copy for phones (made
// from the full one with sharp, resize(800) and webp quality 86), about half the bytes of the
// 1278 px one; the browser picks by the stage's width and the device pixel ratio.
const STILL_SIZES = "(max-width: 760px) 100vw, (max-width: 1100px) 60vw, 820px";

// The camera's vertical field of view, in degrees. It frames the robot close: at rest it spans
// about 84% of the stage's width, and turned as far as the pointer can turn it (yaw -1.0, the
// pose that shows the most of its length) about 94%, so no pose is ever cut off at the stage's
// edge. It is a narrower lens from the same spot, rather than a camera moved in, so the robot
// keeps the perspective it had at 30 degrees. The stills are rendered from this framing
// (scripts/capture-robopet-stills.mjs), so a change here needs new stills.
const HERO_FOV = 26;

// How long the head keeps looking at the spot a finger left before it turns back, in ms.
const TOUCH_HOLD_MS = 1200;
// The idle look on a touch screen: a slow side-to-side turn with a smaller up-and-down drift
// on a different period, so it never repeats as a plain back-and-forth. Amplitudes are shares
// of the pointer's full range (the yaw stays well inside the framing HERO_FOV allows); periods
// are in seconds. It is drawn at about 30 frames a second, which is plenty for a turn this slow.
const SWEEP_X = 0.4;
const SWEEP_Y = 0.18;
const SWEEP_X_PERIOD = 6.5;
const SWEEP_Y_PERIOD = 4.1;
const SWEEP_FRAME_MS = 30;

export function HeroRobot() {
  const motion = useMotionAllowed();
  const theme = useThemeName();
  // Keeps every still of the page (not only this one) from going blank at a theme switch.
  useThemeStills();
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
      const { createRoboPetModel, disposeRoboPetModel, setRoboPetEyeColor, setRoboPetEyes } =
        await import("./createRoboPetModel");
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
      // Touch devices never track a pointer, so a lighter buffer is plenty. They also get the
      // idle look (below).
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
      // The floor disc fades out inside the frame, so its rim never meets the stage edge at this lens.
      const studio = addStudio(THREE, scene, { shadowExtent: 2.5, floorRadius: 1.5 });

      const eyeColor = () => themeColor("--eye", "#ffffff");
      const model = createRoboPetModel({ eyeColor: eyeColor(), eyeMode: "open", shadows: true });
      const rig = new THREE.Group();
      rig.add(model);
      scene.add(rig);
      const baseYaw = -0.55;
      rig.rotation.y = baseYaw;

      const camera = new THREE.PerspectiveCamera(HERO_FOV, 1, 0.05, 100);
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
      // settling, or on a touch screen while it looks around; blinks are two scheduled draws.
      // Nothing is drawn while the hero is off screen or the tab is hidden, so an idle hero
      // there costs no GPU time.
      const look = { x: 0, y: 0 };
      const target = { x: 0, y: 0 };
      let frame = 0;
      let blinkTimer = 0;
      let openTimer = 0;
      let releaseTimer = 0;
      let visible = true;
      let eyes: "open" | "blink" = "open";
      // A finger is on the robot, or lifted less than TOUCH_HOLD_MS ago.
      let touching = false;
      // Seconds of idle look so far, and the times of the last frame and the last draw.
      let sweepTime = 0;
      let lastFrame = 0;
      let lastDraw = 0;
      const draw = () => {
        setRoboPetEyes(model, eyes, { x: look.x, y: -look.y });
        render();
      };
      const sweeping = () =>
        coarse && !touching && visible && motionRef.current && !document.hidden;

      const tick = (now: number) => {
        frame = 0;
        const sweep = sweeping();
        if (sweep) {
          // A long gap (the tab was hidden, the hero off screen) counts as one frame, so the
          // look picks up where it stopped instead of jumping.
          sweepTime += Math.min(lastFrame ? now - lastFrame : 16, 50) / 1000;
          target.x = SWEEP_X * Math.sin((2 * Math.PI * sweepTime) / SWEEP_X_PERIOD);
          target.y = SWEEP_Y * Math.sin((2 * Math.PI * sweepTime) / SWEEP_Y_PERIOD);
        }
        lastFrame = now;
        look.x += (target.x - look.x) * 0.08;
        look.y += (target.y - look.y) * 0.08;
        rig.rotation.y = baseYaw + look.x * 0.45;
        rig.rotation.x = look.y * 0.08;
        const settling =
          Math.abs(target.x - look.x) > 0.002 || Math.abs(target.y - look.y) > 0.002;
        // The idle look is slow, so it is drawn at about half the frame rate; a turn toward a
        // finger, or back from one, is drawn on every frame.
        const quick = Math.abs(target.x - look.x) > 0.02 || Math.abs(target.y - look.y) > 0.02;
        if (!sweep || quick || now - lastDraw >= SWEEP_FRAME_MS) {
          draw();
          lastDraw = now;
        }
        if (visible && motionRef.current && !document.hidden && (settling || sweep)) {
          frame = requestAnimationFrame(tick);
        } else {
          lastFrame = 0;
        }
      };
      const wake = () => {
        if (!frame && visible && !document.hidden) frame = requestAnimationFrame(tick);
      };
      const scheduleBlink = () => {
        blinkTimer = window.setTimeout(() => {
          if (visible && motionRef.current && !document.hidden) {
            eyes = "blink";
            draw();
            openTimer = window.setTimeout(() => {
              eyes = "open";
              draw();
            }, 140);
          }
          scheduleBlink();
        }, 2600 + Math.random() * 2800);
      };
      scheduleBlink();

      const aimAt = (event: PointerEvent) => {
        const rect = host.getBoundingClientRect();
        target.x = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width) * 2 - 1));
        target.y = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height) * 2 - 1));
      };
      const onPointer = (event: PointerEvent) => {
        if (event.pointerType !== "mouse" || !motionRef.current) return;
        aimAt(event);
        wake();
      };
      window.addEventListener("pointermove", onPointer, { passive: true });
      const onLeave = () => {
        target.x = 0;
        target.y = 0;
        wake();
      };
      document.documentElement.addEventListener("pointerleave", onLeave);

      // Touch and pen, on the robot itself. A touch pointer only moves while it is down, and
      // the browser captures it to the canvas, so a drag that leaves the robot still steers it.
      // The canvas lets the page scroll vertically and pinch-zoom (touch-action), so a swipe up
      // or down scrolls as before: the browser then cancels the pointer, and the head turns
      // back after the hold.
      const onTouch = (event: PointerEvent) => {
        if (event.pointerType === "mouse" || !motionRef.current) return;
        touching = true;
        window.clearTimeout(releaseTimer);
        aimAt(event);
        wake();
      };
      const onRelease = (event: PointerEvent) => {
        if (event.pointerType === "mouse" || !touching) return;
        window.clearTimeout(releaseTimer);
        releaseTimer = window.setTimeout(() => {
          touching = false;
          target.x = 0;
          target.y = 0;
          // The idle look starts again from the middle, where the head is turning back to.
          sweepTime = 0;
          wake();
        }, TOUCH_HOLD_MS);
      };
      renderer.domElement.style.touchAction = "pan-y pinch-zoom";
      host.addEventListener("pointerdown", onTouch);
      host.addEventListener("pointermove", onTouch, { passive: true });
      host.addEventListener("pointerup", onRelease);
      host.addEventListener("pointercancel", onRelease);
      // A pen can hover without pressing; leaving the robot ends that the same way.
      host.addEventListener("pointerleave", onRelease);

      const visibility = new IntersectionObserver((entries) => {
        visible = entries.some((entry) => entry.isIntersecting);
        if (visible) wake();
      });
      visibility.observe(host);
      const onPageVisibility = () => {
        if (!document.hidden) wake();
      };
      document.addEventListener("visibilitychange", onPageVisibility);

      // A theme change recolors the eyes and the LED in place and draws once.
      const offTheme = onThemeChange(() => {
        setRoboPetEyeColor(model, eyeColor());
        render();
      });

      // The pose returns to centre when motion is switched off mid-visit, and the idle look
      // (on a touch screen) starts again when it is switched back on.
      onMotionRef.current = () => {
        if (motionRef.current) {
          wake();
          return;
        }
        cancelAnimationFrame(frame);
        frame = 0;
        window.clearTimeout(releaseTimer);
        touching = false;
        sweepTime = 0;
        target.x = target.y = look.x = look.y = 0;
        tick(performance.now());
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
        wake();
      };
      renderer.domElement.addEventListener("webglcontextlost", onLost);
      renderer.domElement.addEventListener("webglcontextrestored", onRestored);

      setReady(true);

      cleanup = () => {
        onMotionRef.current = () => {};
        offTheme();
        renderer.domElement.removeEventListener("webglcontextlost", onLost);
        renderer.domElement.removeEventListener("webglcontextrestored", onRestored);
        cancelAnimationFrame(frame);
        window.clearTimeout(blinkTimer);
        window.clearTimeout(openTimer);
        window.clearTimeout(releaseTimer);
        window.removeEventListener("pointermove", onPointer);
        document.documentElement.removeEventListener("pointerleave", onLeave);
        host.removeEventListener("pointerdown", onTouch);
        host.removeEventListener("pointermove", onTouch);
        host.removeEventListener("pointerup", onRelease);
        host.removeEventListener("pointercancel", onRelease);
        host.removeEventListener("pointerleave", onRelease);
        document.removeEventListener("visibilitychange", onPageVisibility);
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
        aria-label={`A 3D model of roboPet's planned design: a small four-legged robot with a rounded light grey shell and an OLED face showing two ${EYE_WORD[theme]} eyes.`}
      >
        <ThemeStill
          theme="mono"
          kind="hero"
          className="hero-robot-still hero-robot-still-mono"
          src="/robopet/hero-still.webp"
          srcSet="/robopet/hero-still-sm.webp 800w, /robopet/hero-still.webp 1278w"
          sizes={STILL_SIZES}
          fetchPriority="high"
          alt=""
          width={1278}
          height={1066}
          loading="lazy"
        />
        <ThemeStill
          theme="violet"
          kind="hero"
          className="hero-robot-still hero-robot-still-violet"
          src="/robopet/hero-still-violet.webp"
          srcSet="/robopet/hero-still-violet-sm.webp 800w, /robopet/hero-still-violet.webp 1278w"
          sizes={STILL_SIZES}
          fetchPriority="high"
          alt=""
          width={1278}
          height={1066}
          loading="lazy"
        />
        <div ref={hostRef} className="hero-robot-canvas" aria-hidden="true" />
      </div>
    </div>
  );
}
