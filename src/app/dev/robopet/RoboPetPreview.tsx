"use client";

import { useEffect, useRef } from "react";
import type { RoboPetEyeMode } from "@/components/robopet/createRoboPetModel";
import { mountRoboPetStage } from "@/components/robopet/roboPetStage";

declare global {
  interface Window {
    __roboPet?: { ready: boolean; triangles: number; drawCalls: number; parts: unknown; bounds: unknown };
  }
}

const BG = "#000000";

/**
 * Dev-only review canvas for the roboPet model. Fixed camera (no orbit controls).
 * Query params: ?az=<deg from +Z toward +X, default 30>&el=<deg, default 11>&explode=<0..1>
 * &eyes=<open|blink|happy|sleepy|off>&dist=<camera distance>
 */
export default function RoboPetPreview() {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const q = new URLSearchParams(window.location.search);
    const num = (k: string) => {
      const v = Number(q.get(k));
      return q.has(k) && Number.isFinite(v) ? v : undefined;
    };
    const stage = mountRoboPetStage(host, {
      az: num("az"),
      el: num("el"),
      dist: num("dist"),
      explode: num("explode"),
      eyes: (q.get("eyes") as RoboPetEyeMode | null) ?? undefined,
      background: BG,
    });
    window.__roboPet = { ready: true, ...stage.stats };
    return () => stage.dispose();
  }, []);

  return <div ref={hostRef} style={{ position: "fixed", inset: 0, background: BG }} />;
}
