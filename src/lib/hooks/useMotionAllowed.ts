"use client";

import { useSyncExternalStore } from "react";

// The nav's pause control writes html[data-motion="paused"]; scroll-driven scenes must
// honour it exactly like prefers-reduced-motion, including mid-session changes.
function subscribe(callback: () => void) {
  const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
  mql.addEventListener("change", callback);
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-motion"],
  });
  return () => {
    mql.removeEventListener("change", callback);
    observer.disconnect();
  };
}

function getSnapshot() {
  return (
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
    document.documentElement.dataset.motion !== "paused"
  );
}

export function useMotionAllowed(): boolean {
  // Server and first paint render the static layout; scrubbing is an enhancement.
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
