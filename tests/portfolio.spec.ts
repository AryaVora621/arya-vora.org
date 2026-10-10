import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { FILM_FRAMES } from "../src/components/robopet/filmFrames";
import { teaserFor } from "../src/components/home/teasers";
import { PROJECTS } from "../src/data/projects";
import {
  AXE_TAGS,
  THEME_KEY,
  ambiguousLinks,
  arriveWithTheme,
  collectErrors,
  controlsOffScreen,
  drawsLive,
  huedColors,
  noHorizontalOverflow,
  scrollIsStill,
  scrollThrough,
  sectionPosition,
  tabKey,
  themeColorTags,
  whenSwitchIsLive,
} from "./helpers";

// The home page: the highlights. Reaper, the roboPet film and parts, a preview of every other
// project, then About and Contact. The depth is on /projects (projects.spec.ts), and the theme
// switch, which every page shares, is tested here on the home page.

// Page order from the v9 contract, top to bottom.
const SECTION_ORDER = ["top", "ftc", "robopet", "exploded", "projects", "about", "contact"];

// Reaper and roboPet have sections of their own on the home page, so the preview grid holds
// every other project.
const FEATURED = new Set(["reaper", "robopet"]);
const PREVIEWED = PROJECTS.filter((project) => !FEATURED.has(project.slug));

// The header links on the home page. About and Contact are places on this page; the rest are
// routes.
const NAV = [
  ["Home", "#top"],
  ["Projects", "/projects"],
  ["roboPet", "/projects/robopet"],
  ["About", "#about"],
  ["Contact", "#contact"],
  ["Games", "https://games.arya-vora.org"],
] as const;

test("home renders in contract order without errors, duplicate IDs, or overflow", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Arya Vora");

  const order = await page.evaluate(
    (ids) =>
      ids.map((id) => {
        const element = document.getElementById(id);
        return element ? element.getBoundingClientRect().top + scrollY : null;
      }),
    SECTION_ORDER,
  );
  expect(order.every((top) => top !== null)).toBe(true);
  for (let i = 1; i < order.length; i++) {
    expect(order[i]!).toBeGreaterThan(order[i - 1]!);
  }

  const nav = page.getByRole("navigation", { name: "Main navigation" });
  for (const [label, href] of NAV) {
    await expect(nav.getByRole("link", { name: label, exact: true })).toHaveAttribute(
      "href",
      href,
    );
  }
  // Home is the page you are on; a section of it never is.
  await expect(nav.locator("[aria-current]")).toHaveCount(1);
  await expect(nav.getByRole("link", { name: "Home", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );

  for (const id of ["ftc", "projects", "about", "contact"]) {
    await page.locator(`#${id}`).scrollIntoViewIfNeeded();
    await expect(page.locator(`#${id} h2`).first()).toBeVisible();
  }
  expect(await noHorizontalOverflow(page)).toBe(true);
  const duplicates = await page
    .locator("[id]")
    .evaluateAll((elements) =>
      elements.map((e) => e.id).filter((id, i, all) => all.indexOf(id) !== i),
    );
  expect(duplicates).toEqual([]);
  expect(errors).toEqual([]);
});

test("the home page features Reaper and roboPet, each with a way to its full page", async ({
  page,
}) => {
  await page.goto("/");
  const ftc = page.locator("#ftc");
  await expect(ftc.getByRole("heading", { level: 2, name: "Reaper" })).toBeVisible();
  // Three headline results, each dated, from the 2025-26 ledger.
  const results = ftc.getByRole("list", { name: "Results with Reaper" }).getByRole("listitem");
  await expect(results).toHaveCount(3);
  await expect(results.first()).toContainText("FIRST Championship");
  await expect(results.first()).toContainText("5-5");
  for (const row of await results.all()) {
    await expect(row.locator("time")).toHaveAttribute("datetime", /^\d{4}-\d{2}-\d{2}$/);
  }
  await expect(ftc.getByRole("link", { name: "The full Reaper page" })).toHaveAttribute(
    "href",
    "/projects/reaper",
  );
  // The long section moved to its page: no ledger, no spec rows on the home page.
  await expect(page.locator("table")).toHaveCount(0);
  await expect(page.locator("dl.ftc-specs")).toHaveCount(0);

  // The roboPet film and its parts, then the link on.
  await expect(page.locator("#robopet .film-beat")).toHaveCount(4);
  await expect(page.getByRole("list", { name: "roboPet parts" })).toBeAttached();
  const more = page.getByRole("link", { name: "The full roboPet page" });
  await expect(more).toHaveAttribute("href", "/projects/robopet");
  const [film, exploded, link] = await Promise.all(
    ["#robopet", "#exploded"].map((id) =>
      page.locator(id).evaluate((el) => el.getBoundingClientRect().top + scrollY),
    ).concat(more.evaluate((el) => el.getBoundingClientRect().top + scrollY)),
  );
  expect(film).toBeLessThan(exploded);
  expect(exploded).toBeLessThan(link);
});

test("the project previews show every other project as a picture, a title and a line", async ({
  page,
}) => {
  await page.goto("/");
  const section = page.locator("#projects");
  await expect(section.getByRole("heading", { level: 2, name: "Projects" })).toBeVisible();
  const cards = section.locator(".home-card");
  await expect(cards).toHaveCount(PREVIEWED.length);
  for (const [i, project] of PREVIEWED.entries()) {
    const card = cards.nth(i);
    // One link per card, named by the title, to the project's own page.
    const links = card.getByRole("link");
    await expect(links).toHaveCount(1);
    await expect(links).toHaveAccessibleName(project.title);
    await expect(links).toHaveAttribute("href", `/projects/${project.slug}`);
    await expect(card.locator(".home-card-title")).toHaveText(project.title);
    await expect(card.locator(".home-card-teaser")).toHaveText(teaserFor(project));
    // The picture is a preview: it loads, and it takes the violet duotone like every other
    // showcase image. The title says what it is, so it carries no alt text of its own.
    const image = card.locator("img").first();
    await image.scrollIntoViewIfNeeded();
    await expect(image).toHaveAttribute("src", project.cover.src);
    await expect(image).toHaveClass(/theme-tint/);
    await expect(image).toHaveAttribute("alt", "");
    await expect
      .poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth))
      .toBeGreaterThan(0);
  }
  await expect(
    section.getByRole("link", { name: `All ${PROJECTS.length} projects` }),
  ).toHaveAttribute("href", "/projects");
});

test("every link out of the home page opens a page that exists", async ({ page, request }) => {
  await page.goto("/");
  const hrefs = await page
    .locator('main a[href^="/"], header a[href^="/"], footer a[href^="/"]')
    .evaluateAll((links) => [...new Set(links.map((link) => link.getAttribute("href")!))]);
  expect(hrefs).toEqual(expect.arrayContaining(PREVIEWED.map((p) => `/projects/${p.slug}`)));
  for (const href of hrefs) {
    const response = await request.get(href.split("#")[0]);
    expect(response.status(), href).toBe(200);
  }
  // Each project page is the project the card named.
  for (const project of PREVIEWED) {
    const html = await (await request.get(`/projects/${project.slug}`)).text();
    expect(html, project.slug).toContain(`<title>${project.title} | Arya Vora</title>`);
  }
});

