import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("games subdomain host serves the games section", async ({ request }) => {
  const headers = { host: "games.arya-vora.org" };
  const index = await request.get("/", { headers });
  expect(await index.text()).toContain("<title>Games | Arya Vora</title>");
  const game = await request.get("/stat-line", { headers });
  expect(await game.text()).toContain("<title>Stat Line | Arya Vora Games</title>");
  const asset = await request.get("/icon.svg", { headers });
  expect(asset.headers()["content-type"]).toContain("image/svg");
  const home = await request.get("/");
  expect(await home.text()).toContain("<title>Arya Vora</title>");
});

// games.arya-vora.org has a sitemap and a robots.txt of its own (src/app/games/sitemap.ts and
// robots.txt/route.ts, which next.config.ts rewrites that host's two files to). The main host's
// two files stay as they were (portfolio.spec.ts checks their exact content) and leave the games
// out, since the games' canonical host is the other one.
test("games.arya-vora.org lists its pages in its own sitemap and robots.txt, and the main host does not", async ({
  request,
}) => {
  const host = { headers: { host: "games.arya-vora.org" } };
  const sitemap = await request.get("/sitemap.xml", host);
  expect(sitemap.status()).toBe(200);
  expect(sitemap.headers()["content-type"]).toContain("xml");
  const locs = [...(await sitemap.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  expect(locs).toEqual([
    "https://games.arya-vora.org/",
    "https://games.arya-vora.org/career-ladder",
    "https://games.arya-vora.org/stat-line",
    "https://games.arya-vora.org/free-throw",
  ]);
  // Each address in it is a page that answers on that host, and names itself as its canonical.
  for (const loc of locs) {
    const path = new URL(loc).pathname;
    const page = await request.get(path, host);
    expect(page.status(), loc).toBe(200);
    const canonical = (await page.text()).match(/<link rel="canonical" href="([^"]*)"/)?.[1];
    expect(canonical?.replace(/\/$/, ""), loc).toBe(loc.replace(/\/$/, ""));
  }
  const robots = await request.get("/robots.txt", host);
  expect(robots.status()).toBe(200);
  expect(robots.headers()["content-type"]).toContain("text/plain");
  expect(await robots.text()).toContain("Sitemap: https://games.arya-vora.org/sitemap.xml");

  const main = await (await request.get("/sitemap.xml")).text();
  expect(main).toContain("<loc>https://www.arya-vora.org/projects/reaper</loc>");
  expect(main).not.toContain("games.arya-vora.org");
  expect(await (await request.get("/robots.txt")).text()).toContain(
    "Sitemap: https://www.arya-vora.org/sitemap.xml",
  );
});

// /Stat-Line was a 404 on the games host, while /games/Stat-Line on the main host is one 308. The
// proxy now answers a game's slug in another case there with one 308 to the lower-case address
// (the longer set of cases is in routes-nav.spec.ts).
test("a game's slug in capitals on the games host goes to the lower-case address in one 308", async ({
  request,
}) => {
  const host = { headers: { host: "games.arya-vora.org" } };
  for (const [from, to] of [
    ["/Stat-Line", "/stat-line"],
    ["/Free-Throw", "/free-throw"],
    ["/Career-Ladder", "/career-ladder"],
  ]) {
    const moved = await request.get(from, { ...host, maxRedirects: 0 });
    expect(moved.status(), from).toBe(308);
    expect(moved.headers()["location"], from).toBe(to);
    // The Host header is not carried through a redirect the client follows, so the target is asked for itself.
    const landed = await request.get(to, host);
    expect(landed.status(), to).toBe(200);
    expect(await landed.text(), to).toContain("Arya Vora Games</title>");
  }
});

test("every games page has its own canonical, description and share card", async ({ request }) => {
  const read = async (path: string) => {
    const html = await (await request.get(path)).text();
    const attr = (pattern: RegExp) => html.match(pattern)?.[1] ?? null;
    return {
      title: attr(/<title>([^<]*)<\/title>/),
      description: attr(/<meta name="description" content="([^"]*)"/),
      canonical: attr(/<link rel="canonical" href="([^"]*)"/),
      ogUrl: attr(/<meta property="og:url" content="([^"]*)"/),
      ogTitle: attr(/<meta property="og:title" content="([^"]*)"/),
      ogImage: attr(/<meta property="og:image" content="([^"]*)"/),
      twitterTitle: attr(/<meta name="twitter:title" content="([^"]*)"/),
    };
  };
  const index = await read("/games");
  expect(index.canonical).toBe("https://games.arya-vora.org");
  expect(index.ogUrl).toBe(index.canonical);
  expect(index.ogImage).toMatch(/^https:\/\/.+\.png$/);
  expect(index.twitterTitle).toBe(index.ogTitle);
  for (const slug of ["career-ladder", "stat-line", "free-throw"]) {
    const game = await read(`/games/${slug}`);
    expect(game.canonical, slug).toBe(`https://games.arya-vora.org/${slug}`);
    expect(game.ogUrl, slug).toBe(game.canonical);
    expect(game.ogTitle, slug).toBe(game.title);
    expect(game.twitterTitle, slug).toBe(game.title);
    expect(game.ogImage, slug).toBe(index.ogImage);
    expect(game.description, slug).not.toBe(index.description);
  }
});

