import type { Difficulty, Layout } from "../engine/game";

/**
 * Reads the test-only `layout` URL parameter: one row per Board row, separated by "/",
 * with "x" for a Mine and "." for a Cell without one. Only test builds call this.
 */
export function layoutFromSearch(search: string, difficulty: Difficulty): Layout | undefined {
  const param = new URLSearchParams(search).get("layout");
  if (param === null) return undefined;
  const rows = param.split("/");
  const fits =
    rows.length === difficulty.height &&
    rows.every((row) => row.length === difficulty.width && /^[x.]*$/.test(row));
  if (!fits) {
    throw new Error(
      `Invalid layout parameter: expected ${difficulty.height} rows of ${difficulty.width} "x" or "." characters, got "${param}"`,
    );
  }
  return rows.flatMap((line, row) =>
    [...line].flatMap((char, col) => (char === "x" ? [{ row, col }] : [])),
  );
}
