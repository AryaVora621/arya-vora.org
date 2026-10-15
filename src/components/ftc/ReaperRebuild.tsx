"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import styles from "./ReaperRebuild.module.css";
import { useMotionAllowed } from "@/lib/hooks/useMotionAllowed";
import { prefersStill, shouldUseStill } from "@/components/robopet/gpu";
import { onThemeChange, themeColor } from "@/lib/theme";
import {
  createReaperModel,
  REAPER_ASSEMBLIES,
  reaperAssemblyNodes,
  setReaperColors,
  setReaperFocus,
  setReaperViewport,
  type ReaperPartId,
} from "./createReaperModel";
import * as studio3d from "./reaperStudio";

/*
  Interactive scroll-driven CAD reassembly of FTC 23786 MakEMinds' robot Reaper.
  Uses the authentic procedural 3D model (createReaperModel) matching the highlight
  stage at the top of the page.

  As the visitor scrolls through the 560vh track, each of the 7 authentic subsystems
  converges from dispersed 3D coordinates into its exact docked position on the chassis:

  1. Drivetrain (34 parts) - goBILDA U-channel chassis, 4 mecanum wheels, gearmotors
  2. Intake (28 parts) - Full-width lifting intake, compliant rollers, centering mecanums
  3. Transfer (16 parts) - 1150 RPM gecko-wheel indexer and guide ramp
  4. Shooter (26 parts) - Dual 6000 RPM motors, weighted flywheel, tilting hood
  5. Limelight 3A (8 parts) - Optical AprilTag targeting sensor under the hood
  6. Protection (18 parts) - CNC plywood side plates with #23786 & acrylic shields
  7. Electronics (22 parts) - REV Control Hub, Expansion Hub, battery, and Pinpoint computer
  Total: 152 parts

  Features:
  - Synchronous in-memory model generation (0 KB external download, instant load)
  - Subtle translucent blueprint/ghost silhouette of the target robot geometry
  - Active subsystem accent outline (inverted smoothed hull) & silhouette rim lighting
  - Live placed parts counter (0 to 152) and responsive subsystem description card
  - Drag-to-orbit pointer controls with smooth damping
  - Seamless dual-theme support (monochrome neutral palette or violet accents)
  - Full prefers-reduced-motion accessibility fallbacks
*/

type SubsystemDef = {
  key: ReaperPartId;
  name: string;
  partCount: number;
  start: number;
  end: number;
  title: string;
  body: string;
  dispOffset: [number, number, number]; // millimeters in model space
  dispRot: [number, number, number]; // radians
};

const SUBSYSTEMS: readonly SubsystemDef[] = [
  {
    key: "drive",
    name: "Drivetrain",
    partCount: 34,
    start: 0.0,
    end: 0.15,
    title: "goBILDA Mecanum Chassis",
    body: "Four NeveRest gearmotors drive 96mm mecanum wheels geared for high-speed cycle times across the DECODE field. Perforated goBILDA channel chassis provides rigid mounting for all superstructure uprights.",
    dispOffset: [0, -220, 0],
    dispRot: [0.08, 0, 0],
  },
  {
    key: "intake",
    name: "Intake",
    partCount: 28,
    start: 0.15,
    end: 0.3,
    title: "Full-Width Lifting Intake",
    body: "Dual compliant-wheel rollers and centering mecanum wheels sweep artifacts over the perimeter and center them into the transfer indexer in under 0.4 seconds.",
    dispOffset: [0, 140, 340],
    dispRot: [-0.42, 0, 0],
  },
  {
    key: "transfer",
    name: "Transfer",
    partCount: 16,
    start: 0.3,
    end: 0.44,
    title: "1150 RPM Gecko Indexer",
    body: "High-grip gecko wheel powered by an 1150 RPM motor carries artifacts up a low-friction ramp directly to the shooter staging gate.",
    dispOffset: [0, 260, 160],
    dispRot: [0.25, 0.1, 0],
  },
  {
    key: "shooter",
    name: "Shooter",
    partCount: 26,
    start: 0.44,
    end: 0.58,
    title: "Twin 6000 RPM Flywheels & Hood",
    body: "Dual high-inertia counter-rotating flywheels under a servo-articulated curved hood launch artifacts into the alliance goal with vision-adjusted arc angles.",
    dispOffset: [0, 360, -80],
    dispRot: [-0.15, 0, 0],
  },
  {
    key: "aiming",
    name: "Limelight 3A",
    partCount: 8,
    start: 0.58,
    end: 0.72,
    title: "AprilTag Optical Targeting",
    body: "Vision sensor mounted under the hood reads field AprilTags at 60 fps to automate target distance and continuous hood elevation.",
    dispOffset: [0, 180, 240],
    dispRot: [0.1, 0.2, 0],
  },
  {
    key: "protection",
    name: "Protection",
    partCount: 18,
    start: 0.72,
    end: 0.86,
    title: "CNC Wooden Plates & Shields",
    body: "CNC-routed birch plywood side plates etched with #23786, polycarbonate inner plates, and acrylic shields protect internal wiring from ball impacts.",
    dispOffset: [0, 0, 0],
    dispRot: [0, 0, 0],
  },
  {
    key: "electronics",
    name: "Electronics",
    partCount: 22,
    start: 0.86,
    end: 1.0,
    title: "REV Hubs & Pinpoint Odometry",
    body: "REV Control Hub and Expansion Hub handle closed-loop velocity control across all mechanisms, backed by a goBILDA Pinpoint computer for sub-millimeter localization.",
    dispOffset: [0, 120, -320],
    dispRot: [0.2, 0, 0],
  },
] as const;

