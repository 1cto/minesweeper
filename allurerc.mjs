import { defineConfig } from "allure";

// The report on the tests run against the live site after each deploy, published at
// https://1cto.github.io/minesweeper/reports/. history.jsonl carries the earlier runs; the Deploy
// workflow fetches it from the published report before the deploy and publishes it again with the
// new report, so the trend and flaky marks survive across runs.
export default defineConfig({
  name: "Minesweeper on the live site",
  output: "allure-report",
  historyPath: "./history.jsonl",
  historyLimit: 50,
  plugins: {
    awesome: {
      options: {
        reportName: "Minesweeper on the live site",
        reportLanguage: "en",
        singleFile: false,
      },
    },
  },
});
