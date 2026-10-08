import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("games subdomain host serves the games section", async ({ request }) => {
  const headers = { host: "games.arya-vora.org" };
  const index = await request.get("/", { headers });
  expect(await index.text()).toContain("<title>Games | Arya Vora</title>");
  const game = await request.get("/stat-line", { headers });
  expect(await game.text()).toContain("<title>Stat Line | Arya Vora Games</title>");
  const asset = await request.get("/favicon.svg", { headers });
  expect(asset.headers()["content-type"]).toContain("image/svg");
  const home = await request.get("/");
  expect(await home.text()).toContain("Robots, Software &amp; Experiments");
});

test("games index links to every game and passes axe", async ({ page }) => {
  await page.goto("/games");
  await expect(page.locator(".games-card")).toHaveCount(3);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("career ladder plays to a game over", async ({ page }) => {
  await page.goto("/games/career-ladder");
  await page.getByRole("button", { name: "Start" }).click();
  for (let i = 0; i < 60; i++) {
    await page.locator(".ladder-card").last().click();
    if (await page.getByRole("button", { name: "Play again" }).count()) break;
    await page.getByRole("button", { name: "Next matchup" }).click();
  }
  await expect(page.getByRole("status")).toContainText("Run over at");
});

test("stat line runs ten rounds and keeps a best score", async ({ page }) => {
  await page.goto("/games/stat-line");
  await page.getByRole("button", { name: "Start" }).click();
  for (let i = 0; i < 10; i++) {
    await page.locator(".option-button").first().click();
    await page.getByRole("button", { name: /Next season|See score/ }).click();
  }
  await expect(page.getByRole("status")).toContainText("Final score");
  await page.reload();
  const best = await page.evaluate(() => localStorage.getItem("av-games-best:stat-line"));
  if (Number(best) > 0) await expect(page.getByText(/Best score/)).toBeVisible();
});

test("free throw takes ten shots from the keyboard", async ({ page }) => {
  await page.goto("/games/free-throw");
  await page.getByRole("button", { name: "Start" }).click();
  for (let i = 0; i < 10; i++) await page.keyboard.press("Space");
  await expect(page.locator(".shot-track li[data-state]")).toHaveCount(10);
  await expect(page.getByRole("button", { name: "Shoot again" })).toBeVisible();
});
