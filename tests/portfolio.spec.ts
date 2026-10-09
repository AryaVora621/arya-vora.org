import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  CELL_STATES,
  DEFAULT_OBSTACLES,
  findPath,
  GOAL,
  moveCell,
} from "../src/lib/playground";
import { FILM_FRAMES } from "../src/components/robopet/filmFrames";

// Page order from the v8 contract, top to bottom.
const SECTION_ORDER = [
  "top",
  "ftc",
  "robopet",
  "exploded",
  "cad",
  "projects",
  "playground",
  "about",
  "contact",
];

// On an empty 7 x 7 grid the shortest route has 13 cells. Start and goal keep their own
// look, so 11 cells show the route marker.
const ROUTE_CELLS = 11;

const NAV = [
  ["FTC", "#ftc"],
  ["roboPet", "#robopet"],
  ["CAD", "#cad"],
  ["Software", "#projects"],
  ["About", "#about"],
  ["Contact", "#contact"],
];

// Returns every computed color on the page whose channels differ by more than `tolerance`.
// The site is black and white, so any hue at all is a regression.
async function huedColors(page: Page, tolerance = 2) {
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

async function noHorizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
}

// The two color themes. "mono" (B&W) is the default; the choice is kept in localStorage.
const THEME_KEY = "av-theme";
const THEMES = [
  ["mono", "B&W"],
  ["violet", "Violet"],
] as const;
type ThemeName = (typeof THEMES)[number][0];

