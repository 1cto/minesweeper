import type { Page } from "@playwright/test";

/** Opens a Beginner Game with a fixed Layout: one row per string, "x" for a Mine. */
export async function openWithLayout(page: Page, rows: string[]) {
  await page.goto(`/?layout=${rows.join("/")}`);
}

export const cell = (page: Page, row: number, col: number) =>
  page.getByTestId(`cell-${row}-${col}`);

export const ONE_MINE_IN_THE_CORNER = [
  "x........",
  ".........",
  ".........",
  ".........",
  ".........",
  ".........",
  ".........",
  ".........",
  ".........",
];

/**
 * Nine 3×3 blocks whose centres have Clues 8, 7, 6 / 5, 4, 3 / 2, 1, 0,
 * so Revealing the centres shows every Clue once.
 */
export const EVERY_CLUE = [
  "xxxxxxxxx",
  "x.xx.xx.x",
  "xxxxx.x..",
  "xxxxxxxxx",
  "x.xx.....",
  ".........",
  "xx.x.....",
  ".........",
  ".........",
];

export const EVERY_CLUE_CENTRES = [
  [1, 1],
  [1, 4],
  [1, 7],
  [4, 1],
  [4, 4],
  [4, 7],
  [7, 1],
  [7, 4],
  [7, 7],
] as const;
