"use client";

import { useEffect, type RefObject } from "react";

interface MagneticOptions {
  /** Distance from center (px) within which the pull is active. */
  range?: number;
  /** Max translation at the pointer, as a fraction of the offset. */
  pull?: number;
}

/** Nudges an element toward the pointer while it's within `range`, springs back on leave. */
export function useMagnetic(ref: RefObject<HTMLElement | null>, { range = 90, pull = 0.35 }: MagneticOptions = {}) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce), (pointer: coarse)").matches) return;

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist < range) {
        el.style.transform = `translate3d(${dx * pull}px, ${dy * pull}px, 0)`;
      } else {
        el.style.transform = "";
      }
    };
    const onLeave = () => {
      el.style.transform = "";
    };

    el.style.transition = "transform 300ms cubic-bezier(0.22, 1, 0.36, 1)";
    window.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
      el.style.transform = "";
    };
  }, [ref, range, pull]);
}
