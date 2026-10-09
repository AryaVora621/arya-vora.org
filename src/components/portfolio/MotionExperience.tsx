"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Fragment links (/#about) are placed by the browser against the server HTML, which has
// the short static layout. Right after hydration the film becomes 480vh and the exploded
// view 260vh, so the page grows by several thousand pixels and the target ends up far
// below the viewport. Until the visitor takes over the scroll, keep the target where the
// fragment put it. Once the layout has been still for a moment it lets go, and a reload
// or a back navigation keeps the position the browser restores.
const HOLD_QUIET_MS = 1000;
const HOLD_LIMIT_MS = 8000;
const TAKEOVER_EVENTS = ["wheel", "touchstart", "pointerdown", "keydown", "hashchange"] as const;

// Where the browser itself leaves a fragment target: below the root's scroll padding.
function anchorInset(target: Element): number {
  return (
    (parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0) +
    (parseFloat(getComputedStyle(target).scrollMarginTop) || 0)
  );
}

function scrollTargetNow(target: Element) {
  try {
    target.scrollIntoView({ behavior: "instant", block: "start" });
  } catch {
    target.scrollIntoView();
  }
}

function holdDeepLink(main: Element | null): () => void {
  const hash = window.location.hash.slice(1);
  if (!hash || !main) return () => {};
  const entry = performance.getEntriesByType("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined;
  if (entry && entry.type !== "navigate") return () => {};

  let id = hash;
  try {
    id = decodeURIComponent(hash);
  } catch {
    // A malformed escape: the raw hash is still what the browser looked up.
  }

  let released = false;
  const align = () => {
    const target = document.getElementById(id);
    if (released || !target) return;
    if (Math.abs(target.getBoundingClientRect().top - anchorInset(target)) <= 2) return;
    scrollTargetNow(target);
  };

  let quiet = 0;
  let lastHeight = -1;
  const observer = new ResizeObserver(([change]) => {
    const height = change.contentRect.height;
    if (Math.abs(height - lastHeight) < 1) return;
    lastHeight = height;
    align();
    window.clearTimeout(quiet);
    quiet = window.setTimeout(release, HOLD_QUIET_MS);
  });
  const limit = window.setTimeout(release, HOLD_LIMIT_MS);

  function release() {
    released = true;
    observer.disconnect();
    window.clearTimeout(quiet);
    window.clearTimeout(limit);
    for (const type of TAKEOVER_EVENTS) window.removeEventListener(type, release);
  }

  observer.observe(main);
  for (const type of TAKEOVER_EVENTS) window.addEventListener(type, release, { passive: true });
  // Fonts and lazy images can still move the target after the first layout change.
  document.fonts?.ready.then(align);
  return release;
}

// A click on an in-page link (the header, the footer, "Top") starts a smooth scroll across
// the pinned film and exploded view, thousands of pixels in all. Two things can leave it short.
// The film and the exploded view switch from their short static heights to their scroll-driven
// ones shortly after hydration, so a click in that window aims at a layout that is about to grow.
// And WebKit drops a smooth scroll that is still running when ScrollTrigger re-measures. So after
// the click, watch the scroll. Once it has stopped moving, check the target, and if it is not
// where the browser would have left a fragment target, put it there. The check repeats until the
// target holds still, and any wheel, touch, key or pointer press from the visitor ends it.
const FOLLOW_MIN_FRAMES = 12;
const FOLLOW_STILL_FRAMES = 20;
const FOLLOW_LIMIT_MS = 12000;
const FOLLOW_TAKEOVER = ["wheel", "touchstart", "pointerdown", "keydown"] as const;

function followAnchor(id: string): () => void {
  let frame = 0;
  let frames = 0;
  let still = 0;
  let last = window.scrollY;
  const limit = window.setTimeout(stop, FOLLOW_LIMIT_MS);

  function stop() {
    cancelAnimationFrame(frame);
    window.clearTimeout(limit);
    for (const type of FOLLOW_TAKEOVER) window.removeEventListener(type, stop);
  }

  const tick = () => {
    frames += 1;
    const y = window.scrollY;
    still = Math.abs(y - last) < 0.5 ? still + 1 : 0;
    last = y;
    if (frames >= FOLLOW_MIN_FRAMES && still >= FOLLOW_STILL_FRAMES) {
      const target = document.getElementById(id);
      if (!target) return stop();
      const gap = target.getBoundingClientRect().top - anchorInset(target);
      const atEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
      // Aligned, or the page ends before the target can reach the top: nothing more to do.
      if (Math.abs(gap) <= 2 || (atEnd && gap > 0)) return stop();
      scrollTargetNow(target);
      still = 0;
      last = window.scrollY;
    }
    frame = requestAnimationFrame(tick);
  };

  for (const type of FOLLOW_TAKEOVER) window.addEventListener(type, stop, { passive: true });
  frame = requestAnimationFrame(tick);
  return stop;
}

function followAnchorClicks(): () => void {
  let stop = () => {};
  const onClick = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
    if (!(link instanceof HTMLAnchorElement) || !link.hash) return;
    if (link.target && link.target !== "_self") return;
    if (link.origin !== window.location.origin || link.pathname !== window.location.pathname) return;
    let id = link.hash.slice(1);
    try {
      id = decodeURIComponent(id);
    } catch {
      // A malformed escape: the raw hash is still what the browser looks up.
    }
    stop();
    stop = followAnchor(id);
  };
  document.addEventListener("click", onClick);
  return () => {
    document.removeEventListener("click", onClick);
    stop();
  };
}

