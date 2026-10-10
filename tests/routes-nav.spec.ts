import { readdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { NextRequest } from "next/server";
import nextConfig from "../next.config";
import { PROJECTS } from "../src/data/projects";
import { proxy } from "../src/proxy";
import {
  arriveWithTheme,
  collectErrors,
  noHorizontalOverflow,
  themeColorTags,
  whenSwitchIsLive,
} from "./helpers";

// The proxy reads the names in public/projects from process.env.PROJECT_PUBLIC_FILES, which Next
// inlines from next.config.ts at build time. Called directly here it is not inlined, so the same
// value is set from the same config.
process.env.PROJECT_PUBLIC_FILES = nextConfig.env?.PROJECT_PUBLIC_FILES;
const PUBLIC_PROJECT_FILES = readdirSync("public/projects").filter((name) => !name.startsWith("."));

// The behavior of the routes and the nav that the layout of one page cannot show: the project
// titles on a phone, the sub-tab strip at every desktop width, how a route change and Back and
// Forward land, the share card of each project, the 404 pages and the Games link.

const SITE = "https://www.arya-vora.org";
const subTabs = (page: Page) => page.getByRole("navigation", { name: "Projects", exact: true });
const mainNav = (page: Page) => page.getByRole("navigation", { name: "Main navigation" });

// Records scrollY on every frame until stopped, so a glide shows as many values and a jump as two.
async function recordScroll(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __ys: number[]; __raf: number };
    w.__ys = [];
    const tick = () => {
      w.__ys.push(Math.round(scrollY));
      w.__raf = requestAnimationFrame(tick);
    };
    tick();
  });
}
async function stopRecording(page: Page) {
  return page.evaluate(() => {
    const w = window as unknown as { __ys: number[]; __raf: number };
    cancelAnimationFrame(w.__raf);
    return w.__ys;
  });
}

// Like recordScroll, but stamps each frame with performance.now(), so a glide can be told from a
// jump by how long it took and what it passed through, not by how many frames the browser managed
// to paint. A busy machine (six parallel workers) paints fewer frames in the same glide, and a
// frame count then reads a short glide as no glide at all.
type ScrollSample = { t: number; y: number };
async function recordScrollTimed(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as {
      __samples: ScrollSample[];
      __rafTimed: number;
      __sawAnchorClass: boolean;
      __classWatch: MutationObserver;
    };
    w.__samples = [];
    // The class that turns smooth scrolling on lasts a few hundred ms in WebKit. Watching it from
    // the page sees every change; polling it from the test can miss the whole window on a busy machine.
    const root = document.documentElement;
    w.__sawAnchorClass = root.classList.contains("is-anchor-scrolling");
    w.__classWatch?.disconnect();
    w.__classWatch = new MutationObserver(() => {
      if (root.classList.contains("is-anchor-scrolling")) w.__sawAnchorClass = true;
    });
    w.__classWatch.observe(root, { attributes: true, attributeFilter: ["class"] });
    const tick = () => {
      w.__samples.push({ t: performance.now(), y: Math.round(scrollY) });
      w.__rafTimed = requestAnimationFrame(tick);
    };
    tick();
  });
}
async function stopRecordingTimed(page: Page) {
  return page.evaluate(async () => {
    const w = window as unknown as {
      __samples: ScrollSample[];
      __rafTimed: number;
      __sawAnchorClass: boolean;
      __classWatch: MutationObserver;
    };
    // Two more frames, so the place the scroll ended on is in the record.
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    cancelAnimationFrame(w.__rafTimed);
    w.__classWatch.disconnect();
    return { samples: w.__samples, sawAnchorClass: w.__sawAnchorClass };
  });
}

for (const width of [390, 320]) {
  test(`at ${width}px wide no project title breaks inside a word or runs past its box`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    for (const project of PROJECTS) {
      await page.goto(`/projects/${project.slug}`);
      const title = await page.getByRole("heading", { level: 1 }).evaluate((h1) => {
        const text = h1.firstChild as Text;
        const broken: string[] = [];
        for (const match of text.data.matchAll(/\S+/g)) {
          const range = document.createRange();
          range.setStart(text, match.index!);
          range.setEnd(text, match.index! + match[0].length);
          // A word that wraps in the middle has a box on each of two lines.
          const lines = new Set([...range.getClientRects()].map((r) => Math.round(r.top)));
          if (lines.size > 1) broken.push(match[0]);
        }
        return { broken, overflow: h1.scrollWidth - h1.clientWidth };
      });
      expect(title.broken, project.slug).toEqual([]);
      expect(title.overflow, project.slug).toBeLessThanOrEqual(0);
      expect(await noHorizontalOverflow(page), project.slug).toBe(true);
    }
  });
}

test("the sub-tab strip shows every tab at once from a 1258px window up", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "a phone scrolls the strip by touch");
  for (const width of [1728, 1440, 1366, 1280, 1258]) {
    await page.setViewportSize({ width, height: 800 });
    // A project at the far end, where the strip used to scroll its first tab out of view.
    await page.goto(`/projects/${PROJECTS[PROJECTS.length - 2].slug}`);
    const strip = subTabs(page).locator(".ptabs-scroll");
    await expect(subTabs(page).getByRole("link")).toHaveCount(PROJECTS.length + 1);
    const { scroll, client, left } = await strip.evaluate((el) => ({
      scroll: el.scrollWidth,
      client: el.clientWidth,
      left: el.scrollLeft,
    }));
    expect(scroll, `${width}px strip`).toBeLessThanOrEqual(client);
    expect(left, `${width}px strip`).toBe(0);
    await expect(subTabs(page).locator(".ptabs-step:visible")).toHaveCount(0);
    const box = await strip.boundingBox();
    const first = await subTabs(page).getByRole("link").first().boundingBox();
    const last = await subTabs(page).getByRole("link").last().boundingBox();
    expect(first!.x, `${width}px first tab`).toBeGreaterThanOrEqual(box!.x - 1);
    expect(last!.x + last!.width, `${width}px last tab`).toBeLessThanOrEqual(box!.x + box!.width + 1);
  }
});

