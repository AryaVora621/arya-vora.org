"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useMotionAllowed } from "@/lib/hooks/useMotionAllowed";

const EASE = "expo.out";

// Page-level scroll choreography. Everything here is additive: server HTML is fully
// visible, and gsap.context().revert() restores it the moment motion is disallowed.
export function ScrollChoreography() {
  const motion = useMotionAllowed();

  useEffect(() => {
    if (!motion) return;
    gsap.registerPlugin(ScrollTrigger, SplitText);
    const splits: SplitText[] = [];

    const ctx = gsap.context(() => {
      // Hero: lines rise out of a mask once, on load.
      const heroTitle = document.querySelector<HTMLElement>(".hero-copy h1");
      if (heroTitle) {
        const split = SplitText.create(heroTitle, {
          type: "lines",
          mask: "lines",
          linesClass: "split-line",
        });
        splits.push(split);
        gsap
          .timeline({ defaults: { ease: EASE } })
          .from(split.lines, { yPercent: 115, duration: 1.3, stagger: 0.1 })
          .from(".hero-intro", { opacity: 0, y: 16, duration: 0.9 }, 0.1)
          .from(
            ".hero-description, .hero-actions, .hero-aliases",
            { opacity: 0, y: 22, duration: 1, stagger: 0.08 },
            0.35,
          )
          .from(".hero-art", { opacity: 0, scale: 0.94, duration: 1.4 }, 0.2);
      }

      // Section headings: masked line reveal as they enter.
      gsap.utils
        .toArray<HTMLElement>(
          ".section-heading h2, .about-intro h2, .contact-section h2, .closing-note > p",
        )
        .forEach((heading) => {
          const split = SplitText.create(heading, {
            type: "lines",
            mask: "lines",
            linesClass: "split-line",
          });
          splits.push(split);
          gsap.from(split.lines, {
            yPercent: 110,
            duration: 1.1,
            stagger: 0.09,
            ease: EASE,
            scrollTrigger: { trigger: heading, start: "top 88%", once: true },
          });
        });

      // Project visuals open like a shutter, then drift slightly slower than the page.
      gsap.utils.toArray<HTMLElement>(".project-visual").forEach((visual) => {
        gsap.fromTo(
          visual,
          { clipPath: "inset(14% 10% 14% 10% round 14px)" },
          {
            clipPath: "inset(0% 0% 0% 0% round 0px)",
            ease: "none",
            scrollTrigger: {
              trigger: visual,
              start: "top 95%",
              end: "top 45%",
              scrub: 0.6,
            },
          },
        );
        const inner = visual.firstElementChild;
        if (inner)
          gsap.fromTo(
            inner,
            { yPercent: 6 },
            {
              yPercent: -6,
              ease: "none",
              scrollTrigger: {
                trigger: visual,
                start: "top bottom",
                end: "bottom top",
                scrub: true,
              },
            },
          );
      });

      // Journey cards stack in with a slight stagger instead of all at once.
      gsap.utils.toArray<HTMLElement>(".journey-card").forEach((card, index) => {
        gsap.from(card, {
          x: index % 2 ? 36 : -36,
          duration: 1,
          ease: EASE,
          scrollTrigger: { trigger: card, start: "top 85%", once: true },
        });
      });

      // Footer wordmark rises as the page ends.
      gsap.fromTo(
        ".footer-name",
        { yPercent: 35 },
        {
          yPercent: 0,
          ease: "none",
          scrollTrigger: {
            trigger: ".portfolio-footer",
            start: "top bottom",
            end: "bottom bottom",
            scrub: true,
          },
        },
      );
    });

    // Line splits depend on fonts; re-measure once they settle.
    document.fonts?.ready.then(() => ScrollTrigger.refresh());

    return () => {
      ctx.revert();
      splits.forEach((split) => split.revert());
    };
  }, [motion]);

  return null;
}
