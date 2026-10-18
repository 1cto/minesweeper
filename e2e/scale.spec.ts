import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  cell,
  EVERY_CLUE,
  EVERY_CLUE_CENTRES,
  ONE_MINE_IN_THE_CORNER,
  openWithLayout,
} from "./helpers";

type Viewport = { width: number; height: number };
type Difficulty = "Beginner" | "Intermediate" | "Expert";

/** The Minesweeper window, which shows the scale it is drawn at in `data-scale`. */
const theWindow = (page: Page) => page.getByTestId("window");

const hiddenCells = (page: Page) => page.locator('[data-state="hidden"]');

/** The drawn box of `target`, which must be visible. */
async function boxOf(target: Locator) {
  const box = await target.boundingBox();
  if (!box) throw new Error("target is not visible");
  return box;
}

/** The drawn size of the window, as "width×height". */
async function drawnSize(page: Page) {
  const { width, height } = await boxOf(theWindow(page));
  return `${width}×${height}`;
}

async function chooseFromMenu(page: Page, menu: "Game" | "Help", item: string) {
  await page.getByRole("menuitem", { name: menu, exact: true }).click();
  await page.getByRole("menu").getByText(item, { exact: true }).click();
}

/** Opens the game in a viewport of the given size on the given Difficulty. */
async function openIn(page: Page, viewport: Viewport, difficulty: Difficulty = "Beginner") {
  await page.setViewportSize(viewport);
  await page.goto("./");
  if (difficulty !== "Beginner") await chooseFromMenu(page, "Game", difficulty);
}

const named = ({ width, height }: Viewport) => `${width}×${height}`;

// Beginner is 174×256 at ×1, 348×512 at ×2 and 522×768 at ×3.
// Expert is 510×368 at ×1, 1020×736 at ×2 and 1530×1104 at ×3.
const SCALES: { difficulty: Difficulty; viewport: Viewport; scale: string; size: string }[] = [
  { difficulty: "Beginner", viewport: { width: 1280, height: 500 }, scale: "1", size: "174×256" },
  { difficulty: "Beginner", viewport: { width: 1280, height: 720 }, scale: "2", size: "348×512" },
  { difficulty: "Beginner", viewport: { width: 1920, height: 1080 }, scale: "3", size: "522×768" },
  { difficulty: "Beginner", viewport: { width: 522, height: 768 }, scale: "3", size: "522×768" },
  { difficulty: "Beginner", viewport: { width: 521, height: 1080 }, scale: "2", size: "348×512" },
  { difficulty: "Beginner", viewport: { width: 1920, height: 767 }, scale: "2", size: "348×512" },
  { difficulty: "Beginner", viewport: { width: 348, height: 512 }, scale: "2", size: "348×512" },
  { difficulty: "Beginner", viewport: { width: 347, height: 512 }, scale: "1", size: "174×256" },
  { difficulty: "Expert", viewport: { width: 1280, height: 720 }, scale: "1", size: "510×368" },
  { difficulty: "Expert", viewport: { width: 1280, height: 736 }, scale: "2", size: "1020×736" },
  { difficulty: "Expert", viewport: { width: 1019, height: 1080 }, scale: "1", size: "510×368" },
  { difficulty: "Expert", viewport: { width: 1920, height: 1080 }, scale: "2", size: "1020×736" },
  { difficulty: "Expert", viewport: { width: 1530, height: 1104 }, scale: "3", size: "1530×1104" },
  { difficulty: "Expert", viewport: { width: 2560, height: 1440 }, scale: "3", size: "1530×1104" },
];

for (const { difficulty, viewport, scale, size } of SCALES) {
  test(`${difficulty} in a ${named(viewport)} viewport is drawn at ×${scale}`, async ({ page }) => {
    await openIn(page, viewport, difficulty);

    await expect(theWindow(page)).toHaveAttribute("data-scale", scale);
    expect(await drawnSize(page)).toBe(size);
  });
}

