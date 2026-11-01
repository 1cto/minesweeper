import { describe, expect, it } from "vitest";
import { applyAction, elapsedSeconds, finalSeconds, newGame, statusOf } from "./game";
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
/** One Mine in a corner: Revealing the opposite corner Cascades over every other Cell and wins. */
const oneMine = () =>
  newGame(SQUARE_3, { random: unusedRandom, layout: layoutFrom(["x..", "...", "..."]) });

describe("the timer", () => {
  it("reads 0 before the first Reveal", () => {
    const game = newGame(SQUARE_3, { random: unusedRandom });

    expect(elapsedSeconds(game, 42_000)).toBe(0);
  });

  it("shows 1 right at the first Reveal", () => {
    const playing = applyAction(twoMines(), reveal(centre, 10_000));

    expect(elapsedSeconds(playing, 10_000)).toBe(1);
  });

  it("adds one for each whole second after the first Reveal", () => {
    const playing = applyAction(twoMines(), reveal(centre, 10_000));

    expect(elapsedSeconds(playing, 13_700)).toBe(4);
  });

  it("starts at the first Reveal that opens a Cell, not at a Flag placed before it", () => {
    const playing = revealOrMark(twoMines(), [
      cycleMarker(centre, true, 1_000),
      reveal(centre, 2_000), // ignored: the centre is Flagged
      reveal({ row: 0, col: 1 }, 10_000),
    ]);

    expect(elapsedSeconds(playing, 13_700)).toBe(4);
  });

  it("reads 1 for a time earlier than the first Reveal", () => {
    const playing = applyAction(twoMines(), reveal(centre, 10_000));

    expect(elapsedSeconds(playing, 9_750)).toBe(1);
  });

  it("stops at the Reveal that loses the Game", () => {
    const lost = revealOrMark(twoMines(), [
      reveal(centre, 10_000),
      reveal({ row: 0, col: 0 }, 17_200),
    ]);

    expect(elapsedSeconds(lost, 60_000)).toBe(8);
  });

  it("stops at the Reveal that wins the Game", () => {
    // Each Reveal Cascades from a 0-Clue corner; the second one Reveals the last safe Cell.
    const won = revealOrMark(twoMines(), [
      reveal({ row: 0, col: 2 }, 10_000),
      reveal({ row: 2, col: 0 }, 14_500),
    ]);

    expect(statusOf(won)).toBe("won");
    expect(elapsedSeconds(won, 60_000)).toBe(5);
  });

  it("shows 1 for a Win on the first Reveal", () => {
    const won = applyAction(oneMine(), reveal({ row: 2, col: 2 }, 10_000));

    expect(statusOf(won)).toBe("won");
    expect(elapsedSeconds(won, 60_000)).toBe(1);
  });

  it("reaches 999 one whole second before 999 seconds have passed, and never goes past it", () => {
    const playing = applyAction(twoMines(), reveal(centre, 10_000));

    expect(elapsedSeconds(playing, 1_007_999)).toBe(998);
    expect(elapsedSeconds(playing, 1_008_000)).toBe(999);
    expect(elapsedSeconds(playing, 1_009_999)).toBe(999);
    expect(elapsedSeconds(playing, 3_600_000)).toBe(999);
  });
});

describe("the final seconds", () => {
  it("are where the timer stopped, once the Game is lost or won", () => {
    const lost = revealOrMark(twoMines(), [
      reveal(centre, 10_000),
      reveal({ row: 0, col: 0 }, 17_200),
    ]);
    const won = revealOrMark(twoMines(), [
      reveal({ row: 0, col: 2 }, 10_000),
      reveal({ row: 2, col: 0 }, 14_500),
    ]);

    expect(finalSeconds(lost)).toBe(8);
    expect(finalSeconds(won)).toBe(5);
  });

  it("stop at 999 like the timer", () => {
    const won = revealOrMark(twoMines(), [
      reveal({ row: 0, col: 2 }, 10_000),
      reveal({ row: 2, col: 0 }, 1_210_000),
    ]);

    expect(finalSeconds(won)).toBe(999);
  });

  it("are none while the Game is not over", () => {
    expect(finalSeconds(twoMines())).toBeUndefined();
    expect(finalSeconds(applyAction(twoMines(), reveal(centre, 10_000)))).toBeUndefined();
  });
});
