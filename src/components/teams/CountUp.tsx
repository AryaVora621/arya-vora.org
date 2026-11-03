"use client";

import { useEffect, useRef } from "react";
import { useMotionAllowed } from "@/lib/hooks/useMotionAllowed";

/*
  A number that counts up from zero the first time it scrolls into view. The server HTML holds
  the final value, so the number is right without script and under reduced motion. Digits are
  tabular (teams.css), so the count never changes the width of the line.
*/
export function CountUp({ value, duration = 1100 }: { value: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const motion = useMotionAllowed();

  useEffect(() => {
    const element = ref.current;
    const node = element?.firstChild;
    if (!motion || !element || !(node instanceof Text) || value === 0) return;
    let frame = 0;
    const final = String(value);

    const run = () => {
      const begin = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - begin) / duration);
        // easeOutExpo: fast at first, then a long settle onto the real number.
        const eased = t === 1 ? 1 : 1 - 2 ** (-10 * t);
        node.data = String(Math.round(value * eased));
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      node.data = "0";
      frame = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        run();
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(element);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      node.data = final;
    };
  }, [motion, value, duration]);

  return <span ref={ref}>{value}</span>;
}
