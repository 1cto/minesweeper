import type { Page } from "@playwright/test";

/** Opens a Beginner Game with a fixed Layout: one row per string, "x" for a Mine. */
export async function openWithLayout(page: Page, rows: string[]) {
  await page.goto(`./?layout=${rows.join("/")}`);
}

export const cell = (page: Page, row: number, col: number) =>
  page.getByTestId(`cell-${row}-${col}`);

/** A Win faster than the Best Time asks for the player's name; this accepts the name offered. */
export async function acceptOfferedName(page: Page) {
  await page
    .getByRole("dialog", { name: "New Best Time" })
    .getByRole("button", { name: "OK" })
    .click();
}

/** Init scripts that make browser storage fail, for `page.addInitScript`. */
export const BROKEN_STORAGE = {
  // Blocked site data: merely touching localStorage throws.
  blocked: () => {
    const fail = () => {
      throw new DOMException("The operation is insecure.", "SecurityError");
    };
    Object.defineProperty(window, "localStorage", { get: fail });
  },
  // Every read and write throws, like a full or disabled store.
  throwing: () => {
    const fail = () => {
      throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
    };
    Object.assign(Storage.prototype, { getItem: fail, setItem: fail, removeItem: fail });
  },
};

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
