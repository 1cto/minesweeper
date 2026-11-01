import { describe, expect, it } from "vitest";
import { cellView, elapsedSeconds, mineCounter, newGame, type Coord } from "../engine/game";
import {
  cellsOf,
  cycleMarker,
  layoutFrom,
  picture,
  reveal,
  revealAll,
  revealOrMark,
  unusedRandom,
  WIDE_5x3,
} from "../engine/testHelpers";
import {
  applyBoardEvent,
  isPressOrTouchUnderWay,
  looksPressedIn,
  type BoardEvent,
  type BoardState,
} from "./boardState";
import { isUnderWay, type Button } from "./press";
import type { Point, TouchInput } from "./touch";

/** Mines in two corners: (1, 1) has a Clue of 1 and no Cascade starts there. */
const READY = newGame(WIDE_5x3, {
  random: unusedRandom,
  layout: layoutFrom(["x....", ".....", "....x"]),
});
const START: BoardState = { game: READY, press: undefined, touch: undefined };
const clueOf1 = { row: 1, col: 1 };

const mouse = (
  type: "down" | "up",
  button: Button,
  cell: Coord | undefined,
  { now = 0, questionsEnabled = true } = {},
): BoardEvent =>
  type === "down" && cell
    ? { type: "mouse", input: { type, button, cell }, now, questionsEnabled }
    : { type: "mouse", input: { type: "up", button, cell }, now, questionsEnabled };

const applyAll = (state: BoardState, events: BoardEvent[]) => events.reduce(applyBoardEvent, state);

type TouchOptions = { now?: number; pointer?: number; questionsEnabled?: boolean };

/** Where every finger goes down on screen; moves are measured from here. */
const ORIGIN: Point = { x: 100, y: 100 };

const touchEvent = (
  input: TouchInput,
  { now = 0, questionsEnabled = true }: TouchOptions,
): BoardEvent => ({ type: "touch", input, now, questionsEnabled });

/** A finger going down on `cell` at `ORIGIN`; finger 1 unless `pointer` says otherwise. */
const fingerDown = (cell: Coord, options: TouchOptions = {}) =>
  touchEvent({ type: "down", pointer: options.pointer ?? 1, cell, at: ORIGIN }, options);

/** A finger going down on the Board's border, between no Cells. */
const fingerDownOnTheBorder = (options: TouchOptions = {}) =>
  touchEvent({ type: "down", pointer: options.pointer ?? 1, at: ORIGIN }, options);

const fingerMove = (at: Point, options: TouchOptions = {}) =>
  touchEvent({ type: "move", pointer: options.pointer ?? 1, at }, options);

const fingerUp = (options: TouchOptions = {}) =>
  touchEvent({ type: "up", pointer: options.pointer ?? 1 }, options);

/** The browser taking the finger over, to scroll or zoom the page. */
const browserCancels = (options: TouchOptions = {}) =>
  touchEvent({ type: "cancel", pointer: options.pointer ?? 1 }, options);

/** The finger still on the Board at `now`: the moment a Touch may become a Long Touch. */
const stillHeld = (options: TouchOptions = {}) => touchEvent({ type: "held" }, options);

/** A finger held on `cell` from `now` until it becomes a Long Touch, and lifted. */
const longTouch = (cell: Coord, { now = 0, ...options }: TouchOptions = {}) => [
  fingerDown(cell, { now, ...options }),
  stillHeld({ now: now + 400, ...options }),
  fingerUp({ now: now + 500, ...options }),
];

/** Draws which Cells look pressed in: "o" for pressed in, "." otherwise. */
function pressedIn(state: BoardState): string[] {
  return Array.from({ length: WIDE_5x3.height }, (_, row) =>
    Array.from({ length: WIDE_5x3.width }, (_, col) =>
      looksPressedIn(state, { row, col }) ? "o" : ".",
    ).join(""),
  );
}