test("below that width a mouse gets a button on each side that has more tabs", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "a phone scrolls the strip by touch");
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.goto(`/projects/${PROJECTS[2].slug}`);
  const strip = subTabs(page).locator(".ptabs-scroll");
  const step = subTabs(page).locator(".ptabs-step");
  const left = () => strip.evaluate((el) => Math.round(el.scrollLeft));
  expect(await strip.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);

  // At the start there is nothing before the first tab and more after the last.
  await expect(step.filter({ visible: true })).toHaveCount(1);
  await expect(step.last()).toBeVisible();
  const before = await left();
  await step.last().click();
  await expect.poll(left).toBeGreaterThan(before);
  // The buttons are a mouse's way along the strip: a keyboard and a screen reader use the links.
  await expect(step.first()).toHaveAttribute("aria-hidden", "true");
  await expect(step.first()).toHaveAttribute("tabindex", "-1");
  // Scrolled to the end, the button that was there is gone and the other has appeared.
  await expect(step.last()).toBeHidden();
  await expect(step.first()).toBeVisible();
  await step.first().click();
  await expect.poll(left).toBe(0);
});

test("a route change lands in one frame, not by gliding from the old scroll position", async ({
  page,
}) => {
  const [, , drone, corexy] = PROJECTS;
  await page.goto(`/projects/${drone.slug}`);
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
  const startedAt = await page.evaluate(() => Math.round(scrollY));
  expect(startedAt).toBeGreaterThan(1000);

  await recordScroll(page);
  await page
    .getByRole("navigation", { name: "More projects" })
    .getByRole("link", { name: /^Next/ })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(corexy.title);
  await page.waitForTimeout(1200);
  const ys = await stopRecording(page);
  // Only where it started and the top: no value in between means no glide.
  expect([...new Set(ys)].sort((a, b) => b - a)).toEqual([startedAt, 0].filter((y, i, all) => all.indexOf(y) === i));
  expect(ys[ys.length - 1]).toBe(0);

  // The same from a sub-tab, part way down a page. The strip sits at the top of the page, so a
  // visitor would have to scroll up to reach it; the click is made on the element instead, which
  // leaves the scroll position where this test put it.
  await page.evaluate(() => window.scrollTo({ top: 1500, behavior: "instant" }));
  await recordScroll(page);
  const last = PROJECTS[PROJECTS.length - 1];
  await subTabs(page).getByRole("link", { name: last.tab, exact: true }).evaluate((a) => (a as HTMLAnchorElement).click());
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(last.title);
  await page.waitForTimeout(1200);
  const tabYs = await stopRecording(page);
  expect(new Set(tabYs).size).toBeLessThanOrEqual(2);
  expect(tabYs[tabYs.length - 1]).toBe(0);
});

test("Back returns to where the page was left, in one step, in Chromium", async ({
  page,
  browserName,
}) => {
  // The glide was Chromium's own scroll restoration meeting scroll-behavior: smooth.
  test.skip(browserName !== "chromium", "restoration differs by engine");
  const [, , drone, corexy] = PROJECTS;
  for (const left of [600, 1800]) {
    await page.goto(`/projects/${drone.slug}`);
    await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), left);
    await page.waitForTimeout(300);
    // Click the link on the element: Playwright's own click would first scroll it into view.
    await page.evaluate(() => document.querySelector<HTMLAnchorElement>(".pdetail-pager .is-next")!.click());
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(corexy.title);
    await page.waitForTimeout(500);

    await recordScroll(page);
    await page.goBack();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(drone.title);
    await page.waitForTimeout(1500);
    const back = await stopRecording(page);
    // Where it was left, reached in one step: a glide would show a run of values on the way.
    expect(back[back.length - 1], `back to ${left}`).toBe(left);
    expect(new Set(back).size, `back to ${left}`).toBeLessThanOrEqual(2);

    await recordScroll(page);
    await page.goForward();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(corexy.title);
    await page.waitForTimeout(1500);
    const forward = await stopRecording(page);
    expect(forward[forward.length - 1], `forward from ${left}`).toBe(0);
    expect(new Set(forward).size, `forward from ${left}`).toBeLessThanOrEqual(2);
  }
});

test("the page scrolls instantly, and smoothly only for the length of an in-page link", async ({
  page,
}) => {
  await page.goto(`/projects/${PROJECTS[2].slug}`);
  const behavior = () => page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior);
  expect(await behavior()).toBe("auto");

  const top = page
    .getByRole("navigation", { name: "Footer navigation" })
    .getByRole("link", { name: "Top", exact: true });
  // The click handler that turns smooth scrolling on is installed once the page has hydrated. A
  // click before that is the browser's own instant jump, which is not what this test is about,
  // and on a busy machine hydration can take seconds. React puts __reactProps$ on a node it has
  // hydrated; two frames more lets the effect that installs the handler run.
  await expect
    .poll(() => top.evaluate((el) => Object.keys(el).some((key) => key.startsWith("__reactProps"))), {
      timeout: 20000,
    })
    .toBe(true);
  await page.evaluate(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))),
  );
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
  await recordScrollTimed(page);
  await top.click();
  await expect.poll(() => page.evaluate(() => Math.round(scrollY)), { timeout: 15000 }).toBeLessThanOrEqual(2);
  const { samples, sawAnchorClass } = await stopRecordingTimed(page);
  // Smooth while it travels...
  expect(sawAnchorClass, "smooth scrolling was switched on for the link").toBe(true);
  // ...and a glide, not a jump: it passed through places between the bottom and the top, and
  // took real time to do it. Counting frames would depend on how busy the machine is; the
  // length of the glide and a place strictly between the two ends do not. A jump measures 0ms and
  // no frame between; a glide measures about 180ms in WebKit, 350 to 600 in Firefox, 950 in Chromium.
  const from = samples[0].y;
  const left = samples.find((sample) => sample.y < from);
  const arrived = samples.find((sample) => sample.y <= 2);
  expect(left, "the page left the bottom").toBeDefined();
  expect(arrived, "the page reached the top").toBeDefined();
  const between = samples.filter((sample) => sample.y > 2 && sample.y < from);
  expect(between.length, "frames strictly between the bottom and the top").toBeGreaterThanOrEqual(1);
  expect(arrived!.t - left!.t, "ms from leaving the bottom to reaching the top").toBeGreaterThan(100);
  // ...and instant again once it has stopped.
  await expect(page.locator("html")).not.toHaveClass(/is-anchor-scrolling/);
  expect(await behavior()).toBe("auto");
});

