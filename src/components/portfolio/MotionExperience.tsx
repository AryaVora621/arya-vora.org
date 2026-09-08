"use client";

import { useEffect, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Pause, Play } from "lucide-react";

export function MotionExperience() {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    document.documentElement.dataset.motion = paused ? "paused" : "on";
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    if (!paused)
      media.add("(prefers-reduced-motion: no-preference)", () => {
        const animations: Animation[] = [];
        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return;
              // Never move controls underneath a pointer or keyboard focus.
              const interactive = entry.target.querySelector("a, button, input, select");
              animations.push(
                entry.target.animate(
                  interactive
                    ? [{ opacity: 0.25 }, { opacity: 1 }]
                    : [
                        { opacity: 0.25, transform: "translateY(28px)" },
                        { opacity: 1, transform: "translateY(0)" },
                      ],
                  { duration: 700, easing: "cubic-bezier(.16,1,.3,1)" },
                ),
              );
              observer.unobserve(entry.target);
            });
          },
          { threshold: 0.08 },
        );
        document
          .querySelectorAll(".reveal")
          .forEach((element) => observer.observe(element));
        gsap.to(".hero-art", {
          y: 85,
          rotate: 4,
          ease: "none",
          scrollTrigger: {
            trigger: ".portfolio-hero",
            start: "top top",
            end: "bottom top",
            scrub: 0.8,
          },
        });
        gsap.to(".scroll-statement-track", {
          xPercent: -18,
          ease: "none",
          scrollTrigger: {
            trigger: ".scroll-statement",
            start: "top bottom",
            end: "bottom top",
            scrub: 0.6,
          },
        });
        gsap.fromTo(
          ".journey-line",
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: "none",
            scrollTrigger: {
              trigger: ".journey-list",
              start: "top 65%",
              end: "bottom 65%",
              scrub: true,
            },
          },
        );
        let refreshFrame = 0;
        const resizeObserver = new ResizeObserver(() => {
          cancelAnimationFrame(refreshFrame);
          refreshFrame = requestAnimationFrame(() => ScrollTrigger.refresh());
        });
        const main = document.querySelector("main");
        if (main) resizeObserver.observe(main);
        return () => {
          observer.disconnect();
          resizeObserver.disconnect();
          cancelAnimationFrame(refreshFrame);
          animations.forEach((animation) => animation.cancel());
        };
      });
    return () => {
      media.revert();
      delete document.documentElement.dataset.motion;
    };
  }, [paused]);
  return (
    <button
      className="motion-toggle"
      aria-label={paused ? "Enable effects" : "Pause effects"}
      aria-pressed={paused}
      onClick={() => setPaused(!paused)}
    >
      {paused ? (
        <Play size={14} aria-hidden="true" />
      ) : (
        <Pause size={14} aria-hidden="true" />
      )}
      <span className="motion-label">{paused ? "Enable effects" : "Pause effects"}</span>
    </button>
  );
}
