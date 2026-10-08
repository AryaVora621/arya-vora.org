"use client";

import { useEffect, useRef, useState } from "react";
import { RoboPetFigure, type PartKey } from "@/components/robopet/RoboPetFigure";

declare global {
  interface Window {
    __roboPet?: { ready: boolean; capture?: (exploded: boolean) => string };
  }
}

const KEYS: PartKey[] = ["shell", "face", "camera", "electronics", "power", "legs", "chassis"];

/** Still size: 700 x 525 CSS px drawn at 1600 x 1200, so edges land near 1 CSS px on a desktop figure. */
const CAPTURE = { width: 700, height: 525, pixelRatio: 1600 / 700 };

function CaptureStage() {
  const hostRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let dispose = () => {};
    let cancelled = false;
    import("@/components/robopet/roboPetStage").then(({ mountRoboPetStage }) => {
      if (cancelled) return;
      const stage = mountRoboPetStage(host, { exploded: false, selected: null, pixelRatio: CAPTURE.pixelRatio });
      if (!stage) {
        window.__roboPet = { ready: false };
        return;
      }
      dispose = stage.dispose;
      window.__roboPet = {
        ready: true,
        capture: (exploded) => {
          stage.setExploded(exploded, { immediate: true });
          return stage.capture();
        },
      };
    });
    return () => {
      cancelled = true;
      dispose();
    };
  }, []);
  return <div ref={hostRef} style={{ width: CAPTURE.width, height: CAPTURE.height }} />;
}

export default function RoboPetPreview({ capture }: { capture: boolean }) {
  const [selected, setSelected] = useState<PartKey | null>(null);
  const [exploded, setExploded] = useState(false);

  if (capture) return <CaptureStage />;

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "48px 16px" }}>
      <RoboPetFigure selected={selected} exploded={exploded} onSelect={setSelected} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
        <button type="button" className="button" aria-pressed={exploded} onClick={() => setExploded((v) => !v)}>
          Exploded view
        </button>
        {KEYS.map((key) => (
          <button
            key={key}
            type="button"
            className="button"
            aria-pressed={selected === key}
            onClick={() => setSelected((current) => (current === key ? null : key))}
          >
            {key}
          </button>
        ))}
      </div>
      <p className="meta" style={{ marginTop: 16 }}>
        Selected: <span data-testid="selected">{selected ?? "none"}</span>
      </p>
    </main>
  );
}
