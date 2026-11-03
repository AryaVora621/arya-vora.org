"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useMotionAllowed } from "@/lib/hooks/useMotionAllowed";

/*
  The seasons as one horizontal strip that the page scroll moves sideways while the section is
  pinned, after the scroll-driven camera of igloo.inc: reading down the page walks the seasons
  in order. It happens only on a wide, tall enough window with motion allowed. Everywhere else
  (phones, short windows, reduced motion, no script) the cards are an ordinary grid, which is
  also what the server sends, so nothing is ever hidden waiting for script.

  While pinned, a card that takes keyboard focus off to the side is brought into the window by
  scrolling the page to the point of the pin that shows it, since the browser only knows how to
  scroll it vertically. The counter (01 / 04) and the rule under it follow the scroll.
*/

const WIDE = "(min-width: 1024px) and (min-height: 640px)";

export function SeasonRail({
  count,
  head,
  children,
}: {
  count: number;
  /** The section heading, pinned with the cards so the pinned screen reads as one section. */
  head: ReactNode;
  children: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const motion = useMotionAllowed();

  useEffect(() => {
    const section = root.current;
    const track = section?.querySelector<HTMLElement>("[data-rail-track]");
    const meter = section?.querySelector<HTMLElement>("[data-rail-meter]");
    const counter = section?.querySelector<HTMLElement>("[data-rail-index]");
    if (!motion || !section || !track) return;
    gsap.registerPlugin(ScrollTrigger);

    const media = gsap.matchMedia();
    media.add(WIDE, () => {
      section.classList.add("is-rail");
      const distance = () => Math.max(0, track.scrollWidth - track.clientWidth);
      const show = (progress: number) => {
        if (meter) meter.style.transform = `scaleX(${progress})`;
        if (counter) {
          const index = Math.min(count, 1 + Math.floor(progress * count * 0.999));
          counter.textContent = String(index).padStart(2, "0");
        }
      };
      const tween = gsap.to(track, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 0.6,
          invalidateOnRefresh: true,
          onUpdate: (self) => show(self.progress),
        },
      });
      show(0);

      const onFocus = (event: FocusEvent) => {
        const trigger = tween.scrollTrigger;
        const card = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-rail-card]") : null;
        if (!trigger || !card) return;
        const span = distance();
        const progress = span > 0 ? Math.min(1, Math.max(0, card.offsetLeft / span)) : 0;
        window.scrollTo({ top: trigger.start + progress * (trigger.end - trigger.start), behavior: "instant" });
      };
      section.addEventListener("focusin", onFocus);

      return () => {
        section.removeEventListener("focusin", onFocus);
        section.classList.remove("is-rail");
        if (meter) meter.style.transform = "";
        if (counter) counter.textContent = "01";
      };
    });

    return () => media.revert();
  }, [motion, count]);

  return (
    <div ref={root} className="team-rail">
      <div className="site-shell">{head}</div>
      <div className="team-rail-hud site-shell mono" aria-hidden="true">
        <span data-rail-index>01</span>
        <span className="team-rail-of">/ {String(count).padStart(2, "0")}</span>
        <span className="team-rail-meter">
          <span data-rail-meter />
        </span>
      </div>
      <div className="team-rail-window">
        <ol className="team-rail-track site-shell" data-rail-track>
          {children}
        </ol>
      </div>
    </div>
  );
}
