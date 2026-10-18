import { defineConfig, devices } from "@playwright/test";

// E2E_PORT lets several checkouts run browser tests side by side.
const port = Number(process.env.E2E_PORT ?? 4173);

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"], ["html", { open: "never" }]] : "list",
  use: {
    // The site is published as a GitHub Pages project page, so it is served under /minesweeper/.
    baseURL: `http://localhost:${port}/minesweeper/`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      // Low enough that every Difficulty is drawn at ×1, so screenshots show the window at its
      // original size; scale.spec.ts sets its own viewports to test the larger scales.
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 500 } },
    },
  ],
  webServer: {
    command: `pnpm build:e2e && pnpm preview --outDir dist-e2e --port ${port} --strictPort`,
    port,
    reuseExistingServer: !process.env.CI,
  },
});