// The card a link previews as is a 1200 x 630 PNG per project, drawn at build time
// (src/app/projects/_share/card.tsx). A cover is a WebP, often a cutout with an alpha channel,
// and LinkedIn has never read WebP, so the cover itself is never the share image.
const pngSize = (bytes: Buffer) => ({
  signature: bytes.subarray(0, 8).toString("hex"),
  width: bytes.readUInt32BE(16),
  height: bytes.readUInt32BE(20),
});

test("every project shares a 1200 x 630 PNG card of its own, and the index shares the site card", async ({
  page,
  request,
}) => {
  for (const project of PROJECTS) {
    await page.goto(`/projects/${project.slug}`);
    const meta = (selector: string) => page.locator(selector).getAttribute("content");
    const og = await meta('meta[property="og:image"]');
    const twitter = await meta('meta[name="twitter:image"]');
    expect(og, project.slug).toBe(`${SITE}/projects/${project.slug}/card.png`);
    expect(twitter, project.slug).toBe(og);
    expect(await meta('meta[property="og:image:type"]'), project.slug).toBe("image/png");
    expect(await meta('meta[property="og:image:width"]'), project.slug).toBe("1200");
    expect(await meta('meta[property="og:image:height"]'), project.slug).toBe("630");
    // The words a preview shows when it cannot show the picture: the title, then what the cover shows.
    const alt = await meta('meta[property="og:image:alt"]');
    expect(alt, project.slug).toContain(project.title);
    expect(alt, project.slug).toContain(project.cover.alt);
    expect(await meta('meta[name="twitter:image:alt"]'), project.slug).toBe(alt);
    expect(await meta('meta[name="twitter:card"]'), project.slug).toBe("summary_large_image");

    // And the files are what the tags say they are.
    for (const url of [og!]) {
      const response = await request.get(new URL(url).pathname);
      expect(response.status(), url).toBe(200);
      expect(response.headers()["content-type"], url).toBe("image/png");
      const bytes = await response.body();
      expect(pngSize(bytes), url).toEqual({ signature: "89504e470d0a1a0a", width: 1200, height: 630 });
      // A card with its picture is tens of KB; one drawn without it is about 15.
      expect(bytes.length, url).toBeGreaterThan(30_000);
      expect(bytes.length, url).toBeLessThan(400_000);
    }
  }
  await page.goto("/projects");
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    `${SITE}/portfolio-og.png`,
  );
});

// A search result and a link preview cut a description at about 160 characters, mid sentence.
test("every page describes itself in 160 characters or fewer, the same on the card", async ({ page }) => {
  for (const path of ["/", "/projects", ...PROJECTS.map((project) => `/projects/${project.slug}`)]) {
    await page.goto(path);
    const meta = (selector: string) => page.locator(selector).getAttribute("content");
    const description = await meta('meta[name="description"]');
    expect(description, path).toBeTruthy();
    expect(description!.length, `${path}: ${description}`).toBeLessThanOrEqual(160);
    expect(description!.length, path).toBeGreaterThanOrEqual(60);
    expect(description, path).not.toMatch(/[\u2013\u2014\u2192\u00b7]/);
    expect(await meta('meta[property="og:description"]'), path).toBe(description);
    expect(await meta('meta[name="twitter:description"]'), path).toBe(description);
  }
});

test("a project that does not exist is a 404 that does not claim to be the home page", async ({
  page,
}) => {
  const errors = collectErrors(page, { allowDocument404: true });
  const response = await page.goto("/projects/not-a-project");
  expect(response?.status()).toBe(404);
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  await expect(page.locator('meta[property="og:url"]')).toHaveCount(0);
  await expect(page.locator('meta[property="og:image"]')).toHaveCount(0);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    "Project not found | Arya Vora",
  );
  await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute("content", /noindex/);
  expect(errors).toEqual([]);
});

// Next 16 answers notFound() from a page with a bare <html id="__next_error__"> shell (no lang,
// no theme script, no stylesheet, an empty body) and draws the message after the scripts load.
// The missing project is rewritten by the proxy to a page that renders normally instead, so the
// document itself carries the message: it is readable with scripts off, takes the saved theme
// before the first paint, and gives a crawler something to read.
test("the raw HTML of a missing project is a complete page, not Next's error shell", async ({
  request,
}) => {
  for (const missing of ["/projects/not-a-project", "/projects/Not-A-Project", "/projects/not-a-project/"]) {
    const response = await request.get(missing);
    expect(response.status(), missing).toBe(404);
    const html = await response.text();
    expect(html, missing).toContain('<html lang="en"');
    expect(html, missing).toContain('data-theme="mono"');
    expect(html, missing).toContain("There is no project at this address.");
    expect(html, missing).toContain("See all projects");
    expect(html, missing).toContain("<title>Project not found | Arya Vora</title>");
    expect(html, missing).toContain("av-theme");
    expect(html, missing).toMatch(/<link rel="stylesheet"/);
    expect(html, missing).not.toContain('id="__next_error__"');
  }
  // A file-like address under /projects that is no file (a cover that was removed) is not a page
  // of the projects layout, but it is still a whole 404 page and not the error shell.
  const file = await request.get("/projects/tally.webp");
  expect(file.status()).toBe(404);
  const html = await file.text();
  expect(html).toContain('<html lang="en"');
  expect(html).toContain("There is no page at this address.");
  expect(html).not.toContain('id="__next_error__"');
});