test("a preview card opens its page in place, and Back returns to a working home page", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto("/");
  const first = PREVIEWED[0];
  const card = page.locator("#projects").getByRole("link", { name: first.title, exact: true });
  await card.scrollIntoViewIfNeeded();
  await scrollIsStill(page);
  await card.click();
  await expect(page).toHaveURL(new RegExp(`/projects/${first.slug}$`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(first.title);
  await expect(
    page.getByRole("navigation", { name: "Projects", exact: true }).locator('[aria-current="page"]'),
  ).toHaveText(first.tab);
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Arya Vora");
  await expect(page.locator("#robopet")).toHaveAttribute("data-mode", /scrub|static/);
  expect(errors).toEqual([]);
});

test("the page has no hue anywhere: every computed color is a grey", async ({ page }) => {
  for (const path of ["/", "/projects", "/projects/reaper"]) {
    await page.goto(path);
    await scrollThrough(page);
    expect(await huedColors(page), path).toEqual([]);
  }

  // Spot-check the elements a palette regression would hit first, so a failure names them.
  await page.goto("/");
  const key = await page.evaluate(() =>
    [
      "body",
      "h1",
      ".nav-links a",
      "#ftc h2",
      ".home-reaper-results time",
      ".home-card-title",
      ".secondary-button",
      ".email-address",
    ].map((selector) => {
      const element = document.querySelector(selector);
      if (!element) return `${selector} missing`;
      const style = getComputedStyle(element);
      return `${selector} ${style.color} ${style.backgroundColor}`;
    }),
  );
  for (const line of key) {
    expect(line).not.toContain("missing");
    for (const color of line.match(/rgba?\([^)]+\)/g) ?? []) {
      const [r, g, b] = color.match(/[\d.]+/g)!.map(Number);
      expect(Math.max(r, g, b) - Math.min(r, g, b), line).toBeLessThanOrEqual(2);
    }
  }
});

test("links with the same accessible name go to the same place", async ({ page }) => {
  await page.goto("/");
  const { count, ambiguous } = await ambiguousLinks(page);
  expect(count).toBeGreaterThan(25);
  expect(ambiguous).toEqual([]);
});

test("contact copies the address and explains a blocked copy", async ({
  page,
  context,
  browserName,
}) => {
  // Only Chromium lets a test grant clipboard permissions or read the clipboard back. WebKit and
  // Firefox still run the click, so the button, its status line and the blocked path are checked
  // there; the clipboard contents are checked in Chromium.
  const canRead = browserName === "chromium";
  if (canRead) await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  const contact = page.locator("#contact");
  await expect(
    contact.getByRole("link", { name: "aryavora621@gmail.com" }),
  ).toHaveAttribute("href", "mailto:aryavora621@gmail.com");
  await contact.getByRole("button", { name: "Copy address", exact: true }).click();
  await expect(contact.getByText("Copied to your clipboard.")).toBeVisible();
  if (canRead) {
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      "aryavora621@gmail.com",
    );
  }
  await page.evaluate(() => {
    Object.defineProperty(navigator.clipboard, "writeText", {
      value: () => Promise.reject(new Error("denied")),
    });
  });
  await contact.getByRole("button", { name: "Copied", exact: true }).click();
  await expect(contact.getByText(/Your browser blocked the copy/)).toBeVisible();
  await expect(contact.locator("form")).toHaveCount(0);
  await expect(contact.getByRole("link", { name: /Instagram/ })).toHaveAttribute(
    "href",
    "https://www.instagram.com/aryavora621/",
  );
  await expect(contact.getByRole("link", { name: /^X\b/ })).toHaveAttribute(
    "href",
    "https://x.com/aryavora621",
  );
  await expect(contact.getByRole("link", { name: /Hugging Face/ })).toHaveCount(0);
});

test("reduced motion runs no animations and puts the scenes in their static layouts", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".hero-art .hero-robot-stage")).toBeVisible();
  await scrollThrough(page, 900);
  expect(
    await page.evaluate(
      () => document.getAnimations().filter((a) => a.playState === "running").length,
    ),
  ).toBe(0);
  // Scroll-driven scenes fall back to their static layouts.
  await expect(page.locator("#robopet")).toHaveAttribute("data-mode", "static");
  await expect(page.locator("#exploded")).toHaveAttribute("data-mode", "static");
  expect(
    await page.locator(".hero-art").evaluate((element) => getComputedStyle(element).transform),
  ).toBe("none");
  // The preview cards hold still too.
  for (const item of await page.locator("#projects .home-projects-item").all()) {
    expect(await item.evaluate((element) => getComputedStyle(element).transform)).toBe("none");
  }
});

test("hero art drifts on scroll and stops under reduced motion", async ({ page }) => {
  await page.goto("/");
  const art = page.locator(".hero-art");
  await page.evaluate(() => window.scrollTo({ top: 600, behavior: "instant" }));
  await expect
    .poll(() => art.evaluate((element) => getComputedStyle(element).transform))
    .not.toBe("none");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect
    .poll(() => art.evaluate((element) => getComputedStyle(element).transform))
    .toBe("none");
});

