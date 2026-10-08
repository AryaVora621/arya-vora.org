"use client";

import { useEffect, useRef } from "react";

// Global ambient background: a single mouse-reactive halftone dot field
// (inspired by monishsaravana.com) plus gradient orbs, a faint grid, film
// grain, and a cursor glow. Rendered once in page.tsx so there is exactly
// one fixed layer — content sits above it at z-10.
export function AmbientBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    const mouse = { x: -9999, y: -9999 };
    const glow = { x: -9999, y: -9999 };
    const GAP = 30;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const onLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };

    let t = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      t += 0.008;

      // Ease the glow toward the cursor for a trailing feel.
      glow.x += (mouse.x - glow.x) * 0.08;
      glow.y += (mouse.y - glow.y) * 0.08;
      if (glowRef.current) {
        glowRef.current.style.transform = `translate(${glow.x - 250}px, ${glow.y - 250}px)`;
        glowRef.current.style.opacity = mouse.x < -500 ? "0" : "1";
      }

      ctx.clearRect(0, 0, w, h);

      for (let y = GAP / 2; y < h; y += GAP) {
        for (let x = GAP / 2; x < w; x += GAP) {
          const dx = x - mouse.x;
          const dy = y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const proximity = Math.max(0, 1 - dist / 220);
          const wave = 0.5 + 0.5 * Math.sin(x * 0.012 + t + y * 0.008);

          const radius = 1 + wave * 0.8 + proximity * 2.2;
          const alpha = 0.1 + wave * 0.12 + proximity * 0.5;
          if (alpha <= 0.02) continue;

          // Blend cool white -> violet across the viewport width.
          const mix = x / Math.max(w, 1);
          const r = Math.round(190 + (139 - 190) * mix);
          const g = Math.round(192 + (92 - 192) * mix);
          const b = Math.round(220 + (246 - 220) * mix);

          ctx.beginPath();
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${Math.min(alpha, 0.75).toFixed(3)})`;
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    resize();
    draw();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {/* Halftone dot field */}
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* Faint engineering grid */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(196, 181, 253, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(196, 181, 253, 0.06) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse 90% 70% at 50% 30%, black 30%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 90% 70% at 50% 30%, black 30%, transparent 75%)",
        }}
      />

      {/* Drifting violet orbs */}
      <div className="absolute -top-40 left-1/4 w-[36rem] h-[36rem] rounded-full bg-signal-500/[0.09] blur-[120px] animate-float" />
      <div
        className="absolute top-1/3 -right-40 w-[32rem] h-[32rem] rounded-full bg-signal-600/[0.08] blur-[120px] animate-float"
        style={{ animationDelay: "-3s" }}
      />
      <div
        className="absolute bottom-0 -left-40 w-[30rem] h-[30rem] rounded-full bg-paper-200/[0.04] blur-[120px] animate-float"
        style={{ animationDelay: "-4.5s" }}
      />

      {/* Cursor glow that trails the mouse */}
      <div
        ref={glowRef}
        className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full transition-opacity duration-500"
        style={{
          background: "radial-gradient(circle, rgba(139, 92, 246, 0.09) 0%, transparent 60%)",
          opacity: 0,
        }}
      />

      {/* Film grain */}
      <div
        className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "180px 180px",
        }}
      />

      {/* Vignette to keep edges calm */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 120% 90% at 50% 40%, transparent 55%, rgba(7, 7, 12, 0.6) 100%)",
        }}
      />
    </div>
  );
}
