"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import styles from "./ReaperRebuild.module.css";
import { useMotionAllowed } from "@/lib/hooks/useMotionAllowed";
import { onThemeChange } from "@/lib/theme";

/*
  Interactive scroll-driven CAD reassembly of FTC 23786 MakEMinds' robot Reaper.
  Loads the complete 197-part robot CAD model (/ftc/reaper.glb) and disperses components
  into 3D space. As the visitor scrolls through the 560vh track, each of the 6 core
  subsystems reassembles bottom-up in sequence:

  1. Drivetrain (38 parts)
  2. Intake (65 parts)
  3. Lift (30 parts)
  4. Turret (38 parts)
  5. Shooter (21 parts)
  6. Electronics (5 parts)
  Total: 197 parts

  Includes ghost silhouette target geometry, slerp quaternion / position interpolation,
  drag-to-orbit pointer controls, live placed parts counter, responsive layout,
  dual-theme support, and full prefers-reduced-motion accessibility fallbacks.
*/

type SubsystemDef = {
  key: string;
  name: string;
  match: string;
  partCount: number;
  start: number;
  end: number;
  title: string;
  body: string;
};

const SUBSYSTEMS: readonly SubsystemDef[] = [
  {
    key: "drivetrain",
    name: "Drivetrain",
    match: "drivetrain",
    partCount: 38,
    start: 0.0,
    end: 0.16,
    title: "8-Wheel Mecanum Base",
    body: "Four NeveRest gearmotors drive 96mm mecanum wheels geared for high-speed cycle times across the DECODE field. Perforated goBILDA channel chassis provides rigid mounting for all superstructure uprights.",
  },
  {
    key: "intake",
    name: "Intake",
    match: "intake",
    partCount: 65,
    start: 0.16,
    end: 0.33,
    title: "Active Roller & Compliant Wheels",
    body: "Dual compliant-wheel rollers driven via polycord belts sweep artifacts over the perimeter and center them into the transfer indexer in under 0.4 seconds.",
  },
  {
    key: "lift",
    name: "Lift",
    match: "lift",
    partCount: 30,
    start: 0.33,
    end: 0.5,
    title: "Twin-Stage Telescoping Lift",
    body: "Precision linear slide cascade powered by continuous synthetic cord rigging elevates the turret assembly to high-basket scoring elevations.",
  },
  {
    key: "turret",
    name: "Turret",
    match: "turret",
    partCount: 38,
    start: 0.5,
    end: 0.67,
    title: "Continuous Azimuth Turret",
    body: "High-precision lazy-susan ring bearing driven by an encoder-equipped planetary motor allows 360° targeting independent of chassis orientation.",
  },
  {
    key: "shooter",
    name: "Shooter",
    match: "shooter",
    partCount: 21,
    start: 0.67,
    end: 0.83,
    title: "Dual Flywheel Launcher & Variable Hood",
    body: "Counter-rotating high-inertia flywheels paired with an articulated curved hood launch artifacts into the alliance goal with vision-adjusted arc angles.",
  },
  {
    key: "electronics",
    name: "Electronics",
    match: "electronics",
    partCount: 5,
    start: 0.83,
    end: 1.0,
    title: "REV Hubs & Limelight 3A Vision",
    body: "REV Control Hub and Expansion Hub handle closed-loop velocity control across all mechanisms, while a Limelight 3A tracks field AprilTags for automated aiming.",
  },
] as const;

const TOTAL_PARTS = 197;