test("at 320px wide nothing scrolls sideways and every control stays on screen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  await scrollThrough(page, 700);
  expect(await noHorizontalOverflow(page)).toBe(true);
  expect(await controlsOffScreen(page)).toEqual([]);
  // The theme switch shares the first row with the wordmark, and switching it moves nothing.
  const theme = page.getByRole("navigation", { name: "Main navigation" }).getByRole("group", {
    name: "Theme",
  });
  await expect(theme.getByRole("button")).toHaveCount(2);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await theme.getByRole("button", { name: "Violet", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "violet");
  expect(await noHorizontalOverflow(page)).toBe(true);
  expect(await controlsOffScreen(page)).toEqual([]);
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Contact", exact: true })
    .click();
  await expect(page).toHaveURL(/#contact$/);
});

// WCAG 2.4.3: Tab has to follow what is on screen. The header lays out as wordmark, theme
// switch, links on one row and, once it wraps, as wordmark and switch over the links, so the
// markup order has to be the same in both. This walks Tab through the header at wide, tablet
// and phone widths and checks it against the reading order of the boxes (rows top to bottom,
// left to right within a row).
for (const width of [1280, 881, 880, 600, 390, 320]) {
  test(`Tab walks the header in the order it is drawn at ${width}px`, async ({
    page,
    browserName,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Main navigation" });
    const controls = nav.locator("a, button");
    const count = await controls.count();
    // Wordmark, B&W, Violet, and the six links.
    expect(count).toBe(3 + NAV.length);

    await nav.locator(".wordmark").focus();
    const walked: { name: string; x: number; y: number }[] = [];
    for (let i = 0; i < count; i++) {
      walked.push(
        await page.evaluate(() => {
          const el = document.activeElement as HTMLElement;
          const box = el.getBoundingClientRect();
          return {
            name: (el.textContent ?? "").trim(),
            x: box.left,
            y: box.top + box.height / 2,
          };
        }),
      );
      await page.keyboard.press(tabKey(browserName));
    }

    // Boxes whose centers sit within half a line of each other share a row.
    const drawn = [...walked].sort((a, b) => (Math.abs(a.y - b.y) > 12 ? a.y - b.y : a.x - b.x));
    expect(walked.map((w) => w.name)).toEqual(drawn.map((w) => w.name));
    expect(walked.map((w) => w.name).slice(0, 3)).toEqual(["Arya Vora", "B&W", "Violet"]);
    expect(walked[walked.length - 1].name).toBe("Games");
    expect(await noHorizontalOverflow(page)).toBe(true);
  });
}

// On a phone the six header links share one row from 340px up (below that, two rows of three,
// never "Games" alone), each is a 44px touch target whose area meets its neighbours' without
// overlapping, and the footer's short "Top" is 44px wide too.
for (const width of [320, 340, 375, 390]) {
  test(`header links at ${width}px: one row from 340px, and 44px touch targets`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    const links = page.getByRole("navigation", { name: "Main navigation" }).locator(".nav-links a");
    await expect(links).toHaveCount(NAV.length);
    const boxes = await links.evaluateAll((elements) =>
      elements.map((element) => {
        const box = element.getBoundingClientRect();
        return { top: Math.round(box.top), left: box.left, right: box.right, width: box.width, height: box.height };
      }),
    );
    // The rule is about the width the page has, not the window's: desktop WebKit keeps a 10px
    // classic scrollbar inside the window, so a 340px window gives the page 330px, the media query
    // sees 330px, and six 44px targets could not share a row there anyway.
    const available = await page.evaluate(() => document.documentElement.clientWidth);
    expect(new Set(boxes.map((box) => box.top)).size).toBe(available < 340 ? 2 : 1);
    for (const [i, box] of boxes.entries()) {
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
      const next = boxes[i + 1];
      if (next && next.top === box.top) expect(next.left).toBeGreaterThanOrEqual(box.right - 0.5);
    }
    const top = page
      .getByRole("navigation", { name: "Footer navigation" })
      .getByRole("link", { name: "Top", exact: true });
    expect((await top.boundingBox())!.width).toBeGreaterThanOrEqual(44);
  });
}

test("no preview card title breaks inside a word on the narrowest phones", async ({ page }) => {
  for (const width of [320, 340, 360]) {
    await page.setViewportSize({ width, height: 740 });
    await page.goto("/");
    // A title whose neighbouring letters land on different lines has broken mid-word.
    const broken = await page.locator("#projects .home-card-link").evaluateAll((links) =>
      links
        .filter((link) => {
          const text = link.firstChild;
          if (!text || text.nodeType !== Node.TEXT_NODE) return false;
          const tops: number[] = [];
          for (let i = 0; i < (text as Text).length; i++) {
            const range = document.createRange();
            range.setStart(text, i);
            range.setEnd(text, i + 1);
            tops.push(Math.round(range.getBoundingClientRect().top));
          }
          const chars = (text as Text).data;
          return [...chars].some((c, i) => i > 0 && /\S/.test(c) && /\S/.test(chars[i - 1]) && tops[i] !== tops[i - 1]);
        })
        .map((link) => link.textContent),
    );
    expect(broken, `at ${width}px`).toEqual([]);
  }
});

test("links in About to other sites open in a new tab", async ({ page }) => {
  await page.goto("/");
  const external = page.locator('#about a[href^="http"]');
  expect(await external.count()).toBeGreaterThan(0);
  for (const link of await external.all()) {
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", /noopener/);
  }
});

test("About and Contact in the nav scroll to their sections, past the pinned film and exploded view", async ({
  page,
}) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  for (const [label, id] of [
    ["About", "about"],
    ["Contact", "contact"],
  ] as const) {
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await nav.getByRole("link", { name: label, exact: true }).click();
    // Contact is the last section, so the page can end before it reaches the top.
    const landed = async () => {
      const { top, atEnd, viewport } = await sectionPosition(page, id);
      return top >= -2 && (atEnd ? top < viewport : top <= 40);
    };
    await expect.poll(landed, { timeout: 20000 }).toBe(true);
  }
});

// The server HTML has the short static layout, so the browser scrolls a fragment link there.
// After hydration the film (480vh) and the exploded view (260vh) switch to their scroll-driven
// heights and the page grows by thousands of pixels. The target has to follow.
for (const id of ["ftc", "robopet", "projects", "about", "contact"]) {
  test(`opening /#${id} lands on that section once the page has hydrated`, async ({ page }) => {
    await page.goto(`/#${id}`);
    // Without this the test would pass on the short layout it is meant to catch.
    await expect(page.locator("#robopet")).toHaveAttribute("data-mode", "scrub");
    await page.waitForTimeout(3000);
    const { top, atEnd, viewport } = await sectionPosition(page, id);
    expect(top).toBeGreaterThanOrEqual(-2);
    // The last section cannot reach the top when the page ends first.
    if (atEnd) expect(top).toBeLessThan(viewport);
    else expect(top).toBeLessThan(100);
  });
}

test("a deep link still lands with reduced motion, where the layout does not change", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#projects");
  await expect(page.locator("#robopet")).toHaveAttribute("data-mode", "static");
  await page.waitForTimeout(1500);
  const { top } = await sectionPosition(page, "projects");
  expect(top).toBeGreaterThanOrEqual(-2);
  expect(top).toBeLessThan(100);
});

test("scrolling right after a deep link opens is not pulled back to the target", async ({
  page,
  browserName,
  isMobile,
}) => {
  await page.goto("/#about");
  await expect(page.locator("#robopet")).toHaveAttribute("data-mode", "scrub");
  if (browserName === "webkit" && isMobile) {
    // Mobile WebKit has no mouse wheel. A key press is also a hand-over of the scroll to the
    // visitor, so two page-ups stand in for the wheel there.
    await page.keyboard.press("PageUp");
    await page.keyboard.press("PageUp");
  } else {
    await page.mouse.move(100, 300);
    await page.mouse.wheel(0, -1200);
  }
  await page.waitForTimeout(1500);
  const settled = await page.evaluate(() => Math.round(scrollY));
  await page.waitForTimeout(3000);
  expect(Math.abs((await page.evaluate(() => scrollY)) - settled)).toBeLessThanOrEqual(2);
  // The wheel moved the page up from the target, so the target sits below its anchored spot.
  expect((await sectionPosition(page, "about")).top).toBeGreaterThan(400);
});

