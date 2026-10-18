import { expect, test, type Page } from "@playwright/test";
import { BROKEN_STORAGE, cell, ONE_MINE_IN_THE_CORNER, openWithLayout } from "./helpers";

/** Opens a Beginner Game with Playwright's clock paused, so time only moves when a test moves it. */
async function openWithPausedClock(page: Page) {
  await page.clock.install({ time: new Date("2026-01-01T09:00:00") });
  await openWithLayout(page, ONE_MINE_IN_THE_CORNER);
  await page.clock.pauseAt(new Date("2026-01-01T09:01:00"));
}

/** One Mine in the top-left corner of a Board `width` Cells wide and `height` Cells high. */
function oneMineInTheCorner(width: number, height: number) {
  const empty = ".".repeat(width);
  return ["x" + empty.slice(1), ...Array<string>(height - 1).fill(empty)];
}

/** Wins a Game with one Mine in the corner, with the timer stopping at `seconds`. */
async function winIn(page: Page, seconds: number) {
  // (1, 1) touches the Mine, so its Reveal starts the timer and the Game goes on.
  await cell(page, 1, 1).click();
  await page.clock.fastForward(seconds * 1_000);
  // The bottom-right Cell is far from the Mine, so its Cascade Reveals every other Cell.
  await page.locator("[data-testid^='cell-']").last().click();
  await expect(page.getByRole("button", { name: "New game" })).toHaveAttribute("data-face", "cool");
}

async function chooseFromGameMenu(page: Page, item: string) {
  await page.getByRole("menuitem", { name: "Game", exact: true }).click();
  await page.getByRole("menu").getByText(item, { exact: true }).click();
}

const namePrompt = (page: Page) => page.getByRole("dialog", { name: "New Best Time" });

const nameField = (page: Page) => namePrompt(page).getByRole("textbox", { name: "Name" });

async function enterName(page: Page, name: string) {
  await nameField(page).fill(name);
  await namePrompt(page).getByRole("button", { name: "OK" }).click();
  await expect(namePrompt(page)).toBeHidden();
}

const bestTimes = (page: Page) => page.getByRole("dialog", { name: "Best Times" });

const showBestTimes = (page: Page) => chooseFromGameMenu(page, "Best Times…");

/**
 * Expects the Best Times dialog to list each Difficulty as "Difficulty: N seconds Name". The rows'
 * inner text separates their cells, and the comparison reduces each separation to one space.
 */
async function expectBestTimes(page: Page, rows: string[]) {
  await expect(bestTimes(page).getByRole("row")).toHaveText(rows, { useInnerText: true });
}

test("a Win faster than the Best Time asks for a name and Best Times shows it", async ({
  page,
}) => {
  await openWithPausedClock(page);
  await winIn(page, 7);

  await expect(namePrompt(page)).toContainText("Beginner");
  await enterName(page, "Ada");
  await showBestTimes(page);

  await expectBestTimes(page, [
    "Beginner: 7 seconds Ada",
    "Intermediate: 999 seconds Anonymous",
    "Expert: 999 seconds Anonymous",
  ]);
});

test("a Best Time survives a reload", async ({ page }) => {
  await openWithPausedClock(page);
  await winIn(page, 7);
  await enterName(page, "Ada");

  await page.reload();
  await showBestTimes(page);

  await expectBestTimes(page, [
    "Beginner: 7 seconds Ada",
    "Intermediate: 999 seconds Anonymous",
    "Expert: 999 seconds Anonymous",
  ]);
});

test("a Win in exactly the Best Time does not ask for a name", async ({ page }) => {
  await openWithPausedClock(page);
  await winIn(page, 7);
  await enterName(page, "Ada");
  await page.reload();

  await winIn(page, 7);

  await expect(namePrompt(page)).toHaveCount(0);
  await showBestTimes(page);
  await expectBestTimes(page, [
    "Beginner: 7 seconds Ada",
    "Intermediate: 999 seconds Anonymous",
    "Expert: 999 seconds Anonymous",
  ]);
});

test("a Win slower than the Best Time does not ask for a name", async ({ page }) => {
  await openWithPausedClock(page);
  await winIn(page, 7);
  await enterName(page, "Ada");
  await page.reload();

  await winIn(page, 12);

  await expect(namePrompt(page)).toHaveCount(0);
  await showBestTimes(page);
  await expectBestTimes(page, [
    "Beginner: 7 seconds Ada",
    "Intermediate: 999 seconds Anonymous",
    "Expert: 999 seconds Anonymous",
  ]);
});

test("the name field offers Anonymous at first and then the last name entered", async ({
  page,
}) => {
  await openWithPausedClock(page);
  await winIn(page, 9);
  await expect(nameField(page)).toHaveValue("Anonymous");
  await enterName(page, "Ada");
  await page.reload();

  await winIn(page, 5);

  await expect(nameField(page)).toHaveValue("Ada");
});

test("the offered name starts selected, so typing replaces it and Enter confirms it", async ({
  page,
}) => {
  await openWithPausedClock(page);
  await winIn(page, 7);

  await page.keyboard.type("Ada");
  await page.keyboard.press("Enter");

  await expect(namePrompt(page)).toBeHidden();
  await showBestTimes(page);
  await expectBestTimes(page, [
    "Beginner: 7 seconds Ada",
    "Intermediate: 999 seconds Anonymous",
    "Expert: 999 seconds Anonymous",
  ]);
});

