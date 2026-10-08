"use client";

import { useEffect, useRef, useState } from "react";
import type { PartKey } from "@/data/robopet";
import { canRunLiveModel } from "./gpu";
import type { RoboPetStage } from "./roboPetStage";

export type { PartKey };

export type RoboPetFigureProps = {
  selected: PartKey | null;
  exploded: boolean;
  onSelect: (key: PartKey | null) => void;
};

const LABEL = "roboPet 3D model. Drag sideways or press the arrow keys to turn it. Home resets the view.";

// Names for the alt text of the stills, written to sit mid-sentence.
const PART_NAMES: Record<PartKey, string> = {
  shell: "shell",
  face: "OLED face",
  camera: "PiCam",
  electronics: "Pico and Zero 2W boards",
  power: "battery pack",
  legs: "legs",
  chassis: "chassis",
};

// The stage is columns 1 to 8 from 1024px and the full content width below, so the browser can pick
// the half size file for phones and small windows. The widths are close fits, enough to choose
// between two files. Keep in step with film.css and robopet.css.
const STILL_SIZES = "(min-width: 1152px) 696px, (min-width: 1024px) 60vw, (min-width: 640px) 92vw, 94vw";

/**
 * The still for a pose and selection, in both color schemes: one per part and pose, so pressing a
 * row of the parts table changes the figure even without the live model. Captured from the live
 * model on /dev/robopet?force3d with the stage at 700 x 525 CSS px and a device scale of 2,
 * pressing each part in turn, so a selected part is filled in exactly as the live model fills it.
 * Each is saved at 1400 px and at 700 px wide. The folder name is a version: the files never
 * change under it, so next.config.ts caches them for good. Re-capture into a new folder.
 */
function still(exploded: boolean, selected: PartKey | null) {
  const pose = exploded ? "exploded" : "assembled";
  const name = selected ? `${pose}-${selected}` : pose;
  const base = exploded ? "roboPet model pulled apart" : "roboPet model, assembled";
  const alt = selected
    ? `${base}, with the ${PART_NAMES[selected]} filled in.`
    : exploded
      ? "roboPet model pulled apart: shell, face, boards, battery and four legs."
      : "roboPet model, assembled.";
  const file = (scheme: "light" | "dark") => `/robopet/v1/${name}-${scheme}`;
  const set = (scheme: "light" | "dark") => `${file(scheme)}-700.webp 700w, ${file(scheme)}.webp 1400w`;
  return { light: `${file("light")}.webp`, lightSet: set("light"), darkSet: set("dark"), alt };
}

/**
 * The roboPet model as a line drawing the visitor can turn and take apart. A still covers first
 * paint, software GPUs, missing WebGL and a lost WebGL context. three.js loads only when the box
 * is within 200px of the viewport and a throwaway canvas says the live model would run.
 */
export function RoboPetFigure({ selected, exploded, onSelect }: RoboPetFigureProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<RoboPetStage | null>(null);
  const [live, setLive] = useState(false);
  const latest = useRef({ selected, exploded, onSelect });

  useEffect(() => {
    latest.current = { selected, exploded, onSelect };
  });

  useEffect(() => {
    const box = boxRef.current;
    const host = canvasHostRef.current;
    if (!box || !host) return;
    let cancelled = false;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        if (!canRunLiveModel()) return;
        import("./roboPetStage")
          .then(({ mountRoboPetStage }) => {
            if (cancelled) return;
            const stage = mountRoboPetStage(host, {
              selected: latest.current.selected,
              exploded: latest.current.exploded,
              label: LABEL,
              onPick: (key) => {
                const current = latest.current;
                if (key === null && current.selected === null) return;
                // Clicking the selected part again lets it go, like its row in the parts table.
                current.onSelect(key !== null && key === current.selected ? null : key);
              },
              onLost: () => setLive(false),
              // The stage keeps taking the pose and selection while the context is gone, so it
              // comes back current.
              onRestored: () => setLive(true),
            });
            if (!stage) return;
            stageRef.current = stage;
            setLive(true);
          })
          .catch(() => {
            // Keep the still if the chunk fails to load.
          });
      },
      { rootMargin: "200px 0px" },
    );
    observer.observe(box);

    return () => {
      cancelled = true;
      observer.disconnect();
      stageRef.current?.dispose();
      stageRef.current = null;
    };
  }, []);

  useEffect(() => {
    stageRef.current?.setExploded(exploded);
  }, [exploded]);

  useEffect(() => {
    stageRef.current?.setSelected(selected);
  }, [selected]);

  const image = still(exploded, selected);

  // The still comes after the canvas so that, while it is shown, it covers the canvas and takes
  // the pointer, which matters when a lost context leaves the canvas in place.
  return (
    <div ref={boxRef} className="robopet-stage">
      <div ref={canvasHostRef} className="robopet-stage-canvas" />
      {!live && (
        <picture className="robopet-stage-still">
          <source media="(prefers-color-scheme: dark)" srcSet={image.darkSet} sizes={STILL_SIZES} />
          <img
            src={image.light}
            srcSet={image.lightSet}
            sizes={STILL_SIZES}
            alt={image.alt}
            width={1400}
            height={1050}
            loading="lazy"
            decoding="async"
          />
        </picture>
      )}
    </div>
  );
}
