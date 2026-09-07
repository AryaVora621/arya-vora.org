"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion, useCoarsePointer } from "@/lib/hooks/useMediaQuery";

/**
 * Faint violet glow that follows the cursor, only visible while hovering an
 * element marked data-glow="on" (Hero, Contact). Fixed + pointer-events:none.
 */
export function MouseGlow() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const coarse = useCoarsePointer();
  const enabled = !reduced && !coarse;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const onMove = (e: MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      el.style.left = `${e.clientX}px`;
      el.style.top = `${e.clientY}px`;
      const inGlow = !!(e.target as HTMLElement)?.closest?.("[data-glow='on']");
      setVisible(inGlow);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed -translate-x-1/2 -translate-y-1/2 transition-opacity duration-300 ease-out"
      style={{
        zIndex: 5,
        width: 700,
        height: 700,
        opacity: visible ? 1 : 0,
        background:
          "radial-gradient(circle, color-mix(in srgb, var(--color-signal-500) 14%, transparent) 0%, transparent 62%)",
      }}
    />
  );
}