// Next adds <meta name="robots" content="noindex"> to a page it answers with a 404. The pages here
// used to add a second one of their own ("noindex, nofollow"), so a crawler read two. Each 404
// has exactly one, and it keeps the page out of results.
test("every kind of 404 carries exactly one robots meta, and it says noindex", async ({ request }) => {
  for (const path of [
    "/nope",
    "/games/nope",
    "/projects/nope",
    "/projects/not-a-project/",
    "/projects/tally.webp",
    "/projects/foo.txt",
    "/projects/nope/card.png",
  ]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(404);
    const robots = [...(await response.text()).matchAll(/<meta name="robots" content="([^"]*)"/g)].map(
      (match) => match[1],
    );
    expect(robots, path).toHaveLength(1);
    expect(robots[0], path).toContain("noindex");
  }
});

// Every file in public/projects is an address the proxy must leave alone: it answers a name with an
// extension that is not a file itself (/projects/tally.webp, with the root 404), and the names it
// lets through are the ones next.config.ts listed. The list is read from the folder when the
// config loads, so a new image is covered by the next build; this checks that the list and the
// folder agree, and that the built server serves every file.
test("every file in public/projects passes the proxy untouched and is served", async ({ request }) => {
  expect(PUBLIC_PROJECT_FILES.length).toBeGreaterThan(5);
  for (const name of PUBLIC_PROJECT_FILES) {
    const response = proxy(new NextRequest(`https://www.arya-vora.org/projects/${name}`));
    expect(response.status, name).toBe(200);
    expect(response.headers.get("x-middleware-rewrite"), name).toBeNull();
    expect(response.headers.get("location"), name).toBeNull();
    expect(response.headers.get("x-middleware-next"), name).toBe("1");
    const served = await request.get(`/projects/${name}`);
    expect(served.status(), name).toBe(200);
    expect(served.headers()["content-type"], name).toMatch(/^image\//);
  }
});

// A name that is not a file never reaches the [slug] route (dynamicParams = false there makes Next
// write "Error: Internal: NoFallbackError" to the server log on every request, though the answer
// is still a 404). The proxy rewrites it to an address no route has, with the 404, so the root
// not-found page answers. The log cannot be read from here; the rewrite is what keeps it clean.
test("a file name that is not in public/projects is rewritten to the root 404, not left to [slug]", () => {
  for (const name of ["tally.webp", "foo.txt", "x.png", "reaper.webp", "Tally-Cover.webp", ".DS_Store", "tally-cover.webp.map"]) {
    const response = proxy(new NextRequest(`https://www.arya-vora.org/projects/${name}?x=1`));
    expect(response.status, name).toBe(404);
    expect(response.headers.get("x-middleware-rewrite"), name).toBe(
      "https://www.arya-vora.org/_no-such-file?x=1",
    );
  }
  // A percent-encoded spelling of a real file is the file.
  const encoded = proxy(new NextRequest("https://www.arya-vora.org/projects/tally%2Dcover.webp"));
  expect(encoded.status).toBe(200);
  expect(encoded.headers.get("x-middleware-rewrite")).toBeNull();
  // Without the list (a build that did not set it) nothing is turned away.
  const listed = process.env.PROJECT_PUBLIC_FILES;
  try {
    delete process.env.PROJECT_PUBLIC_FILES;
    const unknown = proxy(new NextRequest("https://www.arya-vora.org/projects/tally.webp"));
    expect(unknown.status).toBe(200);
    expect(unknown.headers.get("x-middleware-rewrite")).toBeNull();
  } finally {
    process.env.PROJECT_PUBLIC_FILES = listed;
  }
});

test("a missing project shows its message and the sub-tabs with scripts off", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  const page = await context.newPage();
  const response = await page.goto("/projects/not-a-project");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "There is no project at this address.",
  );
  await expect(subTabs(page).getByRole("link")).toHaveCount(PROJECTS.length + 1);
  await context.close();
});

test("a missing project takes the saved theme before the first paint", async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("av-theme", "violet");
    } catch {}
    document.addEventListener("DOMContentLoaded", () => {
      const html = document.documentElement;
      (window as unknown as { __first: unknown }).__first = {
        lang: html.lang,
        theme: html.dataset.theme,
        chars: document.body.innerText.length,
      };
    });
  });
  await page.goto("/projects/not-a-project", { waitUntil: "domcontentloaded" });
  const first = await page.evaluate(() => (window as unknown as { __first: unknown }).__first);
  expect(first).toMatchObject({ lang: "en", theme: "violet" });
  expect((first as { chars: number }).chars).toBeGreaterThan(40);
});

test("Games in the nav goes to the games site, named as a separate site", async ({ page }) => {
  await page.goto("/projects/reaper");
  const games = mainNav(page).getByRole("link", { name: "Games", exact: true });
  await expect(games).toHaveAttribute("href", "https://games.arya-vora.org");
  await expect(games).toHaveAttribute("title", /separate site/);
  await expect(games).not.toHaveAttribute("aria-current");
  await expect(
    page
      .getByRole("navigation", { name: "Footer navigation" })
      .getByRole("link", { name: "Games", exact: true }),
  ).toHaveAttribute("href", "https://games.arya-vora.org");
});