test("metadata, social card, icons, sitemap, and internal link targets resolve", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Arya Vora");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    /class of 2028/,
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://www.arya-vora.org",
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    "https://www.arya-vora.org/portfolio-og.png",
  );
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#000000");
  const card = await request.get("/portfolio-og.png");
  expect(card.status()).toBe(200);
  expect(card.headers()["content-type"]).toContain("image/png");
  expect((await card.body()).length).toBeGreaterThan(10000);
  for (const href of await page
    .locator('link[rel="icon"], link[rel="apple-touch-icon"]')
    .evaluateAll((links) => links.map((link) => link.getAttribute("href")!))) {
    expect((await request.get(href)).status()).toBe(200);
  }
  const brokenAnchors = await page
    .locator('a[href^="#"]')
    .evaluateAll((links) =>
      links
        .map((link) => link.getAttribute("href")!)
        .filter((hash) => !document.getElementById(hash.slice(1))),
    );
  expect(brokenAnchors).toEqual([]);

  // The sitemap lists the home page, the projects index and every project page, and nothing
  // that is not a page.
  const sitemap = await (await request.get("/sitemap.xml")).text();
  const listed = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  expect(listed).toEqual([
    "https://www.arya-vora.org/",
    "https://www.arya-vora.org/projects",
    ...PROJECTS.map((project) => `https://www.arya-vora.org/projects/${project.slug}`),
  ]);
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Sitemap: https://www.arya-vora.org/sitemap.xml");
});

for (const [theme, label] of [
  ["mono", "B&W"],
  ["violet", "Violet"],
] as const) {
  test(`axe finds no accessibility violations on the home page in the ${label} theme`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await arriveWithTheme(page, theme);
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await scrollThrough(page, 900);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
    expect(
      results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`),
    ).toEqual([]);
  });
}

test("the theme starts in B&W, switches to Violet in place, and a reload keeps it from the first paint", async ({
  page,
  browserName,
}) => {
  // Record data-theme the moment <body> exists, before anything can be painted, so a reload
  // that showed the default for a frame and then switched would be caught.
  await page.addInitScript(() => {
    const w = window as unknown as { __firstTheme?: string | null };
    const record = () => {
      if (w.__firstTheme === undefined && document.body) {
        w.__firstTheme = document.documentElement.getAttribute("data-theme");
      }
    };
    new MutationObserver(record).observe(document, { childList: true, subtree: true });
  });
  const firstTheme = () =>
    page.evaluate(() => (window as unknown as { __firstTheme?: string | null }).__firstTheme);
  const stored = () => page.evaluate((key) => localStorage.getItem(key), THEME_KEY);
  const surface = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const html = page.locator("html");

  await page.goto("/");
  const group = page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("group", { name: "Theme" });
  const mono = group.getByRole("button", { name: "B&W", exact: true });
  const violet = group.getByRole("button", { name: "Violet", exact: true });
  await expect(html).toHaveAttribute("data-theme", "mono");
  expect(await firstTheme()).toBe("mono");
  await expect(mono).toHaveAttribute("aria-pressed", "true");
  await expect(violet).toHaveAttribute("aria-pressed", "false");
  expect(await stored()).toBeNull();
  expect(await surface()).toBe("rgb(0, 0, 0)");

  // The keyboard reaches both options, and Enter switches.
  await mono.focus();
  await page.keyboard.press(tabKey(browserName));
  await expect(violet).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(html).toHaveAttribute("data-theme", "violet");
  await expect(violet).toHaveAttribute("aria-pressed", "true");
  await expect(mono).toHaveAttribute("aria-pressed", "false");
  expect(await stored()).toBe("violet");
  // Everything recolors without a reload: the surface, the toolbar color and the showcase
  // images, which take the violet duotone.
  await expect.poll(surface).toBe("rgb(7, 7, 12)");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#07070c");
  const preview = page.locator("#projects img.theme-tint").first();
  expect(await preview.evaluate((img) => getComputedStyle(img).filter)).toContain(
    "av-duotone-violet",
  );

  await page.reload();
  expect(await firstTheme()).toBe("violet");
  await expect(html).toHaveAttribute("data-theme", "violet");
  await expect(violet).toHaveAttribute("aria-pressed", "true");
  await expect.poll(surface).toBe("rgb(7, 7, 12)");

  // Space switches back, and B&W is kept the same way.
  await mono.focus();
  await page.keyboard.press("Space");
  await expect(html).toHaveAttribute("data-theme", "mono");
  expect(await stored()).toBe("mono");
  await page.reload();
  expect(await firstTheme()).toBe("mono");
  await expect(mono).toHaveAttribute("aria-pressed", "true");
  await expect.poll(surface).toBe("rgb(0, 0, 0)");
  expect(
    await page.locator("img.theme-tint").first().evaluate((img) => getComputedStyle(img).filter),
  ).toBe("none");
});

test("every showcase image takes the theme tint", async ({ page }) => {
  await page.goto("/");
  const untinted = await page
    .locator("#projects img, .film-photo img")
    .evaluateAll((images) =>
      images.filter((img) => !img.classList.contains("theme-tint")).map((img) => img.getAttribute("src")),
    );
  expect(untinted).toEqual([]);
  expect(await page.locator("img.theme-tint").count()).toBeGreaterThanOrEqual(PREVIEWED.length);
});

// ---------------------------------------------------------------------------------------
// The theme switch under the conditions that break it in the field: JavaScript still
// downloading, storage blocked, reduced motion, and a second tab. The inline script in <head>
// (THEME_INIT_SCRIPT in src/lib/theme.ts) is the riskiest code here, because it answers clicks
// before React exists and then has to get out of the way.
// ---------------------------------------------------------------------------------------

const themeButtons = (page: Page) => {
  const group = page.getByRole("navigation", { name: "Main navigation" }).getByRole("group", {
    name: "Theme",
  });
  return {
    mono: group.getByRole("button", { name: "B&W", exact: true }),
    violet: group.getByRole("button", { name: "Violet", exact: true }),
  };
};

// The meta element browsers read the toolbar color from. There is exactly one theme-color tag, at
// every moment after the page loads. (React cannot hydrate the server's tag once the inline script
// has recolored it, so it adds its own; syncThemeColorMeta in src/lib/theme.ts takes the server's
// out and recolors React's the moment it lands. A browser that read the last tag, or the first
// after a change of head order, would otherwise show a black toolbar in Violet.)
const toolbarColor = (page: Page) => page.locator('meta[name="theme-color"]').first();

// React puts __reactProps$ on a DOM node when it hydrates it, so this is true once the nav is
// live. Two frames more lets the layout effect that releases the inline click handler run.
async function whenHydrated(page: Page) {
  const { violet } = themeButtons(page);
  // Hydrating the page is seconds of script on a machine that is busy running the other tests,
  // and two tabs open at once, so the wait is longer than the default.
  await expect
    .poll(() => violet.evaluate((el) => Object.keys(el).some((key) => key.startsWith("__reactProps"))), {
      timeout: 20000,
    })
    .toBe(true);
  await page.evaluate(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))),
  );
}

async function isHydrated(page: Page) {
  return themeButtons(page).violet.evaluate((el) =>
    Object.keys(el).some((key) => key.startsWith("__reactProps")),
  );
}

// Holds back every script chunk, so the page stays server HTML plus the inline script until
// release() is called. Always release in a finally block, or the held requests outlive the test.
async function holdScripts(page: Page) {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  await page.route(/\/_next\/static\/.*\.js/, async (route) => {
    await gate;
    await route.continue();
  });
  return release;
}

test("the theme switch works, and reports the right state, before the page hydrates", async ({ page }) => {
  // The option of every switch button whose aria-pressed disagrees with data-theme on <html>.
  const switchesOutOfStep = () =>
    page.evaluate(() => {
      const current = document.documentElement.getAttribute("data-theme");
      return [...document.querySelectorAll("[data-theme-option]")]
        .filter(
          (button) =>
            (button.getAttribute("aria-pressed") === "true") !==
            (button.getAttribute("data-theme-option") === current),
        )
        .map((button) => button.getAttribute("data-theme-option"));
    });
  await arriveWithTheme(page, "violet");
  const release = await holdScripts(page);
  try {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const { mono, violet } = themeButtons(page);
    const html = page.locator("html");
    // The gate worked: React has not touched the nav, so only the inline script is in play.
    expect(await isHydrated(page)).toBe(false);
    await expect(html).toHaveAttribute("data-theme", "violet");
    await expect(violet).toHaveAttribute("aria-pressed", "true");
    await expect(mono).toHaveAttribute("aria-pressed", "false");
    await expect(toolbarColor(page)).toHaveAttribute("content", "#07070c");

    await mono.click();
    await expect(html).toHaveAttribute("data-theme", "mono");
    await expect(mono).toHaveAttribute("aria-pressed", "true");
    await expect(violet).toHaveAttribute("aria-pressed", "false");
    await expect(toolbarColor(page)).toHaveAttribute("content", "#000000");
    expect(await page.evaluate((key) => localStorage.getItem(key), THEME_KEY)).toBe("mono");
    expect(await isHydrated(page)).toBe(false);

    // Every copy of the switch on the page (header, and the footer or games header where there
    // is one) answers and reports the same state. The last Violet button is the farthest one.
    expect(await switchesOutOfStep()).toEqual([]);
    await page.locator('[data-theme-option="violet"]').last().click();
    await expect(html).toHaveAttribute("data-theme", "violet");
    expect(await switchesOutOfStep()).toEqual([]);
    await mono.click();
    await expect(html).toHaveAttribute("data-theme", "mono");
    expect(await switchesOutOfStep()).toEqual([]);

    release();
    await whenHydrated(page);
    // The hand-over keeps what the visitor chose, and React's handler works from here.
    await expect(html).toHaveAttribute("data-theme", "mono");
    await expect(mono).toHaveAttribute("aria-pressed", "true");
    await violet.click();
    await expect(html).toHaveAttribute("data-theme", "violet");
    await expect(violet).toHaveAttribute("aria-pressed", "true");
    await expect(mono).toHaveAttribute("aria-pressed", "false");
    expect(await page.evaluate((key) => localStorage.getItem(key), THEME_KEY)).toBe("violet");
  } finally {
    release();
  }
});

test("a returning Violet visitor keeps the toolbar color in step with the switch after hydration", async ({
  page,
}) => {
  await arriveWithTheme(page, "violet");
  await page.goto("/");
  await whenHydrated(page);
  const { mono, violet } = themeButtons(page);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "violet");
  await expect(violet).toHaveAttribute("aria-pressed", "true");
  await expect(toolbarColor(page)).toHaveAttribute("content", "#07070c");
  await mono.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "mono");
  await expect(toolbarColor(page)).toHaveAttribute("content", "#000000");
  await violet.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "violet");
  await expect(toolbarColor(page)).toHaveAttribute("content", "#07070c");
  // One tag, not two: a Violet arrival used to keep the server's tag (recolored) and React's
  // (#000000) side by side.
  await expect(page.locator('meta[name="theme-color"]')).toHaveCount(1);
  expect(await themeColorTags(page)).toEqual(["#07070c"]);
});

// The same on the other routes a visitor can arrive on (the projects index and a project page share
// a layout with the home page but not its tree; /games has its own header), on a hard load, once
// the page is hydrated and again a moment later, and as the switch is used.
for (const path of ["/", "/projects", "/projects/tally", "/games"]) {
  test(`a hard load of ${path} in Violet has one theme-color tag, #07070c, that follows the switch`, async ({
    page,
  }) => {
    const errors = collectErrors(page);
    await arriveWithTheme(page, "violet");
    await page.goto(path);
    await whenSwitchIsLive(page);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "violet");
    await expect.poll(() => themeColorTags(page)).toEqual(["#07070c"]);
    // It stays one: a second tag that arrives late (a streamed boundary, a slow chunk) is caught too.
    await page.waitForTimeout(1500);
    expect(await themeColorTags(page)).toEqual(["#07070c"]);

    const group = page.getByRole("group", { name: "Theme" }).first();
    await group.getByRole("button", { name: "B&W", exact: true }).click();
    await expect.poll(() => themeColorTags(page)).toEqual(["#000000"]);
    await group.getByRole("button", { name: "Violet", exact: true }).click();
    await expect.poll(() => themeColorTags(page)).toEqual(["#07070c"]);
    expect(errors).toEqual([]);
  });
}

