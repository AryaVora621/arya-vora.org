"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersStill, shouldUseStill } from "./gpu";
import { PartText } from "./PartText";
import { addStudio } from "./studio";
import { useScrubStage } from "./useScrubStage";

// UI-side part data, so the explainer works without WebGL. `ids` maps a part to the model's
// part ids; the four legs are one entry. Each line is checked against the roboPet README and
// build log (devlogs/DEVLOG.md, Days 1 to 8). The film beside this section already covers
// what each subsystem does, and its outro says once how far the build has got, so a part
// panel adds something the film does not: why the part is there, a size or rating, or what
// went wrong with it. The lede says once that the model is the planned design, so the panels
// do not repeat it. `backticks` mark part numbers, code and dates, which render in the mono
// face. Measurements keep a no-break space before the unit because the mono face gives a
// decimal point a full cell.
const PARTS = [
  {
    key: "shell",
    label: "Upper shell",
    ids: ["shell-top", "status-led"],
    // README hardware table: one WS2812 for status and mood. Day 3: "the cute, rounded Sesame
    // aesthetic". The README never mentions a printed shell; the lede says the model is a plan.
    detail:
      "The top cover, rounded in the style of the Sesame robot, with one `WS2812` LED for status and mood.",
  },
  {
    key: "face",
    label: "OLED face",
    ids: ["face"],
    // Day 5: second I2C bus (I2C0, GP8 and GP9) for the SSD1306, the IMU on I2C1; a 1,024-byte
    // frame timed out until it was written in 256-byte chunks; "128x64".
    detail:
      "A 128 by 64 `SSD1306` on its own I2C bus, apart from the IMU. A full frame timed out on the breadboard until I wrote it in 256-byte chunks.",
  },
  {
    key: "camera",
    label: "PiCam",
    ids: ["camera"],
    // Day 3: the quad-core Zero 2W runs full Linux and "will run multiple concurrent
    // processes": camera, web server, Bluetooth daemon.
    detail:
      "Camera for the Zero 2W, which runs full Linux on four cores. The camera, the web dashboard and the Bluetooth controller link are meant to run there together. The Pico keeps the servo loop to itself.",
  },
  {
    key: "electronics",
    label: "Pico and Zero 2W",
    ids: ["electronics"],
    // Day 4: Zero GPIO 14 and 15 to Pico GP1 and GP0; TX was first wired to TX; core_freq=250
    // added to the Zero's config to stop the mini UART baud rate drifting.
    detail:
      "Zero GPIO 14 and 15 wire to Pico GP1 and GP0. Wired straight through, the link did not work until TX and RX were crossed. The Zero also needed `core_freq=250` to stop its UART baud rate drifting.",
  },
  {
    key: "power",
    label: "Power",
    ids: ["power"],
    // README Architecture and Progress Log: inline fuse and switch on the pack, bulk
    // capacitors at the servo power bus, logic rail under 500 mA with the OLED and LED running.
    detail:
      "A fuse and a switch sit inline at the pack, with bulk capacitors on the servo bus. With the OLED and LED running, the logic rail drew under 500\u00a0mA.",
  },
  {
    key: "legs",
    label: "Legs",
    ids: ["leg-fl", "leg-fr", "leg-rl", "leg-rr"],
    // Day 7 (DEVLOG): esp32_servo_tester, a web page with 0, 45, 90, 135 and 180 degree buttons,
    // run at 5 to 6 V, built to check each MG996R before it is mounted. It worked on the first
    // servo. Connecting the second, Arya swapped its VCC and GND while it was powered from the
    // ESP32, and the ESP32 died. (The servo rating story is in the film's Power beat.)
    detail:
      "Printed PLA legs. I built an ESP32 bench tester, a web page with buttons for 0, 45, 90, 135 and 180 degrees, to check each servo at 5 to 6\u00a0V before mounting it. It worked on the first servo. Then I swapped the power and ground wires on the second one and killed the ESP32.",
  },
  {
    key: "lower",
    label: "Lower shell",
    ids: ["shell-bottom"],
    // The model's shell-bottom is the concept render's lower half-tube. It is not the printed
    // chassis (README Day 8, 2026-07-10 and 11). The film outro states once that the chassis is
    // printed and partly assembled, so this panel neither repeats nor cross-refers it.
    detail: "The lower half of the shell, where the boards and the battery sit.",
  },
] as const;
type PartKey = (typeof PARTS)[number]["key"];