// The text of a page rises into place on the scroll timeline; it must never wait at partial
// opacity, which an audit run on a phone while the text sits near the fold reads as low contrast.
for (const [width, height] of [
  [320, 640],
  [375, 667],
  [390, 844],
] as const) {
  for (const path of ["/projects", "/projects/reaper", "/projects/tally"]) {
    test(`on a fresh load at ${width}x${height} ${path} has no contrast failure`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto(path);
      // Where the browser has scroll-driven animations, nothing that holds text changes opacity.
      const fading = await page.evaluate(() =>
        document
          .getAnimations()
          .filter((a) => {
            const target = (a.effect as KeyframeEffect | null)?.target as Element | null;
            const name = (a as CSSAnimation).animationName;
            return (
              name === "projects-reveal" &&
              target &&
              getComputedStyle(target).opacity !== "1"
            );
          })
          .map((a) => (a as CSSAnimation).animationName),
      );
      expect(fading).toEqual([]);
      const results = await new AxeBuilder({ page }).withRules(["color-contrast"]).analyze();
      expect(
        results.violations.map((v) => v.nodes.map((n) => n.target.join(" ")).join(" | ")),
      ).toEqual([]);
    });
  }
}

// Paper and PDF never run a scroll timeline, so a picture that fades in with the scroll would print
// at the opacity it starts from: a caption with an empty block above it.
test("a project page printed to PDF keeps every picture", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "page.pdf() is Chromium only");
  test.setTimeout(90000);
  for (const path of ["/projects", "/projects/drone", "/projects/reaper", "/projects/robopet", "/projects/tally"]) {
    await page.emulateMedia({ media: "print" });
    await page.goto(path);
    const hidden = await page.evaluate(() =>
      [
        ...document.querySelectorAll<HTMLElement>(
          ".pb-reveal, .pindex-cell, .pb-img, .pb-bleed, .pcard-media, .pcard-img, .pdetail-cover-img",
        ),
      ]
        .filter((el) => getComputedStyle(el).opacity !== "1")
        .map((el) => el.className),
    );
    expect(hidden, path).toEqual([]);
    const running = await page.evaluate(() =>
      document
        .getAnimations()
        .map((animation) => (animation as CSSAnimation).animationName)
        .filter((name) => /^projects-(reveal|fade)$/.test(name)),
    );
    expect(running, path).toEqual([]);
    const pdf = await page.pdf({ format: "Letter" });
    expect(pdf.length, path).toBeGreaterThan(20_000);
  }
});

// A hand-typed /projects/Robopet, or the title's own spelling /projects/roboPet, is the project at its
// lower-case address (src/proxy.ts). Next matches a prerendered page without regard to case but
// renders it for the slug as typed, so before the redirect lived in the proxy one visit to
// /projects/roboPet replaced the stored page of /projects/robopet with a 404 for everyone.
test("a project address in capitals redirects to the lower-case one without harming it, and a missing project stays a 404", async ({
  request,
}) => {
  for (let round = 0; round < 3; round++) {
    for (const project of PROJECTS) {
      const spelled = project.title.replace(/\s+/g, "");
      const variants = new Set([
        project.slug.charAt(0).toUpperCase() + project.slug.slice(1),
        project.slug.toUpperCase(),
        // The title's own spelling, where it is the slug in other letters (roboPet, notchTerm).
        ...(spelled.toLowerCase() === project.slug ? [spelled] : []),
      ]);
      variants.delete(project.slug);
      for (const variant of variants) {
        for (const rest of ["", "/card.png"]) {
          const response = await request.get(`/projects/${variant}${rest}`, { maxRedirects: 0 });
          expect(response.status(), `${variant}${rest} round ${round}`).toBe(308);
          expect(response.headers()["location"], `${variant}${rest}`).toBe(`/projects/${project.slug}${rest}`);
        }
      }
      // The real address is untouched by any of that.
      const real = await request.get(`/projects/${project.slug}`);
      expect(real.status(), `${project.slug} round ${round}`).toBe(200);
      expect(await real.text(), project.slug).toContain(`<title>${project.title} | Arya Vora</title>`);
      const card = await request.get(`/projects/${project.slug}/card.png`);
      expect(card.status(), `${project.slug}/card.png round ${round}`).toBe(200);
    }
    for (const missing of ["/projects/Not-A-Project", "/projects/not-a-project", "/projects/not-a-project/card.png"]) {
      const response = await request.get(missing, { maxRedirects: 0 });
      expect(response.status(), missing).toBe(404);
    }
  }
});

// React turns every eager <img> into a preload hint and puts the hint in the payload a page sends
// to the browser, a prefetched neighbour's included. The covers of the pages next to the one being
// read were fetched, never drawn, and Chrome warned about each.
test("a project page fetches no picture it does not draw, and Chrome logs no unused preload", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "the unused-preload warning is Chromium's");
  test.setTimeout(90000);
  // /games and the 404 are in the list for the stylesheets: the root not-found page renders the site
  // nav, which used to import interaction.css, so /games announced a file it never applied.
  const paths = ["/projects", "/projects/corexy", "/projects/drone", "/projects/shipkit", "/projects/tally", "/games", "/nope"];
  for (const path of paths) {
    const warnings: string[] = [];
    page.on("console", (message) => {
      if (/preloaded using link preload but not used/.test(message.text())) warnings.push(message.text());
    });
    const fetched = new Set<string>();
    page.on("response", (response) => {
      if (response.request().resourceType() === "image") fetched.add(new URL(response.url()).pathname);
    });
    await page.goto(path, { waitUntil: "networkidle" });
    // Chrome's warning comes a few seconds after load.
    await page.waitForTimeout(4500);
    const shown = await page.evaluate(() =>
      [...document.images].flatMap((image) =>
        [image.currentSrc, image.src].filter(Boolean).map((src) => new URL(src, location.href).pathname),
      ),
    );
    const unused = [...fetched].filter((src) => !shown.includes(src) && /^\/(?:cad|projects|ftc|robopet)\//.test(src));
    expect(unused, path).toEqual([]);
    expect(warnings, path).toEqual([]);
    page.removeAllListeners("console");
    page.removeAllListeners("response");
  }
});

