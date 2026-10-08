"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";

// Runs before paint on the client to avoid a flash of the hidden state; on
// the server (and during the initial SSR pass) this degrades to no-op, which
// is exactly what we want — content renders visible until this component's
// effect runs.
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  scale?: boolean;
  opacity?: boolean;
  staggerDelay?: number;
}

const OFFSETS: Record<NonNullable<ScrollRevealProps["direction"]>, [number, number]> = {
  up: [0, 28],
  down: [0, -28],
  left: [28, 0],
  right: [-28, 0],
  none: [0, 0],
};

/**
 * Reveals content on scroll into view. Content is ALWAYS rendered visible by
 * default (SSR, no-JS, hydration) — hiding is applied client-side only, and
 * every path that hides it (intersection, timers, unmount, reduced motion)
 * is paired with a guaranteed restore so a missed observer callback can
 * never strand a section invisible. A secondary rAF/getBoundingClientRect
 * check backs up IntersectionObserver in case it misfires.
 */
export function ScrollReveal({
  children,
  className,
  threshold = 0.1,
  rootMargin = "0px 0px -10% 0px",
  triggerOnce = true,
  delay = 0,
  direction = "up",
  scale = false,
}: ScrollRevealProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useIsoLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const [x, y] = OFFSETS[direction];
    let revealed = false;
    let timeoutId: number | null = null;
    let rafId: number | null = null;

    const hide = () => {
      inner.style.transition = "none";
      inner.style.opacity = "0";
      inner.style.transform = `translate3d(${x}px, ${y}px, 0)${scale ? " scale(0.96)" : ""}`;
      inner.style.willChange = "opacity, transform";
    };

    const restore = () => {
      if (revealed) return;
      revealed = true;
      inner.style.transition = `opacity 900ms ${EASE}, transform 900ms ${EASE}`;
      inner.style.opacity = "1";
      inner.style.transform = "translate3d(0, 0, 0) scale(1)";
      window.setTimeout(() => {
        inner.style.willChange = "";
      }, 950);
    };

    const trigger = () => {
      if (revealed) return;
      if (delay > 0) {
        timeoutId = window.setTimeout(restore, delay);
      } else {
        restore();
      }
    };

    hide();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            trigger();
            if (triggerOnce) observer.unobserve(outer);
          } else if (!triggerOnce) {
            revealed = false;
            hide();
          }
        }
      },
      { threshold, rootMargin }
    );
    observer.observe(outer);

    // Fallback: in case the observer never fires (edge cases with layout
    // thrash, zero-size containers, etc.), a scroll/resize check against
    // actual viewport geometry guarantees content still shows up.
    const checkGeometry = () => {
      const rect = outer.getBoundingClientRect();
      const inView = rect.top < window.innerHeight * 0.95 && rect.bottom > 0;
      if (inView) trigger();
      if (!revealed) rafId = window.requestAnimationFrame(checkGeometry);
    };
    rafId = window.requestAnimationFrame(checkGeometry);

    return () => {
      observer.disconnect();
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      // Guaranteed restore on cleanup — a section can never be left hidden
      // by an unmount racing its own reveal.
      restore();
    };
  }, [threshold, rootMargin, triggerOnce, delay, direction, scale]);

  return (
    <div ref={outerRef} className={cn(className)}>
      <div ref={innerRef}>{children}</div>
    </div>
  );
}

interface StaggeredRevealProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
  direction?: "up" | "down" | "left" | "right";
  threshold?: number;
  rootMargin?: string;
}

export function StaggeredReveal({
  children,
  className,
  staggerDelay = 100,
  direction = "up",
  threshold = 0.1,
  rootMargin = "0px 0px -10% 0px",
}: StaggeredRevealProps) {
  const childArray = Array.isArray(children) ? children : [children];

  return (
    <div className={cn("space-y-6", className)}>
      {childArray.map((child, index) => (
        <ScrollReveal
          key={index}
          delay={index * staggerDelay}
          direction={direction}
          threshold={threshold}
          rootMargin={rootMargin}
        >
          {child}
        </ScrollReveal>
      ))}
    </div>
  );
}

export function ParallaxScroll({
  children,
  className,
  speed = 0.5,
}: {
  children: React.ReactNode;
  className?: string;
  speed?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let rafId: number | null = null;
    const update = () => {
      const rect = element.getBoundingClientRect();
      element.style.transform = `translateY(${-rect.top * speed}px)`;
      rafId = null;
    };
    const handleScroll = () => {
      if (rafId === null) rafId = window.requestAnimationFrame(update);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, [speed]);

  return (
    <div ref={ref} className={cn("relative overflow-hidden", className)}>
      {children}
    </div>
  );
}