describe("a mouse event on the Board", () => {
  it("passes the Press's request to the engine, stamped with the event's time", () => {
    const state = applyAll(START, [
      mouse("down", "left", clueOf1, { now: 1_000 }),
      mouse("up", "left", clueOf1, { now: 5_000 }),
    ]);

    expect(cellView(state.game, clueOf1)).toEqual({ kind: "revealed", clue: 1 });
    expect(elapsedSeconds(state.game, 8_000)).toBe(4);
  });

  it.each([
    [true, "question"],
    [false, "hidden"],
  ] as const)("with Marks (?) %s, cycles a Flag to %s", (questionsEnabled, after) => {
    const cell = { row: 0, col: 2 };
    const rightClick = [
      mouse("down", "right", cell, { questionsEnabled }),
      mouse("up", "right", cell, { questionsEnabled }),
    ];
    const flagged = applyAll(START, rightClick);
    expect(cellView(flagged.game, cell)).toEqual({ kind: "flag" });
    expect(cellView(applyAll(flagged, rightClick).game, cell)).toEqual({ kind: after });
  });

  it("passes a Chord on to the engine as a Chord", () => {
    const mine = { row: 0, col: 0 };
    const ready = applyAll(START, [
      mouse("down", "left", clueOf1),
      mouse("up", "left", clueOf1),
      mouse("down", "right", mine),
      mouse("up", "right", mine),
    ]);
    const chorded = applyAll(ready, [
      mouse("down", "middle", clueOf1),
      mouse("up", "middle", clueOf1),
    ]);

    expect(cellView(chorded.game, { row: 2, col: 2 })).toEqual({ kind: "revealed", clue: 0 });
  });

  it("leaves the very state it got when nothing changes, so a release delivered twice acts once", () => {
    const released = applyAll(START, [
      mouse("down", "left", clueOf1),
      mouse("up", "left", clueOf1),
    ]);
    expect(applyBoardEvent(released, mouse("up", "left", clueOf1))).toBe(released);

    const pointed: BoardEvent = {
      type: "mouse",
      input: { type: "point", cell: clueOf1 },
      now: 0,
      questionsEnabled: true,
    };
    expect(applyBoardEvent(START, pointed)).toBe(START);
  });
});

describe("a new Game", () => {
  it("replaces the Game and drops the Press under way", () => {
    const held = applyAll(START, [mouse("down", "left", clueOf1)]);
    const fresh = newGame(WIDE_5x3, {
      random: unusedRandom,
      layout: layoutFrom(["....x", ".....", "x...."]),
    });

    const next = applyBoardEvent(held, { type: "newGame", game: fresh });

    expect(next.game).toBe(fresh);
    expect(isUnderWay(next.press)).toBe(false);
  });
});

describe("a Tap", () => {
  it("on a Hidden Cell Reveals it when the finger lifts, at the time of the lift", () => {
    const touched = applyAll(START, [fingerDown(clueOf1, { now: 1_000 })]);
    expect(cellView(touched.game, clueOf1)).toEqual({ kind: "hidden" });

    const tapped = applyBoardEvent(touched, fingerUp({ now: 1_300 }));
    expect(cellView(tapped.game, clueOf1)).toEqual({ kind: "revealed", clue: 1 });
    // Revealed at 1.3 s, the Timer reads 2 at 3.25 s; had the touch's time been used, it would read 3.
    expect(elapsedSeconds(tapped.game, 3_250)).toBe(2);
  });
});