// Reaper and roboPet carry a stylesheet of their own (src/app/projects/_view/own-routes.ts). A page that
// prefetched one of them, from the strip beside it or from the pager at its foot, was sent a hint for
// a file it never applies, and Chrome warned. Both now wait for a hover or a press.
test("no page preloads the stylesheet of Reaper or roboPet unless it uses it", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "the unused-preload warning is Chromium's");
  test.setTimeout(120000);
  const warnings: string[] = [];
  page.on("console", (message) => {
    if (/preloaded using link preload but not used/.test(message.text())) warnings.push(message.text());
  });
  for (const path of ["/projects/drone", "/projects/robopet", "/projects/reaper", "/projects/tally", "/projects"]) {
    await page.goto(path, { waitUntil: "networkidle" });
    // To the foot, where the pager's links come into view and Next prefetches what they lead to.
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
    await page.waitForTimeout(500);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.waitForTimeout(4500);
    expect(warnings, path).toEqual([]);
  }
});

// From a tablet up the sub-tab strip is pinned to the top of the window; it steps away on a scroll
// down and returns on the first scroll up. On a phone it stays in the page.
test("the sub-tab strip stays within reach on a long project page", async ({ page, viewport }) => {
  await page.goto("/projects/reaper");
  const strip = page.getByRole("navigation", { name: "Projects", exact: true });
  const position = () => strip.evaluate((el) => getComputedStyle(el).position);
  const top = () => strip.evaluate((el) => Math.round(el.getBoundingClientRect().top));
  if (viewport!.width <= 760) {
    expect(await position()).toBe("relative");
    return;
  }
  expect(await position()).toBe("sticky");
  // Hydrated: the scroll handler is installed in an effect.
  await expect
    .poll(() => strip.evaluate((el) => Object.keys(el).some((key) => key.startsWith("__reactProps"))), {
      timeout: 20000,
    })
    .toBe(true);
  await page.evaluate(() => window.scrollTo({ top: 3000, behavior: "instant" }));
  await expect(strip).toHaveAttribute("data-away", "");
  // Above the window, once the 0.28s slide is over.
  await expect.poll(top, { message: "away: above the window" }).toBeLessThan(0);
  // A small scroll up brings it back, flush with the top of the window.
  await page.evaluate(() => window.scrollBy({ top: -40, behavior: "instant" }));
  await expect(strip).not.toHaveAttribute("data-away");
  await expect.poll(top).toBe(0);
  // And it is a working tab: the click lands without scrolling to the top first.
  await strip.getByRole("link", { name: "Drone", exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/drone$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("ESP32 quadcopter");
});

// The section is matched as typed, so /Projects and /GAMES/free-throw were plain 404s, and a trailing
// slash cost a second hop (Next's own redirect for it runs before the proxy and does not lower the
// case). Both go to the one lower-case address with a single 308 now (src/proxy.ts).
test("the section in capitals goes to the lower-case address in one 308, and games.arya-vora.org paths still work", async ({
  request,
}) => {
  const moved: [string, string][] = [
    ["/Projects", "/projects"],
    ["/PROJECTS", "/projects"],
    ["/PROJECTS/reaper", "/projects/reaper"],
    ["/Projects/RoboPet", "/projects/robopet"],
    ["/PROJECTS/Reaper/card.png", "/projects/reaper/card.png"],
    ["/Games", "/games"],
    ["/GAMES/free-throw", "/games/free-throw"],
    ["/games/Free-Throw", "/games/free-throw"],
    ["/PROJECTS?from=a-link", "/projects?from=a-link"],
  ];
  for (const [from, to] of moved) {
    const response = await request.get(from, { maxRedirects: 0 });
    expect(response.status(), from).toBe(308);
    expect(response.headers()["location"], from).toBe(to);
    const landed = await request.get(to);
    expect(landed.status(), to).toBe(200);
  }
  // An address that names nothing is a 404 as typed, not a redirect to a 404.
  for (const missing of ["/PROJECTS/not-a-project", "/GAMES/not-a-game"]) {
    expect((await request.get(missing, { maxRedirects: 0 })).status(), missing).toBe(404);
  }

  // The games host is rewritten after the proxy has run; its own paths are not the proxy's.
  const host = { headers: { host: "games.arya-vora.org" } };
  for (const path of ["/", "/free-throw", "/stat-line", "/games/free-throw"]) {
    const response = await request.get(path, { ...host, maxRedirects: 0 });
    expect(response.status(), `games host ${path}`).toBe(200);
  }

  // A game's slug in capitals on the games host is no route either (/Stat-Line was a 404 there,
  // while /games/Stat-Line on the main host is one 308). It goes to the lower-case address on the
  // same host, once, and keeps the query.
  const gamesMoved: [string, string][] = [
    ["/Stat-Line", "/stat-line"],
    ["/STAT-LINE", "/stat-line"],
    ["/Free-Throw", "/free-throw"],
    ["/Career-Ladder", "/career-ladder"],
    ["/Stat-Line?from=a-link", "/stat-line?from=a-link"],
  ];
  for (const [from, to] of gamesMoved) {
    const response = await request.get(from, { ...host, maxRedirects: 0 });
    expect(response.status(), `games host ${from}`).toBe(308);
    expect(response.headers()["location"], `games host ${from}`).toBe(to);
    expect((await request.get(to, { ...host, maxRedirects: 0 })).status(), `games host ${to}`).toBe(200);
  }
  // Not a game: a 404 as typed, not a redirect to one.
  for (const missing of ["/Nope", "/Constructor", "/Stat-Lines"]) {
    expect((await request.get(missing, { ...host, maxRedirects: 0 })).status(), `games host ${missing}`).toBe(404);
  }
  // The main host has no such page at that address, and says so.
  expect((await request.get("/Stat-Line", { maxRedirects: 0 })).status()).toBe(404);
});

// Next's own trailing-slash redirect (trailingSlash is off, skipTrailingSlashRedirect is not set)
// answers before the proxy does, so through the server /projects/RoboPet/ is two hops: Next's
// slash strip, then the proxy's case fold, while a slash alone or a capital alone is one. The
// proxy itself folds a slash into the same 308, so this calls it directly and checks the one
// redirect it would make for an address that reaches it with the slash still on.
test("the proxy folds a trailing slash and a capital into one redirect", () => {
  const cases: [string, string | null][] = [
    ["/projects/RoboPet/", "/projects/robopet"],
    ["/Projects/", "/projects"],
    ["/projects/", "/projects"],
    ["/projects/drone/", "/projects/drone"],
    ["/GAMES/Free-Throw/", "/games/free-throw"],
    ["/projects/reaper/card.png", null],
    ["/projects/drone", null],
    ["/projects", null],
    ["/games/free-throw", null],
    // A game or a file that is no page, and anything below a slug, is left to Next.
    ["/games/not-a-game", null],
    ["/projects/tally-cover.webp", null],
    ["/projects/not-a-project/card.png", null],
    // Not the proxy's sections, or the games host's own paths (see the games host test below).
    ["/free-throw/", null],
    ["/Free-Throw", null],
    ["/", null],
  ];
  for (const [path, to] of cases) {
    const response = proxy(new NextRequest(`https://www.arya-vora.org${path}?x=1`));
    if (to === null) {
      expect(response.status, path).toBe(200);
      expect(response.headers.get("location"), path).toBeNull();
    } else {
      expect(response.status, path).toBe(308);
      expect(response.headers.get("location"), path).toBe(`https://www.arya-vora.org${to}?x=1`);
    }
  }
});

// On games.arya-vora.org the games are at "/<slug>", so a slug in capitals there is the proxy's
// (the third matcher entry picks the host and a capital letter in one segment). Everything else on
// that host is not, and the main host never sends these addresses here.
test("the proxy sends a game's slug in capitals on the games host to the lower-case address", () => {
  const games = "https://games.arya-vora.org";
  for (const [path, to] of [
    ["/Stat-Line", "/stat-line"],
    ["/STAT-LINE/", "/stat-line"],
    ["/Free-Throw", "/free-throw"],
    ["/Career-Ladder", "/career-ladder"],
  ]) {
    const response = proxy(new NextRequest(`${games}${path}?x=1`));
    expect(response.status, path).toBe(308);
    expect(response.headers.get("location"), path).toBe(`${games}${to}?x=1`);
  }
  // The host is read from the Host header when there is one, as the matcher does.
  const byHeader = proxy(new NextRequest("http://localhost:3100/Stat-Line", { headers: { host: "games.arya-vora.org" } }));
  expect(byHeader.status).toBe(308);
  for (const path of ["/stat-line", "/Nope", "/Constructor", "/valueOf", "/Stat-Line/extra", "/", "/icon.svg"]) {
    const response = proxy(new NextRequest(`${games}${path}`));
    expect(response.status, path).toBe(200);
    expect(response.headers.get("location"), path).toBeNull();
    expect(response.headers.get("x-middleware-rewrite"), path).toBeNull();
  }
  // /games/<slug> on that host is the main host's rule, unchanged.
  const under = proxy(new NextRequest(`${games}/games/Free-Throw`));
  expect(under.headers.get("location")).toBe(`${games}/games/free-throw`);
  // The main host does not have these pages at that address; nothing to fix, nothing to send.
  for (const path of ["/Stat-Line", "/Free-Throw", "/Career-Ladder"]) {
    const response = proxy(new NextRequest(`https://www.arya-vora.org${path}`));
    expect(response.status, path).toBe(200);
    expect(response.headers.get("location"), path).toBeNull();
  }
});

// A project that does not exist is answered by a page that renders (/projects/missing), under the
// address as typed, with the 404 set by the proxy.
test("the proxy rewrites a missing project to its 404 page", () => {
  for (const path of ["/projects/not-a-project", "/projects/Not-A-Project", "/projects/not-a-project/", "/PROJECTS/nope"]) {
    const response = proxy(new NextRequest(`https://www.arya-vora.org${path}?x=1`));
    expect(response.status, path).toBe(404);
    expect(response.headers.get("location"), path).toBeNull();
    expect(response.headers.get("x-middleware-rewrite"), path).toBe(
      "https://www.arya-vora.org/projects/missing?x=1",
    );
  }
});

// A route loads the stylesheet of every component it imports, rendered or not. ProjectBlocks used
// to import the Reaper blocks (a CSS module) and the roboPet build log (another), so every project
// page and the 404 carried both files; and the site nav imported interaction.css, which the root
// not-found page pulled into /games as a preload nothing used.
test("a page loads only the stylesheets it applies", async ({ request }) => {
  const sheets = async (path: string) => {
    const html = await (await request.get(path)).text();
    const links = [...html.matchAll(/<link\b[^>]*>/g)].map((match) => match[0]).filter((tag) => /\.css/.test(tag));
    const hrefs = (rel: RegExp) =>
      links.filter((tag) => rel.test(tag)).map((tag) => /href="([^"]+)"/.exec(tag)![1]);
    const applied = hrefs(/rel="stylesheet"/);
    // A preload of a stylesheet the page does not also apply is the one Chrome warns about.
    const orphaned = hrefs(/rel="preload"/).filter((href) => !applied.includes(href));
    const css = (await Promise.all(applied.map(async (href) => (await request.get(href)).text()))).join("\n");
    return { css, orphaned };
  };
  for (const path of ["/projects", "/projects/drone", "/projects/shipkit", "/projects/not-a-project", "/nope", "/games"]) {
    const { css, orphaned } = await sheets(path);
    expect(orphaned, path).toEqual([]);
    expect(css, path).not.toContain("ReaperBlocks-module");
    expect(css, path).not.toContain("RoboPetBuildLog-module");
  }
  const reaper = await sheets("/projects/reaper");
  expect(reaper.css).toContain("ReaperBlocks-module");
  expect(reaper.css).not.toContain("RoboPetBuildLog-module");
  expect(reaper.orphaned).toEqual([]);
  const robopet = await sheets("/projects/robopet");
  expect(robopet.css).toContain("RoboPetBuildLog-module");
  expect(robopet.css).not.toContain("ReaperBlocks-module");
  expect(robopet.orphaned).toEqual([]);
});

// Next swaps the head tags on a client-side navigation, and the new meta theme-color holds the
// layout's #000000. In violet the toolbar went black again after the first route change.
test("the toolbar color follows the theme through client-side navigation", async ({ page, browserName }) => {
  test.skip(browserName === "firefox", "Firefox has no theme-color toolbar");
  await page.goto("/");
  await page.locator('.theme-toggle button[data-theme-option="violet"]').first().click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "violet");
  const toolbar = () =>
    page.evaluate(() => ({
      color: document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')!.content,
      surface: getComputedStyle(document.documentElement).getPropertyValue("--surface").trim(),
    }));
  await expect.poll(async () => (await toolbar()).color).toBe((await toolbar()).surface);
  expect((await toolbar()).color).not.toBe("#000000");

  const violet = (await toolbar()).surface;
  for (const [name, url] of [
    ["Projects", /\/projects$/],
    ["roboPet", /\/projects\/robopet$/],
    ["Home", /\/$/],
  ] as const) {
    await mainNav(page).getByRole("link", { name, exact: true }).click();
    await expect(page).toHaveURL(url);
    await expect.poll(async () => (await toolbar()).color, { message: `after ${name}` }).toBe(violet);
  }
});

