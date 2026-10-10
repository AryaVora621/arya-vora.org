"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";
import {
  applyTheme,
  DEFAULT_THEME,
  getStoredTheme,
  getTheme,
  isTheme,
  onThemeChange,
  releaseThemeBoot,
  setTheme,
  syncThemeColorMeta,
  watchThemeColorMeta,
  THEME_STORAGE_KEY,
  type Theme,
} from "@/lib/theme";

/*
  The theme switch. It lives in its own module, apart from PortfolioNav, so the games pages can
  use it without pulling in the portfolio's GSAP scroll layer. It appears in the portfolio
  header, in the portfolio footer (the header is not pinned, so past the first screen it would
  be a long scroll away) and in the games header. Every copy reads and writes the same state
  on <html>, so they stay in step.
*/

const themeOptions = [
  ["mono", "B&W"],
  ["violet", "Violet"],
] as const satisfies readonly (readonly [Theme, string])[];

// A short cross-fade between themes where the browser has view transitions and the visitor
// has not asked for less motion. Everywhere else the colors swap in one frame.
function switchTheme(next: Theme) {
  if (next === getTheme()) return;
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (calm || typeof document.startViewTransition !== "function") {
    setTheme(next);
    return;
  }
  document.startViewTransition(() => setTheme(next));
}

// How many switches React owns right now. The inline script's click handler (see
// THEME_INIT_SCRIPT) stays up until every switch in the markup is live, so a footer switch
// that has not hydrated yet still answers a click when the header one already has.
let liveToggles = 0;

// Two plain buttons in a labelled group. Which one looks selected comes from data-theme on
// <html> in CSS, so the right one is lit from the first paint. Before the page is live the
// inline script in <head> (THEME_INIT_SCRIPT) answers clicks and keeps aria-pressed and the
// toolbar color right, so the switch is never dead; the buttons carry suppressHydrationWarning
// because that script may have already moved aria-pressed off what the server rendered.
export function ThemeToggle() {
  const theme = useSyncExternalStore(onThemeChange, getTheme, () => DEFAULT_THEME);

  useLayoutEffect(() => {
    liveToggles += 1;
    // This component owns its buttons from here on. The inline handler goes once every
    // switch on the page is owned.
    if (liveToggles >= document.querySelectorAll(".theme-toggle").length) releaseThemeBoot();
    // In development React's Strict Mode remount resets <html> to its JSX attributes, which
    // drops the theme the inline script set. Re-apply the saved one; in production this
    // finds nothing to do.
    const stored = getStoredTheme();
    if (stored && stored !== getTheme()) applyTheme(stored);
    else syncThemeColorMeta();
    // Another tab changed the theme.
    const onStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return;
      applyTheme(isTheme(event.newValue) ? event.newValue : DEFAULT_THEME);
    };
    window.addEventListener("storage", onStorage);
    // A client-side navigation swaps the page's metadata, and the new meta theme-color holds the
    // layout's #000000 whatever theme is on <html>. It lands a frame or more after the route
    // commits, later than any effect keyed on the route, so the tag is watched instead. The watch
    // also takes out the server's own theme-color tag once React's has landed (see
    // syncThemeColorMeta), so a hard load leaves one tag and not two.
    const unwatchMeta = watchThemeColorMeta();
    return () => {
      liveToggles -= 1;
      window.removeEventListener("storage", onStorage);
      unwatchMeta();
    };
  }, []);

  return (
    <div className="theme-toggle" role="group" aria-label="Theme">
      {themeOptions.map(([value, label], index) => (
        <span className="theme-toggle-item" key={value}>
          {index > 0 && <span className="theme-toggle-sep" aria-hidden="true" />}
          <button
            type="button"
            data-theme-option={value}
            aria-pressed={theme === value}
            suppressHydrationWarning
            onClick={() => switchTheme(value)}
          >
            {label}
          </button>
        </span>
      ))}
    </div>
  );
}
