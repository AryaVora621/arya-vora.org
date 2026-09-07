"use client";

import { useSyncExternalStore } from "react";

/**
 * Subscribes to a media query via useSyncExternalStore so it's correct for
 * concurrent rendering and SSR (server/first paint use ssrFallback, then
 * reconciles to the real value) without a setState-in-effect render flash.
 */
function useMediaQuery(query: string, ssrFallback = false): boolean {
  return useSyncExternalStore(
    (callback) => {
      if (typeof window === "undefined") return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener("change", callback);
      return () => mql.removeEventListener("change", callback);
    },
    () => window.matchMedia(query).matches,
    () => ssrFallback
  );
}

export function useReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

export function useCoarsePointer(): boolean {
  return useMediaQuery("(pointer: coarse)");
}
