"use client";

import { useEffect, useRef, type ElementType } from "react";
import { useMotionAllowed } from "@/lib/hooks/useMotionAllowed";

/*
  A decode effect for short labels and numerals, after the HUD text on igloo.inc: each character
  cycles through glyphs of its own class and settles left to right. The server HTML is the final
  text, so without script or with reduced motion nothing moves.

  Glyphs only swap within their class (a digit for a digit, a capital for a capital), and the
  element's width is locked for the run, so a tabular numeral or a mono label never shifts the
  layout under it. While it runs, a heading carries its real text as aria-label, so a screen
  reader that reads it mid-run hears the words, not the noise. A plain span cannot take a label
  (ARIA prohibits one on a generic element), and a run lasts well under a second.
*/

const DIGITS = "0123456789";
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWER = "abcdefghijklmnopqrstuvwxyz";

function poolFor(char: string): string | null {
  if (DIGITS.includes(char)) return DIGITS;
  if (UPPER.includes(char)) return UPPER;
  if (LOWER.includes(char)) return LOWER;
  return null;
}

type Props = {
  text: string;
  as?: ElementType;
  className?: string;
  /** Milliseconds before the first character settles. */
  delay?: number;
  /** Milliseconds between one character settling and the next. */
  step?: number;
  /** Run when it scrolls into view (default) or straight away. */
  trigger?: "view" | "mount";
};

export function ScrambleText({
  text,
  as: Tag = "span",
  className,
  delay = 160,
  step = 45,
  trigger = "view",
}: Props) {
  const ref = useRef<HTMLElement>(null);
  const motion = useMotionAllowed();

  useEffect(() => {
    const element = ref.current;
    // The text node React rendered. Writing to it, rather than to textContent, keeps the node
    // React holds, so a later render still updates the same node.
    const node = element?.firstChild;
    if (!motion || !element || !(node instanceof Text)) return;
    let frame = 0;
    let started = false;
    const labelable = /^H[1-6]$/.test(element.tagName);

    const run = () => {
      if (started) return;
      started = true;
      const width = element.getBoundingClientRect().width;
      element.style.display = getComputedStyle(element).display === "inline" ? "inline-block" : "";
      element.style.minWidth = `${width}px`;
      if (labelable) element.setAttribute("aria-label", text);
      const begin = performance.now();
      const chars = [...text];
      const tick = (now: number) => {
        const elapsed = now - begin;
        let done = true;
        const out = chars.map((char, index) => {
          const pool = poolFor(char);
          if (!pool) return char;
          if (elapsed >= delay + index * step) return char;
          done = false;
          return pool[Math.floor(Math.random() * pool.length)];
        });
        node.data = out.join("");
        if (done) {
          element.removeAttribute("aria-label");
          element.style.minWidth = "";
          element.style.display = "";
          return;
        }
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };

    let observer: IntersectionObserver | null = null;
    if (trigger === "mount") run();
    else {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            observer?.disconnect();
            run();
          }
        },
        { rootMargin: "0px 0px -8% 0px" },
      );
      observer.observe(element);
    }

    return () => {
      observer?.disconnect();
      cancelAnimationFrame(frame);
      node.data = text;
      element.removeAttribute("aria-label");
      element.style.minWidth = "";
      element.style.display = "";
    };
  }, [motion, text, delay, step, trigger]);

  return (
    <Tag ref={ref} className={className}>
      {text}
    </Tag>
  );
}
