import { expect, test } from "@playwright/test";
import {
  cell,
  EVERY_CLUE,
  EVERY_CLUE_CENTRES,
  ONE_MINE_IN_THE_CORNER,
  openWithLayout,
} from "./helpers";

test("the game is a Windows 95/98 window centred on a teal desktop", async ({ page }) => {
  await page.goto("./");

  // The title and menu text are drawn with a system font, which differs between machines.
  await expect(page).toHaveScreenshot("desktop.png", {
    mask: [page.getByTestId("title-text"), page.getByTestId("menu-text")],
  });
});

test("the title bar shows the name and inert minimise and close buttons", async ({ page }) => {
  await openWithLayout(page, ONE_MINE_IN_THE_CORNER);
  await cell(page, 8, 8).click();

  await page.getByRole("button", { name: "Minimise" }).click();
  await page.getByRole("button", { name: "Close" }).click();

  await expect(page.getByTestId("title-text")).toHaveText("Minesweeper");
  await expect(page.getByTestId("game")).toBeVisible();
  await expect(cell(page, 8, 8)).toHaveAttribute("data-state", "revealed");
});

test("the status panel shows the Mine count and the timer at 000", async ({ page }) => {
  await openWithLayout(page, ONE_MINE_IN_THE_CORNER);

  await expect(page.getByTestId("mine-counter")).toHaveAccessibleName("Mine counter: 001");
  await expect(page.getByTestId("timer")).toHaveAccessibleName("Timer: 000");
});

test("Clues 1 to 8 use their classic colours and a 0-Clue Cell is blank", async ({ page }) => {
  await openWithLayout(page, EVERY_CLUE);

  for (const [row, col] of EVERY_CLUE_CENTRES) await cell(page, row, col).click();

  await expect(page.getByTestId("game")).toHaveScreenshot("every-clue.png");
});

test("a Revealed Mine is drawn on its Cell", async ({ page }) => {
  await openWithLayout(page, ONE_MINE_IN_THE_CORNER);

  await cell(page, 0, 0).click();

  await expect(page.getByTestId("game")).toHaveScreenshot("revealed-mine.png");
});

test("the smiley looks pressed while it is held", async ({ page }) => {
  await page.goto("./");
  const smiley = page.getByRole("button", { name: "New game" });
  const box = await smiley.boundingBox();
  if (!box) throw new Error("smiley is not visible");

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(smiley).toHaveScreenshot("smiley-pressed.png");
  await page.mouse.up();

  await expect(smiley).toHaveScreenshot("smiley.png");
});
