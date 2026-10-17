import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { PROJECTS } from "../src/data/projects";
import { shareDescription } from "../src/app/projects/project-metadata";
import {
  AXE_TAGS,
  THEMES,
  THEME_KEY,
  ambiguousLinks,
  arriveWithTheme,
  collectErrors,
  controlsOffScreen,
  drawsLive,
  noHorizontalOverflow,
  scrollIsStill,
  scrollThrough,
  sectionPosition,
} from "./helpers";

// The depth of the site: /projects, the index of every project, and /projects/<slug>, one page
// each, under the site nav and a strip of sub-tabs. The data is src/data/projects, so a project
// added there is covered here without a change.

const SITE = "https://www.arya-vora.org";

// The pager's links read "Previous" or "Next" and then the title, in two spans.
const pagerName = (direction: "Previous" | "Next", title: string) =>
  new RegExp(`^${direction}\\s*${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);

const subTabs = (page: Page) => page.getByRole("navigation", { name: "Projects", exact: true });
const mainNav = (page: Page) => page.getByRole("navigation", { name: "Main navigation" });

test("the projects index lists every project, grouped, each card opening its page", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto("/projects");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Projects");
  await expect(page).toHaveTitle("Projects | Arya Vora");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${SITE}/projects`);

  // One card per project, in the order of the data, under its category heading.
  const cards = page.locator("main .pcard");
  await expect(cards).toHaveCount(PROJECTS.length);
  const categories = [...new Set(PROJECTS.map((project) => project.category))];
  await expect(page.locator("main h2")).toHaveText(categories);
  for (const category of categories) {
    const group = page.locator(`#${category.toLowerCase()}`);
    const inGroup = PROJECTS.filter((project) => project.category === category);
    await expect(group.locator(".pcard")).toHaveCount(inGroup.length);
    for (const project of inGroup) {
      const link = group.getByRole("link", { name: project.title, exact: true });
      await expect(link).toHaveAttribute("href", `/projects/${project.slug}`);
    }
  }
  // Every cover loads and follows the theme: the duotone, or a violet twin of its own.
  for (const image of await page.locator("main .pcard img:visible").all()) {
    await image.scrollIntoViewIfNeeded();
    await expect(image).toHaveClass(/theme-tint|theme-twin-mono/);
    await expect
      .poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth))
      .toBeGreaterThan(0);
  }

  // The nav marks Projects as the page you are on, and the sub-tabs mark the index.
  await expect(mainNav(page).getByRole("link", { name: "Projects", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(subTabs(page).locator('[aria-current="page"]')).toHaveText("All projects");
  expect(await noHorizontalOverflow(page)).toBe(true);
  expect(errors).toEqual([]);
});

test("each project page renders its title, metadata and sub-tabs with the current one marked", async ({
  page,
}) => {
  test.setTimeout(180000);
  const errors = collectErrors(page);
  for (const project of PROJECTS) {
    const path = `/projects/${project.slug}`;
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(project.title);
    await expect(page).toHaveTitle(`${project.title} | Arya Vora`);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${SITE}${path}`);
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", `${SITE}${path}`);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      shareDescription(project),
    );

    // The strip holds the index and every project, and marks this one, once.
    const tabs = subTabs(page);
    await expect(tabs.getByRole("link")).toHaveCount(PROJECTS.length + 1);
    const current = tabs.locator('[aria-current="page"]');
    await expect(current).toHaveCount(1);
    await expect(current).toHaveText(project.tab);
    await expect(current).toHaveAttribute("href", path);
    // On first load the current tab is scrolled into the strip, so it is never hidden past
    // its edge on a phone.
    const strip = await tabs.locator(".ptabs-scroll").boundingBox();
    const tab = await current.boundingBox();
    expect(tab!.x, `${project.tab} tab`).toBeGreaterThanOrEqual(strip!.x - 1);
    expect(tab!.x + tab!.width, `${project.tab} tab`).toBeLessThanOrEqual(strip!.x + strip!.width + 1);

    // The site nav says which part of the site this is; roboPet is also its own nav link.
    await expect(mainNav(page).getByRole("link", { name: "Projects", exact: true })).toHaveAttribute(
      "aria-current",
      "true",
    );
    await expect(mainNav(page).locator('[aria-current="page"]')).toHaveCount(
      project.slug === "robopet" ? 1 : 0,
    );
    expect(await noHorizontalOverflow(page), path).toBe(true);
  }
  expect(errors).toEqual([]);
});

test("the sub-tabs and the pager move between projects in place", async ({ page }) => {
  const errors = collectErrors(page);
  const [first, second] = PROJECTS;
  const last = PROJECTS[PROJECTS.length - 1];
  await page.goto(`/projects/${first.slug}`);
  await subTabs(page).getByRole("link", { name: second.tab, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/projects/${second.slug}$`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(second.title);
  await expect(subTabs(page).locator('[aria-current="page"]')).toHaveText(second.tab);

  // Previous and Next follow the order of the tabs and wrap at both ends.
  const pager = page.getByRole("navigation", { name: "More projects" });
  await pager.getByRole("link", { name: pagerName("Previous", first.title) }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(first.title);
  await page.getByRole("navigation", { name: "More projects" })
    .getByRole("link", { name: pagerName("Previous", last.title) })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(last.title);
  await expect(subTabs(page).locator('[aria-current="page"]')).toHaveText(last.tab);
  await page.getByRole("navigation", { name: "More projects" })
    .getByRole("link", { name: pagerName("Next", first.title) })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(first.title);

  // All projects, from the strip, returns to the index.
  await subTabs(page).getByRole("link", { name: "All projects", exact: true }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Projects");
  await expect(subTabs(page).locator('[aria-current="page"]')).toHaveText("All projects");
  expect(errors).toEqual([]);
});

// ---------------------------------------------------------------------------------------
// Where the page is scrolled after a route change. The whole site sets scroll-behavior: smooth,
// and a route change that scrolls with that setting glides: Next 16 no longer switches it off
// for the move (data-scroll-behavior="smooth" on <html> asks it to), and the browser's own
// restoration on Back follows the CSS the same way, so Back would start at the top of the home
// page and glide down through the hero. Waiting for the scroll to be still, as the other tests
// do, hides that, so these tests watch every frame instead.
// ---------------------------------------------------------------------------------------

type Frame = { y: number; title: string };

// From now on, records on every animation frame how far the page is scrolled and which page it
// shows (the text of its h1). The page keeps its document across a next/link navigation, so the
// recorder survives the route change.
async function startRecordingFrames(page: Page) {
  await page.evaluate(() => {
    const frames: Frame[] = [];
    let live = true;
    const tick = () => {
      if (!live) return;
      frames.push({
        y: Math.round(scrollY),
        title: document.querySelector("h1")?.textContent?.trim() ?? "",
      });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    Object.assign(window, { __frames: frames, __stopFrames: () => (live = false) });
  });
}

async function stopRecordingFrames(page: Page) {
  return page.evaluate(() => {
    const recorder = window as unknown as { __frames: Frame[]; __stopFrames: () => void };
    recorder.__stopFrames();
    return recorder.__frames;
  });
}

for (const direction of ["Next", "Previous"] as const) {
  test(`${direction} at the end of a long project page opens that project at its top on the first frame`, async ({
    page,
  }) => {
    const errors = collectErrors(page);
    const index = PROJECTS.findIndex((project) => project.slug === "drone");
    const target =
      PROJECTS[(index + (direction === "Next" ? 1 : -1) + PROJECTS.length) % PROJECTS.length];
    await page.goto(`/projects/${PROJECTS[index].slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(PROJECTS[index].title);

    // The end of the page, with the pager on screen, reached without a glide of its own.
    const link = page
      .getByRole("navigation", { name: "More projects" })
      .getByRole("link", { name: pagerName(direction, target.title) });
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
    await link.evaluate((el) => el.scrollIntoView({ block: "nearest", behavior: "instant" }));
    await expect(link).toBeInViewport();
    const start = await page.evaluate(() => Math.round(scrollY));
    const viewport = await page.evaluate(() => innerHeight);
    // Far enough down that a glide to the top would take many frames.
    expect(start).toBeGreaterThan(viewport);

    await startRecordingFrames(page);
    await link.click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(target.title);
    await scrollIsStill(page);
    const frames = await stopRecordingFrames(page);

    // The first frame that shows the new page is already at its top.
    const arrived = frames.filter((frame) => frame.title === target.title);
    expect(arrived.length).toBeGreaterThan(0);
    expect(arrived[0].y, "scroll position on the first frame of the new page").toBe(0);
    // And the page was only ever where the visitor left it or at the top, never between.
    const between = frames.filter((frame) => frame.y !== 0 && frame.y !== start);
    expect(
      between.length,
      `${between.length} frames between the bottom and the top (${between
        .slice(0, 4)
        .map((frame) => frame.y)
        .join(", ")}, ...)`,
    ).toBe(0);
    expect(await page.evaluate(() => scrollY)).toBe(0);
    expect(errors).toEqual([]);
  });
}

test("Back from a project opened from a home card returns to the card without crossing the hero", async ({
  page,
}) => {
  const errors = collectErrors(page);
  // The card furthest down the preview grid: the longest way from the hero, so a glide from the
  // top shows for as many frames as it can.
  const project = PROJECTS.filter((item) => item.slug !== "reaper" && item.slug !== "robopet").at(-1)!;
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Arya Vora");
  // The film and the exploded view have grown to their scroll-driven heights once the film
  // reports its mode.
  await expect(page.locator("#robopet")).toHaveAttribute("data-mode", /scrub|static/);
  const card = page.locator("#projects").getByRole("link", { name: project.title, exact: true });
  await card.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
  await scrollIsStill(page);
  await expect(card).toBeInViewport();
  const start = await page.evaluate(() => Math.round(scrollY));
  // Everything above the first section after the hero is the hero.
  const heroBottom = await page.evaluate(
    () => Math.round(document.getElementById("ftc")!.getBoundingClientRect().top + scrollY),
  );
  expect(start).toBeGreaterThan(heroBottom + (await page.evaluate(() => innerHeight)));

  await startRecordingFrames(page);
  await card.click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(project.title);
  await scrollIsStill(page);
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Arya Vora");
  await scrollIsStill(page);
  const frames = await stopRecordingFrames(page);

  // Going there: every frame that shows the project's page is at its top.
  const away = frames.findIndex((frame) => frame.title === project.title);
  const home = frames.findIndex((frame, i) => i > away && frame.title === "Arya Vora");
  expect(away, "a frame on the project page").toBeGreaterThan(-1);
  expect(home, "a frame back on the home page").toBeGreaterThan(away);
  const notAtTop = frames.slice(away, home).filter((frame) => frame.y !== 0);
  expect(
    notAtTop.length,
    `${notAtTop.length} frames of the project page below its top (${notAtTop
      .slice(0, 4)
      .map((frame) => frame.y)
      .join(", ")}, ...)`,
  ).toBe(0);

  // Coming back: no frame of the home page sits in the hero, and the page ends where it was left
  // with the card still on screen.
  const inHero = frames.slice(home).filter((frame) => frame.y < heroBottom);
  expect(
    inHero.length,
    `${inHero.length} frames of the home page in the hero, from ${inHero[0]?.y} on the first (the card is at ${start})`,
  ).toBe(0);
  expect(Math.abs((await page.evaluate(() => scrollY)) - start)).toBeLessThanOrEqual(24);
  await expect(card).toBeInViewport();
  expect(errors).toEqual([]);
});

test("an address outside the list answers 404 under the same nav and sub-tabs", async ({ page }) => {
  const errors = collectErrors(page, { allowDocument404: true });
  const response = await page.goto("/projects/not-a-project");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "There is no project at this address.",
  );
  await expect(subTabs(page).getByRole("link")).toHaveCount(PROJECTS.length + 1);
  await expect(subTabs(page).locator('[aria-current="page"]')).toHaveCount(0);
  await page.getByRole("link", { name: "See all projects" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Projects");
  expect(errors).toEqual([]);
});

// About and Contact are sections of the home page. From a project page the nav links are
// "/#about" and "/#contact", a full load of the home page that has to land on the section after
// the film and the exploded view grow to their scroll-driven heights.
for (const [label, id, from] of [
  ["About", "about", PROJECTS[2].slug],
  ["Contact", "contact", PROJECTS[PROJECTS.length - 1].slug],
] as const) {
  test(`${label} in the nav of a project page lands on the home page's #${id}`, async ({ page }) => {
    await page.goto(`/projects/${from}`);
    const link = mainNav(page).getByRole("link", { name: label, exact: true });
    await expect(link).toHaveAttribute("href", `/#${id}`);
    await link.click();
    await expect(page).toHaveURL(new RegExp(`/#${id}$`));
    await expect(page.locator("#robopet")).toHaveAttribute("data-mode", "scrub");
    await page.waitForTimeout(3000);
    const { top, atEnd, viewport } = await sectionPosition(page, id);
    expect(top).toBeGreaterThanOrEqual(-2);
    if (atEnd) expect(top).toBeLessThan(viewport);
    else expect(top).toBeLessThan(100);
  });
}

test("the nav, the footer and the home link work from a project page", async ({ page }) => {
  await page.goto("/projects/reaper");
  const nav = mainNav(page);
  for (const [label, href] of [
    ["Home", "/"],
    ["Projects", "/projects"],
    ["roboPet", "/projects/robopet"],
    ["About", "/#about"],
    ["Contact", "/#contact"],
    ["Games", "https://games.arya-vora.org"],
  ]) {
    await expect(nav.getByRole("link", { name: label, exact: true })).toHaveAttribute("href", href);
  }
  await expect(nav.locator(".wordmark")).toHaveAttribute("href", "/");
  const footer = page.getByRole("navigation", { name: "Footer navigation" });
  await expect(footer.getByRole("link", { name: "Home", exact: true })).toHaveAttribute("href", "/");
  await expect(footer.getByRole("link", { name: "Top", exact: true })).toHaveAttribute("href", "#top");

  // Top, from the end of the page, returns to the nav.
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
  await footer.getByRole("link", { name: "Top", exact: true }).click();
  await expect.poll(() => page.evaluate(() => Math.round(scrollY)), { timeout: 20000 }).toBeLessThanOrEqual(2);

  await nav.getByRole("link", { name: "roboPet", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("roboPet");
  await expect(nav.getByRole("link", { name: "roboPet", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await nav.getByRole("link", { name: "Home", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Arya Vora");
});

test("the theme carries across navigation, both ways, and through a reload", async ({ page }) => {
  const html = page.locator("html");
  const toggle = (name: "B&W" | "Violet") =>
    mainNav(page).getByRole("group", { name: "Theme" }).getByRole("button", { name, exact: true });
  const stored = () => page.evaluate((key) => localStorage.getItem(key), THEME_KEY);

  await page.goto("/");
  await toggle("Violet").click();
  await expect(html).toHaveAttribute("data-theme", "violet");

  // In place, through next/link: the projects layout mounts its own switch, which has to read
  // the theme the page is already in.
  await mainNav(page).getByRole("link", { name: "Projects", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Projects");
  await expect(html).toHaveAttribute("data-theme", "violet");
  await expect(toggle("Violet")).toHaveAttribute("aria-pressed", "true");
  await expect(toggle("B&W")).toHaveAttribute("aria-pressed", "false");

  const project = PROJECTS.find((item) => item.cover.tint !== false && !/-still|reaper-model/.test(item.cover.src))!;
  await page.locator("main").getByRole("link", { name: project.title, exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(project.title);
  await expect(html).toHaveAttribute("data-theme", "violet");
  const cover = page.locator(".pdetail-cover img").first();
  expect(await cover.evaluate((img) => getComputedStyle(img).filter)).toContain("av-duotone-violet");

  // A full load of a project page starts in the saved theme.
  await page.reload();
  await expect(html).toHaveAttribute("data-theme", "violet");
  await expect(toggle("Violet")).toHaveAttribute("aria-pressed", "true");

  // Switched back on a project page, the choice reaches the home page too.
  await toggle("B&W").click();
  await expect(html).toHaveAttribute("data-theme", "mono");
  expect(await stored()).toBe("mono");
  await mainNav(page).getByRole("link", { name: "Home", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Arya Vora");
  await expect(html).toHaveAttribute("data-theme", "mono");
  await expect(toggle("B&W")).toHaveAttribute("aria-pressed", "true");
  await expect(toggle("Violet")).toHaveAttribute("aria-pressed", "false");
});

for (const path of ["/projects", "/projects/reaper"]) {
  for (const [theme, label] of THEMES) {
    test(`axe finds no accessibility violations on ${path} in the ${label} theme`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await arriveWithTheme(page, theme);
      await page.goto(path);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await scrollThrough(page, 900);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
      expect(
        results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`),
      ).toEqual([]);
    });
  }
}

for (const path of ["/projects", "/projects/reaper"]) {
  test(`at 320px wide ${path} does not scroll sideways and every control stays on screen`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 740 });
    await page.goto(path);
    await scrollThrough(page, 700);
    expect(await noHorizontalOverflow(page)).toBe(true);
    expect(await controlsOffScreen(page)).toEqual([]);
    // The sub-tabs scroll sideways inside their own strip, and the page does not move with them.
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    const scroller = subTabs(page).locator(".ptabs-scroll");
    const wider = await scroller.evaluate((el) => el.scrollWidth > el.clientWidth);
    expect(wider).toBe(true);
    await scroller.evaluate((el) => el.scrollTo({ left: el.scrollWidth, behavior: "instant" }));
    await expect(subTabs(page).getByRole("link").last()).toBeInViewport();
    expect(await noHorizontalOverflow(page)).toBe(true);
  });
}

test("links with the same accessible name go to the same place on a project page", async ({
  page,
}) => {
  for (const path of ["/projects", "/projects/reaper", "/projects/robopet"]) {
    await page.goto(path);
    const { count, ambiguous } = await ambiguousLinks(page);
    expect(count, path).toBeGreaterThan(15);
    expect(ambiguous, path).toEqual([]);
  }
});

// ---------------------------------------------------------------------------------------
// Reaper's page holds what the home page's long FTC section used to: the model beside its spec
// rows, the iterations and the full ledger.
// ---------------------------------------------------------------------------------------

test("the Reaper page shows the model beside its spec rows, live or as its still", async ({
  page,
}) => {
  await page.goto("/projects/reaper");
  const block = page.locator("section.ftc-section", { has: page.locator("dl.ftc-specs") });
  const dock = block.locator("[data-reaper-dock]");
  // One model on the page, so one canvas at most.
  await expect(page.locator("[data-reaper-dock]")).toHaveCount(1);
  await dock.scrollIntoViewIfNeeded();
  await expect(dock).toHaveAttribute("role", "img");
  await expect(dock).toHaveAttribute("aria-label", /Reaper/);

  const specs = block.locator("dl.ftc-specs");
  const terms = ["Shooter", "Aiming", "Intake", "Protection", "Code"];
  await expect(specs.locator(".ftc-spec-key")).toHaveText(terms);
  if (!(await drawsLive(page))) {
    // Stills only: the terms are plain text, nothing claims to show a part, nothing lights up.
    await expect(specs.getByRole("button")).toHaveCount(0);
    await expect(specs.locator("[aria-pressed]")).toHaveCount(0);
    await expect(specs.locator("[data-active]")).toHaveCount(0);
    await expect(block).not.toHaveAttribute("data-reaper-live");
    await expect(block.locator("canvas.reaper-canvas")).toHaveCount(0);
    return;
  }
  const row = (name: string) => specs.getByRole("button", { name, exact: true });
  // The rows become buttons once the first build succeeds, which loads three.js and the model.
  await expect(specs.getByRole("button")).toHaveCount(5, { timeout: 45000 });
  await expect(specs.locator("button[aria-pressed='true']")).toHaveCount(0);
  await row("Shooter").click();
  await expect(row("Shooter")).toHaveAttribute("aria-pressed", "true");
  await expect(specs).toHaveAttribute("data-active", "shooter");
  // One part at a time.
  await row("Aiming").click();
  await expect(row("Aiming")).toHaveAttribute("aria-pressed", "true");
  await expect(row("Shooter")).toHaveAttribute("aria-pressed", "false");
  await expect(specs.locator("button[aria-pressed='true']")).toHaveCount(1);
  await expect(specs).toHaveAttribute("data-active", "aiming");
  // A second press clears it, and with the pointer and focus gone nothing stays lit.
  await row("Aiming").click();
  await expect(row("Aiming")).toHaveAttribute("aria-pressed", "false");
  await page.mouse.move(0, 0);
  await row("Aiming").blur();
  await expect(specs).not.toHaveAttribute("data-active");
});

test("the Reaper page shows its photos, and the season ledger opens from the keyboard", async ({
  page,
}) => {
  await page.goto("/projects/reaper");
  const images = page.locator("main img:visible");
  expect(await images.count()).toBeGreaterThanOrEqual(10);
  for (const image of await images.all()) {
    await image.scrollIntoViewIfNeeded();
    await expect(image).toHaveAttribute("alt", /\S/);
    await expect
      .poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth))
      .toBeGreaterThan(0);
  }
  await expect(page.getByText(/The model is incomplete/)).toBeVisible();

  const all = page.locator("details.ftc-all");
  const summary = all.locator("summary");
  // Closed on load: the short list of highlights leads, and the tables are not in the way.
  await expect(all).not.toHaveAttribute("open", "");
  await expect(all.locator("table.ftc-ledger").first()).toBeHidden();
  const announced = Number(((await summary.textContent()) ?? "").match(/\d+/)?.[0]);
  expect(announced).toBeGreaterThanOrEqual(21);

  await summary.scrollIntoViewIfNeeded();
  await scrollIsStill(page);
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(all).toHaveAttribute("open", "");
  await expect(all.locator("table.ftc-ledger")).toHaveCount(3);
  // The heading promises a count; the tables have to deliver exactly that many rows.
  await expect(all.locator("table.ftc-ledger tbody tr")).toHaveCount(announced);
  await expect(all.getByRole("row", { name: /FIRST Championship, Ross Division/ })).toContainText("5-5");
  await expect(all.locator("table.ftc-ledger tbody tr").last()).toBeVisible();

  // An empty table cell is read as "blank", or skipped, so a screen reader user cannot tell a
  // missing value from a broken table. Every cell has to hold text or carry a name.
  const empty = await page.locator("table td, table th").evaluateAll((cells) =>
    cells
      .filter((cell) => !cell.textContent?.trim() && !cell.getAttribute("aria-label"))
      .map((cell) => cell.closest("tr")?.textContent ?? ""),
  );
  expect(empty).toEqual([]);

  await page.keyboard.press("Space");
  await expect(all).not.toHaveAttribute("open", "");
});

test("project pages keep their content without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto("/projects");
  await expect(page.locator("main .pcard")).toHaveCount(PROJECTS.length);
  for (const slug of ["reaper", "robopet", PROJECTS[PROJECTS.length - 1].slug]) {
    const project = PROJECTS.find((item) => item.slug === slug)!;
    await page.goto(`/projects/${slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(project.title);
    await expect(subTabs(page).locator('[aria-current="page"]')).toHaveText(project.tab);
    // The cover leads the page, unless the first scene opens on the same picture (roboPet).
    await expect(page.locator(".pdetail-cover img:visible")).toHaveCount(
      project.hideCoverOnPage ? 0 : 1,
    );
    // Every block of the write-up is in the server HTML, the custom ones included, and none of
    // it waits in a hidden streamed segment that only a script would swap in.
    expect(await page.locator(".pb-flow > .pb").count()).toBe(project.blocks.length);
    await expect(page.locator('div[hidden][id^="S:"]')).toHaveCount(0);
  }
  await page.goto("/projects/reaper");
  await expect(page.locator("table.ftc-ledger")).toHaveCount(3);
  await context.close();
});

// The first screen has to hold some of the picture, not only the words about it. At 1440 by 900 the
// title, summary and meta row used to end at 565px with the cover 88px under that, so the picture
// began in the last tenth of the window.
for (const [width, height, share] of [
  [1440, 900, 0.45],
  [1100, 800, 0.3],
  [390, 844, 0.25],
] as const) {
  test(`at ${width}x${height} the cover of every project starts well inside the first screen`, async ({
    page,
  }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width, height });
    for (const project of PROJECTS.filter((item) => !item.hideCoverOnPage)) {
      await page.goto(`/projects/${project.slug}`);
      const frame = page.locator(".pdetail-cover-frame");
      await expect(frame).toBeVisible();
      const { top, height: frameHeight } = await frame.evaluate((el) => {
        const box = el.getBoundingClientRect();
        return { top: box.top, height: box.height };
      });
      const shown = Math.max(0, Math.min(top + frameHeight, height) - Math.max(top, 0));
      expect(shown / frameHeight, `${project.slug} at ${width}x${height}: cover top ${Math.round(top)}`).toBeGreaterThanOrEqual(share);
    }
  });
}

// On the smallest phones the picture still has to be on the first screen. At 320 by 568 the nav is
// two rows (140px), and the covers used to start 500 to 650px down, under the summary, showing 0 to
// 76px; roboPet's film started under a meta grid 270px tall, below the fold of a 393 by 659 phone.
test("on short phones every cover and roboPet's film show on the first screen", async ({ page }) => {
  test.setTimeout(120000);
  for (const [width, height, need] of [
    [320, 568, 150],
    [393, 659, 180],
  ] as const) {
    await page.setViewportSize({ width, height });
    for (const project of PROJECTS.filter((item) => !item.headerInFirstBlock)) {
      await page.goto(`/projects/${project.slug}`);
      // The cover, or for a page that leaves it off, the film's canvas or its poster. The canvas is
      // sized by the film's script, so the top is polled until a picture has a box.
      const top = () =>
        page.evaluate(() => {
          const shown = (el: Element) =>
            getComputedStyle(el).display !== "none" && el.getBoundingClientRect().height > 0;
          const pictures = [
            ...document.querySelectorAll(".pdetail-cover-frame, #robopet canvas, #robopet img[class*='film-poster']"),
          ].filter(shown);
          return Math.round(Math.min(...pictures.map((el) => el.getBoundingClientRect().top)));
        });
      await expect
        .poll(top, { message: `${project.slug} at ${width}x${height}: picture top` })
        .toBeLessThanOrEqual(height - need);
    }
    expect(await noHorizontalOverflow(page)).toBe(true);
  }
});

// roboPet's meta row follows the film on a phone, and stays in the header from a tablet up. One
// copy shows at a time, so a screen reader meets it once.
test("roboPet's meta row shows once, under the header or after the film", async ({ page }) => {
  for (const [width, inHeader] of [
    [390, false],
    [1100, true],
  ] as const) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/projects/robopet");
    await expect(page.locator(".pdetail-meta:visible")).toHaveCount(1);
    await expect(page.locator(".pdetail-head .pdetail-meta")).toBeVisible({ visible: inHeader });
    await expect(page.locator(".pdetail-meta-after .pdetail-meta")).toBeVisible({ visible: !inHeader });
    await expect(page.locator(".pdetail-meta:visible").getByRole("link", { name: "Code on GitHub" })).toHaveCount(1);
  }
});

// A software cover is a 3200px window. Drawn whole at a phone's width its UI text was 4 to 7px
// tall; on a phone each is cropped to one feature (src/components/projects/coverCrops.ts), drawn at
// a scale that puts its text at about 9.5px or more, on the project's page, on the index and on the
// home page. A wider window shows the project's cover whole.
test("a software cover is cropped to a readable scale on a phone and drawn whole from a tablet up", async ({
  page,
}) => {
  test.setTimeout(120000);
  const software = PROJECTS.filter((project) => project.cover.src.startsWith("/projects/"));
  expect(software.length).toBeGreaterThanOrEqual(6);
  // Pixels of picture per CSS pixel: the cover as painted (object-fit, the frame's zoom) over its
  // natural width.
  const scale = (selector: string) =>
    page.locator(selector).evaluateAll((images) =>
      (images as HTMLImageElement[]).map((img) => {
        const box = img.getBoundingClientRect();
        const { objectFit } = getComputedStyle(img);
        const fit = objectFit === "cover" ? Math.max : Math.min;
        const k = fit(img.offsetWidth / img.naturalWidth, img.offsetHeight / img.naturalHeight);
        return k * (box.width / img.offsetWidth);
      }),
    );
  await page.setViewportSize({ width: 390, height: 844 });
  for (const project of software) {
    await page.goto(`/projects/${project.slug}`);
    const img = page.locator(".pdetail-cover img");
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
    const [painted] = await scale(".pdetail-cover img");
    expect(painted, project.slug).toBeGreaterThanOrEqual(0.165);
    await expect(img).toHaveCSS("object-fit", "cover");
  }
  await page.goto("/projects");
  const cards = page.locator(".pcard[data-cropped] img");
  await expect(cards).toHaveCount(software.length);
  for (const card of await cards.all()) {
    await card.scrollIntoViewIfNeeded();
    await expect.poll(() => card.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
  }
  for (const painted of await scale(".pcard[data-cropped] img")) expect(painted).toBeGreaterThanOrEqual(0.165);
  await page.goto("/");
  const previews = page.locator(".home-card[data-cropped] img");
  await expect(previews).toHaveCount(software.length);
  for (const preview of await previews.all()) {
    await preview.scrollIntoViewIfNeeded();
    await expect.poll(() => preview.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
  }
  for (const painted of await scale(".home-card[data-cropped] img")) expect(painted).toBeGreaterThanOrEqual(0.165);

  await page.setViewportSize({ width: 1100, height: 800 });
  await page.goto(`/projects/${software[0].slug}`);
  await expect(page.locator(".pdetail-cover img")).toHaveCSS("object-fit", "contain");
});

// The one-picture gallery takes the whole column on a phone, as every other picture does; the
// tablet rule that starts it at column 4 left it 100px in from the gutter.
test("a gallery of one picture spans the column on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto("/projects/reaper");
  const gallery = page.locator(".pb-gallery.is-single").first();
  await gallery.scrollIntoViewIfNeeded();
  const { section, figure } = await gallery.evaluate((el) => {
    const box = (node: Element) => {
      const rect = node.getBoundingClientRect();
      return { left: Math.round(rect.left), width: Math.round(rect.width) };
    };
    return { section: box(el), figure: box(el.querySelector(".pb-figure")!) };
  });
  expect(figure).toEqual(section);
});

// A score, a season or a date is never split at its hyphen ("the 2025-" then "26 game"), in either
// engine; the text itself is unchanged.
test("no score, season or date breaks across lines in a summary", async ({ page }) => {
  const split = () =>
    page.locator(".pcard-summary, .pdetail-summary").evaluateAll((elements) => {
      const out: string[] = [];
      for (const el of elements) {
        if (!el.getClientRects().length) continue;
        const nodes: [Text, number][] = [];
        let text = "";
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          nodes.push([node as Text, text.length]);
          text += (node as Text).data;
        }
        for (const match of text.matchAll(/\d+(?:-\d+)+/g)) {
          const tops = new Set<number>();
          for (let i = match.index!; i < match.index! + match[0].length; i++) {
            const [node, start] = nodes.filter(([, at]) => at <= i).pop()!;
            const range = document.createRange();
            range.setStart(node, i - start);
            range.setEnd(node, i - start + 1);
            const rect = range.getBoundingClientRect();
            if (rect.width) tops.add(Math.round(rect.top));
          }
          if (tops.size > 1) out.push(match[0]);
        }
      }
      return out;
    });
  for (const width of [320, 393, 412]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/projects");
    expect(await split(), `/projects at ${width}`).toEqual([]);
    await page.goto("/projects/reaper");
    await expect(page.locator(".pdetail-summary")).toContainText("2025-26");
    expect(await split(), `/projects/reaper at ${width}`).toEqual([]);
  }
});

// The index opens on its pictures: the title and the intro share a line, and the category heading
// is a small one, so at 1440 by 900 the first two pictures are whole on the first screen.
test("the first two pictures of the index are whole on a 1440 by 900 screen", async ({ page, isMobile }) => {
  test.skip(isMobile, "a desktop window");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/projects");
  const bottoms = await page
    .locator("#robotics .pcard-media")
    .evaluateAll((frames) => frames.map((frame) => frame.getBoundingClientRect().bottom));
  expect(bottoms.length).toBeGreaterThanOrEqual(2);
  for (const bottom of bottoms.slice(0, 2)) expect(bottom).toBeLessThanOrEqual(900);
});

// A write-up's headings pin beside their text, and the sub-tab strip (53px, pinned to the window)
// comes back on a scroll up. A heading pinned at 32px slid under the strip.
test("a pinned section heading stays clear of the sub-tab strip when it comes back", async ({ page, viewport }) => {
  test.skip(viewport!.width <= 760, "on a phone the strip is in the page and the headings are not pinned");
  await page.goto("/projects/shipkit");
  const strip = subTabs(page);
  // Hydrated: the strip's scroll handler is installed in an effect.
  await expect
    .poll(() => strip.evaluate((el) => Object.keys(el).some((key) => key.startsWith("__reactProps"))), {
      timeout: 20000,
    })
    .toBe(true);
  const heading = page.getByRole("heading", { name: "The 18 rules" });
  await expect(heading).toHaveCSS("position", "sticky");
  const middle = await heading.evaluate((el) => {
    const rail = el.closest(".pb-rail")!.getBoundingClientRect();
    return rail.top + scrollY + rail.height / 2;
  });
  await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), middle);
  await expect(strip).toHaveAttribute("data-away", "");
  // Pinned at the top of the window while the strip is away.
  await expect.poll(() => heading.evaluate((el) => Math.round(el.getBoundingClientRect().top))).toBe(32);

  await page.evaluate(() => window.scrollBy({ top: -40, behavior: "instant" }));
  await expect(strip).not.toHaveAttribute("data-away");
  await expect.poll(() => strip.evaluate((el) => Math.round(el.getBoundingClientRect().bottom))).toBeGreaterThan(40);
  // Once the strip is back, the heading has moved down to sit under it, never beneath it.
  await expect
    .poll(async () => {
      const stripBottom = await strip.evaluate((el) => el.getBoundingClientRect().bottom);
      const headingTop = await heading.evaluate((el) => el.getBoundingClientRect().top);
      return Math.round(headingTop - stripBottom);
    })
    .toBeGreaterThanOrEqual(8);
});

test("a heading beside a block too short to need it is not pinned", async ({ page, viewport }) => {
  // ShipKit has both: two text blocks that fit in one screen, and the 18 rules, which run for
  // several. A heading is pinned only where it has at least 40% of the window to travel in. (Tally
  // was the page for this, but every block of its write-up is now short enough to fit, so it can
  // no longer show the pinned case.)
  await page.goto("/projects/shipkit");
  // Hydrated: StickyHeadings marks the short blocks in an effect.
  await expect.poll(() => page.locator(".pb-heading[data-fits]").count(), { timeout: 20000 }).toBeGreaterThan(0);
  const headings = await page.locator(".pb-rail .pb-heading").evaluateAll((els) =>
    els.map((el) => ({
      text: el.textContent,
      room: el.closest(".pb-rail")!.getBoundingClientRect().height - el.getBoundingClientRect().height,
      window: innerHeight,
      fits: el.hasAttribute("data-fits"),
      position: getComputedStyle(el).position,
    })),
  );
  expect(headings.length).toBeGreaterThanOrEqual(3);
  for (const heading of headings) {
    expect(heading.fits, `${heading.text}: room ${Math.round(heading.room)} of a ${heading.window}px window`).toBe(
      Math.round(heading.room) < heading.window * 0.4,
    );
    if (heading.fits) expect(heading.position, heading.text!).toBe("static");
  }
  expect(headings.some((heading) => heading.fits)).toBe(true);
  // On a phone every heading is a plain one above its text; from a tablet up the long block pins.
  if (viewport!.width > 760) {
    expect(headings.some((heading) => !heading.fits && heading.position === "sticky")).toBe(true);
  }
});

// The screen shows the model in WebGL, drawn over a still that a script reveals, and keeps the
// season ledger shut. Paper has neither a script nor a click.
test("printing /projects/reaper keeps the model figure and opens the season ledger", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "::details-content and page.pdf() are checked in Chromium");
  await page.goto("/projects/reaper");
  await page.emulateMedia({ media: "print" });
  const still = page.locator(".reaper-still");
  // Whatever the theme and however far the page got, the still is the black and white one, shown.
  expect(await still.first().evaluate((el) => getComputedStyle(el).backgroundImage)).toContain("reaper-model-mono.webp");
  expect(await still.first().evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
  expect(await still.first().evaluate((el) => getComputedStyle(el).getPropertyValue("print-color-adjust"))).toBe("exact");
  await expect(page.locator(".reaper-host").first()).toBeHidden();

  const all = page.locator("details.ftc-all");
  await expect(all).toBeVisible();
  await expect(all).not.toHaveAttribute("open", "");
  await expect(all.locator("table.ftc-ledger")).toHaveCount(3);
  await expect(all.locator("table.ftc-ledger").first()).toBeVisible();
  await expect(all.locator("table.ftc-ledger tbody tr").last()).toBeVisible();
  const pdf = await page.pdf({ format: "Letter" });
  expect(pdf.length).toBeGreaterThan(20_000);
});