/** How far the page reaches, as "width×height": larger than the viewport when it scrolls. */
const pageSize = (page: Page) =>
  page.evaluate(() => {
    const { scrollWidth, scrollHeight } = document.documentElement;
    return `${scrollWidth}×${scrollHeight}`;
  });

const TOO_SMALL: { difficulty: Difficulty; viewport: Viewport; size: string }[] = [
  { difficulty: "Beginner", viewport: { width: 160, height: 200 }, size: "174×256" },
  { difficulty: "Expert", viewport: { width: 400, height: 300 }, size: "510×368" },
];

for (const { difficulty, viewport, size } of TOO_SMALL) {
  test(`${difficulty} in a ${named(viewport)} viewport stays at ×1 and the page scrolls`, async ({
    page,
  }) => {
    await openIn(page, viewport, difficulty);

    await expect(theWindow(page)).toHaveAttribute("data-scale", "1");
    expect(await drawnSize(page)).toBe(size);
    expect(await pageSize(page)).toBe(size);
    // Nothing is out of reach above or to the left of the page.
    const { x, y } = await boxOf(theWindow(page));
    expect([x, y]).toEqual([0, 0]);
  });
}

test("resizing the viewport recomputes the scale", async ({ page }) => {
  await openIn(page, { width: 1280, height: 500 });
  await expect(theWindow(page)).toHaveAttribute("data-scale", "1");
  const resizes = [
    { viewport: { width: 1920, height: 1080 }, scale: "3", size: "522×768" },
    { viewport: { width: 1280, height: 720 }, scale: "2", size: "348×512" },
    { viewport: { width: 1280, height: 500 }, scale: "1", size: "174×256" },
  ];

  for (const { viewport, scale, size } of resizes) {
    await page.setViewportSize(viewport);

    await expect(theWindow(page), named(viewport)).toHaveAttribute("data-scale", scale);
    expect(await drawnSize(page), named(viewport)).toBe(size);
  }
});

test("choosing a Difficulty recomputes the scale for the new window size", async ({ page }) => {
  await openIn(page, { width: 1920, height: 1080 });
  await expect(theWindow(page)).toHaveAttribute("data-scale", "3");
  // Intermediate is 286×368 at ×1 and Expert 510×368, so neither fits 1080 pixels at ×3.
  const choices = [
    { difficulty: "Expert", scale: "2", size: "1020×736" },
    { difficulty: "Intermediate", scale: "2", size: "572×736" },
    { difficulty: "Beginner", scale: "3", size: "522×768" },
  ];

  for (const { difficulty, scale, size } of choices) {
    await chooseFromMenu(page, "Game", difficulty);

    await expect(theWindow(page), difficulty).toHaveAttribute("data-scale", scale);
    expect(await drawnSize(page), difficulty).toBe(size);
  }
});

/** Lets the page handle a viewport change: the resize steps run before the next frame. */
const nextFrames = (page: Page) =>
  page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );

const WHOLE_SCALES: { difficulty: Difficulty; seen: string[] }[] = [
  { difficulty: "Beginner", seen: ["×1 174×256", "×2 348×512", "×3 522×768"] },
  { difficulty: "Expert", seen: ["×1 510×368", "×2 1020×736", "×3 1530×1104"] },
];

for (const { difficulty, seen } of WHOLE_SCALES) {
  test(`${difficulty} is only ever drawn at ×1, ×2 or ×3 whatever the viewport size`, async ({
    page,
  }) => {
    await openIn(page, { width: 1280, height: 500 }, difficulty);
    const drawn = new Set<string>();

    // Odd steps, so most of these sizes are no whole multiple of the window.
    for (let width = 200; width <= 2000; width += 263) {
      for (let height = 200; height <= 1400; height += 181) {
        await page.setViewportSize({ width, height });
        await nextFrames(page);
        drawn.add(
          await theWindow(page).evaluate((element) => {
            const box = element.getBoundingClientRect();
            return `×${element.dataset.scale} ${box.width}×${box.height}`;
          }),
        );
      }
    }

    expect([...drawn].sort()).toEqual(seen);
  });
}

