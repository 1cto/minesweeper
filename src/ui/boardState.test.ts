import { describe, expect, it } from "vitest";
import { cellView, elapsedSeconds, newGame, type Coord } from "../engine/game";
import { layoutFrom, unusedRandom, WIDE_5x3 } from "../engine/testHelpers";
import { applyBoardEvent, type BoardEvent, type BoardState } from "./boardState";
import { isUnderWay, type Button } from "./press";

/** Mines in two corners: (1, 1) has a Clue of 1 and no Cascade starts there. */
const READY = newGame(WIDE_5x3, {
  random: unusedRandom,
  layout: layoutFrom(["x....", ".....", "....x"]),
});
const START: BoardState = { game: READY, press: undefined };
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

describe("a mouse event on the Board", () => {
  it("passes the Press's request to the engine, stamped with the event's time", () => {
    const state = applyAll(START, [
      mouse("down", "left", clueOf1, { now: 1_000 }),
      mouse("up", "left", clueOf1, { now: 5_000 }),
    ]);

    expect(cellView(state.game, clueOf1)).toEqual({ kind: "revealed", clue: 1 });
    expect(elapsedSeconds(state.game, 8_000)).toBe(3);
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
