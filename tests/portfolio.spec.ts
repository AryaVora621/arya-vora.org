import { expect, test, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { BUILD_LOG } from "../src/data/robopet";
import { CELL_STATES, DEFAULT_OBSTACLES, findPath, GOAL } from "../src/lib/playground";

// Copy rules from DESIGN.md section 12, checked against the rendered page rather than the source,
// so text assembled at runtime is covered too. "explored" is the BFS term and stays allowed.
const BANNED_WORDS = [
  "explore",
  "explores",
  "exploring",
  "unlock",
  "elevate",
  "seamless",
  "empower",
  "supercharge",
  "streamline",
  "delve",
  "journey",
  "passionate",
  "cutting-edge",
  "innovate",
  "innovative",
  "crafted",
  "curiosity",
  "on purpose",
  "under the hood",
  "behind the",
  "the space in between",
  "let's talk",
  "say hello",
  "worth building",
  "built with",
  "brain",
  "from the ground up",
  "end to end",
  "challenge",
  "clearer",
  "dependable",
  "echoed",
  "foster",
  "leverage",
  "matters",
  "multifaceted",
  "practical",
  "prioritize",
  "quietly",
  "steady",
  "universally",
  "additionally",
  "align with",
  "boasts",
  "crucial",
  "pivotal",
  "robust",
  "showcase",
  "highlight",
  "underscore",
  "testament",
  "tapestry",
  "vibrant",
  "intricate",
  "meticulous",
  "landscape",
  "enhance",
  "serves as",
  "junior",
  "robotics engineer",
  "ai engineer",
  "building in public",
  "work in progress",
  "class of 2026",
];
const COLOR_WORDS = [
  "green",
  "violet",
  "purple",
  "lime",
  "teal",
  "blue",
  "red",
  "orange",
  "yellow",
  "pink",
  "cyan",
  "magenta",
  "indigo",
  "amber",
  "emerald",
];
// SwiftShader gives headless Chromium WebGL. The stage still treats it as a software GPU and
// shows its still, unless the URL carries ?force3d, which the live model tests use.
test.use({ launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] } });

const escape = (word: string) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const BANNED = new RegExp(`\\b(${[...BANNED_WORDS, ...COLOR_WORDS].map(escape).join("|")})\\b`, "i");
// Em dash, en dash, the arrows block, middle dot, bullet, and " / " used as a separator.
const BANNED_CHARACTERS = /[–—←-⇿·•]| \/ /;

async function noHorizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
}

// Resolves a color token to the rgb() string the browser computes for it.
async function tokenColor(page: Page, token: string) {
  return page.evaluate((name) => {
    const probe = document.createElement("span");
    probe.style.color = `var(${name})`;
    document.body.append(probe);
    const value = getComputedStyle(probe).color;
    probe.remove();
    return value;
  }, token);
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
      Math.abs((from % 7) - (to % 7)) + Math.abs(Math.floor(from / 7) - Math.floor(to / 7)),
    ).toBe(1);
    expect(walls.has(to)).toBe(false);
  }
  expect(findPath(new Set([1, 7])).path).toEqual([]);
  expect(findPath(new Set([0])).path).toEqual([]);
  expect(findPath(new Set(), 0, 0, 1).path).toEqual([0]);
  expect(findPath(new Set(), 0, 1, 0).path).toEqual([]);
});