/** Seeded PRNG (mulberry32) for deterministic CAD dispersion */
function createPrng(seed: number) {
  let a = seed;
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type PartRecord = {
  obj: THREE.Object3D;
  restPos: THREE.Vector3;
  restQuat: THREE.Quaternion;
  dispPos: THREE.Vector3;
  dispQuat: THREE.Quaternion;
  start: number;
  end: number;
};

export function ReaperRebuild() {
  const motionAllowed = useMotionAllowed();
  const trackRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [activeSubsystem, setActiveSubsystem] = useState<string>("drivetrain");
  const [placedParts, setPlacedParts] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Store mutable refs for animation loop
  const partsRef = useRef<PartRecord[]>([]);
  const scrollProgressRef = useRef(0);
  const userYawRef = useRef(0);
  const userPitchRef = useRef(0);
  const isDraggingRef = useRef(false);
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const dragStartAnglesRef = useRef({ yaw: 0, pitch: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const track = trackRef.current;
    if (!canvas || !track) return;

    let disposed = false;
    let animId = 0;

    // Set up WebGL renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 20);

    // Pivot group to center the CAD model
    const pivot = new THREE.Group();
    scene.add(pivot);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(4, 6, 5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xddeeff, 1.2);
    fillLight.position.set(-5, 3, -4);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 1.0);
    rimLight.position.set(0, -4, 4);
    scene.add(rimLight);

    // Theme adjustment
    const updateThemeLights = () => {
      const isViolet = document.documentElement.getAttribute("data-theme") === "violet";
      if (isViolet) {
        fillLight.color.setHex(0xb892ff);
        fillLight.intensity = 1.6;
      } else {
        fillLight.color.setHex(0xddeeff);
        fillLight.intensity = 1.2;
      }
    };
    updateThemeLights();
    const unbindTheme = onThemeChange(updateThemeLights);

    // Resize handler
    const handleResize = () => {
      if (!canvas || disposed) return;
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      if (width === 0 || height === 0) return;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    handleResize();
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(canvas);

    // Load CAD model
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);

    loader.load(
      "/ftc/reaper.glb",
      (gltf) => {
        if (disposed) return;

        const model = gltf.scene;

        // Compute model bounds to center and scale
        const box = new THREE.Box3().setFromObject(model);
        const center = new THREE.Vector3();
        box.getCenter(center);
        const size = new THREE.Vector3();
        box.getSize(size);

        // Center model within pivot
        model.position.set(-center.x, -center.y, -center.z);
        pivot.add(model);

        // Create ghost silhouette model
        const ghost = gltf.scene.clone(true);
        ghost.position.set(-center.x, -center.y, -center.z);
        ghost.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            const mesh = obj as THREE.Mesh;
            mesh.material = new THREE.MeshBasicMaterial({
              color: 0x888888,
              transparent: true,
              opacity: 0.045,
              depthWrite: false,
            });
          }
        });
        pivot.add(ghost);

        // Map the 6 subsystems and their 197 child components
        const rng = createPrng(23786); // FTC Team 23786 seed
        const partRecords: PartRecord[] = [];

        SUBSYSTEMS.forEach((sub) => {
          let subObj: THREE.Object3D | null = null;
          model.traverse((o) => {
            const nameLower = o.name.toLowerCase();
            if (nameLower.includes("sys") && nameLower.includes(sub.match)) {
              subObj = o;
            }
          });

          if (!subObj) return;

          // Collect parts in this subsystem
          const children = [...(subObj as THREE.Object3D).children];

          // Sort parts bottom-up along Y axis
          children.sort((a, b) => {
            const boxA = new THREE.Box3().setFromObject(a);
            const boxB = new THREE.Box3().setFromObject(b);
            const yA = boxA.isEmpty() ? a.position.y : (boxA.min.y + boxA.max.y) / 2;
            const yB = boxB.isEmpty() ? b.position.y : (boxB.min.y + boxB.max.y) / 2;
            return yA - yB;
          });

          const count = children.length;
          children.forEach((child, idx) => {
            const restPos = child.position.clone();
            const restQuat = child.quaternion.clone();

            // Dispersion vector
            const r1 = rng();
            const r2 = rng();
            const r3 = rng();
            const r4 = rng();
            const r5 = rng();

            const radial = new THREE.Vector3(child.position.x, 0, child.position.z);
            if (radial.lengthSq() < 0.0001) {
              const theta = r1 * Math.PI * 2;
              radial.set(Math.cos(theta), 0, Math.sin(theta));
            } else {
              radial.normalize();
            }

            const dispOffset = radial
              .multiplyScalar(0.42 + r2 * 0.58)
              .add(new THREE.Vector3((r3 - 0.5) * 0.25, (r4 - 0.2) * 0.55, (r5 - 0.5) * 0.25));

            const dispPos = restPos.clone().add(dispOffset);

            // Random rotation delta
            const randAxis = new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize();
            const randAngle = (rng() - 0.5) * Math.PI * 1.8;
            const deltaQuat = new THREE.Quaternion().setFromAxisAngle(randAxis, randAngle);
            const dispQuat = restQuat.clone().multiply(deltaQuat);

            // Stagger parts within subsystem window
            const windowSpan = sub.end - sub.start;
            const partStart = sub.start + (idx / Math.max(1, count)) * windowSpan * 0.72;
            const partEnd = Math.min(1.0, partStart + windowSpan * 0.38);

            partRecords.push({
              obj: child,
              restPos,
              restQuat,
              dispPos,
              dispQuat,
              start: partStart,
              end: partEnd,
            });
          });
        });

        partsRef.current = partRecords;
        setLoaded(true);
      },
      undefined,
      (err) => {
        console.error("Failed to load /ftc/reaper.glb:", err);
      },
    );

    // Scroll listener
    const handleScroll = () => {
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const trackHeight = rect.height - window.innerHeight;
      if (trackHeight <= 0) return;

      const progress = Math.max(0, Math.min(1, -rect.top / trackHeight));
      scrollProgressRef.current = progress;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    // Pointer controls for interactive drag-to-orbit
    const onPointerDown = (e: PointerEvent) => {
      isDraggingRef.current = true;
      setIsDragging(true);
      dragStartPosRef.current = { x: e.clientX, y: e.clientY };
      dragStartAnglesRef.current = { yaw: userYawRef.current, pitch: userPitchRef.current };
      canvas.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - dragStartPosRef.current.x;
      const dy = e.clientY - dragStartPosRef.current.y;
      userYawRef.current = dragStartAnglesRef.current.yaw + dx * 0.006;
      userPitchRef.current = Math.max(
        -0.5,
        Math.min(0.7, dragStartAnglesRef.current.pitch + dy * 0.006),
      );
    };

    const onPointerUp = (e: PointerEvent) => {
      isDraggingRef.current = false;
      setIsDragging(false);
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);

    // Animation frame loop
    let lastPlaced = -1;
    let lastActiveSub = "";

    const renderLoop = () => {
      if (disposed) return;

      const p = motionAllowed ? scrollProgressRef.current : 1.0;

      // Update part positions and count placed
      let placedCount = 0;
      const parts = partsRef.current;
      for (let i = 0; i < parts.length; i++) {
        const item = parts[i];
        if (p <= item.start) {
          item.obj.position.copy(item.dispPos);
          item.obj.quaternion.copy(item.dispQuat);
        } else if (p >= item.end) {
          item.obj.position.copy(item.restPos);
          item.obj.quaternion.copy(item.restQuat);
          placedCount++;
        } else {
          const t = (p - item.start) / (item.end - item.start);
          const ease = t * t * (3 - 2 * t);
          item.obj.position.lerpVectors(item.dispPos, item.restPos, ease);
          item.obj.quaternion.slerpQuaternions(item.dispQuat, item.restQuat, ease);
        }
      }

      // Determine active subsystem
      let curSub = SUBSYSTEMS[0].key;
      for (let i = 0; i < SUBSYSTEMS.length; i++) {
        if (p >= SUBSYSTEMS[i].start) {
          curSub = SUBSYSTEMS[i].key;
        }
      }

      if (placedCount !== lastPlaced) {
        lastPlaced = placedCount;
        setPlacedParts(placedCount);
      }
      if (curSub !== lastActiveSub) {
        lastActiveSub = curSub;
        setActiveSubsystem(curSub);
      }

      // Camera orbit arc
      const baseAngle = -0.75 + p * 1.6;
      const totalYaw = baseAngle + userYawRef.current;
      const totalPitch = 0.24 + userPitchRef.current;
      const dist = 1.15;

      const camX = Math.sin(totalYaw) * dist * Math.cos(totalPitch);
      const camY = Math.sin(totalPitch) * dist + 0.08;
      const camZ = Math.cos(totalYaw) * dist * Math.cos(totalPitch);

      camera.position.set(camX, camY, camZ);
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);

    return () => {
      disposed = true;
      cancelAnimationFrame(animId);
      unbindTheme();
      window.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      renderer.dispose();
    };
  }, [motionAllowed]);

  const currentSub = SUBSYSTEMS.find((s) => s.key === activeSubsystem) ?? SUBSYSTEMS[0];

  return (
    <section ref={trackRef} className={styles.rebuild} aria-label="Rebuilding Reaper interactive CAD">
      <div className={styles.stage}>
        {/* Editorial column */}
        <div className={styles.copy}>
          <span className={styles.eyebrow}>
            <span className={styles.dot} />
            FTC 23786 MakEMinds · Interactive CAD
          </span>
          <h2 className={styles.title}>Rebuilding Reaper</h2>
          <p className={styles.lede}>
            Scroll to reassemble Reaper from 197 raw CAD components across six primary subsystems.
          </p>

          <ol className={styles.systems}>
            {SUBSYSTEMS.map((sub, idx) => {
              const activeIndex = SUBSYSTEMS.findIndex((s) => s.key === activeSubsystem);
              const isDone = motionAllowed
                ? idx < activeIndex || (activeIndex === SUBSYSTEMS.length - 1 && placedParts === TOTAL_PARTS)
                : true;
              const isActive = sub.key === activeSubsystem;
              const state = isDone ? "done" : isActive ? "active" : "pending";

              return (
                <li key={sub.key} className={styles.item} data-state={state}>
                  <span className={styles.num}>{String(idx + 1).padStart(2, "0")}</span>
                  <span className={styles.name}>{sub.name}</span>
                  <span className={styles.count}>{sub.partCount} parts</span>
                  <p className={styles.hiddenDesc}>{sub.body}</p>
                </li>
              );
            })}
          </ol>

          {/* Active subsystem detail card */}
          <div className={`${styles.detail} ${styles.detailIn}`} aria-live="polite">
            <h3 className={styles.detailTitle}>{currentSub.title}</h3>
            <p className={styles.detailBody}>{currentSub.body}</p>
            <span className={styles.detailCount}>Subsystem total: {currentSub.partCount} parts</span>
          </div>

          <div className={styles.counter} aria-label={`Parts placed: ${placedParts} of ${TOTAL_PARTS}`}>
            Parts placed <output className={styles.output}>{placedParts}</output> / {TOTAL_PARTS}
          </div>
        </div>

        {/* 3D Canvas Stage */}
        <div className={styles.canvasWrap}>
          <canvas
            ref={canvasRef}
            className={styles.canvas}
            data-dragging={isDragging}
            aria-label="3D model of Reaper reassembling as you scroll. Drag to rotate."
          />
          <div className={`${styles.load} ${loaded ? styles.loadDone : ""}`}>
            Loading 197 CAD components…
          </div>
        </div>
      </div>
    </section>
  );
}
