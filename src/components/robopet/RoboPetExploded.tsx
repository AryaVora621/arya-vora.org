"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useMotionAllowed } from "@/lib/hooks/useMotionAllowed";
import { shouldUseStill } from "./gpu";

// UI-side part data (README-sourced) so the explainer works without WebGL. `ids` maps a
// chip to model part ids; the four legs are one subsystem.
const PARTS = [
  {
    key: "shell",
    label: "Shell",
    ids: ["shell-top", "status-led"],
    detail: "PLA shell printed on a Bambu A1 Mini, with a single WS2812 status and mood LED.",
  },
  {
    key: "face",
    label: "OLED face",
    ids: ["face"],
    detail: "SSD1306 OLED behind a printed bezel. Draws the eyes; driven over I2C by the Pico.",
  },
  {
    key: "camera",
    label: "PiCam",
    ids: ["camera"],
    detail: "Camera module for the Zero 2W, the brain's eyes for perception.",
  },
  {
    key: "electronics",
    label: "Pico + Zero 2W",
    ids: ["electronics"],
    detail:
      "The Pico runs the real-time loop for all 12 servos. The Zero 2W is the brain. An MPU6050 IMU feeds balance.",
  },
  {
    key: "power",
    label: "Power",
    ids: ["power"],
    detail: "3-cell pack into two XL4016 buck converters: about 7.2 V for servos, 5 V for logic.",
  },
  {
    key: "legs",
    label: "Legs ×4",
    ids: ["leg-fl", "leg-fr", "leg-rl", "leg-rr"],
    detail: "Three MG996R servos per leg (hip, upper leg, lower leg) on printed PLA segments.",
  },
  {
    key: "chassis",
    label: "Chassis",
    ids: ["shell-bottom"],
    detail: "Lower shell carrying the hip mounts, battery tray and board standoffs.",
  },
] as const;
type PartKey = (typeof PARTS)[number]["key"];

const EXPLODE_END = 0.55;