describe("a Long Touch", () => {
  const cell = { row: 0, col: 2 };

  it("puts a Flag once the finger has been held for 400 ms, before it lifts", () => {
    const touched = applyAll(START, [fingerDown(cell, { now: 1_000 }), stillHeld({ now: 1_399 })]);
    expect(cellView(touched.game, cell)).toEqual({ kind: "hidden" });

    const flagged = applyBoardEvent(touched, stillHeld({ now: 1_400 }));
    expect(cellView(flagged.game, cell)).toEqual({ kind: "flag" });
  });

  it("asks for nothing more when the finger lifts: a Question it put is not Revealed", () => {
    const flagged = applyAll(START, longTouch(cell));
    const questioned = applyAll(flagged, [
      fingerDown(cell, { now: 1_000 }),
      stillHeld({ now: 1_400 }),
    ]);
    expect(cellView(questioned.game, cell)).toEqual({ kind: "question" });

    const lifted = applyBoardEvent(questioned, fingerUp({ now: 1_500 }));
    expect(cellView(lifted.game, cell)).toEqual({ kind: "question" });
  });

  it("is still a Long Touch when the finger lifts after 400 ms before the moment was delivered", () => {
    const lifted = applyAll(START, [fingerDown(cell, { now: 1_000 }), fingerUp({ now: 1_450 })]);
    expect(cellView(lifted.game, cell)).toEqual({ kind: "flag" });
  });

  it.each([
    [
      true,
      [
        ["flag", 1],
        ["question", 2],
        ["hidden", 2],
      ],
    ],
    [
      false,
      [
        ["flag", 1],
        ["hidden", 2],
        ["flag", 1],
      ],
    ],
  ] as const)(
    "with Marks (?) %s cycles the marker as the right button does, and the mine counter follows",
    (questionsEnabled, expected) => {
      let state = START;
      const seen: [string, number][] = [];
      for (let i = 0; i < 3; i++) {
        state = applyAll(state, longTouch(cell, { now: i * 1_000, questionsEnabled }));
        seen.push([cellView(state.game, cell).kind, mineCounter(state.game)]);
      }
      expect(seen).toEqual(expected);
    },
  );

  it("before the first Reveal puts a Flag without starting the Timer, and can take the mine counter below 0", () => {
    const flagged = [0, 1, 2, 3].reduce(
      (state, col) => applyAll(state, longTouch({ row: 1, col }, { now: col * 1_000 })),
      START,
    );
    expect(mineCounter(flagged.game)).toBe(-2);
    expect(elapsedSeconds(flagged.game, 60_000)).toBe(0);
  });
});

describe("what the Board shows during a Press", () => {
  it("pushes in the Cell under the left button, with a Press under way until it is released", () => {
    const pressed = applyAll(START, [mouse("down", "left", { row: 1, col: 2 })]);
    expect(pressedIn(pressed)).toEqual([".....", "..o..", "....."]);
    expect(isPressOrTouchUnderWay(pressed)).toBe(true);

    const released = applyBoardEvent(pressed, mouse("up", "left", undefined));
    expect(pressedIn(released)).toEqual([".....", ".....", "....."]);
    expect(isPressOrTouchUnderWay(released)).toBe(false);
  });
});

