import { expect, test, type Locator, type Page } from "@playwright/test";
import { acceptOfferedName, cell, ONE_MINE_IN_THE_CORNER, openWithLayout } from "./helpers";

/** Moves the mouse to the middle of `target`, as a player aiming at it would. */
async function pointAt(page: Page, target: Locator) {
  const box = await target.boundingBox();
  if (!box) throw new Error("target is not visible");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
}

const pressedCells = (page: Page) => page.locator('[data-pressed="true"]');

test("a left press shows a Hidden Cell pressed and the release Reveals it", async ({ page }) => {
  await openWithLayout(page, ONE_MINE_IN_THE_CORNER);
  await pointAt(page, cell(page, 1, 1));

  await page.mouse.down();
  await expect(cell(page, 1, 1)).toHaveAttribute("data-pressed", "true");
  await expect(cell(page, 1, 1)).toHaveAttribute("data-state", "hidden");

  await page.mouse.up();
  await expect(cell(page, 1, 1)).toHaveAttribute("data-state", "revealed");
  await expect(pressedCells(page)).toHaveCount(0);
});

test("the pressed look follows the pointer and the release Reveals only the Cell under it", async ({
  page,
}) => {
  await openWithLayout(page, ONE_MINE_IN_THE_CORNER);
  await pointAt(page, cell(page, 1, 0));
  await page.mouse.down();

  await pointAt(page, cell(page, 1, 1));
  await expect(cell(page, 1, 1)).toHaveAttribute("data-pressed", "true");
  await expect(pressedCells(page)).toHaveCount(1);

  await page.mouse.up();
  await expect(cell(page, 1, 1)).toHaveAttribute("data-state", "revealed");
  await expect(cell(page, 1, 0)).toHaveAttribute("data-state", "hidden");
});

test("releasing outside the Board Reveals nothing and clears the pressed look", async ({
  page,
}) => {
  await openWithLayout(page, ONE_MINE_IN_THE_CORNER);
  await pointAt(page, cell(page, 1, 1));
  await page.mouse.down();
  await expect(cell(page, 1, 1)).toHaveAttribute("data-pressed", "true");

  // The top-left corner of the page is teal desktop, outside the window.
  await page.mouse.move(5, 5);
  await expect(pressedCells(page)).toHaveCount(0);
  await page.mouse.up();
  await pointAt(page, cell(page, 1, 1));

  await expect(pressedCells(page)).toHaveCount(0);
  await expect(page.locator('[data-state="hidden"]')).toHaveCount(81);
});

test("Flagged and Revealed Cells never look pressed", async ({ page }) => {
  await openWithLayout(page, ONE_MINE_IN_THE_CORNER);
  await cell(page, 0, 0).click({ button: "right" });
  await cell(page, 1, 1).click();
  await pointAt(page, cell(page, 1, 0));
  await page.mouse.down();
  await expect(cell(page, 1, 0)).toHaveAttribute("data-pressed", "true");

  await pointAt(page, cell(page, 0, 0));
  await expect(pressedCells(page)).toHaveCount(0);
  await pointAt(page, cell(page, 1, 0));
  await expect(cell(page, 1, 0)).toHaveAttribute("data-pressed", "true");
  await pointAt(page, cell(page, 1, 1));
  await expect(pressedCells(page)).toHaveCount(0);
});

test("a Cell with a Question looks pressed", async ({ page }) => {
  await openWithLayout(page, ONE_MINE_IN_THE_CORNER);
  await cell(page, 1, 1).click({ button: "right" });
  await cell(page, 1, 1).click({ button: "right" });
  await pointAt(page, cell(page, 1, 1));

  await page.mouse.down();

  await expect(cell(page, 1, 1)).toHaveAttribute("data-state", "question");
  await expect(cell(page, 1, 1)).toHaveAttribute("data-pressed", "true");
});

test("the smiley shows the O face while a button is held on the Board", async ({ page }) => {
  await openWithLayout(page, ONE_MINE_IN_THE_CORNER);
  const smiley = page.getByRole("button", { name: "New game" });
  await expect(smiley).toHaveAttribute("data-face", "normal");
  await pointAt(page, cell(page, 1, 1));

  await page.mouse.down();
  await expect(smiley).toHaveAttribute("data-face", "surprised");
  await page.mouse.up();
  await expect(smiley).toHaveAttribute("data-face", "normal");

  await page.mouse.down({ button: "right" });
  await expect(smiley).toHaveAttribute("data-face", "surprised");
  await page.mouse.up({ button: "right" });
  await expect(smiley).toHaveAttribute("data-face", "normal");

  await page.mouse.down();
  await expect(smiley).toHaveAttribute("data-face", "surprised");
  await page.mouse.move(5, 5);
  await page.mouse.up();
  await expect(smiley).toHaveAttribute("data-face", "normal");
});

test("once the Game is lost nothing looks pressed and the face stays dead", async ({ page }) => {
  await openWithLayout(page, ONE_MINE_IN_THE_CORNER);
  await cell(page, 0, 0).click();
  await pointAt(page, cell(page, 1, 1));

  await page.mouse.down();

  await expect(pressedCells(page)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "New game" })).toHaveAttribute("data-face", "dead");
});

test("once the Game is won nothing looks pressed and the face stays cool", async ({ page }) => {
  await openWithLayout(page, ONE_MINE_IN_THE_CORNER);
  await cell(page, 8, 8).click();
  await acceptOfferedName(page);
  await pointAt(page, cell(page, 0, 0));

  await page.mouse.down();

  await expect(pressedCells(page)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "New game" })).toHaveAttribute("data-face", "cool");
});

test("a pressed Cell and the O face are drawn", async ({ page }) => {
  await openWithLayout(page, ONE_MINE_IN_THE_CORNER);
  await pointAt(page, cell(page, 4, 4));

  // Still held, so nothing has been Revealed yet and the timer has not started.
  await page.mouse.down();
  await expect(cell(page, 4, 4)).toHaveAttribute("data-pressed", "true");

  await expect(page.getByTestId("game")).toHaveScreenshot("pressed-cell.png");
});
