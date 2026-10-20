import { describe, expect, it } from "vitest";
import { newGame, type Coord, type Game } from "../engine/game";
import {
  cellsOf,
  cycleMarker,
  layoutFrom,
  reveal,
  revealAll,
  revealOrMark,
  unusedRandom,
  WIDE_5x3,
} from "../engine/testHelpers";
import {
  applyMouse,
  isUnderWay,
  looksPressedIn,
  type Button,
  type Intent,
  type MouseInput,
  type Press,
} from "./press";

/** Mines in two corners, so every Cell in the middle row has a Clue of 0 or 1. */
const READY = newGame(WIDE_5x3, {
  random: unusedRandom,
  layout: layoutFrom(["x....", ".....", "....x"]),
});
const middle = { row: 1, col: 2 };
const TOP_MINE = { row: 0, col: 0 };
const MINES = [TOP_MINE, { row: 2, col: 4 }];

const down = (button: Button, cell: Coord): MouseInput => ({ type: "down", button, cell });
const up = (button: Button, cell?: Coord): MouseInput => ({ type: "up", button, cell });
const point = (cell?: Coord): MouseInput => ({ type: "point", cell });

/** Feeds `inputs` to the Board with no Press under way, keeping every intent on the way. */
function feed(game: Game, inputs: MouseInput[]): { press: Press; intents: Intent[] } {
  let press: Press;
  const intents: Intent[] = [];
  for (const input of inputs) {
    const next = applyMouse(press, game, input);
    press = next.press;
    if (next.intent) intents.push(next.intent);
  }
  return { press, intents };
}

/** Draws which Cells look pressed in: "o" for pressed in, "." otherwise. */
function pressedIn(game: Game, press: Press): string[] {
  const { width, height } = game.difficulty;
  return Array.from({ length: height }, (_, row) =>
    Array.from({ length: width }, (_, col) =>
      looksPressedIn(press, game, { row, col }) ? "o" : ".",
    ).join(""),
  );
}

describe("a left press", () => {
  it("pushes in the Hidden Cell under it, and its release Reveals that Cell", () => {
    const held = feed(READY, [down("left", middle)]);
    expect(isUnderWay(held.press)).toBe(true);
    expect(pressedIn(READY, held.press)).toEqual([".....", "..o..", "....."]);

    const released = feed(READY, [down("left", middle), up("left", middle)]);
    expect(released.intents).toEqual([{ type: "reveal", cell: middle }]);
    expect(isUnderWay(released.press)).toBe(false);
    expect(pressedIn(READY, released.press)).toEqual([".....", ".....", "....."]);
  });

  it("follows the pointer, and its release Reveals only the Cell under the pointer", () => {
    const corner = { row: 2, col: 0 };
    const moved = feed(READY, [down("left", middle), point(undefined), point(corner)]);
    expect(pressedIn(READY, moved.press)).toEqual([".....", ".....", "o...."]);

    const released = feed(READY, [down("left", middle), point(corner), up("left", corner)]);
    expect(released.intents).toEqual([{ type: "reveal", cell: corner }]);
  });

  it("released off the Board Reveals nothing and ends the Press", () => {
    const released = feed(READY, [down("left", middle), point(undefined), up("left", undefined)]);
    expect(released.intents).toEqual([]);
    expect(isUnderWay(released.press)).toBe(false);
  });

  it("never pushes in a Flagged or Revealed Cell, but does push in a Cell with a Question", () => {
    const revealed = { row: 1, col: 1 };
    const flagged = { row: 0, col: 1 };
    const questioned = { row: 0, col: 2 };
    const playing = revealOrMark(READY, [
      reveal(revealed),
      cycleMarker(flagged),
      cycleMarker(questioned),
      cycleMarker(questioned),
    ]);

    expect(pressedIn(playing, feed(playing, [down("left", revealed)]).press)).toEqual([
      ".....",
      ".....",
      ".....",
    ]);
    expect(pressedIn(playing, feed(playing, [down("left", flagged)]).press)).toEqual([
      ".....",
      ".....",
      ".....",
    ]);
    expect(pressedIn(playing, feed(playing, [down("left", questioned)]).press)).toEqual([
      "..o..",
      ".....",
      ".....",
    ]);
  });
});