describe("what the Board shows during a Touch", () => {
  const middle = { row: 1, col: 2 };

  it("pushes in the Hidden Cell under the finger, with a Touch under way until the finger lifts", () => {
    const touched = applyAll(START, [fingerDown(middle)]);
    expect(pressedIn(touched)).toEqual([".....", "..o..", "....."]);
    expect(isPressOrTouchUnderWay(touched)).toBe(true);

    const lifted = applyBoardEvent(touched, fingerUp({ now: 100 }));
    expect(pressedIn(lifted)).toEqual([".....", ".....", "....."]);
    expect(isPressOrTouchUnderWay(lifted)).toBe(false);
  });

  it("never pushes in a Flagged or Revealed Cell, but does push in a Cell with a Question", () => {
    const revealed = { row: 1, col: 1 };
    const flagged = { row: 0, col: 1 };
    const questioned = { row: 0, col: 2 };
    const playing: BoardState = {
      game: revealOrMark(READY, [
        reveal(revealed),
        cycleMarker(flagged),
        cycleMarker(questioned),
        cycleMarker(questioned),
      ]),
      press: undefined,
      touch: undefined,
    };

    expect(pressedIn(applyAll(playing, [fingerDown(revealed)]))).toEqual([
      ".....",
      ".....",
      ".....",
    ]);
    expect(pressedIn(applyAll(playing, [fingerDown(flagged)]))).toEqual([
      ".....",
      ".....",
      ".....",
    ]);
    expect(pressedIn(applyAll(playing, [fingerDown(questioned)]))).toEqual([
      "..o..",
      ".....",
      ".....",
    ]);
  });

  it("stops pushing in the Cell once a Long Touch puts its marker, with the Touch under way until the finger lifts", () => {
    const flagged = applyAll(START, [fingerDown(middle), stillHeld({ now: 400 })]);
    expect(cellView(flagged.game, middle)).toEqual({ kind: "flag" });
    expect(pressedIn(flagged)).toEqual([".....", ".....", "....."]);
    expect(isPressOrTouchUnderWay(flagged)).toBe(true);

    expect(isPressOrTouchUnderWay(applyBoardEvent(flagged, fingerUp({ now: 500 })))).toBe(false);
  });
});

describe("a Touch is cancelled with no action", () => {
  const cell = { row: 1, col: 2 };
  const nothingTouched = [".....", ".....", "....."];

  it("by the finger moving more than 10 pixels from where it went down, but not by less", () => {
    // 6 across and 8 down is exactly 10 pixels away.
    const nudged = applyAll(START, [fingerDown(cell), fingerMove({ x: 106, y: 108 })]);
    expect(isPressOrTouchUnderWay(nudged)).toBe(true);
    expect(pressedIn(nudged)).toEqual([".....", "..o..", "....."]);

    const slid = applyAll(nudged, [fingerMove({ x: 107, y: 108 })]);
    expect(isPressOrTouchUnderWay(slid)).toBe(false);
    expect(pressedIn(slid)).toEqual(nothingTouched);
    expect(applyAll(slid, [fingerUp({ now: 100 })]).game).toBe(READY);
  });

  it("by the browser taking the finger over to scroll or zoom", () => {
    const cancelled = applyAll(START, [fingerDown(cell), browserCancels(), fingerUp({ now: 100 })]);
    expect(cancelled.game).toBe(READY);
    expect(isPressOrTouchUnderWay(cancelled)).toBe(false);
  });

  it("by a second finger going down on the Board, and neither finger's lift acts", () => {
    const pinched = applyAll(START, [
      fingerDown(cell, { pointer: 1 }),
      fingerDown({ row: 1, col: 3 }, { pointer: 2 }),
    ]);
    expect(isPressOrTouchUnderWay(pinched)).toBe(false);
    expect(pressedIn(pinched)).toEqual(nothingTouched);

    const lifted = applyAll(pinched, [fingerUp({ pointer: 2 }), fingerUp({ pointer: 1 })]);
    expect(lifted.game).toBe(READY);
  });

  it("by a second finger going down on the Board's border, where a first finger starts no Touch", () => {
    const pinched = applyAll(START, [fingerDown(cell), fingerDownOnTheBorder({ pointer: 2 })]);
    expect(isPressOrTouchUnderWay(pinched)).toBe(false);
    expect(applyAll(pinched, [fingerUp({ now: 100 })]).game).toBe(READY);

    expect(isPressOrTouchUnderWay(applyAll(START, [fingerDownOnTheBorder()]))).toBe(false);
  });

  it("keeping a marker a Long Touch has already put", () => {
    const flagged = applyAll(START, [fingerDown(cell), stillHeld({ now: 400 })]);
    for (const end of [fingerMove({ x: 130, y: 100 }), browserCancels()]) {
      const ended = applyBoardEvent(flagged, end);
      expect(cellView(ended.game, cell)).toEqual({ kind: "flag" });
      expect(isPressOrTouchUnderWay(ended)).toBe(false);
    }
  });
});

