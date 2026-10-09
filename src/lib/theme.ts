/*
  Two color themes share one set of CSS tokens (src/app/portfolio.css). "mono" is the v8
  black and white and is the default; "violet" keeps the same near-white text and uses violet
  as an accent. The choice lives on <html data-theme> and in localStorage under av-theme.
  layout.tsx sets the attribute before the first paint with THEME_INIT_SCRIPT, so a reload
  never shows the wrong theme for a frame, and the same script keeps the switch working until
  the page is hydrated.

  This module has no React import, so server code (layout.tsx) can read the constants and the
  init script from it. Everything that touches the DOM checks for a browser first.
*/

export type Theme = "mono" | "violet";

export const THEMES: readonly Theme[] = ["mono", "violet"];
export const DEFAULT_THEME: Theme = "mono";
export const THEME_STORAGE_KEY = "av-theme";
export const THEME_EVENT = "av-themechange";

export function isTheme(value: unknown): value is Theme {
  return value === "mono" || value === "violet";
}

/*
  Runs inline in <head> while the HTML is parsed, and does three jobs.

  1. It puts the saved theme on <html> before the first paint. It only ever sets a known value,
     and blocked or missing localStorage leaves the server's default in place.
  2. At DOMContentLoaded it makes the server's markup tell the truth: the aria-pressed state
     of the theme buttons (the server cannot know the saved choice) and the toolbar color
     (meta theme-color), which it reads from the resolved --surface so the CSS tokens stay the
     only place the colors are written.
  3. It listens for clicks on [data-theme-option] on the document, so the switch works in the
     seconds before the JavaScript chunks arrive and React hydrates the nav. Every copy of the
     switch (the portfolio header, the portfolio footer, the games header) matches it, since it
     finds buttons by [data-theme-option] and not by position. The ThemeToggle component calls
     releaseThemeBoot() once all the copies on the page are live, and its own handler takes
     over (with the cross-fade). Without this a click in that window did nothing and was never
     replayed.
*/
export const THEME_INIT_SCRIPT = `(function(){var d=document,h=d.documentElement,k=${JSON.stringify(
  THEME_STORAGE_KEY,
)};function sync(){var t=h.getAttribute("data-theme"),bs=d.querySelectorAll("[data-theme-option]"),i,m,s;for(i=0;i<bs.length;i++)bs[i].setAttribute("aria-pressed",bs[i].getAttribute("data-theme-option")===t?"true":"false");m=d.querySelector('meta[name="theme-color"]');s=getComputedStyle(h).getPropertyValue("--surface").trim();if(/^#[0-9a-f]{3}$/i.test(s))s="#"+s.charAt(1)+s.charAt(1)+s.charAt(2)+s.charAt(2)+s.charAt(3)+s.charAt(3);if(m&&s)m.setAttribute("content",s)}function click(e){var b=e.target&&e.target.closest&&e.target.closest("[data-theme-option]"),t=b&&b.getAttribute("data-theme-option");if(t!=="mono"&&t!=="violet")return;try{localStorage.setItem(k,t)}catch(x){}h.setAttribute("data-theme",t);sync()}try{var t=localStorage.getItem(k);if(t==="mono"||t==="violet")h.setAttribute("data-theme",t)}catch(e){}d.addEventListener("DOMContentLoaded",sync);d.addEventListener("click",click);window.__avThemeBoot=function(){d.removeEventListener("click",click)}})()`;

/**
 * Takes down the click handler THEME_INIT_SCRIPT installed, once React owns every switch.
 * Safe to call more than once, and a no-op where the script never ran.
 */
export function releaseThemeBoot(): void {
  if (typeof window === "undefined") return;
  (window as Window & { __avThemeBoot?: () => void }).__avThemeBoot?.();
}

/** The theme on <html> right now. Outside a browser it is the default. */
export function getTheme(): Theme {
  if (typeof document === "undefined") return DEFAULT_THEME;
  const value = document.documentElement.getAttribute("data-theme");
  return isTheme(value) ? value : DEFAULT_THEME;
}

/** The saved choice, or null when there is none or storage is blocked. */
export function getStoredTheme(): Theme | null {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(value) ? value : null;
  } catch {
    return null;
  }
}

/**
 * A resolved CSS custom property on <html>, for code that cannot use var() itself (WebGL
 * materials, canvas fills). Takes "--eye" or "eye". Returns `fallback` (empty by default)
 * outside a browser or when the property is unset.
 */
export function themeColor(name: string, fallback = ""): string {
  if (typeof document === "undefined") return fallback;
  const property = name.startsWith("--") ? name : `--${name}`;
  const value = getComputedStyle(document.documentElement).getPropertyValue(property).trim();
  return value ? expandHex(value) : fallback;
}

// The CSS minifier shortens #000000 to #000. Callers get the long form, so a value read here
// compares equal to the one written in the token block.
function expandHex(value: string): string {
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])([0-9a-f])?$/i.exec(value);
  if (!short) return value;
  return `#${short
    .slice(1)
    .filter(Boolean)
    .map((digit) => digit + digit)
    .join("")}`.toLowerCase();
}

/** Points the browser's toolbar color (meta theme-color) at the current --surface. */
export function syncThemeColorMeta(): void {
  if (typeof document === "undefined") return;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  const surface = themeColor("--surface");
  if (meta && surface && meta.content !== surface) meta.content = surface;
}

/**
 * Puts a theme on <html> and tells listeners, without saving it. Used to re-apply the saved
 * theme (after the dev-mode remount, or when another tab changes it).
 */
export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  if (document.documentElement.getAttribute("data-theme") !== theme) {
    document.documentElement.setAttribute("data-theme", theme);
  }
  syncThemeColorMeta();
  window.dispatchEvent(new CustomEvent<Theme>(THEME_EVENT, { detail: theme }));
}

/** Sets the theme, saves it for the next visit and tells listeners. */
export function setTheme(theme: Theme): void {
  if (typeof document === "undefined" || !isTheme(theme)) return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Private windows and blocked storage still switch; the choice just is not kept.
  }
  applyTheme(theme);
}

/**
 * Calls `callback` with the new theme whenever it changes, whether through setTheme, the
 * av-themechange event, or anything else that rewrites data-theme on <html>. Each change is
 * reported once. Returns the unsubscribe function, so it also works as the subscribe argument
 * of useSyncExternalStore.
 */
export function onThemeChange(callback: (theme: Theme) => void): () => void {
  if (typeof window === "undefined") return () => {};
  let last = getTheme();
  const check = () => {
    const next = getTheme();
    if (next === last) return;
    last = next;
    callback(next);
  };
  window.addEventListener(THEME_EVENT, check);
  const observer = new MutationObserver(check);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => {
    window.removeEventListener(THEME_EVENT, check);
    observer.disconnect();
  };
}