test("home renders its sections without runtime errors, duplicate ids or broken anchors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/");
  await expect(page).toHaveTitle("Arya Vora");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Arya Vora");
  await expect(page.locator("h1")).toHaveCount(1);
  for (const [id, heading] of [
    ["robopet", "roboPet"],
    ["projects", "Other projects"],
    ["pathfinding", "Breadth-first search"],
    ["about", "About"],
    ["contact", "Contact"],
  ]) {
    const section = page.locator(`section#${id}`);
    await expect(section.locator("h2")).toHaveText(heading);
    const labelledBy = await section.getAttribute("aria-labelledby");
    expect(await section.locator("h2").getAttribute("id")).toBe(labelledBy);
  }
  await expect(page.locator("#projects article")).toHaveCount(5);
  await expect(page.locator("#robopet .robopet-part-name")).toHaveCount(7);
  const duplicates = await page
    .locator("[id]")
    .evaluateAll((elements) =>
      elements.map((e) => e.id).filter((id, i, all) => all.indexOf(id) !== i),
    );
  expect(duplicates).toEqual([]);
  const brokenAnchors = await page
    .locator('a[href^="#"]')
    .evaluateAll((links) =>
      links
        .map((link) => link.getAttribute("href")!)
        .filter((hash) => !document.getElementById(hash.slice(1))),
    );
  expect(brokenAnchors).toEqual([]);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  expect(await noHorizontalOverflow(page)).toBe(true);
  expect(errors).toEqual([]);
});

test("no visible text, label or metadata uses a banned word, color word or character", async ({
  page,
}) => {
  await page.goto("/");
  const strings = await page.evaluate(() => {
    const found: string[] = [document.title];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const parent = node.parentElement;
      if (parent && ["SCRIPT", "STYLE", "NOSCRIPT"].includes(parent.tagName)) continue;
      const text = node.textContent?.trim();
      if (text) found.push(text);
    }
    for (const element of document.querySelectorAll("[alt], [aria-label], [title]")) {
      for (const name of ["alt", "aria-label", "title"]) {
        const value = element.getAttribute(name);
        if (value) found.push(value);
      }
    }
    for (const meta of document.querySelectorAll("meta[name='description'], meta[property^='og:'], meta[name^='twitter:']")) {
      const content = meta.getAttribute("content");
      if (content && !/^https?:/.test(content)) found.push(content);
    }
    return found;
  });
  expect(strings.length).toBeGreaterThan(50);
  expect(strings.filter((text) => BANNED.test(text))).toEqual([]);
  expect(strings.filter((text) => BANNED_CHARACTERS.test(text))).toEqual([]);
});

