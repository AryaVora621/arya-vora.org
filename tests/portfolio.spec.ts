import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { DEFAULT_OBSTACLES, findPath, GOAL } from "../src/lib/playground";

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

test("home renders without runtime errors, duplicate IDs, or horizontal overflow", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "I makecode move.",
  );
  await expect(
    page.getByRole("button", { name: "Curious", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Happy", exact: true }).click();
  await expect(
    page.getByText("A small change. A little personality."),
  ).toBeVisible();
  for (const id of ["projects", "playground", "about", "contact"]) {
    await page.locator(`#${id}`).scrollIntoViewIfNeeded();
    await expect(page.locator(`#${id} h2`)).toBeVisible();
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const duplicates = await page
    .locator("[id]")
    .evaluateAll((elements) =>
      elements.map((e) => e.id).filter((id, i, all) => all.indexOf(id) !== i),
    );
  expect(duplicates).toEqual([]);
  expect(errors).toEqual([]);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: test.info().outputPath("portfolio-full.png"),
    fullPage: true,
    animations: "disabled",
  });
});

test("project filters, details, and repository search work together", async ({
  page,
}) => {
  await page.goto("/");
  const projects = page.locator("#projects");
  await projects.getByRole("button", { name: "Systems" }).click();
  await expect(projects.locator(".project-card")).toHaveCount(2);
  await expect(
    projects.getByRole("heading", { name: "notchTerm" }),
  ).toBeVisible();
  await projects
    .locator(".project-card")
    .first()
    .getByText("Under the hood")
    .click();
  await expect(projects.locator("details[open]")).toContainText(
    "Terminal automation requires macOS permissions",
  );
  await projects.getByRole("button", { name: "AI", exact: false }).click();
  await expect(projects.locator(".project-card")).toHaveCount(2);
  await expect(
    projects.getByRole("heading", { name: "OpenUltraCode" }),
  ).toBeVisible();
  await projects.getByRole("button", { name: /^All/ }).click();
  await expect(projects.locator(".project-card")).toHaveCount(6);
  await page
    .getByRole("searchbox", { name: "Search repositories" })
    .fill("notchTerm");
  await expect(page.locator(".repo-list > a")).toHaveCount(1);
  await expect(page.locator(".repo-list > a")).toHaveAttribute(
    "href",
    "https://github.com/AryaVora621/notchTerm",
  );
  await page.getByRole("searchbox").fill("no-such-repo-abc");
  await expect(page.getByText(/No matches for/)).toBeVisible();
  await page.getByRole("searchbox").fill("");
  await page
    .getByRole("button", { name: /Explore all .* repositories/ })
    .click();
  expect(await page.locator(".repo-list > a").count()).toBeGreaterThan(40);
  await page.getByRole("button", { name: "Show fewer repositories" }).click();
  await expect(page.locator(".repo-list > a")).toHaveCount(6);
});