// React owns the meta theme-color of the route and the page's inline script recolors the server's
// own tag before hydration; the two must never leave the head with a second tag (a browser that
// reads the last one would show a black toolbar in Violet), and the tag React made must not be
// pulled out from under it (the next route change would throw from removeChild). Every engine.
test("one theme-color tag survives client-side navigation, Back and Forward and the switch, with no errors", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await arriveWithTheme(page, "violet");
  await page.goto("/");
  await whenSwitchIsLive(page);
  const only = async (color: string, step: string) =>
    expect.poll(() => themeColorTags(page), { message: step }).toEqual([color]);
  await only("#07070c", "hard load");
  for (const [name, url] of [
    ["Projects", /\/projects$/],
    ["roboPet", /\/projects\/robopet$/],
    ["Home", /\/$/],
  ] as const) {
    await mainNav(page).getByRole("link", { name, exact: true }).click();
    await expect(page).toHaveURL(url);
    await only("#07070c", `after ${name}`);
  }
  await page.goBack();
  await only("#07070c", "Back");
  await page.goForward();
  await only("#07070c", "Forward");
  const group = page.getByRole("group", { name: "Theme" }).first();
  await group.getByRole("button", { name: "B&W", exact: true }).click();
  await only("#000000", "switched to B&W");
  await group.getByRole("button", { name: "Violet", exact: true }).click();
  await only("#07070c", "switched to Violet");
  expect(errors).toEqual([]);
});

