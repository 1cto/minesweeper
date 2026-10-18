import { describe, expect, it } from "vitest";
import {
  applyAction,
  DIFFICULTIES,
  EXPERT,
  INTERMEDIATE,
  layoutOf,
  mineCount,
  newGame,
  statusOf,
} from "./game";
import { picture, reveal, seededRandom, unusedRandom } from "./testHelpers";

describe("the Difficulties", () => {
  it("are Beginner, Intermediate and Expert, in that order", () => {
    expect(DIFFICULTIES.map((difficulty) => difficulty.name)).toEqual([
      "Beginner",
      "Intermediate",
      "Expert",
    ]);
  });
});

describe("a new Intermediate Game", () => {
  it("has a 16×16 Board of Hidden Cells and 40 Mines", () => {
    const game = newGame(INTERMEDIATE, { random: unusedRandom });

    expect(picture(game)).toEqual(Array.from({ length: 16 }, () => "################"));
    expect(mineCount(game)).toBe(40);
  });
});

describe("a new Expert Game", () => {
  it("has a 30×16 Board of Hidden Cells and 99 Mines", () => {
    const game = newGame(EXPERT, { random: unusedRandom });

    expect(picture(game)).toEqual(
      Array.from({ length: 16 }, () => "##############################"),
    );
    expect(mineCount(game)).toBe(99);
  });
});

describe.each([
  { name: "Beginner", mines: 10 },
  { name: "Intermediate", mines: 40 },
  { name: "Expert", mines: 99 },
])("the first Reveal on $name", ({ name, mines }) => {
  const difficulty = DIFFICULTIES.find((candidate) => candidate.name === name);
  const seeds = Array.from({ length: 100 }, (_, i) => i + 1);
  const corner = { row: 0, col: 0 };

  it(`never hits a Mine and fixes a Layout of ${mines} Mines elsewhere`, () => {
    if (!difficulty) throw new Error(`no Difficulty named ${name}`);
    for (const seed of seeds) {
      const game = newGame(difficulty, { random: seededRandom(seed) });

      const next = applyAction(game, reveal(corner));

      const layout = (layoutOf(next) ?? []).map(({ row, col }) => `${row},${col}`);
      expect(statusOf(next), `seed ${seed}`).not.toBe("lost");
      expect(new Set(layout).size, `seed ${seed}`).toBe(mines);
      expect(layout, `seed ${seed}`).not.toContain("0,0");
    }
  });
});