test("the theme still switches, before and after hydration, when storage is blocked", async ({
  page,
  browserName,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => {
    // The film sits right under the Reaper highlight, so its first pack (or a frame decoded from
    // a blob URL) is often still loading when this test reloads. WebKit reports a same-origin
    // request that a reload cancels as an access-control failure. The page catches the
    // rejection; the reload ended the request, not the page.
    if (browserName === "webkit" && /due to access control checks\.$/.test(error.message)) return;
    errors.push(error.message);
  });
  // The way a private window or a "block all cookies" setting looks to a page: merely reading
  // window.localStorage throws.
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new DOMException("The operation is insecure.", "SecurityError");
      },
    });
  });
  const release = await holdScripts(page);
  try {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const { mono, violet } = themeButtons(page);
    const html = page.locator("html");
    expect(
      await page.evaluate(() => {
        try {
          return typeof window.localStorage;
        } catch {
          return "blocked";
        }
      }),
    ).toBe("blocked");
    expect(await isHydrated(page)).toBe(false);
    await expect(html).toHaveAttribute("data-theme", "mono");
    await expect(mono).toHaveAttribute("aria-pressed", "true");

    // The inline script's click handler, with nowhere to save the choice.
    await violet.click();
    await expect(html).toHaveAttribute("data-theme", "violet");
    await expect(violet).toHaveAttribute("aria-pressed", "true");
    await expect(toolbarColor(page)).toHaveAttribute("content", "#07070c");

    release();
    await whenHydrated(page);
    await expect(html).toHaveAttribute("data-theme", "violet");
    await expect(violet).toHaveAttribute("aria-pressed", "true");

    // React's handler, with nowhere to save the choice.
    await mono.click();
    await expect(html).toHaveAttribute("data-theme", "mono");
    await expect(mono).toHaveAttribute("aria-pressed", "true");
    await expect(toolbarColor(page)).toHaveAttribute("content", "#000000");
    await violet.click();
    await expect(html).toHaveAttribute("data-theme", "violet");

    // Nothing was kept, so a reload starts over on the default, without an error.
    await page.reload();
    await expect(html).toHaveAttribute("data-theme", "mono");
    await expect(mono).toHaveAttribute("aria-pressed", "true");
    expect(errors).toEqual([]);
  } finally {
    release();
  }
});

