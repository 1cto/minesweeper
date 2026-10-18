import { expect, test } from "@playwright/test";

test("the game loads under the /minesweeper/ project path with every asset found", async ({
  page,
}) => {
  // On GitHub Pages only /minesweeper/ belongs to this project, so nothing may be fetched elsewhere.
  const problems: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.protocol.startsWith("http") && !url.pathname.startsWith("/minesweeper/")) {
      problems.push(`outside the project path: ${url.pathname}`);
    }
  });
  page.on("response", (response) => {
    if (response.status() >= 400) problems.push(`${response.status()} ${response.url()}`);
  });
  page.on("requestfailed", (request) => problems.push(`failed ${request.url()}`));
  page.on("pageerror", (error) => problems.push(`error ${error.message}`));

  await page.goto("./");

  await expect(page.getByTestId("game")).toBeVisible();
  expect(problems).toEqual([]);
});
