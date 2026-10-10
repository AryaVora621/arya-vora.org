import { expect, type Page } from "@playwright/test";

// Shared by portfolio.spec.ts (the home page and the theme) and projects.spec.ts (the /projects
// routes). Not a spec file, so Playwright does not run it on its own.

export const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];

// The two color themes. "mono" (B&W) is the default; the choice is kept in localStorage.
export const THEME_KEY = "av-theme";
export const THEMES = [
  ["mono", "B&W"],
  ["violet", "Violet"],
] as const;
export type ThemeName = (typeof THEMES)[number][0];

// Starts every page load in this test on `theme`, the way a returning visitor would arrive.
export async function arriveWithTheme(page: Page, theme: ThemeName) {
  await page.addInitScript(
    ([key, value]) => {
      try {
        localStorage.setItem(key, value);
      } catch {
        // Storage blocked: the page stays on its default.
      }
    },
    [THEME_KEY, theme] as const,
  );
}

// The content of every meta theme-color in the head, in tree order. The head is meant to have one.
export async function themeColorTags(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('meta[name="theme-color"]')].map((meta) => meta.getAttribute("content")),
  );
}

// Resolves once React owns the first theme switch on the page (it puts __reactProps$ on a node it
// hydrates), which is when a link click is a client-side navigation and not a page load. Two
// frames more lets the layout effect that takes over from the inline script run.
export async function whenSwitchIsLive(page: Page) {
  await expect
    .poll(
      () =>
        page
          .locator(".theme-toggle button")
          .first()
          .evaluate((el) => Object.keys(el).some((key) => key.startsWith("__reactProps"))),
      { timeout: 20000 },
    )
    .toBe(true);
  await page.evaluate(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))),
  );
}

export async function noHorizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
}

// Scrolls through the whole page once, so lazy sections mount and scroll-driven states apply.
export async function scrollThrough(page: Page, step = 800) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += step) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
  }
}

// Safari on macOS only tabs to form controls unless Option is held, so WebKit on a Mac needs
// Alt+Tab to reach a link or a button. That is a setting of the browser, not of the page.
export function tabKey(browserName: string) {
  return browserName === "webkit" && process.platform === "darwin" ? "Alt+Tab" : "Tab";
}

// Collects page errors and console errors. A 404 page logs the failed document load itself,
// which is the page working, so a caller expecting one passes `allowDocument404`.
export function collectErrors(page: Page, { allowDocument404 = false } = {}) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    if (allowDocument404 && /status of 404/.test(message.text())) return;
    errors.push(message.text());
  });
  return errors;
}

// Returns every computed color on the page whose channels differ by more than `tolerance`.
// B&W is black and white, so any hue at all is a regression there.
export async function huedColors(page: Page, tolerance = 2) {
  return page.evaluate((tolerance) => {
    const props = [
      "color",
      "backgroundColor",
      "borderTopColor",
      "borderRightColor",
      "borderBottomColor",
      "borderLeftColor",
      "outlineColor",
      "textDecorationColor",
      "fill",
      "stroke",
      "boxShadow",
      "backgroundImage",
    ] as const;
    const found: string[] = [];
    for (const element of document.querySelectorAll("body *")) {
      if (element.closest("nextjs-portal, script, style")) continue;
      const style = getComputedStyle(element);
      for (const prop of props) {
        for (const color of String(style[prop]).match(/rgba?\([^)]+\)/g) ?? []) {
          const [r, g, b, a = 1] = color
            .slice(color.indexOf("(") + 1, -1)
            .split(/[\s,/]+/)
            .filter(Boolean)
            .map(Number);
          if (a > 0 && Math.max(r, g, b) - Math.min(r, g, b) > tolerance) {
            found.push(`${element.tagName.toLowerCase()} ${prop} ${color}`);
          }
        }
      }
    }
    return found;
  }, tolerance);
}

// Every link on the page whose accessible name also names a link to somewhere else. A screen
// reader user often lists the links of a page, so each name has to mean one destination.
export async function ambiguousLinks(page: Page) {
  const snapshot = await page.locator("body").ariaSnapshot();
  const destinations = new Map<string, Set<string>>();
  for (const [, name, href] of snapshot.matchAll(
    /- link "((?:[^"\\]|\\.)*)"[^\n]*\n\s*- \/url: "?([^"\n]+)"?/g,
  )) {
    destinations.set(name, (destinations.get(name) ?? new Set()).add(href));
  }
  return {
    count: destinations.size,
    ambiguous: [...destinations]
      .filter(([, hrefs]) => hrefs.size > 1)
      .map(([name, hrefs]) => `"${name}" goes to ${[...hrefs].join(" and ")}`),
  };
}

// Controls drawn past the left or right edge of the window. A control inside a strip that
// scrolls sideways on its own (the project sub-tabs, a wide table) is reached by scrolling that
// strip, so it does not count.
export async function controlsOffScreen(page: Page) {
  return page
    .locator("header a, header button, nav a, main a, main button, footer a")
    .evaluateAll((elements) =>
      elements
        .filter((el) => {
          for (let node = el.parentElement; node; node = node.parentElement) {
            const { overflowX } = getComputedStyle(node);
            if (overflowX === "auto" || overflowX === "scroll") return false;
          }
          const r = el.getBoundingClientRect();
          return r.width > 0 && (r.left < -1 || r.right > innerWidth + 1);
        })
        .map((el) => el.textContent),
    );
}

// Resolves once the page has not scrolled for twenty frames. The page scrolls smoothly, so a
// control focused or scrolled to from far away is still being carried there for a moment.
export async function scrollIsStill(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        let y = scrollY;
        let still = 0;
        const tick = () => {
          if (scrollY === y) still += 1;
          else {
            y = scrollY;
            still = 0;
          }
          if (still >= 20) resolve();
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
  );
}

// Where a section sits once a fragment link has had time to land: its top against the window,
// and whether the page ended before the section could reach the top.
export async function sectionPosition(page: Page, id: string) {
  return page.evaluate((id) => {
    const top = document.getElementById(id)!.getBoundingClientRect().top;
    const atEnd = scrollY + innerHeight >= document.documentElement.scrollHeight - 2;
    return { top, atEnd, viewport: innerHeight };
  }, id);
}

// The probe the page makes before it builds a 3D model (src/components/robopet/gpu.ts): no
// WebGL or a software rasteriser keeps the stills.
export async function drawsLive(page: Page) {
  return page.evaluate(() => {
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
      if (!gl) return false;
      const info = gl.getExtension("WEBGL_debug_renderer_info");
      const name = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER) ?? "");
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      return !/swiftshader|llvmpipe|software|basic render/i.test(name);
    } catch {
      return false;
    }
  });
}