// Counts calls to document.startViewTransition and writes of the theme key, and calls through
// to the browser's own startViewTransition where there is one. A stand-in runs the update
// callback in engines without it, so the count means the same in every project.
async function spyOnThemeSwitch(page: Page) {
  await page.addInitScript(
    (key) => {
      const w = window as unknown as { __viewTransitions: number; __themeWrites: number };
      w.__viewTransitions = 0;
      w.__themeWrites = 0;
      type Update = (() => unknown) | { update?: () => unknown } | undefined;
      const proto = Document.prototype as unknown as {
        startViewTransition?: (this: Document, update?: Update) => unknown;
      };
      const native = proto.startViewTransition;
      proto.startViewTransition = function (this: Document, update?: Update) {
        w.__viewTransitions++;
        if (native) return native.call(this, update);
        const run = typeof update === "function" ? update : update?.update;
        const finished = Promise.resolve().then(() => run?.());
        return { finished, ready: finished, updateCallbackDone: finished, skipTransition() {} };
      };
      const setItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function (this: Storage, name: string, value: string) {
        if (name === key) w.__themeWrites++;
        return setItem.call(this, name, value);
      };
    },
    THEME_KEY,
  );
  return () =>
    page.evaluate(() => {
      const w = window as unknown as { __viewTransitions: number; __themeWrites: number };
      return { transitions: w.__viewTransitions, writes: w.__themeWrites };
    });
}

test("reduced motion switches the theme with no view transition, and motion cross-fades it", async ({
  page,
}) => {
  const counts = await spyOnThemeSwitch(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await whenHydrated(page);
  const { mono, violet } = themeButtons(page);
  const html = page.locator("html");
  const theme = () => page.evaluate(() => document.documentElement.getAttribute("data-theme"));

  // Reduced motion: the colors swap in the click itself, and the browser is never asked for a
  // cross-fade. Read synchronously after the click, with no waiting that could hide a deferred swap.
  await violet.click();
  expect(await theme()).toBe("violet");
  await mono.click();
  expect(await theme()).toBe("mono");
  expect(await counts()).toEqual({ transitions: 0, writes: 2 });

  // The preference is read at click time, so lifting it mid-session takes effect at once.
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await violet.click();
  await expect(html).toHaveAttribute("data-theme", "violet");
  expect(await counts()).toEqual({ transitions: 1, writes: 3 });
  await mono.click();
  await expect(html).toHaveAttribute("data-theme", "mono");
  // One cross-fade per click, and one saved write per click: if the inline click handler were
  // still installed it would swap the colors before the transition took its snapshot, and
  // write the key a second time.
  expect(await counts()).toEqual({ transitions: 2, writes: 4 });
  await expect(mono).toHaveAttribute("aria-pressed", "true");
});

test("a theme chosen in one tab reaches the other tabs", async ({ context }) => {
  const first = await context.newPage();
  const second = await context.newPage();
  await Promise.all([first.goto("/"), second.goto("/")]);
  await Promise.all([whenHydrated(first), whenHydrated(second)]);
  const a = themeButtons(first);
  const b = themeButtons(second);
  const stored = (p: Page) => p.evaluate((key) => localStorage.getItem(key), THEME_KEY);
  await expect(first.locator("html")).toHaveAttribute("data-theme", "mono");
  await expect(second.locator("html")).toHaveAttribute("data-theme", "mono");

  await a.violet.click();
  await expect(second.locator("html")).toHaveAttribute("data-theme", "violet");
  await expect(b.violet).toHaveAttribute("aria-pressed", "true");
  await expect(b.mono).toHaveAttribute("aria-pressed", "false");
  await expect(toolbarColor(second)).toHaveAttribute("content", "#07070c");
  await expect
    .poll(() => second.evaluate(() => getComputedStyle(document.body).backgroundColor))
    .toBe("rgb(7, 7, 12)");
  // The tab that was told does not write the choice back, so the two cannot echo each other.
  expect(await stored(second)).toBe("violet");

  await b.mono.click();
  await expect(first.locator("html")).toHaveAttribute("data-theme", "mono");
  await expect(a.mono).toHaveAttribute("aria-pressed", "true");
  await expect(toolbarColor(first)).toHaveAttribute("content", "#000000");

  // Clearing the saved choice in one tab returns the other to the default.
  await a.violet.click();
  await expect(second.locator("html")).toHaveAttribute("data-theme", "violet");
  await first.evaluate((key) => localStorage.removeItem(key), THEME_KEY);
  await expect(second.locator("html")).toHaveAttribute("data-theme", "mono");
  await expect(b.mono).toHaveAttribute("aria-pressed", "true");
});

// Reaper on the home page is one 3D dock: the model where the browser has a hardware GPU, and a
// still rendered from the same model everywhere else. The spec rows that pick a part of it are
// on /projects/reaper (projects.spec.ts), and the live turn is in reaper-live.spec.ts.
test("the Reaper model shows in #ftc, live or as its still", async ({ page, request }) => {
  await page.goto("/");
  const ftc = page.locator("#ftc");
  const dock = ftc.locator("[data-reaper-dock]");
  await expect(dock).toHaveCount(1);
  await dock.scrollIntoViewIfNeeded();
  await expect(dock).toHaveAttribute("role", "img");
  await expect(dock).toHaveAttribute("aria-label", /Reaper/);
  const box = await dock.boundingBox();
  expect(box!.width).toBeGreaterThan(150);
  expect(box!.height).toBeGreaterThan(150);
  // The still is always the theme's own, so it can stand in the moment the canvas leaves.
  await expect
    .poll(() =>
      dock.evaluate((element) => {
        const style = getComputedStyle(element.querySelector<HTMLElement>(".reaper-still")!);
        return style.backgroundImage.match(/url\("?([^")]+)"?\)/)?.[1] ?? "";
      }),
    )
    .toMatch(/\/ftc\/reaper-model-mono\.webp$/);
  const live = await dock.evaluate(
    (element) => !!element.querySelector("canvas.reaper-canvas") && element.hasAttribute("data-live"),
  );
  if (!live) {
    expect(
      await dock.evaluate((element) =>
        Number(getComputedStyle(element.querySelector(".reaper-still")!).opacity),
      ),
    ).toBe(1);
  }
  if (!(await drawsLive(page))) {
    // Stills only: nothing claims the robot can be turned.
    await expect(ftc).not.toHaveAttribute("data-reaper-live");
    await expect(ftc.locator(".reaper-hint")).toBeHidden();
  }
  const still = await request.get("/ftc/reaper-model-mono.webp");
  expect(still.status()).toBe(200);
  expect(still.headers()["content-type"]).toContain("image/webp");
  expect((await request.get("/ftc/reaper-model-violet.webp")).status()).toBe(200);
});

// Document y of a point `fraction` of the way through a section's own scroll length.
async function insideSection(page: Page, id: string, fraction: number) {
  return page.evaluate(
    ([id, fraction]) => {
      const section = document.getElementById(id as string)!;
      const top = section.getBoundingClientRect().top + scrollY;
      return Math.round(top + (section.offsetHeight - innerHeight) * (fraction as number));
    },
    [id, fraction] as const,
  );
}