// Keyboard focus must end on screen. The browser scrolls a newly focused control into view
// itself, but in the pinned film and exploded view the scroll can be interrupted: a
// ScrollTrigger refresh resets the scroll position to measure, and WebKit drops a smooth
// scroll that is still running when that happens. So once a keyboard focus has stopped
// moving the page, the control is checked and, only if it is still outside the window,
// brought in. When the browser already did its job this does nothing.
//
// It acts only for focus the keyboard moved, and only until the visitor takes the scroll. The
// browser also focuses a fragment target (the section a /#about link names) once the page has
// loaded, and on a busy machine that lands after hydration. Chasing that focus would drag the
// page back to the section just as the visitor scrolls away from it.
const SETTLED_FRAMES = 15;
const SETTLE_LIMIT_FRAMES = 150;
const SCROLL_TAKEOVER = ["wheel", "touchstart", "pointerdown"] as const;

function keepFocusOnScreen(): () => void {
  let frame = 0;
  // True from a key press until the next wheel, touch or pointer press.
  let byKeyboard = false;

  const bringIn = (element: Element) => {
    if (!element.isConnected || !element.matches(":focus-visible")) return;
    const box = element.getBoundingClientRect();
    if (!box.width && !box.height) return;
    if (box.bottom > 0 && box.top < window.innerHeight) return;
    try {
      element.scrollIntoView({ behavior: "instant", block: "center" });
    } catch {
      element.scrollIntoView({ block: "center" });
    }
  };

  const onKey = () => {
    byKeyboard = true;
  };
  const onTakeover = () => {
    byKeyboard = false;
    cancelAnimationFrame(frame);
  };

  const onFocusIn = (event: FocusEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    cancelAnimationFrame(frame);
    if (!byKeyboard) return;
    let last = window.scrollY;
    let still = 0;
    let frames = 0;
    const tick = () => {
      frames += 1;
      if (window.scrollY === last) still += 1;
      else {
        last = window.scrollY;
        still = 0;
      }
      if (still >= SETTLED_FRAMES || frames >= SETTLE_LIMIT_FRAMES) bringIn(target);
      else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
  };

  document.addEventListener("keydown", onKey, true);
  for (const type of SCROLL_TAKEOVER)
    window.addEventListener(type, onTakeover, { passive: true, capture: true });
  document.addEventListener("focusin", onFocusIn);
  return () => {
    document.removeEventListener("keydown", onKey, true);
    for (const type of SCROLL_TAKEOVER) window.removeEventListener(type, onTakeover, true);
    document.removeEventListener("focusin", onFocusIn);
    cancelAnimationFrame(frame);
  };
}

// Page-wide motion that is not tied to one section: the hero art drifts a little
// slower than the page, and every ScrollTrigger re-measures when the layout height
// changes (images and late fonts shift the pinned film and exploded view).
// It runs only when the visitor has not asked for reduced motion, and
// gsap.matchMedia reverts all of it the moment they do.
export function MotionExperience() {
  useEffect(() => holdDeepLink(document.querySelector("main")), []);
  useEffect(() => keepFocusOnScreen(), []);
  useEffect(() => followAnchorClicks(), []);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.to(".hero-art", {
        y: 72,
        ease: "none",
        scrollTrigger: {
          trigger: ".portfolio-hero",
          start: "top top",
          end: "bottom top",
          scrub: 0.8,
        },
      });

      let refreshFrame = 0;
      let lastHeight = 0;
      const resizeObserver = new ResizeObserver(([entry]) => {
        // Sub-pixel rounding moves the height by a pixel now and then; only a real
        // change (an image or font arriving) is worth re-measuring every trigger.
        const height = entry.contentRect.height;
        if (Math.abs(height - lastHeight) < 2) return;
        lastHeight = height;
        cancelAnimationFrame(refreshFrame);
        // The safe refresh waits for any scroll in progress to end. A plain refresh resets
        // the scroll position to measure, which cancels a smooth anchor scroll midway.
        refreshFrame = requestAnimationFrame(() => ScrollTrigger.refresh(true));
      });
      const main = document.querySelector("main");
      if (main) resizeObserver.observe(main);
      return () => {
        resizeObserver.disconnect();
        cancelAnimationFrame(refreshFrame);
      };
    });
    return () => media.revert();
  }, []);
  return null;
}
