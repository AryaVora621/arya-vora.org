"use client";

import { useSyncExternalStore } from "react";
import { useMotionAllowed } from "@/lib/hooks/useMotionAllowed";

// The film and the exploded view pin a full-height stage and stack their heading, copy and
// controls inside it. That needs room: a landscape phone (844x390) or a page at 400 percent
// zoom (360x225) is too short, and the layers pile on top of each other. Those viewports get
// the static layouts, which are written to stand on their own. The 520px floor sits well
// under the shortest portrait phones, so a mobile browser's collapsing toolbar never moves a
// visitor across it mid-scroll.
const ROOMY = "(min-height: 520px) and ((min-width: 761px) or (orientation: portrait))";

function subscribe(callback: () => void) {
  const mql = window.matchMedia(ROOMY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

const getSnapshot = () => window.matchMedia(ROOMY).matches;

/** True when the viewport is big enough for a pinned, scroll-driven stage. */
export function useRoomyViewport(): boolean {
  // Server and first paint get the static layout, like useMotionAllowed.
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/** Scroll-driven stages run when motion is allowed and the viewport has room for them. */
export function useScrubStage(): boolean {
  const motion = useMotionAllowed();
  const roomy = useRoomyViewport();
  return motion && roomy;
}
