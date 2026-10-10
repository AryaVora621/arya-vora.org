"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useMotionAllowed } from "@/lib/hooks/useMotionAllowed";

const EASE = "power3.out";
// A heading rises once its top passes this fraction of the viewport height.
const VISIBLE_AT = 0.88;

// Sections whose first h2 gets the line rise. The roboPet film and the exploded
// view run their own scroll timelines, so their headings are left to them.
const HEADING_SECTIONS = ["#ftc", "#projects", "#about", "#contact"];
const SKIP = "#robopet, #exploded";

// Media frames whose first child (or [data-parallax-inner]) drifts slightly slower
// than the page. Only frames that clip their overflow qualify, so the drift can
// never spill over neighbouring text.
//
// A frame can ask for something else through the custom property --parallax, which the
// stylesheets set per breakpoint: "frame" drifts the whole frame instead of the layer inside it
// (a software cover cropped to one feature on a phone, projects.css, whose crop edges were chosen
// to miss every word and would move through the text if the picture moved inside the frame), and
// "none" leaves the frame still (a cropped card on the /projects index, which never drifts on a
// wide window either). The frames are set up again when the window crosses the phone breakpoint.
const PARALLAX_FRAMES = "[data-parallax]";
// How far a frame that drifts as a whole moves each way, in px.
const FRAME_DRIFT = 8;

// Page-level scroll choreography. Everything here is additive: the server HTML is
// fully visible, and reverting the context restores it the moment motion is
// disallowed (prefers-reduced-motion).
export function ScrollChoreography() {
  const motion = useMotionAllowed();

  useEffect(() => {
    if (!motion) return;
    gsap.registerPlugin(ScrollTrigger, SplitText);
    const splits: SplitText[] = [];

    // Each heading's lines rise once out of a mask. autoSplit re-measures the
    // lines when the web font arrives or the width changes. A heading that is already
    // on screen when the page goes live is left as it is: the server HTML has painted it,
    // and splitting it now would hide the words that are already there and rise them again.
    // The hero title is one of those, and it has its own CSS entrance (.hero-copy h1).
    const rise = (heading: HTMLElement) => {
      const { top, bottom } = heading.getBoundingClientRect();
      if (bottom > 0 && top < window.innerHeight * VISIBLE_AT) return;
      splits.push(
        SplitText.create(heading, {
          type: "lines",
          mask: "lines",
          linesClass: "split-line",
          autoSplit: true,
          onSplit: (self: SplitText) =>
            gsap.from(self.lines, {
              yPercent: 105,
              duration: 0.9,
              stagger: 0.08,
              ease: EASE,
              scrollTrigger: { trigger: heading, start: `top ${VISIBLE_AT * 100}%`, once: true },
            }),
        }),
      );
    };

    const ctx = gsap.context(() => {
      const headings = new Set<HTMLElement>();
      document
        .querySelectorAll<HTMLElement>(".section-heading h2")
        .forEach((heading) => headings.add(heading));
      HEADING_SECTIONS.forEach((selector) => {
        const heading = document.querySelector<HTMLElement>(`${selector} h2`);
        if (heading) headings.add(heading);
      });
      headings.forEach((heading) => {
        if (!heading.closest(SKIP)) rise(heading);
      });
    });

    const drift = (frame: HTMLElement) => {
      const style = getComputedStyle(frame);
      const mode = style.getPropertyValue("--parallax").trim();
      if (mode === "none") return;
      const scrollTrigger = { trigger: frame, start: "top bottom", end: "bottom top", scrub: true };
      if (mode === "frame") {
        gsap.fromTo(frame, { y: FRAME_DRIFT }, { y: -FRAME_DRIFT, ease: "none", scrollTrigger });
        return;
      }
      if (![style.overflow, style.overflowY].some((value) => value === "hidden" || value === "clip")) return;
      const inner =
        frame.querySelector<HTMLElement>("[data-parallax-inner]") ??
        (frame.firstElementChild as HTMLElement | null);
      if (!inner) return;
      // An inner layer that is not taller than its frame is scaled up just
      // enough to keep the drift inside the crop.
      const room = (inner.offsetHeight - frame.clientHeight) / 2 / Math.max(inner.offsetHeight, 1);
      const shift = Math.min(6, room > 0.01 ? room * 100 : 5);
      if (room <= 0.01) gsap.set(inner, { scale: 1.12, transformOrigin: "50% 50%" });
      gsap.fromTo(inner, { yPercent: shift }, { yPercent: -shift, ease: "none", scrollTrigger });
    };
    // matchMedia reverts what it made and runs again when the window crosses the breakpoint, so a
    // frame whose --parallax changes there is set up for the side it is now on.
    const media = gsap.matchMedia();
    media.add({ narrow: "(max-width: 760.98px)", wide: "(min-width: 761px)" }, () => {
      gsap.utils.toArray<HTMLElement>(PARALLAX_FRAMES).forEach(drift);
    });

    // Pinned sections below depend on final heading heights. The safe refresh waits for
    // a scroll in progress to end instead of interrupting it.
    document.fonts?.ready.then(() => ScrollTrigger.refresh(true));

    return () => {
      media.revert();
      ctx.revert();
      splits.forEach((split) => split.revert());
    };
  }, [motion]);

  return null;
}
