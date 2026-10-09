"use client";

import { useEffect } from "react";
import { getTheme, onThemeChange, type Theme } from "@/lib/theme";
import { leanConnection } from "./leanConnection";

/*
  Keeps the robot's stills from going blank when the theme changes.

  Every still has a twin for the other theme (ThemeStill), and CSS shows the one that matches
  <html data-theme>. The twin is display: none and lazy, so it is not fetched until the theme
  changes. Without 3D (reduced motion, a software renderer, no WebGL, a narrow screen) the
  stills are what the visitor is looking at, and on a slow link the old one went away at the
  switch and the new one arrived hundreds of milliseconds later.

  Two things close that gap.

  1. Warming. When the visitor reaches for the theme switch (pointer over it, focus on it, a
     touch on it) the stills of the theme it would pick start downloading and decoding, so on
     most links they have landed by the click. Only stills that the visitor has already seen are
     warmed: a twin whose partner never loaded was never on screen, so there is nothing for it
     to replace, and the hidden live canvas of the hero needs none. Costs about 300 KB, and only
     for people who go to the switch. A Save-Data or slow connection skips this step.
  2. Holding. If the click comes before the new stills are in (a tap on a phone, a keyboard
     Enter, a change from another tab), the page keeps showing the old stills and sets
     data-theme-wait on <html> until the new ones are decoded or WAIT_CAP_MS has passed. A
     rule block in robopet.css lets the old ones stay. The theme's colors change at once; the
     picture follows when it has arrived.

  The Reaper stills (public/ftc) are CSS backgrounds in ftc.css rather than images, so they are
  listed here by URL.
*/

const WAIT_ATTR = "data-theme-wait";
const WAIT_CAP_MS = 6000;

const REAPER_STILL: Record<Theme, string> = {
  mono: "/ftc/reaper-model-mono.webp",
  violet: "/ftc/reaper-model-violet.webp",
};
// WeakMap keys for the Reaper stills, which have no element.
const REAPER_KEY: Record<Theme, object> = { mono: {}, violet: {} };

type Still = {
  key: object;
  /** The page's own element, or null for a CSS background, which gets a stand-in Image. */
  element: HTMLImageElement | null;
  src: string;
  /** Already fetched earlier in this visit, so asking again would only cost a frame. */
  fetched: boolean;
};

const requests = new WeakMap<object, Promise<void>>();
const arrived = new WeakSet<object>();

function request(still: Still): Promise<void> {
  let job = requests.get(still.key);
  if (!job) {
    // The page's own element is the one that loads, not a copy of it, so when the switch makes
    // it visible it is already in hand. Eager is what starts a hidden lazy image: the browser
    // would otherwise wait until it was on screen, and then take a frame or two to put it up.
    let image = still.element;
    if (image) image.loading = "eager";
    else {
      image = new Image();
      image.decoding = "async";
      image.src = still.src;
    }
    // A failed load settles the job too: the page must never wait on a file that is not coming.
    job = image.decode().then(
      () => void arrived.add(still.key),
      () => void arrived.add(still.key),
    );
    requests.set(still.key, job);
  }
  return job;
}

function loaded(image: HTMLImageElement | null): boolean {
  return Boolean(image && image.complete && image.naturalWidth > 0);
}

/** The stills of `target` that a switch to it would replace something visible with. */
function stillsFor(target: Theme): Still[] {
  const other: Theme = target === "mono" ? "violet" : "mono";
  const stills: Still[] = [];
  document
    .querySelectorAll<HTMLImageElement>(`img[data-still-theme="${target}"]`)
    .forEach((image) => {
      const kind = image.dataset.stillKind;
      const twin = document.querySelector<HTMLImageElement>(
        `img[data-still-theme="${other}"][data-still-kind="${kind}"]`,
      );
      // The twin never loaded, so it was never on screen. The hero's live canvas has taken its
      // place if the stage is ready.
      if (!loaded(twin) || twin?.closest('.hero-robot-stage[data-ready="true"]')) return;
      stills.push({
        key: image,
        element: image,
        src: image.getAttribute("src") ?? "",
        fetched: loaded(image),
      });
    });
  // A dock without the live canvas shows the Reaper's still.
  if (document.querySelector(".reaper-dock[data-still]:not([data-live])")) {
    const src = REAPER_STILL[target];
    stills.push({
      key: REAPER_KEY[target],
      element: null,
      src,
      fetched: performance.getEntriesByName(new URL(src, location.href).href).length > 0,
    });
  }
  return stills.filter((still) => still.src);
}

function warm(target: Theme) {
  if (leanConnection()) return;
  for (const still of stillsFor(target)) if (!still.fetched) void request(still);
}

let waitToken = 0;

// Runs on every theme change, in the same task as the change, so the attribute is on <html>
// before the browser paints (or captures the new side of a view transition).
function hold(target: Theme) {
  const token = ++waitToken;
  const root = document.documentElement;
  const pending = stillsFor(target).filter((still) => !still.fetched && !arrived.has(still.key));
  if (pending.length === 0) {
    root.removeAttribute(WAIT_ATTR);
    return;
  }
  root.setAttribute(WAIT_ATTR, "");
  const release = () => {
    if (token === waitToken) root.removeAttribute(WAIT_ATTR);
  };
  const cap = window.setTimeout(release, WAIT_CAP_MS);
  Promise.all(pending.map(request)).then(() => {
    window.clearTimeout(cap);
    release();
  });
}

/** Mount once, anywhere the stills live. See the comment at the top of this file. */
export function useThemeStills(): void {
  useEffect(() => {
    const onIntent = (event: Event) => {
      const option = (event.target as Element | null)?.closest?.("[data-theme-option]");
      const value = option?.getAttribute("data-theme-option");
      if ((value === "mono" || value === "violet") && value !== getTheme()) warm(value);
    };
    const listen = { capture: true, passive: true } as const;
    document.addEventListener("pointerover", onIntent, listen);
    document.addEventListener("focusin", onIntent, listen);
    document.addEventListener("touchstart", onIntent, listen);
    const offTheme = onThemeChange(hold);
    return () => {
      document.removeEventListener("pointerover", onIntent, listen);
      document.removeEventListener("focusin", onIntent, listen);
      document.removeEventListener("touchstart", onIntent, listen);
      offTheme();
    };
  }, []);
}
