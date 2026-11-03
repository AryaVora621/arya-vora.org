import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { SEASONS } from "../src/components/ftc/reaperContent";
import { FTC_AWARDS, FTC_TOTALS, FRC_SEASONS } from "../src/data/teams";
import {
  AXE_TAGS,
  THEMES,
  ambiguousLinks,
  arriveWithTheme,
  collectErrors,
  noHorizontalOverflow,
  scrollThrough,
} from "./helpers";

// The two team pages, /ftc and /frc: content, the numbers counted from the ledger, the season
// tabs, the pinned season rail, and the fallbacks (no script, reduced motion).

const PAGES = [
  { path: "/ftc", name: "FTC 23786, MakEMinds", nav: "FTC" },
  { path: "/frc", name: "FRC 2554, The Warhawks", nav: "FRC" },
] as const;

const mainNav = (page: Page) => page.getByRole("navigation", { name: "Main navigation" });

// The one-shot reveals fade rows in over most of a second. axe reads a row mid-fade at part
// opacity and reports its contrast, which no visitor ever sees once it has settled, so the check
// waits for every transition on the page to finish.
async function settled(page: Page) {
  await expect
    .poll(() => page.evaluate(() => document.getAnimations().filter((a) => a.playState === "running").length))
    .toBe(0);
}

async function duplicateIds(page: Page) {
  return page.evaluate(() => {
    const seen = new Map<string, number>();
    document.querySelectorAll("[id]").forEach((el) => seen.set(el.id, (seen.get(el.id) ?? 0) + 1));
    return [...seen].filter(([, n]) => n > 1).map(([id]) => id);
  });
}

for (const team of PAGES) {
  test(`${team.path} renders its team, marks its nav link and has no errors or overflow`, async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto(team.path);
    await expect(page.getByRole("heading", { level: 1, name: team.name })).toBeVisible();
    await expect(mainNav(page).getByRole("link", { name: team.nav, exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await scrollThrough(page);
    expect(await noHorizontalOverflow(page)).toBe(true);
    expect(await duplicateIds(page)).toEqual([]);
    expect((await ambiguousLinks(page)).ambiguous).toEqual([]);
    expect(errors).toEqual([]);
  });

  for (const [theme] of THEMES) {
    test(`${team.path} passes axe in ${theme}`, async ({ page }) => {
      await arriveWithTheme(page, theme);
      await page.goto(team.path);
      await scrollThrough(page);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await settled(page);
      const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
      expect(
        results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`),
      ).toEqual([]);
    });
  }

  test(`${team.path} reads in full without script`, async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(team.path);
    await expect(page.getByRole("heading", { level: 1, name: team.name })).toBeVisible();
    if (team.path === "/ftc") {
      // Every season's table shows, and the tab row that cannot work without script is gone.
      await expect(page.locator(".team-ledger table")).toHaveCount(SEASONS.length);
      for (const table of await page.locator(".team-ledger table").all()) await expect(table).toBeVisible();
      await expect(page.locator(".team-ledger-tabs")).toBeHidden();
    } else {
      await expect(page.locator(".team-frc-table")).toHaveCount(FRC_SEASONS.length);
    }
    await context.close();
  });
}

test("the FTC numbers are the ledger's own totals", async ({ page }) => {
  const rows = SEASONS.flatMap((season) => season.rows).filter((row) => !row.final);
  const wins = rows.reduce((sum, row) => sum + Number(row.record.split("-")[0]), 0);
  const losses = rows.reduce((sum, row) => sum + Number(row.record.split("-")[1]), 0);
  expect(FTC_TOTALS.record).toEqual({ wins, losses });

  await page.goto("/ftc");
  const stats = page.locator(".team-stats dd");
  await stats.first().scrollIntoViewIfNeeded();
  // The count-up settles on the real numbers.
  await expect(stats.nth(0)).toHaveText(String(rows.length));
  await expect(stats.nth(1)).toHaveText(`${wins}-${losses}`);
  await expect(stats.nth(2)).toHaveText(String(FTC_AWARDS.length));
  await expect(page.locator(".team-awards li")).toHaveCount(FTC_AWARDS.length);
});

test("the FTC season tabs switch with a click and with the arrow keys", async ({ page }) => {
  await page.goto("/ftc");
  const tabs = page.getByRole("tablist", { name: "Season" }).getByRole("tab");
  await expect(tabs).toHaveCount(SEASONS.length);
  await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
  const visibleRows = page.locator(".team-ledger-panel[data-active] tbody tr");
  await expect(visibleRows).toHaveCount(SEASONS[0].rows.length);

  await tabs.nth(2).click();
  await expect(tabs.nth(2)).toHaveAttribute("aria-selected", "true");
  await expect(visibleRows).toHaveCount(SEASONS[2].rows.length);

  await page.keyboard.press("ArrowRight");
  await expect(tabs.first()).toBeFocused();
  await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("End");
  await expect(tabs.last()).toHaveAttribute("aria-selected", "true");
});

test("reduced motion leaves the team pages still and whole", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/ftc");
  await expect(page.locator(".team-title-number")).toHaveText("FTC 23786");
  await expect(page.locator(".team-rail")).not.toHaveClass(/is-rail/);
  await expect(page.locator(".teams-route")).not.toHaveClass(/reveal-ready/);
  await expect(page.locator(".team-stats dd").nth(1)).toHaveText(
    `${FTC_TOTALS.record.wins}-${FTC_TOTALS.record.losses}`,
  );
});

test("everything revealed stays revealed after a jump to the end", async ({ page }) => {
  await page.goto("/ftc");
  await page.evaluate(() =>
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }),
  );
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          [...document.querySelectorAll<HTMLElement>(".team-awards > li, .team-stats dl > div")].filter(
            (el) => getComputedStyle(el).opacity !== "1",
          ).length,
      ),
    )
    .toBe(0);
});

test("on a wide window the seasons pin and walk sideways, and focus brings a card in", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "the rail pins only on a wide window");
  await page.goto("/ftc");
  const rail = page.locator(".team-rail");
  await expect(rail).toHaveClass(/is-rail/);
  const track = page.locator("[data-rail-track]");
  const start = await rail.evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
  await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), start);
  const x0 = await track.evaluate((el) => el.getBoundingClientRect().left);
  await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), start + 600);
  await expect.poll(() => track.evaluate((el) => el.getBoundingClientRect().left)).toBeLessThan(x0 - 100);

  // Back to the start of the pin, then Tab onto the Reaper link in the third card.
  await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), start);
  const reaper = page.locator('.team-card a[href="/projects/reaper"]');
  await reaper.focus();
  await expect
    .poll(() => reaper.evaluate((el) => {
      const box = el.getBoundingClientRect();
      return box.left >= 0 && box.right <= window.innerWidth && box.top >= 0 && box.bottom <= window.innerHeight;
    }))
    .toBe(true);
});

test("the home page links to both team pages and the sitemap lists them", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.locator('#top .hero-description a[href="/ftc"]')).toHaveCount(1);
  await expect(page.locator('#about a[href="/ftc"]')).toHaveCount(1);
  await expect(page.locator('#about a[href="/frc"]')).toHaveCount(1);
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("https://www.arya-vora.org/ftc");
  expect(sitemap).toContain("https://www.arya-vora.org/frc");
});
