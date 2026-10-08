import { expect, test } from "@playwright/test";

// WCAG 1.4.4 (resize text) and 1.4.10 (reflow): enlarged text must wrap, not scroll sideways.
// Setting the root font size is how a phone's "very large" text setting and a browser's
// text-only zoom reach this page, since every size in it is in rem. The widths cover a small
// phone, the common phones, a tablet, the narrowest desktop layout and a wide desktop.
const WIDTHS = [320, 360, 390, 768, 1024, 1280];
const ZOOMS = ["150%", "200%"];

// Each case builds its own non-mobile context, so one run covers the widths whichever project
// (desktop or mobile) invokes it. Only the desktop project runs them, so they are not doubled.
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "viewport widths are set per case");
});

for (const width of WIDTHS) {
  for (const zoom of ZOOMS) {
    test(`text at ${zoom} causes no horizontal scroll at ${width}px wide`, async ({
      browser,
      baseURL,
    }) => {
      const context = await browser.newContext({ baseURL, viewport: { width, height: 800 } });
      const page = await context.newPage();
      await page.goto("/", { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      await page.addStyleTag({ content: `html { font-size: ${zoom} !important; }` });
      // One frame for the new size to lay out before measuring.
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));

      const result = await page.evaluate(() => {
        const root = document.documentElement;
        const past: string[] = [];
        for (const element of document.body.querySelectorAll("*")) {
          if (element.closest(".visually-hidden")) continue;
          const box = element.getBoundingClientRect();
          if (box.width > 0 && box.right > root.clientWidth + 1) {
            const text = (element.textContent ?? "").trim().slice(0, 24);
            past.push(`${element.tagName.toLowerCase()}.${String(element.className).slice(0, 32)} "${text}"`);
          }
        }
        return { scrollWidth: root.scrollWidth, clientWidth: root.clientWidth, past: past.slice(0, 6) };
      });

      // The offenders are in the message, so a failure names the element that ran off the edge.
      expect(result.scrollWidth, JSON.stringify(result.past)).toBeLessThanOrEqual(
        result.clientWidth,
      );
      await context.close();
    });
  }
}