test("games index links to every game and passes axe", async ({ page }) => {
  await page.goto("/games");
  await expect(page.locator(".games-card")).toHaveCount(3);
  // Each card is one link, named by the game's title.
  for (const title of ["Career Ladder", "Stat Line", "Free Throw"]) {
    await expect(page.getByRole("link", { name: title, exact: true })).toHaveCount(1);
  }
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

// Free Throw is a timing game, so the Shoot button has to be in reach on a phone with the needle in
// view: after Start, the whole button is inside the window with no scroll, and it sits below the
// meter and the result line, not over them. These are the phone windows that were short enough to
// push it under the fold (the page above the meter is tightened on a phone in games.css, and the
// button is pinned a thumb's distance above the bottom edge where it would still not fit).
const PHONES = [
  [393, 659],
  [390, 664],
  [375, 667],
  [360, 640],
  [320, 568],
] as const;

test.describe("free throw on a phone", () => {
  // Firefox has no touch emulation to turn on; the layout is the same at these widths, which the
  // desktop-sized Chromium and WebKit projects below run with a touch screen.
  test.skip(({ browserName }) => browserName === "firefox");
  test.use({ hasTouch: true });

  for (const [width, height] of PHONES) {
    test(`the whole Shoot button is on screen after Start at ${width}x${height}, clear of the meter and the result`, async ({
      page,
      browserName,
    }) => {
      await page.setViewportSize({ width, height });
      await page.goto("/games/free-throw");
      await page.getByRole("button", { name: "Start" }).click();
      const shoot = page.getByRole("button", { name: /^Shoot/ });
      await expect(shoot).toBeVisible();
      const box = await page.evaluate(() => {
        const rect = (selector: string) => {
          const r = document.querySelector(selector)!.getBoundingClientRect();
          return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
        };
        return {
          scrollY: window.scrollY,
          viewport: { width: innerWidth, height: innerHeight },
          button: rect(".shoot-button"),
          meter: rect(".meter"),
          flash: rect(".game-flash"),
          track: rect(".shot-track"),
          scorebar: rect(".game-scorebar"),
        };
      });
      // The window is what the test asked for, so a fixed-size emulation cannot pass for a bigger one.
      expect(box.viewport).toEqual({ width, height });
      // Chromium lays the page out the way the sizes above were measured, and starts the game
      // from the top of the page. WebKit's nav and heading are taller at 320 wide, so there the
      // Start button itself is under the fold and the click scrolls to it; what has to hold is that
      // the meter, the result line and the button are all in the window together.
      if (browserName === "chromium") expect(box.scrollY).toBe(0);
      expect(box.button.top).toBeGreaterThanOrEqual(0);
      expect(box.button.bottom).toBeLessThanOrEqual(height);
      expect(box.button.left).toBeGreaterThanOrEqual(0);
      expect(box.button.right).toBeLessThanOrEqual(width);
      // Below everything the player reads, and nothing is covered.
      for (const above of [box.scorebar, box.meter, box.track, box.flash]) {
        expect(above.bottom).toBeLessThanOrEqual(box.button.top);
        expect(above.top).toBeGreaterThanOrEqual(0);
      }
      // A tap target of at least 44 by 44.
      expect(box.button.bottom - box.button.top).toBeGreaterThanOrEqual(44);
      expect(box.button.right - box.button.left).toBeGreaterThanOrEqual(44);
      // One shot, and the result line has its words in the place measured, still above the button.
      await page.keyboard.press("Space");
      await expect(page.locator(".game-flash")).toHaveText(/Swish\.|Rim out\./);
      const after = await page.evaluate(() => ({
        flash: document.querySelector(".game-flash")!.getBoundingClientRect().bottom,
        button: document.querySelector(".shoot-button")!.getBoundingClientRect().top,
      }));
      expect(after.flash).toBeLessThanOrEqual(after.button);
    });
  }

  test("on a touch screen the Space hint is gone, the buttons take quick taps, and the page is not wider than the window", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 664 });
    await page.goto("/games/free-throw");
    const start = page.getByRole("button", { name: "Start" });
    expect(await start.evaluate((el) => getComputedStyle(el).touchAction)).toBe("manipulation");
    await start.click();
    const shoot = page.getByRole("button", { name: /^Shoot/ });
    expect(await shoot.evaluate((el) => getComputedStyle(el).touchAction)).toBe("manipulation");
    // The kbd hint means nothing here: not drawn, and not part of the button's name.
    await expect(shoot.locator("kbd")).toBeHidden();
    await expect(shoot).toHaveAccessibleName("Shoot");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    // The keyboard still plays it.
    await page.keyboard.press("Space");
    await expect(page.locator(".shot-track li[data-state]")).toHaveCount(1);
  });

  test("a short window pins the Shoot button above the bottom edge instead of leaving it under the fold", async ({
    page,
  }) => {
    // Shorter than the compressed page needs (the 320 x 568 window is the tightest that fits).
    await page.setViewportSize({ width: 360, height: 480 });
    await page.goto("/games/free-throw");
    await page.getByRole("button", { name: "Start" }).click();
    const shoot = page.getByRole("button", { name: /^Shoot/ });
    expect(await shoot.evaluate((el) => getComputedStyle(el).position)).toBe("sticky");
    for (const y of [0, 120, 300]) {
      await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
      const r = await shoot.evaluate((el) => {
        const b = el.getBoundingClientRect();
        return { top: b.top, bottom: b.bottom, height: innerHeight };
      });
      expect(r.bottom, `scrolled to ${y}`).toBeLessThanOrEqual(r.height);
      expect(r.top, `scrolled to ${y}`).toBeGreaterThanOrEqual(0);
    }
  });
});

