import { describe, expect, it } from "vitest";
import { applyAction, elapsedSeconds, newGame, statusOf } from "./game";
import {
  cycleMarker,
  layoutFrom,
  reveal,
  revealOrMark,
  SQUARE_3,
  unusedRandom,
} from "./testHelpers";

/** Two Mines in opposite corners: Revealing the centre shows Clue 2 and keeps the Game playing. */
const twoMines = () =>
  newGame(SQUARE_3, { random: unusedRandom, layout: layoutFrom(["x..", "...", "..x"]) });
const centre = { row: 1, col: 1 };

describe("the timer", () => {
  it("reads 0 before the first Reveal", () => {
    const game = newGame(SQUARE_3, { random: unusedRandom });

    expect(elapsedSeconds(game, 42_000)).toBe(0);
  });

  it("counts whole seconds from the first Reveal", () => {
    const playing = applyAction(twoMines(), reveal(centre, 10_000));

    expect(elapsedSeconds(playing, 13_700)).toBe(3);
  });

  it("starts at the first Reveal that opens a Cell, not at a Flag placed before it", () => {
    const playing = revealOrMark(twoMines(), [
      cycleMarker(centre, true, 1_000),
      reveal(centre, 2_000), // ignored: the centre is Flagged
      reveal({ row: 0, col: 1 }, 10_000),
    ]);

    expect(elapsedSeconds(playing, 13_700)).toBe(3);
  });

  it("reads 0 for a time earlier than the first Reveal", () => {
    const playing = applyAction(twoMines(), reveal(centre, 10_000));

    expect(elapsedSeconds(playing, 9_750)).toBe(0);
  });

  it("stops at the Reveal that loses the Game", () => {
    const lost = revealOrMark(twoMines(), [
      reveal(centre, 10_000),
      reveal({ row: 0, col: 0 }, 17_200),
    ]);

    expect(elapsedSeconds(lost, 60_000)).toBe(7);
  });

  it("stops at the Reveal that wins the Game", () => {
    // Each Reveal Cascades from a 0-Clue corner; the second one Reveals the last safe Cell.
    const won = revealOrMark(twoMines(), [
      reveal({ row: 0, col: 2 }, 10_000),
      reveal({ row: 2, col: 0 }, 14_500),
    ]);

    expect(statusOf(won)).toBe("won");
    expect(elapsedSeconds(won, 60_000)).toBe(4);
  });

  it("never goes past 999", () => {
    const playing = applyAction(twoMines(), reveal(centre, 10_000));

    expect(elapsedSeconds(playing, 1_009_999)).toBe(999);
    expect(elapsedSeconds(playing, 3_600_000)).toBe(999);
  });
});
