"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion, useCoarsePointer } from "@/lib/hooks/useMediaQuery";

/**
 * Dot-and-ring cursor. The dot tracks the pointer exactly; the ring lags
 * behind on a spring for a softer feel, and both expand/invert over
 * interactive elements. Native cursor stays on for touch and reduced-motion.
 */
export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const coarse = useCoarsePointer();
  const enabled = !reduced && !coarse;
  const [hovering, setHovering] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const ring = { ...target };
    let rafId: number;

    const onMove = (e: MouseEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
      setVisible(true);
      const dot = dotRef.current;
      if (dot) dot.style.transform = `translate3d(${e.clientX - 3}px, ${e.clientY - 3}px, 0)`;
    };

    const onOver = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      const interactive = el?.closest(
        "a, button, [role='button'], input, select, textarea, [data-cursor='expand']"
      );
      setHovering(!!interactive);
    };

    const onLeave = () => setVisible(false);

    const tick = () => {
      ring.x += (target.x - ring.x) * 0.18;
      ring.y += (target.y - ring.y) * 0.18;
      const ringEl = ringRef.current;
      if (ringEl) {
        const size = ringEl.dataset.expanded === "true" ? 56 : 28;
        ringEl.style.transform = `translate3d(${ring.x - size / 2}px, ${ring.y - size / 2}px, 0)`;
      }
      rafId = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseover", onOver);
    document.documentElement.addEventListener("mouseleave", onLeave);
    rafId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(rafId);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      <style>{`
        html, body, a, button, [role='button'] { cursor: none !important; }
        @media (pointer: coarse) { html, body, a, button, [role='button'] { cursor: auto !important; } }
      `}</style>
      <div
        ref={ringRef}
        data-expanded={hovering}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[200] rounded-full border transition-[width,height,border-color,background-color] duration-150 ease-out"
        style={{
          width: hovering ? 56 : 28,
          height: hovering ? 56 : 28,
          opacity: visible ? 1 : 0,
          borderColor: hovering ? "var(--color-signal-400)" : "color-mix(in srgb, var(--color-paper-400) 60%, transparent)",
          backgroundColor: hovering ? "color-mix(in srgb, var(--color-signal-400) 12%, transparent)" : "transparent",
        }}
      />
      <div
        ref={dotRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[201] h-1.5 w-1.5 rounded-full transition-[background-color,opacity] duration-150"
        style={{
          opacity: visible ? 1 : 0,
          backgroundColor: hovering ? "var(--color-ink-950)" : "var(--color-paper-50)",
        }}
      />
    </>
  );
}