test("at ×2 a click Reveals the Cell drawn under the pointer and a right-click Flags it", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openWithLayout(page, ONE_MINE_IN_THE_CORNER);
  await expect(theWindow(page)).toHaveAttribute("data-scale", "2");
  const revealed = await boxOf(cell(page, 1, 1));
  const flagged = await boxOf(cell(page, 2, 2));
  expect([revealed.width, revealed.height]).toEqual([32, 32]);

  // Near opposite corners of the drawn Cells, so a Cell that still took clicks at its ×1 size
  // or position would miss them.
  await page.mouse.click(revealed.x + 30, revealed.y + 30);
  await page.mouse.click(flagged.x + 2, flagged.y + 2, { button: "right" });

  await expect(cell(page, 1, 1)).toHaveAttribute("data-clue", "1");
  await expect(cell(page, 2, 2)).toHaveAttribute("data-state", "flag");
  await expect(hiddenCells(page)).toHaveCount(79);
});

test("at ×2 an open menu is drawn at ×2 and a click anywhere else closes it and does nothing more", async ({
  page,
}) => {
  await openIn(page, { width: 1280, height: 720 });
  await expect(theWindow(page)).toHaveAttribute("data-scale", "2");
  const game = page.getByRole("menuitem", { name: "Game", exact: true });
  const menu = page.getByRole("menu");

  await game.click();
  expect((await boxOf(menu)).width, "140 pixels wide at ×1").toBe(280);
  // The top-left corner of the page is teal desktop, far outside the window.
  await page.mouse.click(5, 5);
  await expect(menu, "click on the desktop").toHaveCount(0);

  // The bottom-right Cell stays clear of the open Game menu.
  const corner = await boxOf(cell(page, 8, 8));
  await game.click();
  await page.mouse.click(corner.x + corner.width / 2, corner.y + corner.height / 2);
  await expect(menu, "click on a Cell").toHaveCount(0);
  await expect(hiddenCells(page)).toHaveCount(81);

  await chooseFromMenu(page, "Game", "Expert");
  await expect(hiddenCells(page)).toHaveCount(480);
});

test("at ×2 the About dialog is drawn at ×2 in the middle of the viewport", async ({ page }) => {
  await openIn(page, { width: 1280, height: 720 });
  await expect(theWindow(page)).toHaveAttribute("data-scale", "2");
  const about = page.getByRole("dialog", { name: "About Minesweeper" });

  await chooseFromMenu(page, "Help", "About Minesweeper…");

  // The dialog is 270×132 at ×1.
  expect(await boxOf(about)).toEqual({ x: 370, y: 228, width: 540, height: 264 });
  await about.getByRole("button", { name: "OK", exact: true }).click();
  await expect(about).toBeHidden();
});

test("at ×2 every graphic of the window is drawn crisp at twice its size", async ({ page }) => {
  // The Game is still playing when the screenshot is taken, so the timer must not move.
  await page.clock.setFixedTime(new Date("2026-01-01T09:00:00"));
  await page.setViewportSize({ width: 1280, height: 720 });
  await openWithLayout(page, EVERY_CLUE);

  for (const [row, col] of EVERY_CLUE_CENTRES) await cell(page, row, col).click();
  await cell(page, 0, 0).click({ button: "right" });
  await cell(page, 0, 1).click({ button: "right" });
  await cell(page, 0, 1).click({ button: "right" });
  await page.mouse.move(0, 0);

  await expect(theWindow(page)).toHaveAttribute("data-scale", "2");
  // The title and menu text are drawn with a system font, which differs between machines.
  await expect(theWindow(page)).toHaveScreenshot("window-x2.png", {
    mask: [page.getByTestId("title-text"), page.getByTestId("menu-text")],
  });
});
