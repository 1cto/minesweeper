import { expect, test } from "@playwright/test";
import { cell, ONE_MINE_IN_THE_CORNER, openWithLayout } from "./helpers";

test("a Reveal far from the only Mine Cascades into a Win", async ({ page }) => {
  await openWithLayout(page, ONE_MINE_IN_THE_CORNER);

  await cell(page, 8, 8).click();

  await expect(page.getByRole("status")).toHaveText("You won!");
  await expect(cell(page, 1, 1)).toHaveAttribute("data-clue", "1");
  await expect(cell(page, 0, 0)).toHaveAttribute("data-state", "hidden");
});

test("Revealing a Mine is a Loss", async ({ page }) => {
  await openWithLayout(page, ONE_MINE_IN_THE_CORNER);

  await cell(page, 0, 0).click();

  await expect(page.getByRole("status")).toHaveText("You lost.");
  await expect(cell(page, 0, 0)).toHaveAttribute("data-state", "exploded");
});

test("a new Game starts with every Cell Hidden", async ({ page }) => {
  await openWithLayout(page, ONE_MINE_IN_THE_CORNER);
  await cell(page, 0, 0).click();

  await page.getByRole("button", { name: "New game" }).click();

  await expect(page.getByRole("status")).toHaveText("");
  await expect(page.locator('[data-state="hidden"]')).toHaveCount(81);
});

test("a malformed Layout fails loudly", async ({ page }) => {
  await page.goto("/?layout=not-a-layout");

  await expect(page.getByRole("alert")).toContainText("Invalid layout parameter");
});
