import { describe, expect, it } from "vitest";
import { applyAction, mineCounter, newGame, statusOf } from "./game";
import {
  cycleMarker,
  layoutFrom,
  picture,
  reveal,
  revealOrMark,
  unusedRandom,
  WIDE_5x3,
} from "./testHelpers";

describe("a Win", () => {
  it("Flags every Mine and the mine counter reads 0", () => {
    const game = newGame(WIDE_5x3, {
      random: unusedRandom,
      layout: layoutFrom(["x....", ".....", "....x"]),
    });

    const won = applyAction(game, reveal({ row: 0, col: 4 }));

    expect(statusOf(won)).toBe("won");
    expect(picture(won)).toEqual(["F1000", "11011", "0001F"]);
    expect(mineCounter(won)).toBe(0);
  });

  it("replaces a Question on a Mine with a Flag", () => {
    const game = newGame(WIDE_5x3, {
      random: unusedRandom,
      layout: layoutFrom(["x....", ".....", "....x"]),
    });

    const won = revealOrMark(game, [
      cycleMarker({ row: 2, col: 4 }),
      cycleMarker({ row: 2, col: 4 }),
      reveal({ row: 0, col: 4 }),
    ]);

    expect(picture(won)).toEqual(["F1000", "11011", "0001F"]);
    expect(mineCounter(won)).toBe(0);
  });
});

describe("a Loss", () => {
  it("shows the exploded Mine, every other Mine, wrong Flags and correct Flags", () => {
    const game = newGame(WIDE_5x3, {
      random: unusedRandom,
      layout: layoutFrom(["x...x", ".....", "..x.."]),
    });

    const lost = revealOrMark(game, [
      cycleMarker({ row: 0, col: 0 }),
      cycleMarker({ row: 1, col: 0 }),
      cycleMarker({ row: 0, col: 4 }),
      cycleMarker({ row: 0, col: 4 }),
      cycleMarker({ row: 2, col: 0 }),
      cycleMarker({ row: 2, col: 0 }),
      reveal({ row: 2, col: 4 }),
      reveal({ row: 2, col: 2 }),
    ]);

    expect(statusOf(lost)).toBe("lost");
    // (0, 0) is a correct Flag, (1, 0) a wrong one; (0, 4) is a Mine under a Question,
    // while the Question on (2, 0) has no Mine beneath it and stays.
    expect(picture(lost)).toEqual(["F###*", "X##21", "?#!10"]);
  });
});