const EXPLODE_END = 0.55;

// The GPU probe never changes during a visit, so nothing needs to subscribe.
const subscribeNever = () => () => {};

// How much of the stage's narrower side the selected part's bounding sphere should span when
// the camera moves in on it (the sphere includes the part's depth, so the part itself reads
// at about 40 percent of the frame), and how close the camera may get relative to the
// shot it started from, so a part as small as the camera never fills the frame with shell.
const FOCUS_FILL = 0.55;
const FOCUS_MIN_DIST = 0.42;
const GHOST_OPACITY = 0.07;

export function RoboPetExploded() {
  // Scroll-driven when motion is allowed and the viewport is tall enough to pin.
  const scrubStage = useScrubStage();
  const sectionRef = useRef<HTMLElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<PartKey | null>(null);
  const [failed, setFailed] = useState(false);
  // The browser took the GL context away (a backgrounded tab, a GPU reset). The still stands
  // in until it comes back; the layout stays as it is, so the page does not jump.
  const [lost, setLost] = useState(false);
  // The live canvas has drawn its first frame, so the still has done its job.
  const [ready, setReady] = useState(false);
  // False on the server and during hydration, then the cached probe result.
  const stillOnly = useSyncExternalStore(subscribeNever, prefersStill, () => false);
  // False in the server HTML (and so with JavaScript off), true once the page is live.
  const hydrated = useSyncExternalStore(subscribeNever, () => true, () => false);
  const highlightRef = useRef<(key: PartKey | null) => void>(() => {});
  const userPicked = useRef(false);

  useEffect(() => {
    const section = sectionRef.current;
    const mount = mountRef.current;
    if (!section || !mount || prefersStill()) return;
    const motion = scrubStage;
    let disposed = false;
    let cleanup = () => {};

    const start = async () => {
      const THREE = await import("three");
      const { RoomEnvironment } = await import(
        "three/examples/jsm/environments/RoomEnvironment.js"
      );
      const { createRoboPetModel, disposeRoboPetModel, setRoboPetExplode } = await import(
        "./createRoboPetModel"
      );
      if (disposed) return;

      let renderer: import("three").WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
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
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      mount.appendChild(renderer.domElement);

      // Same studio as the hero so the robot looks identical across sections.
      const scene = new THREE.Scene();
      const pmrem = new THREE.PMREMGenerator(renderer);
      const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = env;
      scene.environmentIntensity = 0.3;
      const studio = addStudio(THREE, scene, { shadowExtent: 3, floorRadius: 2.8 });
      const { floorMaterial } = studio;

      const model = createRoboPetModel({ shadows: true });
      const pivot = new THREE.Group();
      pivot.add(model);
      scene.add(pivot);
      const center = new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3());
      model.position.x -= center.x;
      model.position.z -= center.z;

      // Measure both states: the camera blends from an assembled fit (robot fills the
      // stage) to an exploded fit (every part in frame) as the teardown progresses.
      const assembledSphere = new THREE.Box3()
        .setFromObject(model)
        .getBoundingSphere(new THREE.Sphere());
      setRoboPetExplode(model, 1);
      const explodedBox = new THREE.Box3().setFromObject(model);
      const sphere = explodedBox.getBoundingSphere(new THREE.Sphere());
      const halfWidth = explodedBox.getSize(new THREE.Vector3()).x / 2;
      const partCenters = new Map<PartKey, import("three").Vector3>();
      // Bounding radius of each part's group, for the tour's dolly: small boards move the
      // camera in until they fill FOCUS_FILL of the stage; the legs and the shell are already
      // that big, so the camera stays put for them.
      const partRadius = new Map<PartKey, number>();
      setRoboPetExplode(model, 0);

      const state = { explode: motion ? 0 : 1, yaw: motion ? -0.35 : -0.15, focus: 0 };
      const focusTarget = new THREE.Vector3();
      let focusKey: PartKey | null = null;
      const fits = { assembled: 1, exploded: 1, portrait: false };
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

      const partOf = (object: import("three").Object3D | null) => {
        while (object) {
          if (object.userData?.part) return object.userData.part.id as string;
          object = object.parent;
        }
        return null;
      };
      const keyOf = (id: string | null) =>
        PARTS.find((part) => (part.ids as readonly string[]).includes(id ?? ""))?.key ?? null;

      // Unselected parts become a flat white ghost (an x-ray, not muddy glass); the
      // selected one keeps its real material.
      const ghost = new THREE.MeshBasicMaterial({
        color: "#ffffff",
        transparent: true,
        opacity: GHOST_OPACITY,
        depthWrite: false,
      });
      const realMaterial = new Map<import("three").Mesh, import("three").Mesh["material"]>();
      const meshParts = new Map<import("three").Mesh, PartKey | null>();
      // The model shares materials across parts (one PLA for shell, chassis and face), so
      // give each subsystem its own copies; otherwise dimming one part dims them all.
      const perPart = new Map<string, import("three").Material>();
      const cloneFor = (material: import("three").Material, key: PartKey | null) => {
        const id = `${material.uuid}:${key}`;
        if (!perPart.has(id)) perPart.set(id, material.clone());
        return perPart.get(id)!;
      };
      model.traverse((object) => {
        const mesh = object as import("three").Mesh;
        if (!mesh.isMesh) return;
        const key = keyOf(partOf(mesh));
        meshParts.set(mesh, key);
        mesh.material = Array.isArray(mesh.material)
          ? mesh.material.map((material) => cloneFor(material, key))
          : cloneFor(mesh.material, key);
        realMaterial.set(mesh, mesh.material);
      });
      // Part centres in the exploded pose, for the tour's camera dolly.
      setRoboPetExplode(model, 1);
      PARTS.forEach((part) => {
        const box = new THREE.Box3();
        meshParts.forEach((key, mesh) => key === part.key && box.expandByObject(mesh));
        if (box.isEmpty()) return;
        partCenters.set(part.key, box.getCenter(new THREE.Vector3()));
        partRadius.set(part.key, box.getBoundingSphere(new THREE.Sphere()).radius);
      });
      setRoboPetExplode(model, 0);
      let focusTween: gsap.core.Tween | null = null;
      let highlighted: PartKey | null = null;
      const applyHighlight = (key: PartKey | null) => {
        if (key === highlighted) return;
        highlighted = key;
        meshParts.forEach((partKey, mesh) => {
          const dim = key !== null && partKey !== key;
          mesh.material = dim ? ghost : realMaterial.get(mesh)!;
          mesh.castShadow = !dim;
        });
        // Dolly toward the selected subsystem so even small boards read clearly.
        if (key && partCenters.has(key)) {
          focusTarget.copy(partCenters.get(key)!);
          focusKey = key;
        }
        focusTween?.kill();
        focusTween = gsap.to(state, {
          focus: key ? 1 : 0,
          duration: 0.9,
          ease: "power3.out",
          onUpdate: render,
        });
        render();
      };
      highlightRef.current = applyHighlight;

      const resize = () => {
        const { clientWidth: w, clientHeight: h } = mount;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        const portrait = w < h;
        // Fit the exploded sphere into the tighter of the two field-of-view axes.
        const vFov = THREE.MathUtils.degToRad(camera.fov);
        const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
        const usable = portrait ? 0.92 : 0.74; // desktop leaves the copy column free
        // Phones are width-bound and the teardown is mostly lateral, so fit its width
        // directly; the sphere fit wastes most of a narrow screen.
        fits.portrait = portrait;
        fits.exploded = portrait
          ? (halfWidth * 1.22) / Math.tan(hFov / 2) + sphere.radius * 0.35
          : sphere.radius / Math.sin(Math.min(vFov * 1.2, hFov * usable) / 2);
        // Assembled: the robot fills a little over half the stage height.
        fits.assembled = Math.min(
          fits.exploded,
          assembledSphere.radius / Math.sin(Math.min(vFov * 0.5, hFov * usable * 0.7) / 2),
        );
        camera.setViewOffset(w, h, portrait ? 0 : -w * 0.17, portrait ? h * 0.17 : 0, w, h);
        render();
      };

      const lookAt = new THREE.Vector3();
      function render() {
        setRoboPetExplode(model, state.explode);
        pivot.rotation.y = state.yaw;
        floorMaterial.opacity = 1 - Math.min(1, state.explode * 1.6);
        const e = THREE.MathUtils.smoothstep(state.explode, 0, 1);
        let dist = THREE.MathUtils.lerp(fits.assembled, fits.exploded, e);
        const centerY = THREE.MathUtils.lerp(assembledSphere.center.y, sphere.center.y, e);
        lookAt.set(0, centerY, 0);
        // The ghosted rest of the robot steps back as the camera closes in on a part.
        ghost.opacity = GHOST_OPACITY * (1 - 0.6 * state.focus);
        if (state.focus > 0 && focusKey) {
          // Part centres are in model space; rotate them with the pivot's yaw.
          const target = focusTarget.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), state.yaw);
          lookAt.lerp(target, 0.7 * state.focus);
          // Close enough that the part's bounding sphere spans FOCUS_FILL of the narrower
          // field of view, and never farther out than the shot it started from.
          const radius = partRadius.get(focusKey) ?? 0;
          const narrow = Math.min(
            THREE.MathUtils.degToRad(camera.fov),
            2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect),
          );
          const near = radius / (FOCUS_FILL * Math.tan(narrow / 2));
          const closest = Math.max(near, dist * FOCUS_MIN_DIST);
          dist = THREE.MathUtils.lerp(dist, Math.min(dist, closest), state.focus);
        }
        camera.position.set(lookAt.x, lookAt.y + dist * 0.26, lookAt.z + dist);
        camera.lookAt(lookAt);
        camera.updateProjectionMatrix();
        renderer.render(scene, camera);
      }

      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      const onClick = (event: PointerEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.set(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          -((event.clientY - rect.top) / rect.height) * 2 + 1,
        );
        raycaster.setFromCamera(pointer, camera);
        const hit = raycaster.intersectObject(model, true)[0];
        const key = hit ? keyOf(partOf(hit.object)) : null;
        userPicked.current = key !== null;
        setActive(key);
        applyHighlight(key);
      };
      renderer.domElement.addEventListener("pointerup", onClick);

      // A lost context clears the canvas for good unless it is handled: show the still while
      // it is gone and draw again when the browser hands it back.
      const onLost = (event: Event) => {
        event.preventDefault();
        setLost(true);
      };
      const onRestored = () => {
        render();
        setLost(false);
      };
      renderer.domElement.addEventListener("webglcontextlost", onLost);
      renderer.domElement.addEventListener("webglcontextrestored", onRestored);

      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(mount);
      resize();
      setReady(true);

      // The tour timeline is built per orientation and rebuilt when the window crosses it, so
      // a rotated tablet does not keep the other layout's choices.
      let mm: gsap.MatchMedia | null = null;
      if (motion) {
        gsap.registerPlugin(ScrollTrigger);
        let lastTour: PartKey | null = null;
        mm = gsap.matchMedia(section);
        // Both orientations are listed because matchMedia only runs for a condition that matches.
        mm.add({ portrait: "(orientation: portrait)", landscape: "(orientation: landscape)" }, (context) => {
          const portrait = Boolean(context.conditions?.portrait);
          const timeline = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: section,
              start: "top top",
              end: "bottom bottom",
              scrub: 0.7,
              onUpdate: (self) => {
                // After the teardown holds, scrolling walks through each subsystem until
                // the visitor picks one themselves.
                const t = (self.progress - EXPLODE_END) / (1 - EXPLODE_END);
                section.dataset.phase = t < 0 ? "build" : "tour";
                if (userPicked.current) return;
                const next =
                  t < 0 ? null : PARTS[Math.min(PARTS.length - 1, Math.floor(t * PARTS.length))].key;
                if (next !== lastTour) {
                  lastTour = next;
                  setActive(next);
                  applyHighlight(next);
                }
              },
            },
            onUpdate: render,
          });
          timeline
            .to(state, { yaw: 0.15, duration: 1 }, 0)
            .to(state, { explode: 1, duration: EXPLODE_END - 0.1, ease: "power2.inOut" }, 0.08);
          if (portrait)
            timeline.to(".exploded-copy", { opacity: 0, y: -24, duration: 0.08 }, 0.08);
        });
      }

      cleanup = () => {
        mm?.revert();
        resizeObserver.disconnect();
        renderer.domElement.removeEventListener("pointerup", onClick);
        renderer.domElement.removeEventListener("webglcontextlost", onLost);
        renderer.domElement.removeEventListener("webglcontextrestored", onRestored);
        setReady(false);
        setLost(false);
        focusTween?.kill();
        delete section.dataset.phase;
        ghost.dispose();
        disposeRoboPetModel(model);
        perPart.forEach((material) => material.dispose());
        studio.dispose();
        env.dispose();
        pmrem.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    };

    // WebGL is only created once the section is close, keeping the first load light.
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          start().catch(() => setFailed(true));
        }
      },
      { rootMargin: "100% 0px" },
    );
    observer.observe(section);
    return () => {
      disposed = true;
      observer.disconnect();
      cleanup();
    };
  }, [scrubStage]);

  const activePart = PARTS.find((part) => part.key === active);
  const noWebGL = failed || stillOnly;
  // The still shows where there is no live canvas: no WebGL, a lost context, or the moment
  // before the first frame. The server HTML includes it, so it also shows with JavaScript off.
  const showStill = noWebGL || lost || !ready;
  // Layout follows the support, not the context's state, so a lost context cannot move the page.
  const live = scrubStage && !noWebGL;

  return (
    <section
      ref={sectionRef}
      id="exploded"
      className="exploded"
      data-mode={live ? "scrub" : "static"}
      aria-labelledby="exploded-title"
    >
      <div className="exploded-stage">
        <div className="exploded-copy site-shell">
          <h2 id="exploded-title">Parts</h2>
          <p className="exploded-lede">
            The planned design in three.js. Internals are approximate.
            {/* With JavaScript off the parts are listed below, so there is nothing to select. The
                sentence is in the server HTML, invisible, so the lede is the same height before
                and after hydration and the page below it does not move. */}
            <span className="exploded-hint" data-ready={hydrated}>
              {live || !hydrated
                ? "Scroll to pull it apart, or select a part."
                : "Select a part to see what it is."}
            </span>
          </p>
        </div>
        {/* Desktop tour card: a large visual twin of the detail panel that takes over the
            heading's slot once the teardown holds. The panel below stays the live region. */}
        <div className="exploded-tour site-shell" aria-hidden="true">
          {activePart && (
            <div key={activePart.key}>
              <p className="exploded-tour-title">{activePart.label}</p>
              <p>
                <PartText text={activePart.detail} />
              </p>
            </div>
          )}
        </div>
        <div ref={mountRef} className="exploded-canvas" aria-hidden="true">
          {showStill && (
            // eslint-disable-next-line @next/next/no-img-element -- static stand-in for WebGL
            <img
              className="exploded-still"
              src="/robopet/exploded-still.webp"
              alt=""
              width={1169}
              height={1147}
              loading="lazy"
            />
          )}
        </div>
        {/* With JavaScript off the buttons below do nothing, so the parts are listed here. */}
        <noscript>
          <dl className="exploded-all site-shell">
            {PARTS.map((part) => (
              <div key={part.key}>
                <dt>{part.label}</dt>
                <dd>
                  <PartText text={part.detail} />
                </dd>
              </div>
            ))}
          </dl>
        </noscript>
        <div className="exploded-parts site-shell">
          <ul aria-label="roboPet parts" data-ready={hydrated}>
            {PARTS.map((part) => (
              <li key={part.key}>
                <button
                  type="button"
                  aria-pressed={active === part.key}
                  onClick={() => {
                    const next = active === part.key ? null : part.key;
                    userPicked.current = next !== null;
                    setActive(next);
                    highlightRef.current(next);
                  }}
                >
                  {part.label}
                </button>
              </li>
            ))}
          </ul>
          {/* Empty until a part is selected, then a short panel that ends where its text does. */}
          <div className="exploded-detail" aria-live="polite">
            {activePart && (
              <div key={activePart.key} className="exploded-detail-body">
                <h3>{activePart.label}</h3>
                <p>
                  <PartText text={activePart.detail} />
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
