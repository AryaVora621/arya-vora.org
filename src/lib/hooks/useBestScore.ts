"use client";

import { useCallback, useSyncExternalStore } from "react";

const PREFIX = "av-games-best:";
const listeners = new Set<() => void>();

function read(slug: string): number {
  try {
    return Number(localStorage.getItem(PREFIX + slug)) || 0;
  } catch {
    return 0;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Per-game best score kept in this browser's localStorage. */
export function useBestScore(slug: string) {
  const best = useSyncExternalStore(
    subscribe,
    () => read(slug),
    () => 0,
  );
  const record = useCallback(
    (score: number) => {
      if (score <= read(slug)) return;
      try {
        localStorage.setItem(PREFIX + slug, String(score));
      } catch {
        // storage blocked: the best score just won't persist
      }
      listeners.forEach((l) => l());
    },
    [slug],
  );
  return [best, record] as const;
}
