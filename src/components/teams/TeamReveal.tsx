"use client";

import { useEffect } from "react";
import { useMotionAllowed } from "@/lib/hooks/useMotionAllowed";

/*
  Rows, stats and figures on the team pages rise in once as they first come up the window, with
  a short stagger inside each list. The server HTML shows everything; only once this runs are
  the items below the window hidden, and an item is shown for good the moment its top passes
  92% of the window height. That check runs on every scroll frame, not on an intersection, so
  a jump past a list (End, a fragment link) shows it too and never leaves a gap above the
  window. Reduced motion, or unmounting, puts every item back.
*/

const ITEMS = [
  ".team-stats dl > div",
  ".team-awards > li",
  ".team-role-grid > li",
  ".team-timeline > li",
  ".ftc-roles > li",
  ".team-frc-table",
  ".team-ledger",
  ".team-prose",
  ".team-links",
].join(", ");
const LINE = 0.92;

export function TeamReveal() {
  const motion = useMotionAllowed();

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".teams-route");
    if (!motion || !root) return;
    let pending = Array.from(root.querySelectorAll<HTMLElement>(ITEMS));
    for (const item of pending) {
      const siblings = item.parentElement ? Array.from(item.parentElement.children) : [item];
      item.style.setProperty("--reveal-i", String(Math.min(siblings.indexOf(item), 6)));
    }

    const check = () => {
      const line = window.innerHeight * LINE;
      pending = pending.filter((item) => {
        if (item.getBoundingClientRect().top > line) return true;
        item.classList.add("is-in");
        return false;
      });
      if (!pending.length) stop();
    };
    // Items already on screen are marked before the class that hides the rest goes on, so
    // nothing that has painted ever blinks out.
    check();
    root.classList.add("reveal-ready");

    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(check);
    };
    function stop() {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    if (!pending.length) stop();

    return () => {
      stop();
      cancelAnimationFrame(frame);
      root.classList.remove("reveal-ready");
      root.querySelectorAll<HTMLElement>(ITEMS).forEach((item) => {
        item.classList.remove("is-in");
        item.style.removeProperty("--reveal-i");
      });
    };
  }, [motion]);

  return null;
}