test("closing the name prompt still records the new Best Time", async ({ page }) => {
  await openWithPausedClock(page);
  await winIn(page, 7);

  await namePrompt(page).getByRole("button", { name: "Close" }).click();

  await expect(namePrompt(page)).toBeHidden();
  await showBestTimes(page);
  await expectBestTimes(page, [
    "Beginner: 7 seconds Anonymous",
    "Intermediate: 999 seconds Anonymous",
    "Expert: 999 seconds Anonymous",
  ]);
});

test("a name is capped at 32 characters", async ({ page }) => {
  await openWithPausedClock(page);
  await winIn(page, 7);

  await enterName(page, "Augusta Ada King, Countess of Lovelace");

  await showBestTimes(page);
  await expectBestTimes(page, [
    "Beginner: 7 seconds Augusta Ada King, Countess of Lo",
    "Intermediate: 999 seconds Anonymous",
    "Expert: 999 seconds Anonymous",
  ]);
});

test("a name is trimmed and an empty name is saved as Anonymous", async ({ page }) => {
  await openWithPausedClock(page);
  await winIn(page, 9);
  await enterName(page, "  Ada  ");
  await page.reload();
  await winIn(page, 5);
  await expect(nameField(page)).toHaveValue("Ada");

  await enterName(page, "   ");

  await showBestTimes(page);
  await expectBestTimes(page, [
    "Beginner: 5 seconds Anonymous",
    "Intermediate: 999 seconds Anonymous",
    "Expert: 999 seconds Anonymous",
  ]);
});

test("Reset Scores clears the Best Time of every Difficulty at once", async ({ page }) => {
  await openWithPausedClock(page);
  await winIn(page, 7);
  await enterName(page, "Ada");
  await chooseFromGameMenu(page, "Intermediate");
  await openWithLayout(page, oneMineInTheCorner(16, 16));
  await winIn(page, 40);
  await enterName(page, "Grace");
  await chooseFromGameMenu(page, "Expert");
  await openWithLayout(page, oneMineInTheCorner(30, 16));
  await winIn(page, 120);
  await enterName(page, "Edsger");
  await showBestTimes(page);
  await expectBestTimes(page, [
    "Beginner: 7 seconds Ada",
    "Intermediate: 40 seconds Grace",
    "Expert: 120 seconds Edsger",
  ]);

  await bestTimes(page).getByRole("button", { name: "Reset Scores" }).click();

  const cleared = [
    "Beginner: 999 seconds Anonymous",
    "Intermediate: 999 seconds Anonymous",
    "Expert: 999 seconds Anonymous",
  ];
  await expectBestTimes(page, cleared);
  // No confirmation: the Best Times dialog is the only one open.
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await page.reload();
  await showBestTimes(page);
  await expectBestTimes(page, cleared);
});

test("Reset Scores after a slower Win does not ask for a name for that Win", async ({ page }) => {
  await openWithPausedClock(page);
  await winIn(page, 7);
  await enterName(page, "Ada");
  await page.reload();
  await winIn(page, 12);
  await showBestTimes(page);

  await bestTimes(page).getByRole("button", { name: "Reset Scores" }).click();
  await bestTimes(page).getByRole("button", { name: "OK" }).click();

  await expect(bestTimes(page)).toBeHidden();
  await expect(namePrompt(page)).toHaveCount(0);
});

for (const [name, breakStorage] of Object.entries(BROKEN_STORAGE)) {
  test(`Best Times keep working in memory when storage is ${name}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(breakStorage);
    await openWithPausedClock(page);

    await winIn(page, 7);
    await expect(nameField(page)).toHaveValue("Anonymous");
    await enterName(page, "Ada");
    await showBestTimes(page);
    await expectBestTimes(page, [
      "Beginner: 7 seconds Ada",
      "Intermediate: 999 seconds Anonymous",
      "Expert: 999 seconds Anonymous",
    ]);
    await bestTimes(page).getByRole("button", { name: "Reset Scores" }).click();

    await expectBestTimes(page, [
      "Beginner: 999 seconds Anonymous",
      "Intermediate: 999 seconds Anonymous",
      "Expert: 999 seconds Anonymous",
    ]);
    expect(errors).toEqual([]);
  });
}

test("a Win at 999 seconds is no faster than a Difficulty without a Best Time", async ({
  page,
}) => {
  await openWithPausedClock(page);

  await winIn(page, 1_200);

  await expect(page.getByTestId("timer")).toHaveAccessibleName("Timer: 999");
  await expect(namePrompt(page)).toHaveCount(0);
});

/** Text in the system font, which differs between machines, so screenshots mask it. */
const systemFontText = (page: Page) => [
  page.getByTestId("dialog-title"),
  page.getByTestId("dialog-text"),
];

// Every screenshot is taken after a Win, with the timer stopped and the clock paused.

test("the name prompt is a Windows 98 dialog with a text box and only an OK button", async ({
  page,
}) => {
  await openWithPausedClock(page);
  await winIn(page, 7);
  await page.mouse.move(0, 0);

  await expect(namePrompt(page)).toHaveScreenshot("name-prompt.png", {
    mask: systemFontText(page),
  });
});

test("the Best Times dialog is a Windows 98 dialog with Reset Scores and OK", async ({ page }) => {
  await openWithPausedClock(page);
  await winIn(page, 7);
  await enterName(page, "Ada");
  await showBestTimes(page);
  await page.mouse.move(0, 0);

  await expect(bestTimes(page)).toHaveScreenshot("best-times.png", {
    mask: systemFontText(page),
  });
});
