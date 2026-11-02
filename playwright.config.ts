import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// E2E_PORT lets several runs test side by side, even in one checkout: each port builds into its own
// directory, so one run's build never empties the files another run is serving.
const port = Number(process.env.E2E_PORT ?? 4173);
const outDir = `dist-e2e/${port}`;

// A Claude Code cloud session comes with one Chromium, of a newer revision than the one this
// Playwright version downloads, and must not download another; its tests run on that one.
const cloudChromium = "/opt/pw-browsers/chromium";
const launchOptions =
  process.env.CLAUDE_CODE_REMOTE === "true" && existsSync(cloudChromium)
    ? { executablePath: cloudChromium }
    : {};

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // A test that only passes on its retry is flaky; CI fails on it rather than letting it pass
  // quietly.
  failOnFlakyTests: !!process.env.CI,
  reporter: process.env.CI ? [["github"], ["list"], ["html", { open: "never" }]] : "list",
  use: {
    // The site is published as a GitHub Pages project page, so it is served under /minesweeper/.
    baseURL: `http://localhost:${port}/minesweeper/`,
    trace: "on-first-retry",
    launchOptions,
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
    command: `pnpm exec vite build --mode e2e --outDir ${outDir} && pnpm exec vite preview --outDir ${outDir} --port ${port} --strictPort`,
    port,
    reuseExistingServer: !process.env.CI,
  },
});
