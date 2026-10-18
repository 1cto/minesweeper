import { expect, test, type Page } from "@playwright/test";
import { cell, ONE_MINE_IN_THE_CORNER, openWithLayout } from "./helpers";

/** Opens a Game with Playwright's clock paused, so time only moves when a test moves it. */
async function openWithPausedClock(page: Page) {
  await page.clock.install({ time: new Date("2026-01-01T09:00:00") });
  await openWithLayout(page, ONE_MINE_IN_THE_CORNER);
  await page.clock.pauseAt(new Date("2026-01-01T09:01:00"));
}

/** (1, 1) touches the only Mine, so Revealing it opens just that Cell and the Game goes on. */
async function revealNextToTheMine(page: Page) {
  await cell(page, 1, 1).click();
  await expect(cell(page, 1, 1)).toHaveAttribute("data-clue", "1");
}

const timer = (page: Page) => page.getByTestId("timer");

test("the timer stays at 000 until the first Reveal", async ({ page }) => {
  await openWithPausedClock(page);

  await cell(page, 0, 0).click({ button: "right" });
  await page.clock.runFor(5_000);

  await expect(timer(page)).toHaveAccessibleName("Timer: 000");
});

test("the timer counts whole seconds from the first Reveal", async ({ page }) => {
  await openWithPausedClock(page);
  await page.clock.runFor(3_000);

  await revealNextToTheMine(page);
  await page.clock.runFor(1_000);
  await expect(timer(page)).toHaveAccessibleName("Timer: 001");

  await page.clock.runFor(4_000);
  await expect(timer(page)).toHaveAccessibleName("Timer: 005");
});

test("the timer stops when the Game is lost", async ({ page }) => {
  await openWithPausedClock(page);
  await revealNextToTheMine(page);
  await page.clock.runFor(3_000);

  await cell(page, 0, 0).click();
  await expect(cell(page, 0, 0)).toHaveAttribute("data-state", "exploded");
  await page.clock.runFor(10_000);

  await expect(timer(page)).toHaveAccessibleName("Timer: 003");
});

test("the timer never goes past 999", async ({ page }) => {
  await openWithPausedClock(page);
  await revealNextToTheMine(page);

  await page.clock.fastForward("20:00");

  await expect(timer(page)).toHaveAccessibleName("Timer: 999");
});

test("the timer keeps counting while a hidden tab's timers are throttled", async ({ page }) => {
  await openWithPausedClock(page);
  await revealNextToTheMine(page);

  // A hidden tab runs timers rarely; fastForward jumps a minute and fires each timer at most once.
  await page.clock.fastForward("01:00");

  await expect(timer(page)).toHaveAccessibleName("Timer: 060");
});

test("a new Game resets the timer to 000", async ({ page }) => {
  await openWithPausedClock(page);
  await revealNextToTheMine(page);
  await page.clock.runFor(3_000);
  await expect(timer(page)).toHaveAccessibleName("Timer: 003");

  await page.getByRole("button", { name: "New game" }).click();
  await page.clock.runFor(5_000);

  await expect(timer(page)).toHaveAccessibleName("Timer: 000");
});
