import { expect, test, type Locator, type Page } from "@playwright/test";
import { cell, ONE_MINE_IN_THE_CORNER, openWithLayout } from "./helpers";

/** Moves the mouse to the middle of `target`, as a player aiming at it would. */
async function pointAt(page: Page, target: Locator) {
  const box = await target.boundingBox();
  if (!box) throw new Error("target is not visible");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
}

const pressedCells = (page: Page) => page.locator('[data-pressed="true"]');

test("a left press shows the Hidden Cell under the pointer pressed and the release Reveals it", async ({
  page,
}) => {
  await openWithLayout(page, ONE_MINE_IN_THE_CORNER);
  await pointAt(page, cell(page, 1, 0));

  await page.mouse.down();
  await expect(cell(page, 1, 0)).toHaveAttribute("data-pressed", "true");
  await pointAt(page, cell(page, 1, 1));
  await expect(cell(page, 1, 1)).toHaveAttribute("data-pressed", "true");
  await expect(pressedCells(page)).toHaveCount(1);
  await expect(cell(page, 1, 1)).toHaveAttribute("data-state", "hidden");

  await page.mouse.up();
  await expect(cell(page, 1, 1)).toHaveAttribute("data-state", "revealed");
  await expect(cell(page, 1, 0)).toHaveAttribute("data-state", "hidden");
  await expect(pressedCells(page)).toHaveCount(0);
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

test("a pressed Cell and the O face are drawn", async ({ page }) => {
  await openWithLayout(page, ONE_MINE_IN_THE_CORNER);
  await pointAt(page, cell(page, 4, 4));

  // Still held, so nothing has been Revealed yet and the timer has not started.
  await page.mouse.down();
  await expect(cell(page, 4, 4)).toHaveAttribute("data-pressed", "true");

  await expect(page.getByTestId("game")).toHaveScreenshot("pressed-cell.png");
});
