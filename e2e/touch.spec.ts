import { expect, test, type Locator, type Page } from "@playwright/test";
import { cell, ONE_MINE_IN_THE_CORNER, openWithLayout } from "./helpers";

// A tablet: touch input, in a viewport the size of a standard iPad held upright.
test.use({ hasTouch: true, viewport: { width: 820, height: 1180 } });

const smiley = (page: Page) => page.getByRole("button", { name: "New game" });
const hiddenCells = (page: Page) => page.locator('[data-state="hidden"]');

/**
 * Opens a Beginner Game with one Mine in the corner and Playwright's clock paused, so the 400 ms of
 * a Long Touch only pass when a test moves the clock on.
 */
async function openPaused(page: Page) {
  await page.clock.install({ time: new Date("2026-01-01T09:00:00") });
  await openWithLayout(page, ONE_MINE_IN_THE_CORNER);
  await page.clock.pauseAt(new Date("2026-01-01T09:01:00"));
}

/**
 * Puts a finger down in the middle of `target` through the browser's own touch input and keeps it
 * there; the returned functions move it by an offset, put a second finger down at a point on
 * screen, and lift every finger.
 */
async function fingerDown(page: Page, target: Locator) {
  const box = await target.boundingBox();
  if (!box) throw new Error("target is not visible");
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  const cdp = await page.context().newCDPSession(page);
  const touch = (type: "touchStart" | "touchMove", ...touchPoints: { x: number; y: number }[]) =>
    cdp.send("Input.dispatchTouchEvent", { type, touchPoints });
  await touch("touchStart", { x, y });
  return {
    moveBy: (dx: number, dy: number) => touch("touchMove", { x: x + dx, y: y + dy }),
    secondFingerAt: (second: { x: number; y: number }) => touch("touchStart", { x, y }, second),
    lift: () => cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }),
  };
}

test("a Tap on a Hidden Cell Reveals it", async ({ page }) => {
  await openWithLayout(page, ONE_MINE_IN_THE_CORNER);

  await cell(page, 1, 1).tap();

  await expect(cell(page, 1, 1)).toHaveAttribute("data-state", "revealed");
  await expect(cell(page, 1, 1)).toHaveAttribute("data-clue", "1");
  await expect(hiddenCells(page)).toHaveCount(80);
});

test("a Tap acts once: the smiley looks surprised once and the click the browser makes after it does nothing", async ({
  page,
}) => {
  await openWithLayout(page, ONE_MINE_IN_THE_CORNER);
  // Every face the smiley shows, in order, and every click, from now on.
  await smiley(page).evaluate((button) => {
    const seen = { faces: [] as string[], clicks: 0 };
    Object.assign(window, { seen });
    new MutationObserver(() => seen.faces.push(button.dataset.face ?? "")).observe(button, {
      attributeFilter: ["data-face"],
    });
    document.addEventListener("click", () => seen.clicks++, true);
  });
  const seen = () =>
    page.evaluate(() => (window as unknown as { seen: { faces: string[]; clicks: number } }).seen);

  await cell(page, 1, 1).tap();

  // The browser's click comes last, after the mouse events it makes for a Tap, so once it has
  // come every face the Tap brought has been seen.
  await expect.poll(async () => (await seen()).clicks).toBe(1);
  expect((await seen()).faces).toEqual(["surprised", "normal"]);
  await expect(cell(page, 1, 1)).toHaveAttribute("data-state", "revealed");
});

test("a Long Touch puts a Flag after 400 ms while the finger is still down, and the lift does nothing more", async ({
  page,
}) => {
  await openPaused(page);
  const target = cell(page, 1, 1);

  const finger = await fingerDown(page, target);
  await expect(target).toHaveAttribute("data-pressed", "true");
  await expect(smiley(page)).toHaveAttribute("data-face", "surprised");

  await page.clock.runFor(400);
  await expect(target).toHaveAttribute("data-state", "flag");
  await expect(target).not.toHaveAttribute("data-pressed");
  await expect(page.getByTestId("mine-counter")).toHaveAccessibleName("Mine counter: 000");
  await expect(smiley(page)).toHaveAttribute("data-face", "surprised");

  await finger.lift();
  await expect(smiley(page)).toHaveAttribute("data-face", "normal");
  await expect(target).toHaveAttribute("data-state", "flag");
  await expect(hiddenCells(page)).toHaveCount(80);
});

test("sliding the finger away cancels the Touch: nothing is Revealed or Flagged", async ({
  page,
}) => {
  await openPaused(page);
  const target = cell(page, 1, 1);

  const finger = await fingerDown(page, target);
  await expect(target).toHaveAttribute("data-pressed", "true");
  await finger.moveBy(30, 0);
  await expect(target).not.toHaveAttribute("data-pressed");
  await page.clock.runFor(400);
  await finger.lift();

  await expect(smiley(page)).toHaveAttribute("data-face", "normal");
  await expect(hiddenCells(page)).toHaveCount(81);
});

test("a second finger on the Board's border cancels the Touch: nothing is Revealed", async ({
  page,
}) => {
  await openWithLayout(page, ONE_MINE_IN_THE_CORNER);
  const target = cell(page, 1, 1);
  const board = await page.locator(".board").boundingBox();
  if (!board) throw new Error("the Board is not visible");

  const finger = await fingerDown(page, target);
  await expect(target).toHaveAttribute("data-pressed", "true");
  // The Board's left border, beside the first column of Cells.
  await finger.secondFingerAt({ x: board.x + 1, y: board.y + board.height / 2 });
  await expect(target).not.toHaveAttribute("data-pressed");
  await finger.lift();

  await expect(smiley(page)).toHaveAttribute("data-face", "normal");
  await expect(hiddenCells(page)).toHaveCount(81);
});

test("a Tap on a Clue whose Mines are all Flagged Chords, here clearing the Board for a Win", async ({
  page,
}) => {
  await openPaused(page);
  await cell(page, 1, 1).tap();
  const finger = await fingerDown(page, cell(page, 0, 0));
  await page.clock.runFor(400);
  await finger.lift();
  await expect(cell(page, 0, 0)).toHaveAttribute("data-state", "flag");

  await cell(page, 1, 1).tap();

  await expect(hiddenCells(page)).toHaveCount(0);
  await expect(smiley(page)).toHaveAttribute("data-face", "cool");
});
