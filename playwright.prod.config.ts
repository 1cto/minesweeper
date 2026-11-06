import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

// Runs the tests tagged @prod against the published site, by default the live GitHub Pages site,
// after each deploy. The public build has no test-only `?layout=` parameter, so only tests that
// open the game at its plain address carry the tag; each run's results go to allure-results for
// the Allure report.
// Tests open "./", so the address must end in "/" to stay under /minesweeper/.
const siteUrl = (process.env.PROD_URL ?? "https://1cto.github.io/minesweeper/").replace(
  /\/?$/,
  "/",
);

export default defineConfig({
  ...base,
  grep: /@prod/,
  reporter: [
    ["list"],
    [
      "allure-playwright",
      {
        resultsDir: "allure-results",
        environmentInfo: { site: siteUrl, commit: process.env.GITHUB_SHA ?? "local" },
      },
    ],
  ],
  use: { ...base.use, baseURL: siteUrl },
  // The site is already served; nothing is built or started here.
  webServer: undefined,
});
