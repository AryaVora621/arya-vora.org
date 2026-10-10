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
)};function sync(){var t=h.getAttribute("data-theme"),bs=d.querySelectorAll("[data-theme-option]"),i,m,s;for(i=0;i<bs.length;i++)bs[i].setAttribute("aria-pressed",bs[i].getAttribute("data-theme-option")===t?"true":"false");m=d.querySelectorAll('meta[name="theme-color"]');s=getComputedStyle(h).getPropertyValue("--surface").trim();if(/^#[0-9a-f]{3}$/i.test(s))s="#"+s.charAt(1)+s.charAt(1)+s.charAt(2)+s.charAt(2)+s.charAt(3)+s.charAt(3);if(s)for(i=0;i<m.length;i++)m[i].setAttribute("content",s)}function click(e){var b=e.target&&e.target.closest&&e.target.closest("[data-theme-option]"),t=b&&b.getAttribute("data-theme-option");if(t!=="mono"&&t!=="violet")return;try{localStorage.setItem(k,t)}catch(x){}h.setAttribute("data-theme",t);sync()}try{var t=localStorage.getItem(k);if(t==="mono"||t==="violet")h.setAttribute("data-theme",t)}catch(e){}d.addEventListener("DOMContentLoaded",sync);d.addEventListener("click",click);window.__avThemeBoot=function(){d.removeEventListener("click",click)}})()`;

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

// Marks the meta theme-color this file adds when Next's has been taken out and its replacement
// has not landed yet. It is never the framework's tag and never outlives it.
const STAND_IN_ATTRIBUTE = "data-theme-stand-in";

// React puts __reactFiber$... and __reactMarker$... on every DOM node it owns, and a head tag it
// hydrated or created is one of them. A tag without them is one React does not know about: the
// one this file adds, or the server's own tag after THEME_INIT_SCRIPT recolored it (React hydrates
// a meta by matching its content, so the recolored tag no longer matches, and React appends a
// tag of its own). Nothing React owns may be removed behind its back: when the route changes it
// calls parentNode.removeChild on the tag it made, and that throws if the tag is gone.
function ownedByReact(node: Element): boolean {
  return Object.keys(node).some((key) => key.startsWith("__react"));
}

/**
 * Points the browser's toolbar color (meta theme-color) at the current --surface, keeps one
 * theme-color tag where there could be two, and makes sure there is a tag to point.
 *
 * Before the page is hydrated the one tag is the server's, recolored by THEME_INIT_SCRIPT. React
 * cannot hydrate that tag once it is recolored (its content no longer matches what React renders
 * from the viewport export), so it adds its own at hydration, and a Violet arrival ended up with
 * two tags: the server's in the right color and React's in #000000. As soon as React owns a tag
 * the others go and React's is recolored, in the same step, so the head never has two and the
 * toolbar color never has a frame in the wrong one. Until then (before hydration, or between two
 * routes) a tag React does not own is the only tag, so it stays.
 *
 * Next also takes the old route's tag out and puts the new one in as two separate steps on some
 * navigations (Home to a project, or back, in WebKit and Chromium alike), with 10 to 40 ms
 * between them, long enough for the browser to draw a frame and drop the toolbar to its default
 * color. For that time a stand-in tag holds the color; it goes the moment the framework's tag is
 * back.
 */
export function syncThemeColorMeta(): void {
  if (typeof document === "undefined") return;
  const surface = themeColor("--surface");
  if (!surface) return;
  const metas = [...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')];
  const owned = metas.filter(ownedByReact);
  const loose = metas.filter((meta) => !ownedByReact(meta));
  const tags = owned.length ? owned : loose;
  if (owned.length) {
    for (const meta of loose) meta.remove();
  } else if (!loose.length) {
    const standIn = document.createElement("meta");
    standIn.name = "theme-color";
    standIn.setAttribute(STAND_IN_ATTRIBUTE, "");
    document.head.append(standIn);
    tags.push(standIn);
  }
  for (const meta of tags) if (meta.content !== surface) meta.content = surface;
}

/**
 * Keeps meta theme-color on the current --surface for as long as it runs. Next replaces the
 * page's head tags on a client-side navigation, and the new theme-color is the layout's #000000
 * (the viewport export cannot know the theme), so without this the toolbar goes black again in
 * violet after the first route change. Watching the head catches the new tag whenever it lands,
 * and the tag that is missing between the old one going and the new one arriving; the callback
 * runs as a microtask right after the change, before the browser can draw or a script can look.
 * syncThemeColorMeta writes only when something differs, so its own writes do not set it off
 * again. Returns the function that stops watching.
 */
export function watchThemeColorMeta(): () => void {
  if (typeof document === "undefined") return () => {};
  const observer = new MutationObserver(syncThemeColorMeta);
  observer.observe(document.head, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["content"],
  });
  return () => {
    observer.disconnect();
    // Nothing is left to replace the stand-in once the watching stops, and a stale one ahead of
    // the framework's next tag would be the one the browser reads.
    document.querySelectorAll(`meta[${STAND_IN_ATTRIBUTE}]`).forEach((meta) => meta.remove());
  };
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
