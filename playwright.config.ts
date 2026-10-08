import { defineConfig, devices } from "@playwright/test";

// The whole suite runs in three engines: Chromium, WebKit (what Safari and every iOS browser
// use) and Firefox. The site leans on engine behavior that differs between them: the pinned
// 100svh film and exploded view, ScrollTrigger refreshes, a 2D canvas driven by a scrub, the
// inert attribute, @media (scripting: none), subgrid in the CAD gallery, and createImageBitmap.
// Install the engines once with: npx playwright install webkit firefox
// The server is a production build, so run `npm run build` first.

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:3100", trace: "retain-on-failure" },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
    {
      name: "safari-desktop",
      use: { ...devices["Desktop Safari"], viewport: { width: 1440, height: 1000 } },
    },
    {
      // The iPhone 13 profile on the real WebKit engine, which is what iOS Safari runs.
      name: "safari-iphone",
      use: { ...devices["iPhone 13"] },
    },
    {
      name: "firefox-desktop",
      use: { ...devices["Desktop Firefox"], viewport: { width: 1440, height: 1000 } },
    },
  ],
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    timeout: 30000,
  },
});