export function RoboPetExploded() {
  const motion = useMotionAllowed();
  const sectionRef = useRef<HTMLElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<PartKey | null>(null);
  const [failed, setFailed] = useState(false);
  const highlightRef = useRef<(key: PartKey | null) => void>(() => {});
  const userPicked = useRef(false);

  useEffect(() => {
    const section = sectionRef.current;
    const mount = mountRef.current;
    if (!section || !mount) return;
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
      const key = new THREE.DirectionalLight("#ffead2", 2.6);
      key.position.set(-1.6, 4.2, 4.6);
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3 });
      key.shadow.bias = -0.0004;
      const rim = new THREE.DirectionalLight("#c4b5fd", 1.6);
      rim.position.set(3.5, 2.5, -3.5);
      scene.add(key, rim, new THREE.HemisphereLight("#e8ecff", "#0a0a10", 0.25));
      const floorMaterial = new THREE.ShadowMaterial({ opacity: 0.4, depthWrite: false });
      const floor = new THREE.Mesh(new THREE.CircleGeometry(5, 48), floorMaterial);
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      floor.renderOrder = -1;
      scene.add(floor);

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
      setRoboPetExplode(model, 0);

      const state = { explode: motion ? 0 : 1, yaw: motion ? -0.35 : -0.15, focus: 0 };
      const focusTarget = new THREE.Vector3();
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

      // Unselected parts become a flat violet ghost (an x-ray, not muddy glass); the
      // selected one keeps its real material with a faint violet lift.
      const ghost = new THREE.MeshBasicMaterial({
        color: "#a78bfa",
        transparent: true,
        opacity: 0.07,
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
        if (!box.isEmpty()) partCenters.set(part.key, box.getCenter(new THREE.Vector3()));
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
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach((material) => {
            const lit = material as import("three").MeshStandardMaterial;
            if (!lit.isMeshStandardMaterial || dim) return;
            if (lit.userData.baseEmissive === undefined) {
              lit.userData.baseEmissive = lit.emissive.getHex();
              lit.userData.baseIntensity = lit.emissiveIntensity;
            }
            const lift = key !== null && partKey === key && lit.userData.baseEmissive === 0;
            lit.emissive.setHex(lift ? 0x6d28d9 : lit.userData.baseEmissive);
            lit.emissiveIntensity = lift ? 0.22 : lit.userData.baseIntensity;
          });
        });
        // Dolly toward the selected subsystem so even small boards read clearly.
        if (key && partCenters.has(key)) focusTarget.copy(partCenters.get(key)!);
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
          ? (halfWidth * 1.08) / Math.tan(hFov / 2) + sphere.radius * 0.35
          : sphere.radius / Math.sin(Math.min(vFov * 1.02, hFov * usable) / 2);
        // Assembled: the robot fills a little over half the stage height.
        fits.assembled = Math.min(
          fits.exploded,
          assembledSphere.radius / Math.sin(Math.min(vFov * 0.6, hFov * usable * 0.75) / 2),
        );
        camera.setViewOffset(w, h, portrait ? 0 : -w * 0.15, portrait ? h * 0.1 : -h * 0.02, w, h);
        render();
      };

      const lookAt = new THREE.Vector3();
      function render() {
        setRoboPetExplode(model, state.explode);
        pivot.rotation.y = state.yaw;
        floorMaterial.opacity = 0.4 * (1 - Math.min(1, state.explode * 1.6));
        const e = THREE.MathUtils.smoothstep(state.explode, 0, 1);
        let dist = THREE.MathUtils.lerp(fits.assembled, fits.exploded, e);
        const centerY = THREE.MathUtils.lerp(assembledSphere.center.y, sphere.center.y, e);
        lookAt.set(0, centerY, 0);
        if (state.focus > 0) {
          // Part centres are in model space; rotate them with the pivot's yaw.
          const target = focusTarget.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), state.yaw);
          lookAt.lerp(target, 0.4 * state.focus);
          dist *= 1 - 0.2 * state.focus;
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

      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(mount);
      resize();

      let ctx: gsap.Context | null = null;
      if (motion) {
        gsap.registerPlugin(ScrollTrigger);
        const portrait = mount.clientWidth < mount.clientHeight;
        let lastTour: PartKey | null = null;
        ctx = gsap.context(() => {
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
        }, section);
      }

      cleanup = () => {
        ctx?.revert();
        resizeObserver.disconnect();
        renderer.domElement.removeEventListener("pointerup", onClick);
        focusTween?.kill();
        delete section.dataset.phase;
        ghost.dispose();
        disposeRoboPetModel(model);
        perPart.forEach((material) => material.dispose());
        floor.geometry.dispose();
        (floor.material as import("three").Material).dispose();
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
  }, [motion]);

  const activePart = PARTS.find((part) => part.key === active);
  const live = motion && !failed;

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
          <p className="eyebrow">
            <span className="status-dot" />
            ROBOPET / EXPLODED VIEW
          </p>
          <h2 id="exploded-title">
            Every part,
            <br />
            <span className="muted-text">on purpose.</span>
          </h2>
          <p className="exploded-lede">
            A procedural Three.js reconstruction, built in code from the concept render.{" "}
            {live ? "Scroll to pull it apart, or pick a part." : "Pick a part to see what it does."}
          </p>
        </div>
        {/* Desktop tour card: a large visual twin of the detail panel that takes over the
            heading's slot once the teardown holds. The panel below stays the live region. */}
        <div className="exploded-tour site-shell" aria-hidden="true">
          {activePart && (
            <div key={activePart.key}>
              <span className="micro">
                {String(PARTS.indexOf(activePart) + 1).padStart(2, "0")} /{" "}
                {String(PARTS.length).padStart(2, "0")}
              </span>
              <p className="exploded-tour-title">{activePart.label}</p>
              <p>{activePart.detail}</p>
            </div>
          )}
        </div>
        <div ref={mountRef} className="exploded-canvas" aria-hidden="true">
          {failed && (
            // eslint-disable-next-line @next/next/no-img-element -- static stand-in for WebGL
            <img
              className="exploded-still"
              src="/robopet/exploded-still.webp"
              alt=""
              width={2583}
              height={1452}
              loading="lazy"
            />
          )}
        </div>
        <div className="exploded-parts site-shell">
          <ul aria-label="roboPet subsystems">
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
          <div className="exploded-detail" aria-live="polite">
            <span className="micro">
              {activePart
                ? `${String(PARTS.indexOf(activePart) + 1).padStart(2, "0")} / ${String(PARTS.length).padStart(2, "0")}`
                : "INTERNALS ARE INFERRED, NOT MEASURED"}
            </span>
            <h3>{activePart?.label ?? "Seven subsystems"}</h3>
            <p>
              {activePart?.detail ??
                "Structure, face, perception, control, power and locomotion. Each one is a decision documented in the build log."}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
