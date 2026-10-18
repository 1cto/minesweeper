import { expect, test } from "@playwright/test";
import { cell, ONE_MINE_IN_THE_CORNER, openWithLayout } from "./helpers";

test("the right button cycles a Hidden Cell through Flag, Question and back", async ({ page }) => {
  await openWithLayout(page, ONE_MINE_IN_THE_CORNER);
  const corner = cell(page, 0, 0);
  const counter = page.getByTestId("mine-counter");
  const seen: [string | null, string | null][] = [];

  for (let i = 0; i < 3; i++) {
    await corner.click({ button: "right" });
    seen.push([await corner.getAttribute("data-state"), await counter.getAttribute("aria-label")]);
  }

  expect(seen).toEqual([
    ["flag", "Mine counter: 000"],
    ["question", "Mine counter: 001"],
    ["hidden", "Mine counter: 001"],
  ]);
});

test("the mine counter goes negative with more Flags than Mines", async ({ page }) => {
  await openWithLayout(page, ONE_MINE_IN_THE_CORNER);

  for (const col of [0, 1, 2]) await cell(page, 0, col).click({ button: "right" });

  await expect(page.getByTestId("mine-counter")).toHaveAccessibleName("Mine counter: -02");
});

test("the left button leaves a Flagged Cell alone", async ({ page }) => {
  await openWithLayout(page, ONE_MINE_IN_THE_CORNER);
  await cell(page, 0, 0).click({ button: "right" });

  await cell(page, 0, 0).click();

  await expect(cell(page, 0, 0)).toHaveAttribute("data-state", "flag");
  await expect(page.getByRole("status")).toHaveText("");
});

test("the left button Reveals a Cell that carries a Question", async ({ page }) => {
  await openWithLayout(page, ONE_MINE_IN_THE_CORNER);
  await cell(page, 8, 8).click({ button: "right" });
  await cell(page, 8, 8).click({ button: "right" });

  await cell(page, 8, 8).click();

  await expect(page.getByRole("status")).toHaveText("You won!");
});

test("the browser's context menu never opens over the window", async ({ page }) => {
  await page.goto("./");
  await page.evaluate(() => {
    const prevented: boolean[] = [];
    document.addEventListener("contextmenu", (event) => prevented.push(event.defaultPrevented));
    Object.assign(window, { prevented });
  });

  await page.getByTestId("title-text").click({ button: "right" });
  await cell(page, 4, 4).click({ button: "right" });
  await page.getByTestId("timer").click({ button: "right" });

  expect(
    await page.evaluate(() => (window as unknown as { prevented: boolean[] }).prevented),
  ).toEqual([true, true, true]);
});

test("Flags, Questions and a negative mine counter are drawn", async ({ page }) => {
  await openWithLayout(page, ONE_MINE_IN_THE_CORNER);
  for (const col of [0, 1, 2]) await cell(page, 0, col).click({ button: "right" });
  await cell(page, 1, 0).click({ button: "right" });
  await cell(page, 1, 0).click({ button: "right" });

  await expect(page.getByTestId("game")).toHaveScreenshot("markers.png");
});
