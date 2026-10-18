import { expect, test, type Page } from "@playwright/test";
import { cell, openWithLayout } from "./helpers";

/** Five Mines; one Reveal at (6, 6) Cascades over every Cell without a Mine. */
const CORNERS_AND_ONE_INSIDE = [
  "x.......x",
  ".........",
  ".........",
  "...x.....",
  ".........",
  ".........",
  ".........",
  ".........",
  "x.......x",
];

const MINES_OF_CORNERS_AND_ONE_INSIDE = [
  [0, 0],
  [0, 8],
  [3, 3],
  [8, 0],
  [8, 8],
] as const;

const smiley = (page: Page) => page.getByRole("button", { name: "New game" });

/**
 * Stops the clock before the page loads, so a screenshot never depends on how long the clicks
 * took: the timer reads 000 however much real time passes between the first Reveal and the end.
 */
async function freezeClock(page: Page) {
  const time = new Date("2026-01-01T00:00:00Z");
  await page.clock.install({ time });
  await page.clock.setFixedTime(time);
}

/** A Win with a Flag on (0, 0) and a Question on (3, 3) placed beforehand. */
async function win(page: Page) {
  await openWithLayout(page, CORNERS_AND_ONE_INSIDE);
  await cell(page, 0, 0).click({ button: "right" });
  await cell(page, 3, 3).click({ button: "right" });
  await cell(page, 3, 3).click({ button: "right" });
  await cell(page, 6, 6).click();
}

/**
 * A Loss on (8, 8) with a correct Flag on (0, 0), a wrong Flag on (0, 1),
 * a Question on the Mine at (3, 3) and a Revealed Clue at (1, 1).
 */
async function lose(page: Page) {
  await openWithLayout(page, CORNERS_AND_ONE_INSIDE);
  await cell(page, 0, 0).click({ button: "right" });
  await cell(page, 0, 1).click({ button: "right" });
  await cell(page, 3, 3).click({ button: "right" });
  await cell(page, 3, 3).click({ button: "right" });
  await cell(page, 1, 1).click();
  await cell(page, 8, 8).click();
}

/** Every Cell's state in reading order, plus the mine counter and the smiley's face. */
async function presentation(page: Page) {
  return {
    cells: await page
      .locator("[data-testid^='cell-']")
      .evaluateAll((cells) => cells.map((c) => c.getAttribute("data-state"))),
    counter: await page.getByTestId("mine-counter").getAttribute("aria-label"),
    face: await smiley(page).getAttribute("data-face"),
  };
}

test("a Win Flags every Mine, the mine counter reads 000 and the smiley wears sunglasses", async ({
  page,
}) => {
  await freezeClock(page);
  await win(page);

  for (const [row, col] of MINES_OF_CORNERS_AND_ONE_INSIDE) {
    await expect(cell(page, row, col)).toHaveAttribute("data-state", "flag");
  }
  await expect(page.locator('[data-state="revealed"]')).toHaveCount(76);
  await expect(page.getByTestId("mine-counter")).toHaveAccessibleName("Mine counter: 000");
  await expect(smiley(page)).toHaveAttribute("data-face", "cool");
  await expect(page.getByTestId("game")).toHaveScreenshot("win.png");
});

test("a Loss shows the exploded Mine, the other Mines and the wrong Flag, and the smiley is dead", async ({
  page,
}) => {
  await freezeClock(page);
  await lose(page);

  await expect(cell(page, 8, 8)).toHaveAttribute("data-state", "exploded");
  for (const [row, col] of [
    [0, 8],
    [3, 3],
    [8, 0],
  ] as const) {
    await expect(cell(page, row, col)).toHaveAttribute("data-state", "mine");
  }
  await expect(cell(page, 0, 0)).toHaveAttribute("data-state", "flag");
  await expect(cell(page, 0, 1)).toHaveAttribute("data-state", "wrongFlag");
  await expect(cell(page, 1, 1)).toHaveAttribute("data-clue", "1");
  await expect(cell(page, 4, 4)).toHaveAttribute("data-state", "hidden");
  await expect(page.getByTestId("mine-counter")).toHaveAccessibleName("Mine counter: 003");
  await expect(smiley(page)).toHaveAttribute("data-face", "dead");
  await expect(page.getByTestId("game")).toHaveScreenshot("loss.png");
});

for (const [ending, play] of [
  ["Win", win],
  ["Loss", lose],
] as const) {
  test(`after a ${ending} the left, right and middle buttons on the Board change nothing`, async ({
    page,
  }) => {
    await play(page);
    const before = await presentation(page);

    for (const button of ["left", "right", "middle"] as const) {
      for (const [row, col] of [
        [4, 4],
        [0, 0],
        [0, 8],
        [1, 1],
      ] as const) {
        await cell(page, row, col).click({ button });
      }
    }

    expect(await presentation(page)).toEqual(before);
  });

  test(`the smiley after a ${ending} starts a new Game with the normal face`, async ({ page }) => {
    await play(page);

    await smiley(page).click();

    await expect(smiley(page)).toHaveAttribute("data-face", "normal");
    await expect(page.locator('[data-state="hidden"]')).toHaveCount(81);
    await expect(page.getByTestId("mine-counter")).toHaveAccessibleName("Mine counter: 010");
  });
}