// Starts every page load in this test on `theme`, the way a returning visitor would arrive.
async function arriveWithTheme(page: Page, theme: ThemeName) {
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

// Safari on macOS only tabs to form controls unless Option is held, so WebKit on a Mac needs
// Alt+Tab to reach a link or a button. That is a setting of the browser, not of the page.
function tabKey(browserName: string) {
  return browserName === "webkit" && process.platform === "darwin" ? "Alt+Tab" : "Tab";
}

test("path planner handles shortest paths, detours, walls, and a one-cell field", () => {
  const empty = findPath(new Set());
  expect(empty.path).toHaveLength(13);
  expect(empty.path[0]).toBe(0);
  expect(empty.path.at(-1)).toBe(GOAL);
  const walls = new Set(DEFAULT_OBSTACLES);
  const result = findPath(walls);
  expect(result.path.length).toBeGreaterThan(0);
  for (let i = 1; i < result.path.length; i++) {
    const from = result.path[i - 1];
    const to = result.path[i];
    expect(
      Math.abs((from % 7) - (to % 7)) +
        Math.abs(Math.floor(from / 7) - Math.floor(to / 7)),
    ).toBe(1);
    expect(walls.has(to)).toBe(false);
  }
  expect(findPath(new Set([1, 7])).path).toEqual([]);
  expect(findPath(new Set([0])).path).toEqual([]);
  expect(findPath(new Set(), 0, 0, 1).path).toEqual([0]);
  expect(findPath(new Set(), 0, 1, 0).path).toEqual([]);
});

test("grid keys stop at the edges instead of wrapping to the next row", () => {
  expect(moveCell(6, "ArrowRight")).toBe(6);
  expect(moveCell(7, "ArrowLeft")).toBe(7);
  expect(moveCell(3, "ArrowUp")).toBe(3);
  expect(moveCell(45, "ArrowDown")).toBe(45);
  expect(moveCell(10, "Home")).toBe(7);
  expect(moveCell(10, "End")).toBe(13);
});

test("legend labels are exactly the cell state labels", async ({ page }) => {
  await page.goto("/");
  const legend = page.getByRole("list", { name: "Legend" });
  // The swatches are aria-hidden (the start and goal swatches show S and G), so read only
  // the text a screen reader gets.
  const labels = await legend.getByRole("listitem").evaluateAll((items) =>
    items.map((item) => {
      const copy = item.cloneNode(true) as HTMLElement;
      copy.querySelectorAll("[aria-hidden='true']").forEach((node) => node.remove());
      return copy.textContent?.trim();
    }),
  );
  expect(labels).toEqual(CELL_STATES.map((state) => state.label));
  // Labels name a state, never a color.
  for (const state of CELL_STATES) {
    expect(state.label).not.toMatch(
      /\b(green|red|blue|violet|purple|yellow|orange|teal|pink|white|black|grey|gray)\b/i,
    );
  }
});

test("home renders in contract order without errors, duplicate IDs, or overflow", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
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

  for (const id of ["ftc", "cad", "projects", "playground", "about", "contact"]) {
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

test("the page has no hue anywhere: every computed color is a grey", async ({ page }) => {
  await page.goto("/");
  // Scroll through once so lazy sections mount and scroll-driven states apply.
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 800) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
  }
  expect(await huedColors(page)).toEqual([]);

  // Spot-check the elements a palette regression would hit first, so a failure names them.
  const key = await page.evaluate(() =>
    [
      "body",
      "h1",
      ".nav-links a",
      "#ftc h2",
      ".ftc-record",
      ".primary-button",
      ".path-cell.endpoint",
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

test("FTC section shows Reaper, its photos and the dated results", async ({ page }) => {
  await page.goto("/");
  const ftc = page.locator("#ftc");
  await expect(ftc.getByRole("heading", { level: 2, name: "Reaper" })).toBeVisible();
  const images = ftc.locator("img");
  expect(await images.count()).toBeGreaterThanOrEqual(5);
  for (const image of await images.all()) {
    await image.scrollIntoViewIfNeeded();
    await expect(image).toHaveAttribute("alt", /\S/);
    await expect
      .poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth))
      .toBeGreaterThan(0);
  }
  await expect(ftc.locator("table.ftc-ledger")).toHaveCount(3);
  await expect(ftc.getByRole("row", { name: /FIRST Championship, Ross Division/ })).toContainText(
    "5-5",
  );
  await expect(ftc.getByText(/The model is incomplete/)).toBeVisible();
});

test("CAD section renders every Onshape image", async ({ page }) => {
  await page.goto("/");
  const cad = page.locator("#cad");
  await expect(cad.getByRole("heading", { level: 2, name: "CAD" })).toBeVisible();
  const images = cad.locator("img");
  // The gallery holds the eight models Arya drew. The Sesame robot (someone else's design),
  // Totebot (authorship unconfirmed), the unfinished claw and two weaker frames are left out
  // on purpose, and WorldsRobo is in the FTC section.
  expect(await images.count()).toBeGreaterThanOrEqual(8);
  for (const image of await images.all()) {
    await image.scrollIntoViewIfNeeded();
    await expect(image).toHaveAttribute("alt", /\S/);
    await expect
      .poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth))
      .toBeGreaterThan(0);
  }
});

test("software section lists features and the index with repository links", async ({
  page,
}) => {
  await page.goto("/");
  const projects = page.locator("#projects");
  await expect(projects.getByRole("heading", { level: 2 })).toHaveText("Software");
  // Two feature rows and four indexed rows. Jarvis-Bee is left off because its agents only
  // echo messages back.
  await expect(projects.locator(".project-card")).toHaveCount(6);
  for (const name of ["notchTerm", "OpenUltraCode", "SmartInvest", "Tally", "TeamStat Insights"]) {
    await expect(projects.getByRole("heading", { level: 3, name })).toBeVisible();
  }
  await expect(projects.getByRole("link", { name: "notchTerm" })).toHaveAttribute(
    "href",
    "https://github.com/AryaVora621/notchTerm",
  );
});

test("pathfinding demo runs, handles a blocked start, and resets", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Clear walls" }).click();
  await page.getByRole("button", { name: "Find path", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: /Goal reached/ })).toContainText(
    /12 moves and \d+ cells explored/,
  );
  await expect(page.locator(".path-cell.route")).toHaveCount(ROUTE_CELLS);
  const upper = page.getByRole("button", { name: "Row 1, column 2", exact: true });
  const lower = page.getByRole("button", { name: "Row 2, column 1", exact: true });
  await expect(upper).toHaveAttribute("aria-pressed", "false");
  await upper.click();
  await lower.click();
  // The name stays the same; the pressed state is what changes.
  await expect(upper).toHaveAttribute("aria-pressed", "true");
  await expect(lower).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Find path", exact: true }).click();
  await expect(
    page.getByText("No route available. Remove a wall and try again."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear walls" }).click();
  await expect(page.locator(".path-cell.wall")).toHaveCount(0);
  const cell = page.getByRole("button", { name: "Row 1, column 6", exact: true });
  await cell.focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("button", { name: "Row 1, column 7", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("button", { name: "Row 1, column 7", exact: true }),
  ).toBeFocused();
});

test("path lab cells are named by position; wall or open is the pressed state", async ({
  page,
}) => {
  await page.goto("/");
  const grid = page.getByRole("group", { name: "Breadth-first search grid" });
  const cells = grid.getByRole("button");
  await expect(cells).toHaveCount(49);
  // A screen reader says "Row 2, column 2, toggle button, pressed", so the name carries the
  // position only. Saying "open" or "wall" in the name too would state it twice, and a toggle's
  // name should not change when it is pressed.
  const names = await cells.evaluateAll((buttons) =>
    buttons.map((button) => button.getAttribute("aria-label")),
  );
  expect(names.filter((name) => /\b(open|wall|pressed|fixed)\b/i.test(name ?? ""))).toEqual([]);
  expect(new Set(names).size).toBe(49);
  await expect(grid.getByRole("button", { name: "Row 1, column 1, start", exact: true })).toBeVisible();
  await expect(grid.getByRole("button", { name: "Row 7, column 7, goal", exact: true })).toBeVisible();
  // The two fixed cells are not toggles.
  await expect(cells.first()).not.toHaveAttribute("aria-pressed");
  await expect(cells.last()).not.toHaveAttribute("aria-pressed");
  // The group says what "pressed" means, since the name no longer does.
  await expect(grid).toHaveAccessibleDescription(/pressed cell is a wall/i);

  // The walls the lab starts with are the pressed cells, and no others.
  const wallNames = DEFAULT_OBSTACLES.map(
    (cell) => `Row ${Math.floor(cell / 7) + 1}, column ${(cell % 7) + 1}`,
  );
  await expect(grid.getByRole("button", { pressed: true })).toHaveCount(DEFAULT_OBSTACLES.length);
  for (const name of wallNames) {
    await expect(grid.getByRole("button", { name, exact: true, pressed: true })).toHaveCount(1);
  }
  // Pressing a pressed cell opens it again, and its name is the same before and after.
  const first = grid.getByRole("button", { name: wallNames[0], exact: true });
  await first.click();
  await expect(first).toHaveAttribute("aria-pressed", "false");
  await expect(first).toHaveAccessibleName(wallNames[0]);
});

// Links that read the same but go to different places leave a screen reader user, who often
// lists the links of a page, guessing. Each name has to mean one destination.
test("links with the same accessible name go to the same place", async ({ page }) => {
  await page.goto("/");
  const snapshot = await page.locator("body").ariaSnapshot();
  const destinations = new Map<string, Set<string>>();
  for (const [, name, href] of snapshot.matchAll(
    /- link "((?:[^"\\]|\\.)*)"[^\n]*\n\s*- \/url: "?([^"\n]+)"?/g,
  )) {
    destinations.set(name, (destinations.get(name) ?? new Set()).add(href));
  }
  expect(destinations.size).toBeGreaterThan(30);
  const ambiguous = [...destinations]
    .filter(([, hrefs]) => hrefs.size > 1)
    .map(([name, hrefs]) => `"${name}" goes to ${[...hrefs].join(" and ")}`);
  expect(ambiguous).toEqual([]);
});

// An empty table cell is read as "blank", or skipped, so a screen reader user cannot tell a
// missing value from a broken table. Every cell has to hold text or carry a name.
test("no table cell is empty", async ({ page }) => {
  await page.goto("/");
  const empty = await page.locator("table td, table th").evaluateAll((cells) =>
    cells
      .filter((cell) => !cell.textContent?.trim() && !cell.getAttribute("aria-label"))
      .map((cell) => {
        const row = cell.closest("tr");
        return `${row?.querySelector("th")?.textContent ?? row?.textContent}: column ${
          [...(row?.children ?? [])].indexOf(cell) + 1
        }`;
      }),
  );
  expect(empty).toEqual([]);
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

test("reduced motion runs no animations and shows a finished route at once", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".hero-art .hero-robot-stage")).toBeVisible();
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 900) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
  }
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
  await page.getByRole("button", { name: "Clear walls" }).click();
  await page.getByRole("button", { name: "Find path", exact: true }).click();
  await expect(page.locator(".path-cell.route")).toHaveCount(ROUTE_CELLS);
  await expect(page.getByText(/Goal reached/)).toBeVisible();
});