test("the legend lists exactly the CELL_STATES labels", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#pathfinding .pathfinding-legend-label")).toHaveText(
    Object.values(CELL_STATES).map((state) => state.label),
  );
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`route cells are drawn in the --ink token (${colorScheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await page.goto("/");
    await page.getByRole("button", { name: "Find path", exact: true }).click();
    const route = page.locator("#pathfinding .pathfinding-cell.pathfinding-state-route");
    await expect(route.first()).toBeVisible();
    const dot = await route
      .first()
      .evaluate((cell) => getComputedStyle(cell, "::after").backgroundColor);
    expect(dot).toBe(await tokenColor(page, "--ink"));
  });
}

test("breadth-first search runs, reports a blocked goal and keeps arrow keys in their row", async ({
  page,
}) => {
  await page.goto("/");
  const section = page.locator("#pathfinding");
  const status = section.getByRole("status");
  await expect(status).toHaveText("Select cells to add walls.");
  await section.getByRole("button", { name: "Clear walls" }).click();
  await section.getByRole("button", { name: "Find path", exact: true }).click();
  await expect(status).toHaveText(/^12 moves, \d+ cells explored\.$/);
  await expect(section.locator(".pathfinding-cell.pathfinding-state-route")).toHaveCount(11);
  await expect(section.getByRole("button", { name: "Run again", exact: true })).toBeVisible();
  // Clearing the walls also clears the run, so the cell labels go back to their positions only.
  await section.getByRole("button", { name: "Clear walls" }).click();
  await expect(status).toHaveText("Select cells to add walls.");
  await section.getByRole("button", { name: "Row 1, column 2", exact: true }).click();
  await section.getByRole("button", { name: "Row 2, column 1", exact: true }).click();
  await expect(section.locator(".pathfinding-cell.pathfinding-state-wall")).toHaveCount(2);
  await section.getByRole("button", { name: /^(Find path|Run again)$/ }).click();
  await expect(status).toHaveText("No route. Remove a wall and try again.");
  await section.getByRole("button", { name: "Clear walls" }).click();
  await expect(section.locator(".pathfinding-cell.pathfinding-state-wall")).toHaveCount(0);
  const lastInRow = section.getByRole("button", { name: "Row 2, column 7", exact: true });
  await lastInRow.focus();
  await page.keyboard.press("ArrowRight");
  await expect(lastInRow).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(section.getByRole("button", { name: "Row 2, column 6", exact: true })).toBeFocused();
});

// Headless Chromium renders WebGL in software, so by default the figure keeps its still.
test("with the still, the toggle switches it and a parts row swaps in that part's still", async ({
  page,
}) => {
  await page.goto("/");
  const section = page.locator("#robopet");
  const toggle = section.locator(".robopet-toggle");
  const still = section.locator(".robopet-stage-still img");
  await toggle.scrollIntoViewIfNeeded();
  await expect(still).toHaveCount(1);
  await expect(toggle).toHaveText("Show exploded view");
  await toggle.click();
  await expect(toggle).toHaveText("Show assembled view");
  await expect(still).toHaveAttribute("alt", /pulled apart/);
  await toggle.click();
  await expect(toggle).toHaveText("Show exploded view");
  // Each part has its own still, so the rows are buttons here too and a press changes the figure.
  await expect(section.locator(".robopet-part-label")).toHaveCount(0);
  await expect(section.locator(".robopet-part-button")).toHaveCount(7);
  const legs = section.getByRole("button", { name: "Legs", exact: true });
  await legs.click();
  await expect(legs).toHaveAttribute("aria-pressed", "true");
  await expect(still).toHaveAttribute("src", /\/robopet\/v1\/assembled-legs-light\.webp$/);
  await expect(still).toHaveAttribute("alt", /legs filled in/);
  // Parts inside the shell take the model apart, so the still is the exploded one.
  await section.getByRole("button", { name: "Power", exact: true }).click();
  await expect(still).toHaveAttribute("src", /\/robopet\/v1\/exploded-power-light\.webp$/);
  await legs.click();
  await expect(legs).toHaveAttribute("aria-pressed", "true");
  await legs.click();
  await expect(legs).toHaveAttribute("aria-pressed", "false");
  await expect(still).toHaveAttribute("src", /\/robopet\/v1\/exploded-light\.webp$/);
});

test("with the still, no Tab stop stands in for the model", async ({ page }) => {
  await page.goto("/");
  const section = page.locator("#robopet");
  const toggle = section.locator(".robopet-toggle");
  await expect(toggle).toBeEnabled();
  // A stand-in stop would appear a moment after hydration, so give it that long.
  await page.waitForTimeout(800);
  await expect(section.getByRole("group", { name: /3D model/ })).toHaveCount(0);
  await section.getByRole("link", { name: "roboPet repository" }).focus();
  await page.keyboard.press("Tab");
  await expect(toggle).toBeFocused();
});

// Screenshots of the stage, so the model tests compare what a visitor sees.
async function stagePixels(page: Page) {
  return page.locator("#robopet .robopet-stage").screenshot({ animations: "disabled" });
}

async function settledStagePixels(page: Page) {
  let previous = await stagePixels(page);
  for (let attempt = 0; attempt < 20; attempt++) {
    await page.waitForTimeout(150);
    const next = await stagePixels(page);
    if (next.equals(previous)) return next;
    previous = next;
  }
  return previous;
}

test.describe("live model", () => {
  async function openLiveModel(page: Page) {
    await page.goto("/?force3d");
    const section = page.locator("#robopet");
    await section.locator(".robopet-stage").scrollIntoViewIfNeeded();
    await expect(section.locator(".robopet-stage canvas")).toHaveCount(1, { timeout: 20000 });
    await expect(section.locator(".robopet-part-button")).toHaveCount(7);
    return section;
  }

  test("a parts-table button sets aria-pressed, brings the model into view and the toggle switches its label", async ({
    page,
    isMobile,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const section = await openLiveModel(page);
    const toggle = section.locator(".robopet-toggle");
    await expect(toggle).toHaveText("Show exploded view");
    await toggle.click();
    await expect(toggle).toHaveText("Show assembled view");
    await toggle.click();
    await expect(toggle).toHaveText("Show exploded view");

    const legs = section.getByRole("button", { name: "Legs", exact: true });
    const power = section.getByRole("button", { name: "Power", exact: true });
    const stage = section.locator(".robopet-stage");
    const readout = section.locator(".robopet-figure-readout");
    await expect(legs).toHaveAttribute("aria-pressed", "false");
    await legs.scrollIntoViewIfNeeded();
    const before = await stagePixels(page);
    await legs.click();
    await expect(legs).toHaveAttribute("aria-pressed", "true");
    await expect(toggle).toHaveText("Show exploded view");
    // The press is visible on the stage, and on a phone the stage is scrolled back on screen,
    // with the part's name and note under it.
    await expect(stage).toBeInViewport({ ratio: 1 });
    expect((await settledStagePixels(page)).equals(before)).toBe(false);
    if (isMobile) await expect(readout).toHaveText(/^Legs\. .*MG996R/);
    else await expect(readout).toHaveCount(0);
    // The battery sits inside the shell, so selecting it takes the model apart.
    await power.click();
    await expect(power).toHaveAttribute("aria-pressed", "true");
    await expect(legs).toHaveAttribute("aria-pressed", "false");
    await expect(toggle).toHaveText("Show assembled view");
    await power.click();
    await expect(power).toHaveAttribute("aria-pressed", "false");
    await expect(readout).toHaveCount(0);
  });

  test("the model turns with the arrow keys and Home puts it back", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const section = await openLiveModel(page);
    const canvas = section.locator(".robopet-stage canvas");
    await expect(canvas).toHaveAttribute("tabindex", "0");
    await expect(canvas).toHaveAttribute("aria-label", /arrow keys/);
    await canvas.focus();
    await expect(canvas).toBeFocused();
    const start = await settledStagePixels(page);
    await page.keyboard.press("ArrowRight");
    const turned = await settledStagePixels(page);
    expect(turned.equals(start)).toBe(false);
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    expect((await settledStagePixels(page)).equals(turned)).toBe(false);
    await page.keyboard.press("Home");
    expect((await settledStagePixels(page)).equals(start)).toBe(true);
  });

  // Fully inside the screen, in viewport pixels.
  async function onScreen(page: Page, target: Locator) {
    const box = await target.boundingBox();
    const height = await page.evaluate(() => innerHeight);
    return box !== null && box.y >= 0 && box.y + box.height <= height;
  }

  test("Tab from the repository link reaches the model before the toggle, and Shift+Tab walks back", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/?force3d");
    const section = page.locator("#robopet");
    const link = section.getByRole("link", { name: "roboPet repository" });
    const canvas = section.locator(".robopet-stage canvas");
    const toggle = section.getByRole("button", { name: "Show exploded view" });
    const standIn = section.getByRole("group", { name: /3D model/ });
    // The film sits between the link and the stage, so the canvas does not exist yet when Tab
    // leaves the link. A stop has to stand in for it, and pass focus on once the canvas loads.
    await expect(standIn).toHaveAttribute("tabindex", "0");
    await link.focus();
    await expect(canvas).toHaveCount(0);
    await page.keyboard.press("Tab");
    await expect(canvas).toBeFocused({ timeout: 20000 });
    await expect(standIn).toHaveCount(0);
    await page.keyboard.press("Tab");
    await expect(toggle).toBeFocused();
    // The canvas is the stop on the way back, and the stand-in is gone, so Shift+Tab does not bounce.
    await page.keyboard.press("Shift+Tab");
    await expect(canvas).toBeFocused();
    const start = await settledStagePixels(page);
    await page.keyboard.press("ArrowRight");
    expect((await settledStagePixels(page)).equals(start)).toBe(false);
    await page.keyboard.press("Shift+Tab");
    await expect(link).toBeFocused();
  });

  test("a keyboard press on a row far from the model keeps the row on screen", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const section = await openLiveModel(page);
    const chassis = section.getByRole("button", { name: "Chassis", exact: true });
    await chassis.scrollIntoViewIfNeeded();
    await chassis.focus();
    await page.keyboard.press("Enter");
    await expect(chassis).toHaveAttribute("aria-pressed", "true");
    await expect(section.locator(".robopet-figure-readout")).toHaveText(/^Chassis\./);
    // The page follows layout a frame or two after the press, so let it settle before looking.
    await page.waitForTimeout(700);
    expect(await onScreen(page, chassis)).toBe(true);
    expect(await onScreen(page, section.locator(".robopet-stage"))).toBe(false);
  });

  test("a tap on a row shows the model, and keeps the row too when both fit", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const section = await openLiveModel(page);
    const stage = section.locator(".robopet-stage");
    const shell = section.getByRole("button", { name: "Shell", exact: true });
    await shell.scrollIntoViewIfNeeded();
    await shell.click();
    await expect.poll(async () => (await onScreen(page, stage)) && (await onScreen(page, shell))).toBe(true);
    const chassis = section.getByRole("button", { name: "Chassis", exact: true });
    await chassis.scrollIntoViewIfNeeded();
    await chassis.click();
    await expect.poll(() => onScreen(page, stage)).toBe(true);
  });

  test("a pressed parts row still reads as pressed in forced colors", async ({ page }) => {
    await page.emulateMedia({ forcedColors: "active" });
    const section = await openLiveModel(page);
    const shell = section.getByRole("button", { name: "Shell", exact: true });
    const legs = section.getByRole("button", { name: "Legs", exact: true });
    await legs.scrollIntoViewIfNeeded();
    await legs.click();
    await page.mouse.move(0, 0);
    const look = (button: typeof legs) =>
      button.evaluate((element) => {
        const style = getComputedStyle(element);
        return [style.backgroundColor, style.color, style.borderTopWidth].join(" ");
      });
    expect(await look(legs)).not.toBe(await look(shell));
  });

  test("hovering a parts row looks different from pressing one", async ({ page, isMobile }) => {
    test.skip(isMobile, "phones have no hover");
    // Instant scrolling, so the hover lands on a button that has stopped moving.
    await page.emulateMedia({ reducedMotion: "reduce" });
    const section = await openLiveModel(page);
    const shell = section.getByRole("button", { name: "Shell", exact: true });
    const camera = section.getByRole("button", { name: "PiCam", exact: true });
    await shell.click();
    await camera.hover();
    await page.waitForTimeout(300);
    const look = (button: typeof shell) =>
      button.evaluate((element) => {
        const style = getComputedStyle(element);
        return [style.backgroundColor, style.color, style.textDecorationLine].join(" ");
      });
    expect(await look(camera)).not.toBe(await look(shell));
  });
});

test("contact copies the address and reports a clipboard failure", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  const contact = page.locator("#contact");
  await expect(contact.getByRole("link", { name: "aryavora621@gmail.com" })).toHaveAttribute(
    "href",
    "mailto:aryavora621@gmail.com",
  );
  await contact.getByRole("button", { name: "Copy email address" }).click();
  await expect(contact.getByRole("button", { name: "Copied", exact: true })).toBeVisible();
  await expect(contact.getByRole("status")).toHaveText("Email address copied.");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("aryavora621@gmail.com");
  await page.evaluate(() => {
    Object.defineProperty(navigator.clipboard, "writeText", {
      value: () => Promise.reject(new Error("denied")),
    });
  });
  await contact.getByRole("button", { name: "Copied", exact: true }).click();
  await expect(contact.getByRole("button", { name: "Copy failed", exact: true })).toBeVisible();
  // Each profile line is one link, name and handle together, so even "X" is a full target.
  await expect(contact.getByRole("link", { name: "LinkedIn: aryavora" })).toHaveAttribute(
    "href",
    "https://linkedin.com/in/aryavora",
  );
  await expect(contact.getByRole("link", { name: "X: aryavora621", exact: true })).toHaveAttribute(
    "href",
    "https://x.com/aryavora621",
  );
});

test("no horizontal overflow at 320px and every control stays on screen", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  expect(await noHorizontalOverflow(page)).toBe(true);
  const outside = await page
    .locator("header a, main a, main button, footer a")
    .evaluateAll((elements) =>
      elements
        .filter((element) => {
          const box = element.getBoundingClientRect();
          return box.width > 0 && (box.left < -1 || box.right > innerWidth + 1);
        })
        .map((element) => element.textContent),
    );
  expect(outside).toEqual([]);
  const board = await page.locator("#pathfinding .pathfinding-board").boundingBox();
  expect(board!.x).toBeGreaterThanOrEqual(15);
  expect(board!.x + board!.width).toBeLessThanOrEqual(320 - 15);
});

// Seven cells cannot be 44px each inside a 320px screen's gutters, so under 360px the board is
// 6x6; from 360px up it is the 7x7 board.
for (const [width, size] of [
  [320, 6],
  [360, 7],
] as const) {
  test(`BFS cells are at least 44px at ${width}px and the ${size}x${size} board searches`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 740 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const section = page.locator("#pathfinding");
    const cells = section.locator(".pathfinding-cell");
    await expect(cells).toHaveCount(size * size);
    await expect(section.getByRole("group")).toHaveAccessibleName(
      `Grid of ${size * size} cells. Select a cell to add or remove a wall.`,
    );
    for (const cell of await cells.all()) {
      const box = await cell.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    await section.getByRole("button", { name: "Find path", exact: true }).click();
    // Both default boards leave only the long way round, along the left and bottom edges.
    const moves = 2 * (size - 1);
    await expect(section.getByRole("status")).toHaveText(
      new RegExp(`^${moves} moves, \\d+ cells explored\\.$`),
    );
    const lastInRow = section.getByRole("button", { name: `Row 2, column ${size}`, exact: true });
    await lastInRow.focus();
    await page.keyboard.press("ArrowRight");
    await expect(lastInRow).toBeFocused();
  });
}

for (const colorScheme of ["light", "dark"] as const) {
  test(`axe finds no violations (${colorScheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto("/");
    await page.locator("#contact").scrollIntoViewIfNeeded();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`)).toEqual([]);
  });
}

test("reduced motion: nothing animates, the film is a still and the search finishes at once", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const film = page.locator("#robopet .film");
  await expect(film).toHaveAttribute("data-mode", "static");
  await expect(film.locator("canvas")).toHaveCount(0);
  const poster = film.locator("img.film-poster");
  await poster.scrollIntoViewIfNeeded();
  await expect(poster).toBeVisible();
  const filmBox = await film.boundingBox();
  const viewport = page.viewportSize()!;
  expect(filmBox!.height).toBeLessThan(viewport.height * 1.5);
  await page.getByRole("button", { name: "Find path", exact: true }).click();
  await expect(page.locator("#pathfinding").getByRole("status")).toHaveText(
    /^\d+ moves, \d+ cells explored\.$/,
  );
  // The click hovers the button. Under reduced motion its colour change has no transition, so
  // nothing is created for it; two frames let the hover style settle before the count.
  await page.evaluate(
    () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
  );
  expect(
    await page.evaluate(
      () => document.getAnimations().filter((animation) => animation.playState === "running").length,
    ),
  ).toBe(0);
});

test("with motion allowed the film is one pinned, scrubbed act", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const film = page.locator("#robopet .film");
  await expect(film).toHaveAttribute("data-mode", "scrub");
  await expect(film.locator("canvas")).toHaveCount(1);
  expect(await film.locator(".film-figure").evaluate((el) => getComputedStyle(el).position)).toBe(
    "sticky",
  );
  const pinned = await page.evaluate(
    () =>
      [...document.querySelectorAll("main *")].filter(
        (el) => getComputedStyle(el).position === "sticky",
      ).length,
  );
  // The film figure, plus the model figure that sits beside the parts table on wide screens.
  expect(pinned).toBeLessThanOrEqual(2);
});

// The film draws only once a pack has arrived. Until then, and for good if the packs never come,
// the poster is what the visitor sees, and a failed film does not pin a screen of blank scrolling.
test("if the film packs fail, the poster stays and the figure does not pin", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.route("**/sequence/robopet/**/*.bin", (route) => route.abort());
  await page.goto("/");
  const film = page.locator("#robopet .film");
  await film.scrollIntoViewIfNeeded();
  await expect(film).toHaveAttribute("data-failed", "");
  await expect(film).not.toHaveAttribute("data-ready", "");
  const poster = film.locator("img.film-poster");
  await expect(poster).toBeVisible();
  await expect
    .poll(() => poster.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
    .toBe(true);
  expect(await film.locator(".film-figure").evaluate((el) => getComputedStyle(el).position)).toBe(
    "static",
  );
  // The unpinned film is no taller than its plate and caption, so there is no blank run.
  const box = await film.boundingBox();
  expect(box!.height).toBeLessThan(page.viewportSize()!.height);
});

test("the poster shows until the first frame is drawn, then the canvas takes over", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/sequence/robopet/**/*.bin", async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto("/");
  const film = page.locator("#robopet .film");
  await film.scrollIntoViewIfNeeded();
  const poster = film.locator("img.film-poster");
  await expect(poster).toBeVisible();
  await expect(film).not.toHaveAttribute("data-ready", "");
  // Until it has drawn, the canvas is hidden from assistive technology so the image is read once.
  await expect(film.locator("canvas")).toHaveAttribute("aria-hidden", "true");
  release();
  await expect(film).toHaveAttribute("data-ready", "");
  await expect(poster).toBeHidden();
  await expect(film.locator("canvas")).not.toHaveAttribute("aria-hidden", "true");
});

test("core content and links are there without JavaScript, and no control pretends to work", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto("/");
  // Every button that needs script renders disabled or not at all, the parts rows are plain
  // names, and the search says why it cannot run.
  expect(await page.locator("button").count()).toBeGreaterThan(0);
  await expect(page.locator("button:not([disabled])")).toHaveCount(0);
  await expect(page.locator("#robopet .robopet-part-button")).toHaveCount(0);
  await expect(page.locator("#contact .contact-copy")).toHaveCount(0);
  // Playwright's text matcher skips <noscript>, so this reads the rendered text instead.
  await expect(page.locator("#pathfinding").getByRole("status")).toHaveText(
    "The grid shows the starting walls. The search needs JavaScript to run.",
    { useInnerText: true },
  );
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Arya Vora");
  await expect(page.locator("#robopet .film img.film-poster")).toHaveCount(1);
  await expect(page.locator("#robopet .robopet-stage-still img")).toHaveCount(1);
  await expect(page.locator("#robopet .robopet-part")).toHaveCount(7);
  await expect(page.locator("#robopet .robopet-log-entry")).toHaveCount(BUILD_LOG.length);
  await expect(page.locator("#projects article")).toHaveCount(5);
  await expect(page.locator("#pathfinding .pathfinding-cell")).toHaveCount(49);
  // The About copy is a draft Arya will rewrite, so only its presence is pinned, not its length.
  expect(await page.locator("#about p").count()).toBeGreaterThan(0);
  await expect(
    page.locator("#contact").getByRole("link", { name: "aryavora621@gmail.com" }),
  ).toHaveAttribute("href", /^mailto:/);
  await context.close();
});

test("metadata, the social card and the 404 page resolve", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    /class of 2028 at John P\. Stevens High School in Edison, NJ/,
  );
  const ogImage = await page.locator('meta[property="og:image"]').getAttribute("content");
  expect(ogImage).toMatch(/^https:\/\/www\.arya-vora\.org\/opengraph-image/);
  const card = await request.get(new URL(ogImage!).pathname + new URL(ogImage!).search);
  expect(card.status()).toBe(200);
  expect(card.headers()["content-type"]).toContain("image/png");
  for (const path of ["/favicon.ico", "/icon.svg", "/apple-icon.png"]) {
    expect((await request.get(path)).status()).toBe(200);
  }
  const missing = await page.goto("/no-such-page");
  expect(missing?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "There is no page at this address.",
  );
  await expect(page.getByRole("link", { name: "Go to the home page" })).toHaveAttribute("href", "/");
});