describe("a Touch under way", () => {
  it("is moved, lifted and cancelled only by its own finger", () => {
    const cell = { row: 1, col: 2 };
    const touched = applyAll(START, [
      fingerDown(cell, { pointer: 1 }),
      fingerMove({ x: 300, y: 300 }, { pointer: 2 }),
      browserCancels({ pointer: 2 }),
      fingerUp({ pointer: 2 }),
    ]);
    expect(isPressOrTouchUnderWay(touched)).toBe(true);

    const tapped = applyBoardEvent(touched, fingerUp({ pointer: 1, now: 100 }));
    expect(cellView(tapped.game, cell)).toEqual({ kind: "revealed", clue: 0 });
  });
});

describe("once the Game is over", () => {
  const topMine = { row: 0, col: 0 };
  const bottomMine = { row: 2, col: 4 };
  const isMine = (cell: Coord) =>
    [topMine, bottomMine].some((mine) => mine.row === cell.row && mine.col === cell.col);
  const lost: BoardState = {
    game: revealOrMark(READY, [reveal(topMine)]),
    press: undefined,
    touch: undefined,
  };
  const won: BoardState = {
    game: revealAll(
      READY,
      cellsOf(WIDE_5x3).filter((cell) => !isMine(cell)),
    ),
    press: undefined,
    touch: undefined,
  };

  it.each([
    ["Loss", lost],
    ["Win", won],
  ])("no Touch starts after a %s", (_, over) => {
    const touched = applyAll(over, [fingerDown(bottomMine)]);
    expect(isPressOrTouchUnderWay(touched)).toBe(false);
    expect(pressedIn(touched)).toEqual([".....", ".....", "....."]);
    expect(applyAll(over, longTouch(bottomMine)).game).toBe(over.game);
  });
});

describe("a Touch on a Revealed Cell", () => {
  it("does nothing yet, whether a Tap or held past 400 ms", () => {
    const playing: BoardState = {
      game: revealOrMark(READY, [reveal(clueOf1)]),
      press: undefined,
      touch: undefined,
    };
    const before = picture(playing.game);

    const tapped = applyAll(playing, [fingerDown(clueOf1), fingerUp({ now: 100 })]);
    expect(picture(tapped.game)).toEqual(before);
    const held = applyAll(playing, longTouch(clueOf1));
    expect(picture(held.game)).toEqual(before);
    expect(mineCounter(held.game)).toBe(2);
  });
});

describe("a Press and a Touch together", () => {
  const pressed = { row: 1, col: 1 };
  const touched = { row: 1, col: 3 };

  it("ignore a finger going down while a Press is under way, and the Press carries on", () => {
    const state = applyAll(START, [
      mouse("down", "left", pressed),
      fingerDown(touched),
      fingerUp({ now: 100 }),
      mouse("up", "left", pressed),
    ]);
    expect(picture(state.game)).toEqual(["#####", "#1###", "#####"]);
  });

  it("ignore a mouse button going down while a Touch is under way, and the Touch carries on", () => {
    const state = applyAll(START, [
      fingerDown(touched),
      mouse("down", "left", pressed),
      mouse("up", "left", pressed),
      fingerUp({ now: 100 }),
    ]);
    expect(picture(state.game)).toEqual(["#####", "###1#", "#####"]);
  });
});

describe("a new Game during a Touch", () => {
  it("drops the Touch, so lifting the finger acts on nothing", () => {
    const held = applyAll(START, [fingerDown(clueOf1)]);
    const fresh = newGame(WIDE_5x3, {
      random: unusedRandom,
      layout: layoutFrom(["....x", ".....", "x...."]),
    });

    const next = applyAll(held, [{ type: "newGame", game: fresh }, fingerUp({ now: 100 })]);

    expect(next.game).toBe(fresh);
    expect(isPressOrTouchUnderWay(next)).toBe(false);
  });
});