test("on a desktop the Shoot button sits in the page with its Space hint", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/games/free-throw");
  const coarse = await page.evaluate(() => matchMedia("(hover: none), (pointer: coarse)").matches);
  test.skip(coarse, "a touch device, not a desktop");
  await page.getByRole("button", { name: "Start" }).click();
  const shoot = page.getByRole("button", { name: /^Shoot/ });
  expect(await shoot.evaluate((el) => getComputedStyle(el).position)).toBe("static");
  await expect(shoot.locator("kbd")).toBeVisible();
  await expect(shoot.locator("kbd")).toHaveText("Space");
});

// The drawings on the games index are small print scaled to the card (cqi units), which came out
// at 9 to 11px on a phone. They have a floor now, and still fit their cards.
test("the previews on the games index have no text under 12.5px and fit their cards", async ({ page }) => {
  for (const width of [320, 360, 393, 768, 1100, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/games");
    const found = await page.evaluate(() => {
      const small: string[] = [];
      const outside: string[] = [];
      let texts = 0;
      for (const media of document.querySelectorAll(".games-card-media")) {
        const card = media.getBoundingClientRect();
        const walker = document.createTreeWalker(media, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          const text = node.textContent!.trim();
          if (!text) continue;
          texts++;
          const el = node.parentElement!;
          const size = parseFloat(getComputedStyle(el).fontSize);
          if (size < 12.5) small.push(`${text} ${size}px`);
          const range = document.createRange();
          range.selectNodeContents(node);
          const r = range.getBoundingClientRect();
          if (r.left < card.left - 0.5 || r.right > card.right + 0.5 || r.top < card.top - 0.5 || r.bottom > card.bottom + 0.5) {
            outside.push(text);
          }
          // Clipped by the box that holds it (an ellipsis, or overflow hidden).
          for (let box: HTMLElement | null = el; box && box !== media; box = box.parentElement) {
            if (box.scrollWidth > box.clientWidth + 1 && getComputedStyle(box).overflow !== "visible") {
              outside.push(`${text} (clipped)`);
              break;
            }
          }
        }
      }
      return { small, outside, texts };
    });
    expect(found.texts, `${width}px`).toBeGreaterThan(10);
    expect(found.small, `${width}px`).toEqual([]);
    expect(found.outside, `${width}px`).toEqual([]);
  }
});
