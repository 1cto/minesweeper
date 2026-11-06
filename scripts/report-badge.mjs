// Writes badge.json next to the Allure report: a shields.io endpoint badge with the result of the
// tests run against the live site, shown at the top of the README.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2] ?? "allure-report";
const { stats } = JSON.parse(readFileSync(join(dir, "summary.json"), "utf8"));

const total = stats.total ?? 0;
const passed = stats.passed ?? 0;
const failed = (stats.failed ?? 0) + (stats.broken ?? 0);
const flaky = stats.flaky ?? 0;

const [message, color] =
  total === 0
    ? ["no tests", "lightgrey"]
    : failed > 0
      ? [`${failed} failed of ${total}`, "red"]
      : flaky > 0
        ? [`${passed}/${total} passed, ${flaky} flaky`, "yellow"]
        : [`${passed}/${total} passed`, "brightgreen"];

const badge = { schemaVersion: 1, label: "live site tests", message, color };
writeFileSync(join(dir, "badge.json"), `${JSON.stringify(badge)}\n`);
console.log(`badge.json: ${message}`);