test("an active route completes immediately when reduced motion turns on", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Clear walls" }).click();
  // Use the browser clock to hold an active route instead of racing its timer.
  await page.clock.install({ time: new Date("2026-10-08T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-08T12:00:01Z"));
  await page.getByRole("button", { name: "Find path", exact: true }).click();
  await expect(page.getByText("Searching for the shortest route.")).toBeVisible();
  expect(await page.locator(".path-cell.route").count()).toBeLessThan(ROUTE_CELLS);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByText(/12 moves and \d+ cells explored/)).toBeVisible();
  await expect(page.locator(".path-cell.route")).toHaveCount(ROUTE_CELLS);
  await page.getByRole("button", { name: "Clear walls" }).click();
  await expect(page.locator(".path-cell.route")).toHaveCount(0);
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
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 700) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
  }
  expect(await noHorizontalOverflow(page)).toBe(true);
  const offScreen = () =>
    page
      .locator("header a, header button, main a, main button, footer a")
      .evaluateAll((elements) =>
        elements
          .filter((el) => {
            const r = el.getBoundingClientRect();
            return r.width > 0 && (r.left < -1 || r.right > innerWidth + 1);
          })
          .map((el) => el.textContent),
      );
  expect(await offScreen()).toEqual([]);
  // The theme switch shares the first row with the wordmark, and switching it moves nothing.
  const theme = page.getByRole("navigation", { name: "Main navigation" }).getByRole("group", {
    name: "Theme",
  });
  await expect(theme.getByRole("button")).toHaveCount(2);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await theme.getByRole("button", { name: "Violet", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "violet");
  expect(await noHorizontalOverflow(page)).toBe(true);
  expect(await offScreen()).toEqual([]);
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
    // Wordmark, B&W, Violet, six section links and Games.
    expect(count).toBe(10);

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

test("nav links scroll to their sections, past the pinned film and exploded view", async ({
  page,
}) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  for (const [label, href] of NAV.filter(([, href]) => href !== "#contact")) {
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await nav.getByRole("link", { name: label, exact: true }).click();
    await expect
      .poll(
        () =>
          page.evaluate(
            (id) => Math.round(document.getElementById(id)!.getBoundingClientRect().top),
            href.slice(1),
          ),
        { timeout: 20000 },
      )
      .toBeLessThanOrEqual(40);
    expect(
      await page.evaluate(
        (id) => document.getElementById(id)!.getBoundingClientRect().top,
        href.slice(1),
      ),
    ).toBeGreaterThanOrEqual(-2);
  }
});

