import { expect, test, type Page } from "@playwright/test";
import { cell, ONE_MINE_IN_THE_CORNER, openWithLayout } from "./helpers";

async function chooseFromMenu(page: Page, menu: "Game" | "Help", item: string) {
  await page.getByRole("menuitem", { name: menu, exact: true }).click();
  await page.getByRole("menu").getByText(item, { exact: true }).click();
}

const hiddenCells = (page: Page) => page.locator('[data-state="hidden"]');

/** The names of the Difficulties the open Game menu shows a checkmark next to. */
async function checkedDifficulties(page: Page) {
  const radios = page.getByRole("menuitemradio", { checked: true });
  return radios.evaluateAll((items) => items.map((item) => item.textContent));
}

test("choosing Expert starts a new Game on a 30×16 Board with 99 Mines", async ({ page }) => {
  await page.goto("./");

  await chooseFromMenu(page, "Game", "Expert");

  await expect(hiddenCells(page)).toHaveCount(480);
  await expect(cell(page, 15, 29)).toBeVisible();
  await expect(page.getByTestId("mine-counter")).toHaveAccessibleName("Mine counter: 099");
});

test("choosing Intermediate moves the checkmark from Beginner to Intermediate", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("menuitem", { name: "Game", exact: true }).click();
  const before = await checkedDifficulties(page);
  await page.getByRole("menuitemradio", { name: "Intermediate" }).click();

  await page.getByRole("menuitem", { name: "Game", exact: true }).click();

  expect([before, await checkedDifficulties(page)]).toEqual([["Beginner"], ["Intermediate"]]);
  await expect(hiddenCells(page)).toHaveCount(256);
  await expect(cell(page, 15, 15)).toBeVisible();
  await expect(page.getByTestId("mine-counter")).toHaveAccessibleName("Mine counter: 040");
});

test("Game → New and the smiley start a new Game on the current Difficulty", async ({ page }) => {
  await page.goto("./");
  await chooseFromMenu(page, "Game", "Expert");
  const starts = {
    "Game → New": () => chooseFromMenu(page, "Game", "New"),
    smiley: () => page.getByRole("button", { name: "New game" }).click(),
  };

  for (const [name, startNewGame] of Object.entries(starts)) {
    await cell(page, 8, 15).click();
    await expect(cell(page, 8, 15), name).toHaveAttribute("data-state", "revealed");

    await startNewGame();

    await expect(hiddenCells(page), name).toHaveCount(480);
  }
});

test("with Marks (?) off the right button only toggles a Flag and Questions stay", async ({
  page,
}) => {
  await openWithLayout(page, ONE_MINE_IN_THE_CORNER);
  const questioned = cell(page, 1, 1);
  const other = cell(page, 2, 2);
  await questioned.click({ button: "right" });
  await questioned.click({ button: "right" });
  const marks = page.getByRole("menuitemcheckbox", { name: "Marks (?)" });
  await page.getByRole("menuitem", { name: "Game", exact: true }).click();
  await expect(marks).toBeChecked();

  await marks.click();

  await expect(questioned).toHaveAttribute("data-state", "question");
  const seen: (string | null)[] = [];
  for (let i = 0; i < 3; i++) {
    await other.click({ button: "right" });
    seen.push(await other.getAttribute("data-state"));
  }
  await questioned.click({ button: "right" });
  seen.push(await questioned.getAttribute("data-state"));
  expect(seen).toEqual(["flag", "hidden", "flag", "hidden"]);
  await page.getByRole("menuitem", { name: "Game", exact: true }).click();
  await expect(marks).not.toBeChecked();
});

test("the last Difficulty and the Marks (?) setting survive a reload", async ({ page }) => {
  await page.goto("./");
  await chooseFromMenu(page, "Game", "Expert");
  await chooseFromMenu(page, "Game", "Marks (?)");

  await page.reload();

  await expect(hiddenCells(page)).toHaveCount(480);
  await page.getByRole("menuitem", { name: "Game", exact: true }).click();
  expect(await checkedDifficulties(page)).toEqual(["Expert"]);
  await expect(page.getByRole("menuitemcheckbox", { name: "Marks (?)" })).not.toBeChecked();
});

test("a test-only Layout applies to the Difficulty the Game starts on", async ({ page }) => {
  await page.goto("./");
  await chooseFromMenu(page, "Game", "Intermediate");
  const oneMineInTheCorner = ["x" + ".".repeat(15), ...Array<string>(15).fill(".".repeat(16))];

  await openWithLayout(page, oneMineInTheCorner);
  await cell(page, 15, 15).click();

  // The Reveal Cascades into a Win, which Flags the only Mine exactly where the Layout put it.
  await expect(page.getByRole("button", { name: "New game" })).toHaveAttribute("data-face", "cool");
  await expect(cell(page, 0, 0)).toHaveAttribute("data-state", "flag");
  await expect(cell(page, 1, 1)).toHaveAttribute("data-clue", "1");
  await expect(cell(page, 0, 15)).toHaveAttribute("data-clue", "0");
});

