// Fails if the public build still contains the test-only Layout override.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2] ?? "dist";
const marker = "Invalid layout parameter";

function filesIn(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? filesIn(join(path, entry.name)) : [join(path, entry.name)],
  );
}

const leaks = filesIn(dir).filter((file) => readFileSync(file, "utf8").includes(marker));
if (leaks.length > 0) {
  console.error(`Test-only Layout override found in ${dir}: ${leaks.join(", ")}`);
  process.exit(1);
}
console.log(`No test-only hooks in ${dir}.`);
