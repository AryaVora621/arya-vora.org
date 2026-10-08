"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useMotionAllowed } from "@/lib/hooks/useMotionAllowed";
import { shouldUseStill } from "./gpu";

type PartInfo = { id: string; label: string; detail: string };

// Ordered the way the hardware README explains the build: structure, control, power, legs.
const PART_ORDER = [
  "shell-top",
  "face",
  "camera",
  "status-led",
  "electronics",
  "power",
  "shell-bottom",
  "leg-fl",
  "leg-fr",
  "leg-rl",
  "leg-rr",
];

export function RoboPetExploded() {
  const motion = useMotionAllowed();
  const sectionRef = useRef<HTMLElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const [parts, setParts] = useState<PartInfo[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const selectRef = useRef<(id: string | null) => void>(() => {});

  useEffect(() => {
    const section = sectionRef.current;
    const mount = mountRef.current;
    if (!section || !mount) return;
    let disposed = false;
    let cleanup = () => {};

    const start = async () => {
      const THREE = await import("three");
      const { createRoboPetModel, setRoboPetExplode } = await import(
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
      renderer.toneMappingExposure = 1.05;
      mount.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
      const pmrem = new THREE.PMREMGenerator(renderer);
      const { RoomEnvironment } = await import(
        "three/examples/jsm/environments/RoomEnvironment.js"
      );
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      const key = new THREE.DirectionalLight(0xffffff, 1.6);
      key.position.set(3, 5, 4);
      const rim = new THREE.DirectionalLight(0xa78bfa, 1.2);
      rim.position.set(-4, 2, -3);
      scene.add(key, rim, new THREE.AmbientLight(0xffffff, 0.15));

      const model = createRoboPetModel();
      const pivot = new THREE.Group();
      pivot.add(model);
      scene.add(pivot);

      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      model.position.sub(new THREE.Vector3(center.x, 0, center.z));
      const radius = box.getSize(new THREE.Vector3()).length();

      const found: PartInfo[] = [];
      const pickables: import("three").Object3D[] = [];
      model.traverse((object) => {
        const part = object.userData?.part as PartInfo | undefined;
        if (part && !found.some((p) => p.id === part.id)) {
          found.push(part);
          pickables.push(object);
        }
      });
      found.sort(
        (a, b) =>
          (PART_ORDER.indexOf(a.id) + 99) % 99 - (PART_ORDER.indexOf(b.id) + 99) % 99,
      );
      setParts(found);

      const state = { explode: motion ? 0 : 0.7, yaw: -0.6, pitch: 0.22 };
      let highlighted: string | null = null;
      const original = new Map<import("three").Material, number>();

      const partOf = (object: import("three").Object3D | null) => {
        while (object) {
          if (object.userData?.part) return object.userData.part.id as string;
          object = object.parent;
        }
        return null;
      };

      // Dim everything except the selected subsystem so it reads like a callout.
      const applyHighlight = (id: string | null) => {
        highlighted = id;
        model.traverse((object) => {
          const mesh = object as import("three").Mesh;
          if (!mesh.isMesh) return;
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          const dim = id !== null && partOf(mesh) !== id;
          materials.forEach((material) => {
            if (!original.has(material)) original.set(material, material.opacity);
            material.transparent = dim || original.get(material)! < 1;
            material.opacity = dim ? 0.16 : original.get(material)!;
            material.depthWrite = !dim;
          });
        });
        render();
      };
      selectRef.current = (id) => applyHighlight(id === highlighted ? null : id);

      const resize = () => {
        const { clientWidth: w, clientHeight: h } = mount;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        // Distance is sized for the fully exploded silhouette, not the assembled robot.
        const portrait = w < h;
        const fit = radius * (portrait ? 3.1 : 2.15);
        camera.position.set(0, fit * 0.3, fit);
        camera.lookAt(0, radius * 0.1, 0);
        // Shift the frame instead of the model so rotation stays centred on the robot:
        // right of the copy column on desktop, below the title on phones.
        camera.setViewOffset(w, h, portrait ? 0 : -w * 0.16, portrait ? -h * 0.04 : 0, w, h);
        camera.updateProjectionMatrix();
        render();
      };

      function render() {
        setRoboPetExplode(model, state.explode);
        pivot.rotation.set(state.pitch * state.explode * 0.5, state.yaw, 0);
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
        const hit = raycaster.intersectObjects(pickables, true)[0];
        const id = hit ? partOf(hit.object) : null;
        setActive((current) => (id === current ? null : id));
        applyHighlight(id === highlighted ? null : id);
      };
      renderer.domElement.addEventListener("pointerup", onClick);

      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(mount);
      resize();

      let ctx: gsap.Context | null = null;
      if (motion) {
        gsap.registerPlugin(ScrollTrigger);
        ctx = gsap.context(() => {
          gsap
            .timeline({
              defaults: { ease: "none" },
              scrollTrigger: {
                trigger: section,
                start: "top top",
                end: "bottom bottom",
                scrub: 0.7,
              },
              onUpdate: render,
            })
            .to(state, { yaw: 0.5, duration: 1 }, 0)
            .to(state, { explode: 1, duration: 0.55, ease: "power2.inOut" }, 0.12)
            .to(state, { explode: 0.85, duration: 0.2 }, 0.8);
        }, section);
      }

      cleanup = () => {
        ctx?.revert();
        resizeObserver.disconnect();
        renderer.domElement.removeEventListener("pointerup", onClick);
        scene.traverse((object) => {
          const mesh = object as import("three").Mesh;
          if (!mesh.isMesh) return;
          mesh.geometry.dispose();
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach((material) => {
            Object.values(material).forEach((value) => {
              if (value instanceof THREE.Texture) value.dispose();
            });
            material.dispose();
          });
        });
        scene.environment?.dispose();
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

  const activePart = parts.find((part) => part.id === active);

  return (
    <section
      ref={sectionRef}
      id="exploded"
      className="exploded"
      data-mode={motion ? "scrub" : "static"}
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
            A procedural Three.js reconstruction, built in code from the concept render.
            Scroll to pull it apart. Pick a part to see what it does.
          </p>
        </div>
        <div ref={mountRef} className="exploded-canvas" aria-hidden="true">
          {failed && (
            // eslint-disable-next-line @next/next/no-img-element -- static stand-in for WebGL
            <img
              className="exploded-still"
              src="/robopet/exploded-still.webp"
              alt=""
              width={1376}
              height={768}
              loading="lazy"
            />
          )}
        </div>
        <div className="exploded-parts site-shell">
          <ul aria-label="roboPet subsystems">
            {parts.map((part) => (
              <li key={part.id}>
                <button
                  type="button"
                  aria-pressed={active === part.id}
                  onClick={() => {
                    setActive(active === part.id ? null : part.id);
                    selectRef.current(part.id);
                  }}
                >
                  {part.label}
                </button>
              </li>
            ))}
          </ul>
          <div className="exploded-detail" aria-live="polite">
            {activePart ? (
              <>
                <span className="micro">{activePart.id.toUpperCase()}</span>
                <h3>{activePart.label}</h3>
                <p>{activePart.detail}</p>
              </>
            ) : (
              <p className="micro">SELECT A PART. INTERNALS ARE INFERRED, NOT MEASURED.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
