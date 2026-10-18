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

/** Reveals (1, 2), Flags `flags` and points at (1, 2), ready to Chord there. */
async function readyToChord(page: Page, flags: readonly (readonly [number, number])[]) {
  await openWithLayout(page, SIX_AROUND_ONE_TWO);
  await cell(page, 1, 2).click();
  for (const [row, col] of flags) await cell(page, row, col).click({ button: "right" });
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
  await readyToChord(page, MATCHING_FLAGS);

  await page.mouse.down({ button: "middle" });
  await page.mouse.up({ button: "middle" });

  await expectChorded(page);
});

test("holding the left and right buttons together Chords too", async ({ page }) => {
  await readyToChord(page, MATCHING_FLAGS);

  await page.mouse.down();
  await page.mouse.down({ button: "right" });
  await page.mouse.up();
  await page.mouse.up({ button: "right" });

  await expectChorded(page);
});

test("a Chord Reveals nothing when the Flags don't match the Clue", async ({ page }) => {
  await readyToChord(page, [[0, 2]]);

  await page.mouse.down({ button: "middle" });
  await page.mouse.up({ button: "middle" });

  await expect(cell(page, 1, 1)).toHaveAttribute("data-state", "hidden");
  await expect(revealedCells(page)).toHaveCount(1);
  await expect(page.getByTestId("mine-counter")).toHaveAccessibleName("Mine counter: 005");
});

test("a Chord over a wrong Flag Reveals a Mine and the Game is lost", async ({ page }) => {
  await readyToChord(page, [
    [0, 2],
    [1, 1],
  ]);

  await page.mouse.down({ button: "middle" });
  await page.mouse.up({ button: "middle" });

  await expect(cell(page, 2, 2)).toHaveAttribute("data-state", "exploded");
  await expect(cell(page, 1, 1)).toHaveAttribute("data-state", "wrongFlag");
  await expect(cell(page, 0, 0)).toHaveAttribute("data-state", "mine");
  await expect(cell(page, 1, 3)).toHaveAttribute("data-clue", "4");
  await expect(page.getByRole("button", { name: "New game" })).toHaveAttribute("data-face", "dead");
});

/** The test ids of the Cells drawn pressed in, in reading order. */
const pressedCellIds = (page: Page) =>
  page
    .locator('[data-pressed="true"]')
    .evaluateAll((cells) => cells.map((c) => c.getAttribute("data-testid")));

for (const [gesture, buttons] of [
  ["the middle button", ["middle"]],
  ["the left and right buttons", ["left", "right"]],
] as const) {
  test(`while a Chord is held with ${gesture}, the unflagged Hidden Neighbors look pressed and follow the pointer`, async ({
    page,
  }) => {
    await readyToChord(page, MATCHING_FLAGS);
    await cell(page, 1, 1).click({ button: "right" });
    await cell(page, 1, 1).click({ button: "right" });
    await cell(page, 1, 4).click();
    await pointAt(page, cell(page, 1, 2));

    for (const button of buttons) await page.mouse.down({ button });

    // The Flags on (0, 2) and (2, 2) stay up; the Question on (1, 1) goes down.
    await expect
      .poll(() => pressedCellIds(page))
      .toEqual(["cell-0-1", "cell-0-3", "cell-1-1", "cell-1-3", "cell-2-1", "cell-2-3"]);
    await expect(page.getByRole("button", { name: "New game" })).toHaveAttribute(
      "data-face",
      "surprised",
    );

    await pointAt(page, cell(page, 1, 4));
    await expect
      .poll(() => pressedCellIds(page))
      .toEqual([
        "cell-0-3",
        "cell-0-4",
        "cell-0-5",
        "cell-1-3",
        "cell-1-5",
        "cell-2-3",
        "cell-2-4",
        "cell-2-5",
      ]);
  });
}

test("releasing a Chord off the Board Reveals nothing and clears the pressed look", async ({
  page,
}) => {
  await readyToChord(page, MATCHING_FLAGS);
  await page.mouse.down({ button: "middle" });
  await expect.poll(async () => (await pressedCellIds(page)).length).toBe(6);

  // The top-left corner of the page is teal desktop, outside the window.
  await page.mouse.move(5, 5);
  await page.mouse.up({ button: "middle" });
  await pointAt(page, cell(page, 1, 2));

  expect(await pressedCellIds(page)).toEqual([]);
  await expect(revealedCells(page)).toHaveCount(1);
  await expect(page.getByRole("button", { name: "New game" })).toHaveAttribute(
    "data-face",
    "normal",
  );
});

test("a Chord held over a Hidden Cell pushes in the whole block around it, like the original", async ({
  page,
}) => {
  await openWithLayout(page, SIX_AROUND_ONE_TWO);
  await pointAt(page, cell(page, 4, 4));

  await page.mouse.down({ button: "middle" });
  await expect
    .poll(() => pressedCellIds(page))
    .toEqual([
      "cell-3-3",
      "cell-3-4",
      "cell-3-5",
      "cell-4-3",
      "cell-4-4",
      "cell-4-5",
      "cell-5-3",
      "cell-5-4",
      "cell-5-5",
    ]);

  // A Chord only acts on a Revealed Cell.
  await page.mouse.up({ button: "middle" });
  await expect(page.locator('[data-state="hidden"]')).toHaveCount(81);
});

for (const releasedFirst of ["left", "right"] as const) {
  test(`a two-button Chord pressed left first and released ${releasedFirst} first leaves no marker change and no Reveal`, async ({
    page,
  }) => {
    await openWithLayout(page, SIX_AROUND_ONE_TWO);
    await pointAt(page, cell(page, 4, 4));

    await page.mouse.down({ button: "left" });
    await page.mouse.down({ button: "right" });
    await expect(cell(page, 4, 4)).toHaveAttribute("data-pressed", "true");
    await page.mouse.up({ button: releasedFirst });
    await page.mouse.up({ button: releasedFirst === "left" ? "right" : "left" });

    await expect(page.locator('[data-state="hidden"]')).toHaveCount(81);
    await expect(page.getByTestId("mine-counter")).toHaveAccessibleName("Mine counter: 006");
  });

  test(`a right press that turns into a Chord keeps its Flag, like the original, and Reveals nothing (released ${releasedFirst} first)`, async ({
    page,
  }) => {
    await openWithLayout(page, SIX_AROUND_ONE_TWO);
    await pointAt(page, cell(page, 4, 4));

    // A lone right press cycles the marker at once, and the Chord that follows leaves it there.
    await page.mouse.down({ button: "right" });
    await expect(cell(page, 4, 4)).toHaveAttribute("data-state", "flag");
    await page.mouse.down({ button: "left" });
    await expect(cell(page, 4, 5)).toHaveAttribute("data-pressed", "true");
    await page.mouse.up({ button: releasedFirst });
    await page.mouse.up({ button: releasedFirst === "left" ? "right" : "left" });

    await expect(cell(page, 4, 4)).toHaveAttribute("data-state", "flag");
    await expect(page.locator('[data-state="hidden"]')).toHaveCount(80);
    await expect(page.getByTestId("mine-counter")).toHaveAccessibleName("Mine counter: 005");
  });
}

test("a held Chord and the O face are drawn", async ({ page }) => {
  // The Game is playing once (1, 2) is Revealed, so the timer must not move before the screenshot.
  const time = new Date("2026-01-01T00:00:00Z");
  await page.clock.install({ time });
  await page.clock.setFixedTime(time);
  await readyToChord(page, MATCHING_FLAGS);
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
