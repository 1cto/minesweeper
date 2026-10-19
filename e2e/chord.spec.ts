import { expect, test, type Locator, type Page } from "@playwright/test";
import { cell, openWithLayout } from "./helpers";

/**
 * Six Mines around (1, 2), whose Clue is 2 from (0, 2) and (2, 2). With those two Flagged, a Chord
 * on (1, 2) Reveals its six other Neighbors, none of whose Clues is 0, so nothing Cascades.
 */
const SIX_AROUND_ONE_TWO = [
  "x.x.x....",
  ".........",
  "x.x.x....",
  ".........",
  ".........",
  ".........",
  ".........",
  ".........",
  ".........",
];

/** The Flags that match the Clue of (1, 2). */
const MATCHING_FLAGS = [
  [0, 2],
  [2, 2],
] as const;

/** The Neighbors a Chord on (1, 2) Reveals, as [row, col, Clue]. */
const CHORDED = [
  [0, 1, 2],
  [0, 3, 2],
  [1, 1, 4],
  [1, 3, 4],
  [2, 1, 2],
  [2, 3, 2],
] as const;

/** Moves the mouse to the middle of `target`, as a player aiming at it would. */
async function pointAt(page: Page, target: Locator) {
  const box = await target.boundingBox();
  if (!box) throw new Error("target is not visible");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
}

const revealedCells = (page: Page) => page.locator('[data-state="revealed"]');

/** Reveals (1, 2), Flags the Mines that match its Clue and points at (1, 2), ready to Chord there. */
async function readyToChord(page: Page) {
  await openWithLayout(page, SIX_AROUND_ONE_TWO);
  await cell(page, 1, 2).click();
  for (const [row, col] of MATCHING_FLAGS) await cell(page, row, col).click({ button: "right" });
  await pointAt(page, cell(page, 1, 2));
}

/** Checks that the Chord on (1, 2) Revealed its six other Neighbors and nothing more. */
async function expectChorded(page: Page) {
  for (const [row, col, clue] of CHORDED) {
    await expect(cell(page, row, col)).toHaveAttribute("data-clue", String(clue));
  }
  await expect(revealedCells(page)).toHaveCount(7);
}

test("a middle-button Chord Reveals the other Hidden Neighbors when the Flags match the Clue", async ({
  page,
}) => {
  await readyToChord(page);

  await page.mouse.down({ button: "middle" });
  await page.mouse.up({ button: "middle" });

  await expectChorded(page);
});

test("holding the left and right buttons together Chords too", async ({ page }) => {
  await readyToChord(page);

  await page.mouse.down();
  await page.mouse.down({ button: "right" });
  await page.mouse.up();
  await page.mouse.up({ button: "right" });

  await expectChorded(page);
});

test("a held Chord and the O face are drawn", async ({ page }) => {
  // The Game is playing once (1, 2) is Revealed, so the timer must not move before the screenshot.
  const time = new Date("2026-01-01T00:00:00Z");
  await page.clock.install({ time });
  await page.clock.setFixedTime(time);
  await readyToChord(page);
  await cell(page, 1, 1).click({ button: "right" });
  await cell(page, 1, 1).click({ button: "right" });
  await pointAt(page, cell(page, 1, 2));

  await page.mouse.down({ button: "middle" });
  await expect(cell(page, 1, 1)).toHaveAttribute("data-pressed", "true");

  await expect(page.getByTestId("game")).toHaveScreenshot("held-chord.png");
});

test("the middle button never starts the browser's autoscroll or paste over the window", async ({
  page,
}) => {
  await page.goto("./");
  // Autoscroll starts on the middle button's mousedown, and paste comes with its click.
  await page.evaluate(() => {
    const seen: string[] = [];
    for (const type of ["mousedown", "auxclick"]) {
      document.addEventListener(type, (event) => {
        if ((event as MouseEvent).button === 1) seen.push(`${type}: ${event.defaultPrevented}`);
      });
    }
    Object.assign(window, { seen });
  });

  await page.getByTestId("title-text").click({ button: "middle" });
  await cell(page, 4, 4).click({ button: "middle" });
  await page.getByTestId("timer").click({ button: "middle" });

  expect(await page.evaluate(() => (window as unknown as { seen: string[] }).seen)).toEqual([
    "mousedown: true",
    "auxclick: true",
    "mousedown: true",
    "auxclick: true",
    "mousedown: true",
    "auxclick: true",
  ]);
});