// The strip scrolls sideways where the tabs do not all fit, and fades its ends and puts a button
// over each. A tab that took focus could land under the fade or the button, or half off the edge.
for (const [width, height] of [
  [1100, 800],
  [820, 800],
  [390, 844],
] as const) {
  test(`at ${width}px a focused sub-tab is scrolled clear of the edge fades`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto(`/projects/${PROJECTS[2].slug}`);
    const links = subTabs(page).getByRole("link");
    const count = await links.count();
    expect(count).toBe(PROJECTS.length + 1);
    for (let i = 0; i < count; i++) {
      await links.nth(i).focus();
      // Judged once the strip has stopped moving: the browser's own scroll to a focused link and
      // the one that follows it a frame later are both over.
      await page.evaluate(
        () =>
          new Promise<void>((resolve) => {
            const strip = document.querySelector(".ptabs-scroll")!;
            let last = -1;
            let still = 0;
            const tick = () => {
              still = strip.scrollLeft === last ? still + 1 : 0;
              last = strip.scrollLeft;
              if (still >= 6) resolve();
              else requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          }),
      );
      await expect
        .poll(
          () =>
            page.evaluate(() => {
              const tab = document.activeElement!.getBoundingClientRect();
              const nav = document.querySelector(".ptabs")!;
              const strip = nav.querySelector(".ptabs-scroll")!.getBoundingClientRect();
              // 56px of fade, and 36px of chevron button where there is a mouse.
              const edge = 56 + (matchMedia("(hover: hover) and (pointer: fine)").matches ? 36 : 0);
              const hiddenStart =
                nav.hasAttribute("data-more-start") ? Math.max(0, strip.left + edge - tab.left) : Math.max(0, strip.left - tab.left);
              const hiddenEnd =
                nav.hasAttribute("data-more-end") ? Math.max(0, tab.right - (strip.right - edge)) : Math.max(0, tab.right - strip.right);
              return Math.round(hiddenStart + hiddenEnd);
            }),
          { message: `tab ${i} of the strip at ${width}px`, timeout: 4000 },
        )
        .toBeLessThanOrEqual(1);
    }
  });
}