// True when the element is on screen, fully opaque all the way up the tree, and not under
// another element, which is what a keyboard user needs from a focused control.
async function focusedControlIsUsable(page: Page) {
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return { ok: false, why: "focus is on the body" };
    const rect = el.getBoundingClientRect();
    if (rect.bottom <= 0 || rect.top >= innerHeight || rect.right <= 0 || rect.left >= innerWidth) {
      return {
        ok: false,
        why: `${el.textContent?.trim()} is off screen (top ${Math.round(rect.top)}, bottom ${Math.round(rect.bottom)}, scrollY ${Math.round(scrollY)}, viewport ${innerHeight})`,
      };
    }
    let opacity = 1;
    for (let node: Element | null = el; node; node = node.parentElement) {
      opacity *= parseFloat(getComputedStyle(node).opacity);
    }
    if (opacity < 0.9) return { ok: false, why: `${el.textContent?.trim()} has opacity ${opacity}` };
    const x = Math.min(innerWidth - 1, Math.max(0, rect.left + rect.width / 2));
    const y = Math.min(innerHeight - 1, Math.max(0, rect.top + rect.height / 2));
    const top = document.elementFromPoint(x, y);
    if (top && top !== el && !el.contains(top) && !top.contains(el)) {
      return { ok: false, why: `${el.textContent?.trim()} is covered by ${top.className || top.tagName}` };
    }
    return { ok: true, why: "" };
  });
}

test("axe finds no violations in scroll-driven mode, inside the film and the exploded pin", async ({
  page,
}) => {
  await page.goto("/");
  // Default motion: the film pins and scrubs. The reduced-motion pass above never sees it.
  await expect(page.locator("#robopet")).toHaveAttribute("data-mode", "scrub");
  for (const [id, fraction] of [
    ["robopet", 0.4],
    ["robopet", 0.9],
    ["exploded", 0.4],
  ] as const) {
    const y = await insideSection(page, id, fraction);
    await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
    // Let the scrubbed timeline settle, so axe reads finished states rather than a fade.
    await page.waitForTimeout(900);
    const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
    expect(
      results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`),
      `${id} at ${fraction}`,
    ).toEqual([]);
  }
});

// The theme axe tests above run with reduced motion, where nothing pins or fades. This is the
// same check with motion on, in the theme that is not the default, and again after the
// cross-fade to the other one, so a contrast or focus problem that only exists in the animated
// layout, or in the frames after a switch, is caught.
test("axe finds no violations in Violet with motion on, and after the cross-fade back to B&W", async ({
  page,
}) => {
  await arriveWithTheme(page, "violet");
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "violet");
  await expect(page.locator("#robopet")).toHaveAttribute("data-mode", "scrub");
  expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(false);
  const violations = async () =>
    (await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()).violations.map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`,
    );

  const stops = [
    ["top", 0],
    ["robopet", 0.4],
    ["exploded", 0.4],
  ] as const;
  for (const [id, fraction] of stops) {
    const y = await insideSection(page, id, fraction);
    await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
    await page.waitForTimeout(900);
    expect(await violations(), `violet, ${id} at ${fraction}`).toEqual([]);
  }

  // Switch from inside the exploded view, wait out the cross-fade, and check the same place.
  await themeButtons(page).mono.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "mono");
  await page.waitForTimeout(1200);
  expect(await violations(), "B&W after the switch, exploded at 0.4").toEqual([]);
});

test("keyboard focus reaches the film link and then the part buttons, on screen and uncovered", async ({
  page,
  browserName,
}) => {
  // Safari on macOS only tabs to form controls unless Option is held, so WebKit on a Mac needs
  // Alt+Tab to reach a link. That is a setting of the browser, not of the page.
  const TAB = browserName === "webkit" && process.platform === "darwin" ? "Alt+Tab" : "Tab";
  await page.goto("/");
  await expect(page.locator("#robopet")).toHaveAttribute("data-mode", "scrub");
  // Start on the last control before the film, then walk forward the way a visitor would.
  await page.locator("#ftc a").last().focus();
  // Focusing from the top of the page scrolls there smoothly. A visitor presses Tab after it
  // has arrived, not in the same instant.
  await scrollIsStill(page);
  await page.keyboard.press(TAB);
  await expect(page.locator(".film-link")).toBeFocused();
  // The film scrolls its outro into view when the link takes focus; wait for it to land.
  await expect.poll(async () => (await focusedControlIsUsable(page)).why, { timeout: 8000 }).toBe("");
  await expect(page.locator(".film-link")).toHaveAttribute("href", /github\.com\/AryaVora621\/roboPet/);

  const parts = page.getByRole("list", { name: "roboPet parts" }).getByRole("button");
  const count = await parts.count();
  expect(count).toBeGreaterThanOrEqual(6);
  for (let i = 0; i < count; i++) {
    await page.keyboard.press(TAB);
    await expect(parts.nth(i)).toBeFocused();
    await expect.poll(async () => (await focusedControlIsUsable(page)).why, { timeout: 8000 }).toBe("");
  }
});

test("exploded part buttons set aria-pressed and fill the live detail panel", async ({ page }) => {
  await page.goto("/");
  const parts = page.getByRole("list", { name: "roboPet parts" });
  const buttons = parts.getByRole("button");
  const detail = page.locator("#exploded .exploded-detail");
  await expect(detail).toHaveAttribute("aria-live", "polite");
  // The list stays hidden until the page is live, so wait for the first button.
  await expect(buttons.first()).toBeVisible();
  const labels = await buttons.allTextContents();
  expect(labels.length).toBeGreaterThanOrEqual(6);

  for (const label of [labels[0], labels[labels.length - 1]]) {
    const button = parts.getByRole("button", { name: label, exact: true });
    await button.scrollIntoViewIfNeeded();
    await scrollIsStill(page);
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    // Only one part is selected at a time, and the panel names it and says something about it.
    await expect(parts.locator("button[aria-pressed='true']")).toHaveCount(1);
    await expect(detail.getByRole("heading", { level: 3, name: label, exact: true })).toBeVisible();
    expect(((await detail.locator("p").first().textContent()) ?? "").length).toBeGreaterThan(30);
  }

  // The keyboard works the same way, and a second press clears the selection.
  const keyed = parts.getByRole("button", { name: labels[2], exact: true });
  await keyed.focus();
  await page.keyboard.press("Enter");
  await expect(keyed).toHaveAttribute("aria-pressed", "true");
  await expect(detail.getByRole("heading", { level: 3, name: labels[2], exact: true })).toBeVisible();
  await page.keyboard.press("Space");
  await expect(keyed).toHaveAttribute("aria-pressed", "false");
  await expect(detail.getByRole("heading", { level: 3 })).toHaveCount(0);
});

