"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useMotionAllowed } from "@/lib/hooks/useMotionAllowed";

/*
  Motion for the project previews (ProjectPreviews.tsx). Each slot ([data-drift]) drifts up by its
  own amount as it crosses the screen, so the column of cards reads as layered. The cover inside
  each card also rises out of a mask once, the first time it comes on screen. Nothing is hidden
  in the server HTML: without script, or with reduced motion, the cards sit still and whole.
  This renders nothing; it finds the section it sits in through a hidden marker.
*/
export function PreviewDrift() {
  const marker = useRef<HTMLSpanElement>(null);
  const motion = useMotionAllowed();

  useEffect(() => {
    const section = marker.current?.closest("section");
    if (!motion || !section) return;
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-drift]").forEach((slot) => {
        const distance = Number(slot.dataset.drift) || 20;
        gsap.fromTo(
          slot,
          { y: distance },
          {
            y: -distance,
            ease: "none",
            scrollTrigger: { trigger: slot, start: "top bottom", end: "bottom top", scrub: true },
          },
        );

        // The cover opens from the bottom edge up, once. Only a cover that has not been seen yet
        // takes part, so a card already on screen when the page goes live is left as painted.
        const cover = slot.querySelector<HTMLElement>("img, svg, picture");
        if (!cover) return;
        const { top } = slot.getBoundingClientRect();
        if (top < window.innerHeight * 0.92) return;
        gsap.fromTo(
          cover,
          { clipPath: "inset(18% 0% 0% 0%)", opacity: 0.001 },
          {
            clipPath: "inset(0% 0% 0% 0%)",
            opacity: 1,
            duration: 0.9,
            ease: "power3.out",
            clearProps: "clipPath,opacity",
            scrollTrigger: { trigger: slot, start: "top 92%", once: true },
          },
        );
      });
    }, section);

    return () => ctx.revert();
  }, [motion]);

  return <span ref={marker} hidden />;
}
