import { expect, test } from "@playwright/test";
import { noHorizontalOverflow } from "./helpers";

// /coaching: the page answers, has one h1, links the resume PDF, the PDF itself is served,
// and the page has no dash characters in its text.

test("the resume PDF is served as a PDF", async ({ request }) => {
  const response = await request.get("/arya-vora-resume.pdf");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("application/pdf");
  expect((await response.body()).subarray(0, 5).toString()).toBe("%PDF-");
});

test("/coaching renders with one h1 and the resume link", async ({ page }) => {
  const response = await page.goto("/coaching");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  const link = page.getByRole("link", { name: "Download the resume (PDF)" });
  await expect(link).toHaveAttribute("href", "/arya-vora-resume.pdf");
  await expect(link).toHaveAttribute("download", "");
  await expect(page.locator('main a[href="https://jjplrockets.org"]')).toHaveAttribute(
    "rel",
    "noopener noreferrer",
  );
});

test("/coaching has no horizontal scroll at 375px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/coaching");
  expect(await noHorizontalOverflow(page)).toBe(true);
});

test("/coaching text has no em or en dash", async ({ page }) => {
  await page.goto("/coaching");
  const text = await page.locator("main").innerText();
  expect(text).not.toMatch(/[–—]/);
});
