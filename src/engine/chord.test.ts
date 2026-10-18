import { describe, expect, it } from "vitest";
import { applyAction, elapsedSeconds, newGame, statusOf } from "./game";
import {
  chord,
  cycleMarker,
  layoutFrom,
  picture,
  reveal,
  revealOrMark,
  unusedRandom,
  WIDE_5x3,
} from "./testHelpers";

/**
 * Six Mines around (1, 2), whose Clue is 2 from (0, 2) and (2, 2). None of the Cells around it has
 * a Clue of 0, so a Chord there Reveals exactly its other Neighbors.
 */
const aroundTheMiddle = () =>
  newGame(WIDE_5x3, {
    random: unusedRandom,
    layout: layoutFrom(["x.x.x", ".....", "x.x.x"]),
  });
const middle = { row: 1, col: 2 };

describe("a Chord", () => {
  it("Reveals every other Hidden Neighbor when the Clue equals the Flagged Neighbors", () => {
    const next = revealOrMark(aroundTheMiddle(), [
      reveal(middle),
      cycleMarker({ row: 0, col: 2 }),
      cycleMarker({ row: 2, col: 2 }),
      chord(middle),
    ]);

    expect(picture(next)).toEqual(["#2F2#", "#424#", "#2F2#"]);
    expect(statusOf(next)).toBe("playing");
  });

  it("does nothing when there are fewer Flagged Neighbors than the Clue", () => {
    const next = revealOrMark(aroundTheMiddle(), [
      reveal(middle),
      cycleMarker({ row: 0, col: 2 }),
      chord(middle),
    ]);

    expect(picture(next)).toEqual(["##F##", "##2##", "#####"]);
  });

  it("does nothing when there are more Flagged Neighbors than the Clue", () => {
    const next = revealOrMark(aroundTheMiddle(), [
      reveal(middle),
      cycleMarker({ row: 0, col: 1 }),
      cycleMarker({ row: 0, col: 2 }),
      cycleMarker({ row: 2, col: 2 }),
      chord(middle),
    ]);

    expect(picture(next)).toEqual(["#FF##", "##2##", "##F##"]);
  });

  it("Reveals a Neighbor that carries a Question", () => {
    const question = { row: 1, col: 1 };

    const next = revealOrMark(aroundTheMiddle(), [
      reveal(middle),
      cycleMarker({ row: 0, col: 2 }),
      cycleMarker({ row: 2, col: 2 }),
      cycleMarker(question),
      cycleMarker(question),
      chord(middle),
    ]);

    expect(picture(next)).toEqual(["#2F2#", "#424#", "#2F2#"]);
  });

  it("Cascades from every Neighbor it Reveals whose Clue is 0", () => {
    const game = newGame(WIDE_5x3, {
      random: unusedRandom,
      layout: layoutFrom(["x....", "....x", "...x."]),
    });
    const nextToTheMine = { row: 1, col: 1 };

    const next = revealOrMark(game, [
      reveal(nextToTheMine),
      cycleMarker({ row: 0, col: 0 }),
      chord(nextToTheMine),
    ]);

    // The Cascade from (0, 2) reaches (0, 3) and (1, 3), beyond the Chord's Neighbors.
    expect(picture(next)).toEqual(["F101#", "1112#", "001##"]);
    expect(statusOf(next)).toBe("playing");
  });

  it("is a Loss when a wrong Flag lets it Reveal a Mine", () => {
    const next = revealOrMark(aroundTheMiddle(), [
      reveal(middle),
      cycleMarker({ row: 0, col: 2 }),
      cycleMarker({ row: 1, col: 1 }),
      chord(middle),
    ]);

    expect(statusOf(next)).toBe("lost");
    // Like the original, the Chord still Reveals its Neighbors without a Mine.
    expect(picture(next)).toEqual(["*2F2*", "#X24#", "*2!2*"]);
  });

  it("shows every Mine it Reveals as exploded, one for each wrong Flag", () => {
    const next = revealOrMark(aroundTheMiddle(), [
      reveal(middle),
      cycleMarker({ row: 1, col: 1 }),
      cycleMarker({ row: 1, col: 3 }),
      chord(middle),
    ]);

    expect(picture(next)).toEqual(["*2!2*", "#X2X#", "*2!2*"]);
  });

  it("is ignored before the first Reveal, so the Game stays ready", () => {
    const game = newGame(WIDE_5x3, { random: unusedRandom });

    const next = applyAction(game, chord(middle, 5_000));

    expect(statusOf(next)).toBe("ready");
    expect(picture(next)).toEqual(["#####", "#####", "#####"]);
    expect(elapsedSeconds(next, 9_000)).toBe(0);
  });

  it("is ignored on Hidden Cells, unmarked, Flagged or with a Question", () => {
    const playing = revealOrMark(aroundTheMiddle(), [
      reveal(middle),
      cycleMarker({ row: 0, col: 0 }),
      cycleMarker({ row: 0, col: 2 }),
      cycleMarker({ row: 0, col: 4 }),
      cycleMarker({ row: 0, col: 4 }),
    ]);

    // On a Revealed Cell, each Clue here would equal the Flags around it.
    const next = revealOrMark(playing, [
      chord({ row: 0, col: 1 }),
      chord({ row: 0, col: 2 }),
      chord({ row: 0, col: 4 }),
    ]);

    expect(picture(next)).toEqual(["F#F#?", "##2##", "#####"]);
  });

  it("is ignored after a Loss", () => {
    const lost = revealOrMark(aroundTheMiddle(), [
      reveal(middle),
      cycleMarker({ row: 0, col: 2 }),
      cycleMarker({ row: 2, col: 2 }),
      reveal({ row: 0, col: 0 }),
    ]);

    const next = applyAction(lost, chord(middle));

    expect(picture(next)).toEqual(["!#F#*", "##2##", "*#F#*"]);
  });
});

describe("the timer", () => {
  it("stops at a Chord that loses the Game", () => {
    const lost = revealOrMark(aroundTheMiddle(), [
      reveal(middle, 10_000),
      cycleMarker({ row: 0, col: 2 }, true, 11_000),
      cycleMarker({ row: 1, col: 1 }, true, 12_000),
      chord(middle, 17_200),
    ]);

    expect(elapsedSeconds(lost, 60_000)).toBe(7);
  });

  it("stops at a Chord that wins the Game, which Flags every Mine", () => {
    const game = newGame(WIDE_5x3, {
      random: unusedRandom,
      layout: layoutFrom(["x....", ".....", "....x"]),
    });

    const won = revealOrMark(game, [
      reveal({ row: 1, col: 1 }, 10_000),
      cycleMarker({ row: 0, col: 0 }, true, 11_000),
      chord({ row: 1, col: 1 }, 14_500),
    ]);

    expect(statusOf(won)).toBe("won");
    expect(picture(won)).toEqual(["F1000", "11011", "0001F"]);
    expect(elapsedSeconds(won, 60_000)).toBe(4);
  });
});