test("pathfinding demo runs, handles a blocked start, and resets", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Clear walls" }).click();
  await page.getByRole("button", { name: "Find path", exact: true }).click();
  await expect(page.getByText(/12 moves .* Goal reached/)).toBeVisible();
  await page
    .getByRole("button", { name: "Row 1, column 2: open", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Row 2, column 1: open", exact: true })
    .click();
  await page.getByRole("button", { name: "Find path", exact: true }).click();
  await expect(
    page.getByText("No route available. Remove a wall and try again."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear walls" }).click();
  await expect(page.locator(".path-cell.wall")).toHaveCount(0);
  const cell = page.getByRole("button", {
    name: "Row 1, column 2: open",
    exact: true,
  });
  await cell.focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("button", { name: "Row 1, column 3: open", exact: true }),
  ).toBeFocused();
});

test("agent workflow completes, cancels, changes task, and replays", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("CHOOSE A TASK").selectOption("Audit a repository");
  await page.getByRole("button", { name: "Run workflow", exact: true }).click();
  await expect(page.getByRole("button", { name: "Running demo…", exact: true })).toBeDisabled();
  await expect(
    page.getByText("Workflow complete. Human review comes next."),
  ).toBeVisible();
  await expect(page.locator(".agent-pipeline .is-complete")).toHaveCount(4);
  await expect(
    page.getByText("Return findings with reproducible verification steps."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Replay workflow" }).click();
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.locator(".agent-pipeline .is-complete")).toHaveCount(0);
  await page.getByLabel("CHOOSE A TASK").selectOption("Build a feature");
  await expect(
    page.getByText("Ready. Choose a task and run the workflow."),
  ).toBeVisible();
});

test("command palette traps focus, searches, navigates, and restores focus", async ({
  page,
}) => {
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Open command palette" });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Search pages and projects" }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  expect(
    await page.evaluate(() => !!document.activeElement?.closest("dialog")),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await page.keyboard.press("Control+k");
  await page
    .getByRole("textbox", { name: "Search pages and projects" })
    .fill("playground");
  await page.keyboard.press("Enter");
  await expect(dialog).not.toBeVisible();
  await expect(page).toHaveURL(/#playground$/);
});

test("contact has honest email links and clipboard failure feedback", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  const contact = page.locator("#contact");
  await expect(
    contact.getByRole("link", { name: "Say hello" }),
  ).toHaveAttribute("href", "mailto:aryavora621@gmail.com");
  await contact
    .getByRole("button", { name: "Copy email", exact: true })
    .click();
  await expect(
    contact.getByText("Email address copied to clipboard."),
  ).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "aryavora621@gmail.com",
  );
  await page.evaluate(() => {
    Object.defineProperty(navigator.clipboard, "writeText", {
      value: () => Promise.reject(new Error("denied")),
    });
  });
  await contact.getByRole("button", { name: "Copied", exact: true }).click();
  await expect(contact.getByText(/Clipboard unavailable/)).toBeVisible();
  await expect(contact.locator("form")).toHaveCount(0);
});

test("reduced motion disables decorative animation and completes route without movement", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  expect(
    await page
      .locator(".hero-art .robot-body")
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
  await page.getByRole("button", { name: "Find path", exact: true }).click();
  await expect(page.getByText(/Goal reached/)).toBeVisible();
  await page.getByRole("button", { name: "Pause effects" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "paused");
  await expect(
    page.getByRole("button", { name: "Enable effects" }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("mobile navigation, section anchors, and small viewport layout", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "Mobile menu applies only to mobile viewport");
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  await page
    .locator("#portfolio-mobile-menu")
    .getByRole("link", { name: "Playground" })
    .click();
  await expect(page).toHaveURL(/#playground$/);
  await expect(
    page.getByRole("button", { name: "Open menu", exact: true }),
  ).toHaveAttribute("aria-expanded", "false");
  await page.setViewportSize({ width: 320, height: 740 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const outside = await page
    .locator("header a, header button, main a, main button, main input, main select")
    .evaluateAll((elements) =>
      elements
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && (r.left < -1 || r.right > innerWidth + 1);
        })
        .map((el) => el.textContent),
    );
  expect(outside).toEqual([]);
});

test("scroll effects respond to position and stop when paused", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-motion", "on");
  const art = page.locator(".hero-art");
  const initial = await art.evaluate((element) => getComputedStyle(element).transform);
  await page.evaluate(() => window.scrollTo({ top: 550, behavior: "instant" }));
  await expect.poll(() => art.evaluate((element) => getComputedStyle(element).transform)).not.toBe(initial);
  await page.getByRole("button", { name: "Pause effects" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "paused");
  expect(await art.evaluate((element) => getComputedStyle(element).transform)).toBe("none");
  expect(await page.evaluate(() => document.getAnimations().filter((animation) => animation.playState === "running").length)).toBe(0);
  await page.getByRole("button", { name: "Enable effects" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "on");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(() => art.evaluate((element) => getComputedStyle(element).transform)).toBe("none");
});

test("metadata, local assets, and internal link targets resolve", async ({ page, request }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Arya Vora | Robots, Software & Experiments");
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", "https://aryavora.com/portfolio-og.png");
  const card = await request.get("/portfolio-og.png");
  expect(card.status()).toBe(200);
  expect(card.headers()["content-type"]).toContain("image/png");
  expect((await card.body()).length).toBeGreaterThan(10000);
  const brokenAnchors = await page.locator('a[href^="#"]').evaluateAll((links) => links.map((link) => link.getAttribute("href")!).filter((hash) => !document.getElementById(hash.slice(1))));
  expect(brokenAnchors).toEqual([]);
});

test("automated accessibility checks for home and command dialog", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator("#contact").scrollIntoViewIfNeeded();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
  await page.getByRole("button", { name: "Open command palette" }).click();
  const dialog = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(dialog.violations).toEqual([]);
});

test("core content and links remain visible without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:3100/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator(".project-card")).toHaveCount(6);
  await page
    .locator(".project-card")
    .first()
    .getByText("Under the hood")
    .click();
  await expect(page.locator("details[open]")).toBeVisible();
  await expect(
    page.locator("#contact").getByRole("link", { name: "Say hello" }),
  ).toHaveAttribute("href", /^mailto:/);
  await context.close();
});
