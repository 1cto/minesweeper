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
 * there; the returned functions move it by an offset and lift it.
 */
async function fingerDown(page: Page, target: Locator) {
  const box = await target.boundingBox();
  if (!box) throw new Error("target is not visible");
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  const cdp = await page.context().newCDPSession(page);
  const touch = (type: "touchStart" | "touchMove", dx = 0, dy = 0) =>
    cdp.send("Input.dispatchTouchEvent", { type, touchPoints: [{ x: x + dx, y: y + dy }] });
  await touch("touchStart");
  return {
    moveBy: (dx: number, dy: number) => touch("touchMove", dx, dy),
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
  // Every face the smiley shows, in order, from now on.
  await smiley(page).evaluate((button) => {
    const faces: string[] = [];
    Object.assign(window, { faces });
    new MutationObserver(() => faces.push(button.dataset.face ?? "")).observe(button, {
      attributeFilter: ["data-face"],
    });
  });

  await cell(page, 1, 1).tap();
  await expect(cell(page, 1, 1)).toHaveAttribute("data-state", "revealed");

  await expect
    .poll(() => page.evaluate(() => (window as unknown as { faces: string[] }).faces))
    .toEqual(["surprised", "normal"]);
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