const TOTAL_PARTS = 152;

type PartAnimationRecord = {
  obj: THREE.Object3D;
  basePos: THREE.Vector3;
  dispPos: THREE.Vector3;
  baseQuat: THREE.Quaternion;
  dispQuat: THREE.Quaternion;
  start: number;
  end: number;
};

type AssemblyAnimationRecord = PartAnimationRecord & {
  assembly: (typeof REAPER_ASSEMBLIES)[number];
};

export function ReaperRebuild() {
  const motionAllowed = useMotionAllowed();
  const trackRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isLive, setIsLive] = useState(false);
  const [activeSubsystem, setActiveSubsystem] = useState<ReaperPartId>("drive");
  const [activeAssembly, setActiveAssembly] = useState<(typeof REAPER_ASSEMBLIES)[number]["id"]>(
    REAPER_ASSEMBLIES[0].id,
  );
  const [placedParts, setPlacedParts] = useState(TOTAL_PARTS);
  const [loaded, setLoaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Animation and interaction state
  const scrollProgressRef = useRef(0);
  const userYawRef = useRef(0);
  const userPitchRef = useRef(0);
  const isDraggingRef = useRef(false);
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const dragStartAnglesRef = useRef({ yaw: 0, pitch: 0 });

  // Activate WebGL when section nears viewport and GPU is adequate
  useEffect(() => {
    const track = trackRef.current;
    if (!track || prefersStill()) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          setIsLive(true);
        }
      },
      { rootMargin: "100% 0px" },
    );

    observer.observe(track);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isLive) return;

    const canvas = canvasRef.current;
    const track = trackRef.current;
    if (!canvas || !track) return;

    let disposed = false;
    let animId = 0;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      return;
    }

    if (shouldUseStill(renderer.getContext())) {
      renderer.dispose();
      return;
    }

    const coarse = matchMedia("(pointer: coarse)").matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !coarse;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);

    // Studio lighting environment
    const studio = studio3d.addReaperStudio(renderer, scene, {
      shadows: !coarse,
      floorColor: themeColor("--surface", "#111111"),
      tint: themeColor("--accent", "#ffffff"),
    });

    const getColors = () => ({
      accent: themeColor("--accent", "#ffffff"),
      eye: themeColor("--eye", "#ffffff"),
    });

    // 1. Ghost blueprint model (subtle translucent target silhouette)
    const ghost = createReaperModel({ shadows: false });
    ghost.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.material = new THREE.MeshBasicMaterial({
          color: 0x888888,
          transparent: true,
          opacity: 0.075,
          depthWrite: false,
        });
      }
    });
    scene.add(ghost);

    // 2. Active procedural Reaper model
    const model = createReaperModel({
      shadows: !coarse,
      colors: getColors(),
    });
    scene.add(model);

    // Theme synchronization
    const syncTheme = () => {
      const isViolet = document.documentElement.getAttribute("data-theme") === "violet";
      studio.setFloorColor(themeColor("--surface", "#111111"));
      studio.setLightTint(isViolet ? themeColor("--accent", "#b892ff") : null);
      setReaperColors(model, {
        accent: themeColor("--accent", isViolet ? "#b892ff" : "#ffffff"),
        eye: themeColor("--eye", isViolet ? "#8ef9f3" : "#ffffff"),
      });
    };
    syncTheme();
    const unbindTheme = onThemeChange(syncTheme);

    // Build each image2threejs assembly as its own mechanism. The parts are source-derived
    // transform nodes, so a wheel, chain, hood, or hub docks independently instead of seven
    // generic subsystem chunks sliding home together.
    const animRecords: AssemblyAnimationRecord[] = [];
    const nodes = new Map(reaperAssemblyNodes(model).map(({ assembly, node }) => [assembly.id, node]));

    SUBSYSTEMS.forEach((sub) => {
      const assemblies = REAPER_ASSEMBLIES.filter((assembly) => assembly.sub === sub.key);
      const span = (sub.end - sub.start) / assemblies.length;

      assemblies.forEach((assembly, index) => {
        const obj = nodes.get(assembly.id);
        if (!obj) return;
        const basePos = obj.position.clone();
        const baseQuat = obj.quaternion.clone();
        const start = sub.start + index * span;
        // Reserve the tail of each slot for the fully docked state. This gives every connection
        // a clean visual lock-in rather than an uninterrupted glide through the scroll track.
        const end = start + span * 0.78;
        const dispPos = basePos.clone().add(new THREE.Vector3(...assembly.offset));
        const dispQuat = baseQuat.clone().multiply(
          new THREE.Quaternion().setFromEuler(new THREE.Euler(...assembly.rotation)),
        );
        animRecords.push({ obj, basePos, dispPos, baseQuat, dispQuat, start, end, assembly });
      });
    });

    setLoaded(true);

    // Responsive canvas handling
    let currentAspect = 1;
    const handleResize = () => {
      if (!canvas || disposed) return;
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      if (width === 0 || height === 0) return;

      currentAspect = width / height;
      camera.aspect = currentAspect;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      setReaperViewport(model, width, height);
    };
    handleResize();
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(canvas);

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

    // Pointer controls for drag-to-orbit
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
      userYawRef.current = dragStartAnglesRef.current.yaw + dx * 0.005;
      userPitchRef.current = Math.max(
        -0.45,
        Math.min(0.65, dragStartAnglesRef.current.pitch + dy * 0.005),
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

    // Main render loop
    let lastPlaced = -1;
    let lastActiveSub: ReaperPartId | null = null;
    let lastActiveAssembly: string | null = null;
    let focusClearedAtEnd = false;

    const renderLoop = () => {
      if (disposed) return;

      const p = motionAllowed ? scrollProgressRef.current : 1.0;

      // Animate subsystems along their trajectory
      for (let i = 0; i < animRecords.length; i++) {
        const item = animRecords[i];
        if (p <= item.start) {
          item.obj.position.copy(item.dispPos);
          item.obj.quaternion.copy(item.dispQuat);
        } else if (p >= item.end) {
          item.obj.position.copy(item.basePos);
          item.obj.quaternion.copy(item.baseQuat);
        } else {
          const t = (p - item.start) / (item.end - item.start);
          const ease = t * t * (3 - 2 * t);
          item.obj.position.lerpVectors(item.dispPos, item.basePos, ease);
          item.obj.quaternion.slerpQuaternions(item.dispQuat, item.baseQuat, ease);
        }
      }

      // Count the source-derived assemblies as they seat. The per-assembly weights preserve the
      // page's original 152 component total while making the visual progress mechanically honest.
      let currentPlaced = 0;
      let curAssembly = animRecords[0]?.assembly ?? REAPER_ASSEMBLIES[0];
      for (const record of animRecords) {
        if (p >= record.start) curAssembly = record.assembly;
        if (p >= record.end) {
          currentPlaced += record.assembly.parts;
        } else if (p > record.start) {
          const t = (p - record.start) / (record.end - record.start);
          currentPlaced += Math.round(THREE.MathUtils.clamp(t, 0, 1) * record.assembly.parts);
        }
      }

      if (p >= 1.0) {
        currentPlaced = TOTAL_PARTS;
      }

      const curSubKey = curAssembly.sub;

      // Update state if changed
      if (currentPlaced !== lastPlaced) {
        lastPlaced = currentPlaced;
        setPlacedParts(currentPlaced);
      }

      if (p >= 0.99) {
        if (!focusClearedAtEnd) {
          focusClearedAtEnd = true;
          setReaperFocus(model, {}, 0.0);
        }
      } else {
        focusClearedAtEnd = false;
        if (curSubKey !== lastActiveSub) {
          lastActiveSub = curSubKey;
          setActiveSubsystem(curSubKey);
          setReaperFocus(model, { [curSubKey]: 1.0 }, 0.28);
        }
        if (curAssembly.id !== lastActiveAssembly) {
          lastActiveAssembly = curAssembly.id;
          setActiveAssembly(curAssembly.id);
        }
      }

      // Cinematic camera orbit arc
      const baseAngle = -0.55 + p * 1.35;
      const totalYaw = baseAngle + userYawRef.current;
      const totalPitch = 0.22 + userPitchRef.current;
      // Start wide enough to hold the whole build bay, then tighten as the final silhouette forms.
      const baseDist = THREE.MathUtils.lerp(4.25, 3.25, p);
      const dist = currentAspect <= 1 ? baseDist / Math.pow(currentAspect, 0.8) : baseDist;

      const camX = studio3d.REAPER_TARGET.x + Math.sin(totalYaw) * dist * Math.cos(totalPitch);
      const camY = studio3d.REAPER_TARGET.y + Math.sin(totalPitch) * dist;
      const camZ = studio3d.REAPER_TARGET.z + Math.cos(totalYaw) * dist * Math.cos(totalPitch);

      camera.position.set(camX, camY, camZ);
      camera.lookAt(studio3d.REAPER_TARGET);

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
      studio.dispose();
      renderer.dispose();
    };
  }, [isLive, motionAllowed]);

  const currentSub = SUBSYSTEMS.find((s) => s.key === activeSubsystem) ?? SUBSYSTEMS[0];
  const currentAssembly = REAPER_ASSEMBLIES.find((assembly) => assembly.id === activeAssembly) ?? REAPER_ASSEMBLIES[0];

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
            Scroll to reassemble Reaper from 152 CAD components across seven primary subsystems and 26 CAD-derived mechanical assemblies.
          </p>

          <ol className={styles.systems}>
            {SUBSYSTEMS.map((sub, idx) => {
              const activeIndex = SUBSYSTEMS.findIndex((s) => s.key === activeSubsystem);
              const isDone = motionAllowed && isLive
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

          <ol className={styles.assemblyQueue} aria-label="Assembly module queue">
            {REAPER_ASSEMBLIES.map((assembly) => (
              <li key={assembly.id} data-active={assembly.id === activeAssembly}>
                {assembly.label}
              </li>
            ))}
          </ol>

          {/* Active subsystem detail card */}
          <div className={`${styles.detail} ${styles.detailIn}`} aria-live="polite">
            <h3 className={styles.detailTitle}>{currentSub.title}</h3>
            <p className={styles.assemblyNow}>Docking now: {currentAssembly.label}</p>
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
            style={{ opacity: isLive && loaded ? 1 : 0 }}
            aria-label="3D model of Reaper reassembling as you scroll. Drag to rotate."
          />
          {(!isLive || !loaded) && (
            <div
              className={`${styles.stillBg} theme-tint`}
              role="img"
              aria-label="WorldsRobo, the team’s Onshape assembly of Reaper"
            />
          )}
          {isLive && (
            <div className={`${styles.load} ${loaded ? styles.loadDone : ""}`}>
              Loading 152 CAD components…
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
