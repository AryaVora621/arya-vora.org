import { expect, test } from "@playwright/test";

test("Rebuilding Reaper renders the 7 authentic subsystems and placed parts counter", async ({
  page,
  isMobile,
}) => {
  await page.goto("/projects/reaper");

  const rebuild = page.locator("section[aria-label='Rebuilding Reaper interactive CAD']");
  await expect(rebuild).toBeVisible();

  // Heading is visible on both desktop and mobile
  await expect(rebuild.getByRole("heading", { name: "Rebuilding Reaper" })).toBeVisible();

  if (!isMobile) {
    // Editorial lede on desktop
    await expect(rebuild.getByText("152 CAD components across seven primary subsystems")).toBeVisible();

    // 7 authentic subsystems listed
    const items = rebuild.locator("ol").first().locator("li");
    await expect(items).toHaveCount(7);
    await expect(items.nth(0)).toContainText("Drivetrain");
    await expect(items.nth(0)).toContainText("34 parts");
    await expect(items.nth(1)).toContainText("Intake");
    await expect(items.nth(1)).toContainText("28 parts");
    await expect(items.nth(2)).toContainText("Transfer");
    await expect(items.nth(2)).toContainText("16 parts");
    await expect(items.nth(3)).toContainText("Shooter");
    await expect(items.nth(3)).toContainText("26 parts");
    await expect(items.nth(4)).toContainText("Limelight 3A");
    await expect(items.nth(4)).toContainText("8 parts");
    await expect(items.nth(5)).toContainText("Protection");
    await expect(items.nth(5)).toContainText("18 parts");
    await expect(items.nth(6)).toContainText("Electronics");
    await expect(items.nth(6)).toContainText("22 parts");
  }

  // Active detail card and parts placed counter
  const counter = rebuild.locator("output");
  await expect(counter).toBeVisible();
});

test("Rebuilding Reaper exposes the CAD-derived mechanical assembly sequence", async ({ page, isMobile }) => {
  await page.goto("/projects/reaper");

  const rebuild = page.locator("section[aria-label='Rebuilding Reaper interactive CAD']");
  if (!isMobile) {
    await expect(rebuild.getByText("26 CAD-derived mechanical assemblies")).toBeVisible();
  }

  await expect(rebuild.getByText("Docking now: U-channel base rails")).toBeVisible();

  const assemblyQueue = rebuild.locator("ol[aria-label='Assembly module queue']");
  await expect(assemblyQueue).toHaveCount(1);
  await expect(assemblyQueue.getByRole("listitem")).toHaveCount(26);
  await expect(assemblyQueue).toContainText("U-channel base rails");
  await expect(assemblyQueue).toContainText("Dual flywheel with weights");
  await expect(assemblyQueue).toContainText("Control and expansion hubs");
});

test("Rebuilding Reaper uses the project shell gutter and a feathered 3D viewport", async ({ page }) => {
  await page.goto("/projects/reaper");

  const rebuild = page.locator("section[aria-label='Rebuilding Reaper interactive CAD']");
  const sharedShell = page.locator(".site-shell").first();
  const rebuildBox = await rebuild.boundingBox();
  const shellBox = await sharedShell.boundingBox();

  expect(rebuildBox).not.toBeNull();
  expect(shellBox).not.toBeNull();
  expect(rebuildBox?.x).toBeCloseTo(shellBox?.x ?? 0, 0);
  expect(rebuildBox?.width).toBeCloseTo(shellBox?.width ?? 0, 0);

  const canvas = rebuild.locator("canvas");
  await expect(canvas).toHaveCSS("mask-image", /linear-gradient/);
});

test("prefers-reduced-motion displays complete static assembly and descriptions across all viewports", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/projects/reaper");

  const rebuild = page.locator("section[aria-label='Rebuilding Reaper interactive CAD']");
  await expect(rebuild).toBeVisible();

  // In reduced-motion mode, all 7 subsystem items show done state and their descriptions are rendered
  const items = rebuild.locator("ol").first().locator("li");
  await expect(items).toHaveCount(7);
  for (let i = 0; i < 7; i++) {
    await expect(items.nth(i)).toHaveAttribute("data-state", "done");
  }

  // Counter shows full count
  await expect(rebuild.locator("output")).toHaveText("152");
});