describe("once the Game is over", () => {
  const lost = revealOrMark(READY, [reveal(TOP_MINE)]);
  const won = revealAll(
    READY,
    cellsOf(WIDE_5x3).filter(
      (cell) => !MINES.some((mine) => mine.row === cell.row && mine.col === cell.col),
    ),
  );

  it.each([
    ["Loss", lost],
    ["Win", won],
  ])("no button starts a Press after a %s", (_, game) => {
    for (const button of ["left", "middle", "right"] as const) {
      const pressed = feed(game, [down(button, middle)]);
      expect(isUnderWay(pressed.press)).toBe(false);
      expect(pressedIn(game, pressed.press)).toEqual([".....", ".....", "....."]);
      expect(feed(game, [down(button, middle), up(button, middle)]).intents).toEqual([]);
    }
  });
});

describe("a Chord", () => {
  /** (1, 1) Revealed with a Clue of 1, its Mine Flagged and a Question on (0, 1); the rest Hidden. */
  const playing = revealOrMark(READY, [
    reveal({ row: 1, col: 1 }),
    cycleMarker(TOP_MINE),
    cycleMarker({ row: 0, col: 1 }),
    cycleMarker({ row: 0, col: 1 }),
  ]);
  const chordDown = {
    "the middle button": (cell: Coord) => [down("middle", cell)],
    "the left and right buttons": (cell: Coord) => [down("left", cell), down("right", cell)],
  };

  it.each(Object.entries(chordDown))(
    "held with %s pushes in the Hidden Neighbors and those with a Question, never a Flag, and follows the pointer",
    (_, start) => {
      const held = feed(playing, start({ row: 1, col: 1 }));
      expect(pressedIn(playing, held.press)).toEqual([".oo..", "o.o..", "ooo.."]);

      const moved = feed(playing, [...start({ row: 1, col: 1 }), point({ row: 1, col: 4 })]);
      expect(pressedIn(playing, moved.press)).toEqual(["...oo", "...oo", "...oo"]);
    },
  );

  it("released over a Cell asks for a Chord there, and nothing else", () => {
    const cell = { row: 1, col: 1 };
    expect(feed(playing, [down("middle", cell), up("middle", cell)]).intents).toEqual([
      { type: "chord", cell },
    ]);
  });

  it.each(["left", "right"] as const)(
    "with the left button pressed first and the %s released first asks only for a Chord: no marker changes and nothing is Revealed",
    (first) => {
      const second = first === "left" ? "right" : "left";
      const cell = { row: 1, col: 1 };
      const released = feed(playing, [
        down("left", cell),
        down("right", cell),
        up(first, cell),
        up(second, cell),
      ]);
      expect(released.intents).toEqual([{ type: "chord", cell }]);
      expect(isUnderWay(released.press)).toBe(false);
    },
  );

  it("released off the Board asks for nothing and ends the Press", () => {
    const released = feed(playing, [
      down("middle", { row: 1, col: 1 }),
      point(undefined),
      up("middle", undefined),
    ]);
    expect(released.intents).toEqual([]);
    expect(isUnderWay(released.press)).toBe(false);
  });

  it.each(["left", "right"] as const)(
    "started by a right press keeps that press's marker change, and asks for the Chord (%s released first)",
    (first) => {
      const second = first === "left" ? "right" : "left";
      const cell = { row: 1, col: 3 };
      const released = feed(playing, [
        down("right", cell),
        down("left", cell),
        up(first, cell),
        up(second, cell),
      ]);
      expect(released.intents).toEqual([
        { type: "cycleMarker", cell },
        { type: "chord", cell },
      ]);
    },
  );
});

describe("a right press", () => {
  it("asks to cycle the marker as soon as it goes down, pushes nothing in, and its release asks for nothing", () => {
    const cell = { row: 0, col: 2 };
    const held = feed(READY, [down("right", cell)]);
    expect(held.intents).toEqual([{ type: "cycleMarker", cell }]);
    expect(isUnderWay(held.press)).toBe(true);
    expect(pressedIn(READY, held.press)).toEqual([".....", ".....", "....."]);

    expect(feed(READY, [down("right", cell), up("right", cell)]).intents).toEqual([
      { type: "cycleMarker", cell },
    ]);
  });
});