test("turning on reduced motion after load puts the film and exploded view into their static layouts", async ({
  page,
}) => {
  await page.goto("/");
  const film = page.locator("#robopet");
  const exploded = page.locator("#exploded");
  await expect(film).toHaveAttribute("data-mode", "scrub");
  // The scrubbed film draws its frames on a canvas; the static one shows the poster.
  await expect(film.locator("canvas.film-canvas")).toHaveCount(1);
  await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), await insideSection(page, "robopet", 0.4));
  await page.waitForTimeout(500);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(film).toHaveAttribute("data-mode", "static");
  await expect(exploded).toHaveAttribute("data-mode", "static");
  await expect(film.locator("canvas.film-canvas")).toHaveCount(0);
  await expect(film.locator("img.film-poster")).toBeVisible();
  // The four beats are all readable at once, and no heading is left half way through a rise.
  await expect(film.locator(".film-beat")).toHaveCount(4);
  await expect(page.locator(".split-line")).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(() =>
        [...document.querySelectorAll("main h2, main h3, .film-beat, .film-outro, .film-poster")]
          .filter((element) => {
            let opacity = 1;
            for (let node: Element | null = element; node; node = node.parentElement) {
              opacity *= parseFloat(getComputedStyle(node).opacity);
            }
            return opacity < 0.99;
          })
          .map((element) => `${element.tagName.toLowerCase()}.${element.className}`),
      ),
    )
    .toEqual([]);
  expect(
    await page.evaluate(() => document.getAnimations().filter((a) => a.playState === "running").length),
  ).toBe(0);

  // Turning it off again brings the film back without a reload.
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(film).toHaveAttribute("data-mode", "scrub");
  await expect(film.locator("canvas.film-canvas")).toHaveCount(1);
});

test("the hero title is painted once and never split or hidden by a script", async ({ page }) => {
  // The title is the first thing painted. SplitText would hide it and rise it again after
  // hydration, so no split line may ever appear inside it.
  await page.addInitScript(() => {
    (window as unknown as { __split: number }).__split = 0;
    new MutationObserver(() => {
      if (document.querySelector("main h1 .split-line, main h1 [style*='overflow']")) {
        (window as unknown as { __split: number }).__split++;
      }
    }).observe(document, { childList: true, subtree: true });
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Arya Vora");
  // Past the CSS entrance, and well past hydration.
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => (window as unknown as { __split: number }).__split)).toBe(0);
  const title = page.getByRole("heading", { level: 1 });
  expect(await title.evaluate((element) => getComputedStyle(element).opacity)).toBe("1");
  await expect(title.locator(".split-line")).toHaveCount(0);
  // Section headings below the fold still rise from a mask, so the effect is not gone.
  await page.locator("#ftc").scrollIntoViewIfNeeded();
  await expect(page.locator(".split-line").first()).toBeAttached();
});

test("the footer repeats the header links and a way back to the top", async ({ page }) => {
  await page.goto("/");
  const footer = page.getByRole("navigation", { name: "Footer navigation" });
  // On the home page, Home and Top would be the same place, so Home is left out.
  const links = [...NAV.filter(([label]) => label !== "Home"), ["Top", "#top"]] as const;
  await expect(footer.getByRole("link")).toHaveCount(links.length);
  for (const [label, href] of links) {
    await expect(footer.getByRole("link", { name: label, exact: true })).toHaveAttribute("href", href);
  }
  // From the end of the page, a footer link lands on its section like the header does.
  for (const [label, id] of [
    ["About", "about"],
    ["Top", "top"],
  ]) {
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
    await footer.getByRole("link", { name: label, exact: true }).click();
    // Scrolling up from the end passes through the section, so wait for the page to stop on it.
    const landed = () =>
      page.evaluate((id) => {
        const top = document.getElementById(id)!.getBoundingClientRect().top;
        return top >= -2 && top <= 40;
      }, id);
    await expect.poll(landed, { timeout: 20000 }).toBe(true);
    await page.waitForTimeout(600);
    expect(await landed()).toBe(true);
  }
});

test("with JavaScript on, the Copy address button is shown", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.locator("#contact").getByRole("button", { name: "Copy address", exact: true }),
  ).toBeVisible();
});

test("core content and links remain visible without JavaScript, with no dead controls", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Arya Vora");
  await expect(page.locator("#ftc").getByRole("heading", { level: 2, name: "Reaper" })).toBeVisible();
  await expect(page.locator("#robopet .film-beat")).toHaveCount(4);
  await expect(page.locator("#projects .home-card")).toHaveCount(PREVIEWED.length);
  await expect(page.locator("#projects .home-card img").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "The full Reaper page" })).toBeVisible();
  await expect(page.getByRole("link", { name: "The full roboPet page" })).toBeVisible();

  // The Copy address button writes to the clipboard from a script, so without one it would
  // be a button that does nothing. The mailto link above it is the way to write in.
  const contact = page.locator("#contact");
  await expect(contact.getByRole("link", { name: "aryavora621@gmail.com" })).toHaveAttribute(
    "href",
    /^mailto:/,
  );
  await expect(contact.getByRole("button")).toHaveCount(0);
  await expect(contact.locator(".email-actions")).toBeHidden();
  await expect(contact.locator(".copy-feedback")).toBeHidden();
  // No control on the whole page is a button, since every button here needs a script.
  await expect(page.locator("main button:visible")).toHaveCount(0);
  await context.close();
});

test("film packs and images are cached for repeat visits, and the pages and roboPet stills stay short", async ({
  request,
}) => {
  const cache = async (path: string) => (await request.get(path)).headers()["cache-control"] ?? "";
  // The film directory is named by a hash of its contents, so it may be kept forever.
  expect(FILM_FRAMES.base).toMatch(/\/sequence\/robopet\/[0-9a-f]{8}$/);
  const pack = await request.get(`${FILM_FRAMES.base}/lg-0.bin`);
  expect(pack.status()).toBe(200);
  expect(pack.headers()["cache-control"]).toMatch(/max-age=31536000.*immutable/);
  const covers = PROJECTS.map((project) => project.cover.src).filter((src) =>
    /^\/(cad|ftc|projects)\//.test(src),
  );
  for (const path of ["/cad/ender5corexy-topsystem.webp", "/ftc/reaper.webp", ...covers]) {
    const header = await cache(path);
    const maxAge = Number(header.match(/max-age=(\d+)/)?.[1]);
    expect(maxAge, `${path}: ${header}`).toBeGreaterThanOrEqual(86400);
    expect(header).not.toContain("immutable");
  }
  // These two keep their names when regenerated, so they must not be immutable.
  for (const path of ["/robopet/hero-still.webp", "/robopet/exploded-still.webp"]) {
    const header = await cache(path);
    const maxAge = Number(header.match(/max-age=(\d+)/)?.[1]);
    expect(maxAge, `${path}: ${header}`).toBeGreaterThan(0);
    expect(maxAge, `${path}: ${header}`).toBeLessThanOrEqual(86400);
    expect(header).not.toContain("immutable");
  }
  // /projects is a page as well as a folder of images: its HTML must not be kept by the browser
  // for a day, or a deploy would not show up on the next visit.
  for (const path of ["/", "/projects", "/projects/reaper"]) {
    const header = await cache(path);
    expect(header, path).not.toMatch(/(^|[ ,])max-age=[1-9]/);
  }
});