test("a click opens a menu and hovering the other title while it is open switches to it", async ({
  page,
}) => {
  await page.goto("./");
  const game = page.getByRole("menuitem", { name: "Game", exact: true });
  const help = page.getByRole("menuitem", { name: "Help", exact: true });
  const menu = page.getByRole("menu");

  await help.hover();
  await expect(menu).toHaveCount(0);
  await game.click();
  await expect(menu).toHaveAccessibleName("Game");
  await help.hover();
  await expect(menu).toHaveAccessibleName("Help");
  await game.hover();
  await expect(menu).toHaveAccessibleName("Game");
  await game.click();
  await expect(menu).toHaveCount(0);
});

test("a click anywhere else closes the open menu and does nothing more", async ({ page }) => {
  await page.goto("./");
  const game = page.getByRole("menuitem", { name: "Game", exact: true });
  const menu = page.getByRole("menu");

  await game.click();
  await page.mouse.click(5, 5);
  await expect(menu, "click on the desktop").toHaveCount(0);

  // The bottom-right Cell stays clear of the open Game menu.
  const box = await cell(page, 8, 8).boundingBox();
  if (!box) throw new Error("Cell is not visible");
  await game.click();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(menu, "click on a Cell").toHaveCount(0);
  await expect(hiddenCells(page)).toHaveCount(81);

  await chooseFromMenu(page, "Game", "Expert");
  await expect(menu, "choosing an item").toHaveCount(0);
});

test("Help → About Minesweeper names the game, its author and its source", async ({ page }) => {
  await page.goto("./");

  await chooseFromMenu(page, "Help", "About Minesweeper…");

  const about = page.getByRole("dialog", { name: "About Minesweeper" });
  await expect(about.getByText("Minesweeper", { exact: true })).toBeVisible();
  await expect(about.getByText("by 1cto", { exact: true })).toBeVisible();
  await expect(about.getByRole("link")).toHaveAttribute(
    "href",
    "https://github.com/1cto/minesweeper",
  );
});

test("the About dialog closes with OK and with its close button", async ({ page }) => {
  await page.goto("./");
  const about = page.getByRole("dialog", { name: "About Minesweeper" });

  for (const button of ["OK", "Close"]) {
    await chooseFromMenu(page, "Help", "About Minesweeper…");
    await expect(about, button).toBeVisible();

    await about.getByRole("button", { name: button, exact: true }).click();

    await expect(about, button).toBeHidden();
  }
});

/** Text in the system font, which differs between machines, so screenshots mask it. */
const systemFontText = (page: Page) => [
  page.getByTestId("title-text"),
  page.getByTestId("menu-text"),
  page.getByTestId("dialog-title"),
  page.getByTestId("dialog-text"),
];

// Every screenshot is taken before the first Reveal, while the timer still shows 000.

test("the open Game menu checks the Difficulty and Marks (?) and highlights the hovered item", async ({
  page,
}) => {
  await page.goto("./");

  await page.getByRole("menuitem", { name: "Game", exact: true }).click();
  await page.getByRole("menuitemradio", { name: "Intermediate" }).hover();

  await expect(page).toHaveScreenshot("game-menu.png", { mask: systemFontText(page) });
});

test("the window grows to fit the Expert Board", async ({ page }) => {
  await page.goto("./");

  await chooseFromMenu(page, "Game", "Expert");
  await page.mouse.move(0, 0);

  await expect(page).toHaveScreenshot("expert.png", { mask: systemFontText(page) });
});

test("the About dialog is a Windows 98 dialog over the game", async ({ page }) => {
  await page.goto("./");

  await chooseFromMenu(page, "Help", "About Minesweeper…");
  await page.mouse.move(0, 0);

  await expect(page).toHaveScreenshot("about.png", { mask: systemFontText(page) });
});

const BROKEN_STORAGE = {
  // Blocked site data: merely touching localStorage throws.
  blocked: () => {
    const fail = () => {
      throw new DOMException("The operation is insecure.", "SecurityError");
    };
    Object.defineProperty(window, "localStorage", { get: fail });
  },
  // Every read and write throws, like a full or disabled store.
  throwing: () => {
    const fail = () => {
      throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
    };
    Object.assign(Storage.prototype, { getItem: fail, setItem: fail, removeItem: fail });
  },
};

for (const [name, breakStorage] of Object.entries(BROKEN_STORAGE)) {
  test(`the game loads and plays when storage is ${name}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(breakStorage);
    await openWithLayout(page, ONE_MINE_IN_THE_CORNER);

    await chooseFromMenu(page, "Game", "Marks (?)");
    const states: (string | null)[] = [];
    for (let i = 0; i < 2; i++) {
      await cell(page, 0, 0).click({ button: "right" });
      states.push(await cell(page, 0, 0).getAttribute("data-state"));
    }
    await cell(page, 8, 8).click();
    await expect(cell(page, 1, 1)).toHaveAttribute("data-clue", "1");
    await chooseFromMenu(page, "Game", "Expert");

    expect(states).toEqual(["flag", "hidden"]);
    await expect(hiddenCells(page)).toHaveCount(480);
    await page.getByRole("menuitem", { name: "Game", exact: true }).click();
    expect(await checkedDifficulties(page)).toEqual(["Expert"]);
    await expect(page.getByRole("menuitemcheckbox", { name: "Marks (?)" })).not.toBeChecked();
    expect(errors).toEqual([]);
  });
}