// The server HTML has the short static layout, so the browser scrolls a fragment link there.
// After hydration the film (480vh) and the exploded view (260vh) switch to their scroll-driven
// heights and the page grows by thousands of pixels. The target has to follow.
async function deepLinkPosition(page: Page, id: string) {
  return page.evaluate((id) => {
    const top = document.getElementById(id)!.getBoundingClientRect().top;
    const atEnd = scrollY + innerHeight >= document.documentElement.scrollHeight - 2;
    return { top, atEnd, viewport: innerHeight };
  }, id);
}

for (const id of ["ftc", "robopet", "cad", "projects", "playground", "about", "contact"]) {
  test(`opening /#${id} lands on that section once the page has hydrated`, async ({ page }) => {
    await page.goto(`/#${id}`);
    // Without this the test would pass on the short layout it is meant to catch.
    await expect(page.locator("#robopet")).toHaveAttribute("data-mode", "scrub");
    await page.waitForTimeout(3000);
    const { top, atEnd, viewport } = await deepLinkPosition(page, id);
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
  await page.goto("/#cad");
  await expect(page.locator("#robopet")).toHaveAttribute("data-mode", "static");
  await page.waitForTimeout(1500);
  const { top } = await deepLinkPosition(page, "cad");
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
  expect((await deepLinkPosition(page, "about")).top).toBeGreaterThan(400);
});

test("metadata, social card, icons, and internal link targets resolve", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Arya Vora");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    /class of 2028/,
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
});

for (const [theme, label] of THEMES) {
  test(`axe finds no accessibility violations in the ${label} theme`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await arriveWithTheme(page, theme);
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < height; y += 900) {
      await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
    }
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
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
  for (const id of ["ftc", "cad", "projects"]) {
    const image = page.locator(`#${id} img.theme-tint`).first();
    expect(await image.evaluate((img) => getComputedStyle(img).filter), id).toContain(
      "av-duotone-violet",
    );
  }

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
    .locator("#ftc img, #cad img, #projects img, .film-photo img")
    .evaluateAll((images) =>
      images.filter((img) => !img.classList.contains("theme-tint")).map((img) => img.getAttribute("src")),
    );
  expect(untinted).toEqual([]);
  expect(await page.locator("img.theme-tint").count()).toBeGreaterThanOrEqual(20);
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

// The meta element browsers read the toolbar color from: the first theme-color in tree order.
// A visitor who arrives on Violet can end up with a second, stale one after hydration (React
// does not recognise the server's meta once the inline script has recolored it, and adds its
// own), which no browser reads while the first is right.
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
}, testInfo) => {
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
  // Known gap, kept visible without failing the run: a second theme-color meta is left behind.
  const colors = await page
    .locator('meta[name="theme-color"]')
    .evaluateAll((metas) => metas.map((meta) => meta.getAttribute("content")));
  if (colors.length > 1) {
    testInfo.annotations.push({
      type: "duplicate theme-color meta",
      description: `After hydration a Violet arrival has ${colors.join(" and ")}; browsers read the first.`,
    });
  }
});

