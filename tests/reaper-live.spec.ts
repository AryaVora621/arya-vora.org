import { expect, test } from "@playwright/test";

// The live Reaper model needs WebGL, and headless browsers have no GPU. Chromium's software
// rasteriser (SwiftShader) stands in for one here, and ?force3d tells the page to draw on it
// anyway; the page itself keeps the stills on software WebGL. SwiftShader is a Chromium switch,
// so the other engines skip this file. The still fallback is covered in portfolio.spec.ts and
// projects.spec.ts.
test.skip(({ browserName }) => browserName !== "chromium", "SwiftShader WebGL is Chromium only");
test.use({
  launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] },
});

type MarkedCanvas = HTMLCanvasElement & { __mark?: number };

test("the live Reaper model on its page turns to the part a spec row names, and keeps its canvas across a theme change", async ({
  page,
}) => {
  // A CPU rasteriser takes seconds to compile and draw the first frame, and several times that
  // while the rest of the suite is running beside it (alone this test takes about ten seconds).
  // The budgets below are for that busy case; they cost nothing when the model arrives sooner.
  test.setTimeout(240000);
  // Reduced motion draws each change in one frame, so the comparison does not race an ease.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/projects/reaper?force3d");
  const block = page.locator("section.ftc-section", { has: page.locator("dl.ftc-specs") });
  const dock = block.locator(".ftc-model-dock");
  const shooter = block.locator("dl.ftc-specs").getByRole("button", { name: "Shooter", exact: true });
  await dock.scrollIntoViewIfNeeded();
  await expect(block).toHaveAttribute("data-reaper-live", "", { timeout: 120000 });
  await expect(dock).toHaveAttribute("data-live", "true", { timeout: 60000 });
  // The page has one model, so one canvas, in the dock beside the rows.
  await expect(page.locator("canvas.reaper-canvas")).toHaveCount(1);
  const canvas = dock.locator("canvas.reaper-canvas");
  await expect(canvas).toHaveCount(1);
  await canvas.evaluate((element) => {
    (element as MarkedCanvas).__mark = 1;
  });

  const before = await dock.screenshot();
  await shooter.click();
  await expect(shooter).toHaveAttribute("aria-pressed", "true");
  await expect
    .poll(async () => Buffer.compare(await dock.screenshot(), before), { timeout: 60000 })
    .not.toBe(0);

  // A click on the empty space around the robot clears the selection.
  await canvas.click({ position: { x: 4, y: 4 } });
  await expect(shooter).toHaveAttribute("aria-pressed", "false");

  // The theme recolors the same model in place: the canvas is the one from before.
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("group", { name: "Theme" })
    .getByRole("button", { name: "Violet", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "violet");
  await dock.scrollIntoViewIfNeeded();
  await expect(dock).toHaveAttribute("data-live", "true", { timeout: 60000 });
  expect(
    await dock
      .locator("canvas.reaper-canvas")
      .evaluate((element) => (element as MarkedCanvas).__mark),
  ).toBe(1);
});

test("the home page's Reaper highlight draws the live model and says it can be turned", async ({
  page,
}) => {
  test.setTimeout(240000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?force3d");
  const ftc = page.locator("#ftc");
  const dock = ftc.locator("[data-reaper-dock]");
  await dock.scrollIntoViewIfNeeded();
  await expect(ftc).toHaveAttribute("data-reaper-live", "", { timeout: 120000 });
  await expect(dock).toHaveAttribute("data-live", "true", { timeout: 60000 });
  await expect(ftc.locator("canvas.reaper-canvas")).toHaveCount(1);
  await expect(ftc.getByText("Drag to turn it.")).toBeVisible();
  // Live, the still steps back behind the canvas.
  await expect
    .poll(() =>
      dock.evaluate((element) =>
        Number(getComputedStyle(element.querySelector(".reaper-still")!).opacity),
      ),
    )
    .toBe(0);
});