test("the theme still switches, before and after hydration, when storage is blocked", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
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

// Reaper is a 3D model where the browser has a hardware GPU, and a still rendered from the
// same model everywhere else. Either way each dock shows the robot. The spec rows are buttons
// that choose a part of the model only where the model draws; elsewhere they are plain terms,
// since a control that changes nothing would only mislead. The live turn to a part is covered
// in reaper-live.spec.ts, on a software GPU the page is told to use.

// The probe the page makes before it builds the model (src/components/robopet/gpu.ts): no WebGL
// or a software rasteriser keeps the stills, so the spec rows stay plain.
async function drawsReaperLive(page: Page) {
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

test("the Reaper model shows in #ftc, live or as its still, and a spec row selects a part", async ({
  page,
  request,
}) => {
  await page.goto("/");
  const ftc = page.locator("#ftc");
  const docks = ftc.locator("[data-reaper-dock]");
  await expect(docks).toHaveCount(2);
  await docks.first().scrollIntoViewIfNeeded();
  for (const dock of await docks.all()) {
    await dock.scrollIntoViewIfNeeded();
    await expect(dock).toHaveAttribute("role", "img");
    await expect(dock).toHaveAttribute("aria-label", /Reaper/);
    const box = await dock.boundingBox();
    expect(box!.width).toBeGreaterThan(150);
    expect(box!.height).toBeGreaterThan(150);
    const shows = await dock.evaluate((element) => {
      const still = element.querySelector<HTMLElement>(".reaper-still")!;
      const style = getComputedStyle(still);
      return {
        canvas: !!element.querySelector("canvas.reaper-canvas") && element.hasAttribute("data-live"),
        still: style.backgroundImage.match(/url\("?([^")]+)"?\)/)?.[1] ?? "",
        opacity: Number(style.opacity),
      };
    });
    // The still is always the theme's own, so it can stand in the moment the canvas leaves.
    expect(shows.still).toMatch(/\/ftc\/reaper-model-mono\.webp$/);
    if (!shows.canvas) expect(shows.opacity).toBe(1);
  }
  const still = await request.get("/ftc/reaper-model-mono.webp");
  expect(still.status()).toBe(200);
  expect(still.headers()["content-type"]).toContain("image/webp");
  expect((await request.get("/ftc/reaper-model-violet.webp")).status()).toBe(200);

  const specs = ftc.locator("dl.ftc-specs");
  const terms = ["Shooter", "Aiming", "Intake", "Protection", "Code"];
  await expect(specs.locator(".ftc-spec-key")).toHaveText(terms);
  if (!(await drawsReaperLive(page))) {
    // Stills only: the terms are plain text, nothing claims to show a part, nothing lights up.
    await expect(specs.getByRole("button")).toHaveCount(0);
    await expect(specs.locator("[aria-pressed]")).toHaveCount(0);
    await expect(specs.locator("[data-active]")).toHaveCount(0);
    await expect(ftc).not.toHaveAttribute("data-reaper-live");
    await expect(ftc.locator("canvas.reaper-canvas")).toHaveCount(0);
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

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];

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

// Resolves once the page has not scrolled for twenty frames. The page scrolls smoothly, so a
// control focused or scrolled to from far away is still being carried there for a moment. A
// smooth scroll also stalls while the main thread is busy (the exploded view builds its scene as
// it comes near), and Playwright can find a button steady in that pause and click where it was.
async function scrollIsStill(page: Page) {
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

test("the season ledger opens from the keyboard and lists every event", async ({ page }) => {
  await page.goto("/");
  const all = page.locator("#ftc details.ftc-all");
  const summary = all.locator("summary");
  // Closed on load: the short list of highlights leads, and the tables are not in the way.
  await expect(all).not.toHaveAttribute("open", "");
  await expect(all.locator("table.ftc-ledger").first()).toBeHidden();

  const announced = Number(((await summary.textContent()) ?? "").match(/\d+/)?.[0]);
  expect(announced).toBeGreaterThanOrEqual(21);

  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(all).toHaveAttribute("open", "");
  await expect(all.locator("table.ftc-ledger")).toHaveCount(3);
  // The heading promises a count; the tables have to deliver exactly that many rows.
  await expect(all.locator("table.ftc-ledger tbody tr")).toHaveCount(announced);
  await expect(all.locator("table.ftc-ledger tbody tr").last()).toBeVisible();

  await page.keyboard.press("Space");
  await expect(all).not.toHaveAttribute("open", "");
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

test("the footer repeats the section links and a way back to the top", async ({ page }) => {
  await page.goto("/");
  const footer = page.getByRole("navigation", { name: "Footer navigation" });
  await expect(footer.getByRole("link")).toHaveCount(NAV.length + 1);
  for (const [label, href] of [...NAV, ["Top", "#top"]]) {
    await expect(footer.getByRole("link", { name: label, exact: true })).toHaveAttribute("href", href);
  }
  // From the end of the page, a footer link lands on its section like the header does.
  for (const [label, id] of [["CAD", "cad"], ["Top", "top"]]) {
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

test("the path lab is inert until the page is live, and shows no dead controls without JavaScript", async ({
  page,
  browser,
  baseURL,
}) => {
  await page.goto("/");
  // Hydrated: the grid and the controls take part in the page again.
  await expect(page.locator("#playground .path-grid")).not.toHaveAttribute("inert");
  await expect(page.locator("#playground .lab-controls")).not.toHaveAttribute("inert");

  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const bare = await context.newPage();
  await bare.goto("/");
  const lab = bare.locator("#playground");
  // The explanation and the source stay. The 49 buttons, the two controls and the status line
  // that told a visitor to select cells would do nothing, so none of them is shown.
  await expect(lab.getByRole("heading", { level: 2, name: "Breadth-first search" })).toBeVisible();
  await expect(lab.locator(".lab-nojs")).toBeVisible();
  await expect(lab.locator(".lab-nojs")).toContainText("JavaScript");
  await expect(lab.getByRole("link", { name: "Source on GitHub" })).toBeVisible();
  await expect(lab.getByRole("button")).toHaveCount(0);
  await expect(lab.locator(".path-cell:visible")).toHaveCount(0);
  // Every dead control is also inert in the markup, for browsers that ignore the media query.
  await expect(lab.locator(".path-grid")).toHaveAttribute("inert", "");
  await expect(lab.locator(".lab-controls")).toHaveAttribute("inert", "");

  // The Copy address button writes to the clipboard from a script, so without one it would
  // be a button that does nothing. The mailto link above it is the way to write in.
  const contact = bare.locator("#contact");
  await expect(contact.getByRole("link", { name: "aryavora621@gmail.com" })).toBeVisible();
  await expect(contact.getByRole("button")).toHaveCount(0);
  await expect(contact.locator(".email-actions")).toBeHidden();
  await expect(contact.locator(".copy-feedback")).toBeHidden();
  // No control on the whole page is a button, since every button here needs a script.
  await expect(bare.locator("main button:visible")).toHaveCount(0);
  await context.close();
});

test("with JavaScript on, the Copy address button is shown", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.locator("#contact").getByRole("button", { name: "Copy address", exact: true }),
  ).toBeVisible();
});

test("film packs and images are cached for repeat visits, and the roboPet stills stay short", async ({
  request,
}) => {
  const cache = async (path: string) => (await request.get(path)).headers()["cache-control"] ?? "";
  // The film directory is named by a hash of its contents, so it may be kept forever.
  expect(FILM_FRAMES.base).toMatch(/\/sequence\/robopet\/[0-9a-f]{8}$/);
  const pack = await request.get(`${FILM_FRAMES.base}/lg-0.bin`);
  expect(pack.status()).toBe(200);
  expect(pack.headers()["cache-control"]).toMatch(/max-age=31536000.*immutable/);
  for (const path of ["/cad/ender5corexy-topsystem.webp", "/ftc/reaper.webp", "/projects/smartinvest.webp"]) {
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
});

test("core content and links remain visible without JavaScript", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Arya Vora");
  await expect(page.locator(".project-card")).toHaveCount(6);
  await expect(page.locator("#ftc table.ftc-ledger")).toHaveCount(3);
  await expect(page.locator("#robopet .film-beat")).toHaveCount(4);
  await expect(
    page.locator("#contact").getByRole("link", { name: "aryavora621@gmail.com" }),
  ).toHaveAttribute("href", /^mailto:/);
  await context.close();
});
