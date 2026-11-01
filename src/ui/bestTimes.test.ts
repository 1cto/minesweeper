import { describe, expect, it } from "vitest";
import {
  BEGINNER,
  EXPERT,
  INTERMEDIATE,
  newGame,
  type Difficulty,
  type Game,
} from "../engine/game";
import { reveal, revealOrMark, unusedRandom } from "../engine/testHelpers";
import {
  bestTimeOf,
  considerGame,
  loadBestTimes,
  offeredName,
  recordName,
  resetScores,
  saveBestTimes,
  waitingForName,
  type BestTimes,
} from "./bestTimes";
import { memoryStorage } from "./storage";

/**
 * A Game on `difficulty` won with its timer stopped at `seconds`. Its one Mine is in the top-left
 * corner, so Revealing the bottom-right Cell Cascades over every other Cell.
 */
function wonIn(seconds: number, difficulty: Difficulty = BEGINNER): Game {
  const game = newGame(difficulty, { random: unusedRandom, layout: [{ row: 0, col: 0 }] });
  return revealOrMark(game, [
    reveal({ row: 1, col: 1 }, 0),
    reveal({ row: difficulty.height - 1, col: difficulty.width - 1 }, seconds * 1_000),
  ]);
}

/** The Best Times on a first visit, with nothing stored. */
const firstVisit = () => loadBestTimes(memoryStorage());

describe("a Win", () => {
  it("faster than its Difficulty's Best Time waits for the player's name", () => {
    const next = considerGame(firstVisit(), wonIn(7));

    expect(waitingForName(next)).toEqual({ difficulty: BEGINNER, seconds: 7 });
  });

  it.each([7, 12])("in %i seconds against a Best Time of 7 waits for nothing", (seconds) => {
    const held = recordName(considerGame(firstVisit(), wonIn(7)), "Ada");

    expect(waitingForName(considerGame(held, wonIn(seconds)))).toBeUndefined();
  });

  it("whose timer stopped at 999 seconds does not beat a starting Best Time", () => {
    expect(waitingForName(considerGame(firstVisit(), wonIn(1_200)))).toBeUndefined();
  });
});

describe("a Game that is not won", () => {
  it("waits for nothing, whether it goes on or is lost", () => {
    const ready = newGame(BEGINNER, { random: unusedRandom, layout: [{ row: 0, col: 0 }] });
    const playing = revealOrMark(ready, [reveal({ row: 1, col: 1 }, 0)]);
    const lost = revealOrMark(playing, [reveal({ row: 0, col: 0 }, 3_000)]);

    for (const game of [ready, playing, lost]) {
      expect(waitingForName(considerGame(firstVisit(), game))).toBeUndefined();
    }
  });
});

describe("recording a name", () => {
  it("makes the waiting Win its Difficulty's Best Time and waits no more", () => {
    const recorded = recordName(considerGame(firstVisit(), wonIn(7)), "Ada");

    expect(bestTimeOf(recorded, BEGINNER)).toEqual({ seconds: 7, name: "Ada" });
    expect(bestTimeOf(recorded, INTERMEDIATE)).toEqual({ seconds: 999, name: "Anonymous" });
    expect(bestTimeOf(recorded, EXPERT)).toEqual({ seconds: 999, name: "Anonymous" });
    expect(waitingForName(recorded)).toBeUndefined();
  });

  it.each([
    ["  Ada  ", "Ada"],
    ["Augusta Ada King, Countess of Lovelace", "Augusta Ada King, Countess of Lo"],
    ["   ", "Anonymous"],
  ])("records %j as %j: trimmed, at most 32 characters, Anonymous when empty", (input, name) => {
    const recorded = recordName(considerGame(firstVisit(), wonIn(7)), input);

    expect(bestTimeOf(recorded, BEGINNER)).toEqual({ seconds: 7, name });
  });
});

/** Wins `difficulty` in `seconds` and records `name`, from `bestTimes`. */
const winAndRecord = (
  bestTimes: BestTimes,
  seconds: number,
  difficulty: Difficulty,
  name: string,
) => recordName(considerGame(bestTimes, wonIn(seconds, difficulty)), name);

describe("Reset Scores", () => {
  it("gives every Difficulty its starting Best Time again", () => {
    const held = [
      [7, BEGINNER, "Ada"],
      [40, INTERMEDIATE, "Grace"],
      [120, EXPERT, "Edsger"],
    ] as const;
    const full = held.reduce(
      (bestTimes, [seconds, difficulty, name]) =>
        winAndRecord(bestTimes, seconds, difficulty, name),
      firstVisit(),
    );

    const reset = resetScores(full);

    for (const difficulty of [BEGINNER, INTERMEDIATE, EXPERT]) {
      expect(bestTimeOf(reset, difficulty)).toEqual({ seconds: 999, name: "Anonymous" });
    }
  });
});

describe("a Game already considered", () => {
  it("asks for a name only once", () => {
    const win = wonIn(7);
    const recorded = recordName(considerGame(firstVisit(), win), "Ada");

    expect(considerGame(recorded, win)).toBe(recorded);
  });

  it("asks for nothing after Reset Scores, whether it was slower or already recorded", () => {
    const held = winAndRecord(firstVisit(), 7, BEGINNER, "Ada");
    const slower = wonIn(12);
    const afterSlower = resetScores(considerGame(held, slower));
    expect(waitingForName(considerGame(afterSlower, slower))).toBeUndefined();

    const win = wonIn(5);
    const afterRecorded = resetScores(recordName(considerGame(held, win), "Ada"));
    expect(waitingForName(considerGame(afterRecorded, win))).toBeUndefined();
  });
});

describe("the name offered", () => {
  it("is Anonymous at first, then the last name entered", () => {
    const first = firstVisit();
    expect(offeredName(first)).toBe("Anonymous");

    expect(offeredName(winAndRecord(first, 9, BEGINNER, "  Ada  "))).toBe("Ada");
  });
});

describe("storage", () => {
  it("keeps the Best Times and the last name from one visit to the next, but not a Win waiting for a name", () => {
    const store = memoryStorage();
    const recorded = winAndRecord(
      winAndRecord(loadBestTimes(store), 7, BEGINNER, "Ada"),
      120,
      EXPERT,
      "Edsger",
    );
    saveBestTimes(store, considerGame(recorded, wonIn(3)));

    const nextVisit = loadBestTimes(store);

    expect(bestTimeOf(nextVisit, BEGINNER)).toEqual({ seconds: 7, name: "Ada" });
    expect(bestTimeOf(nextVisit, INTERMEDIATE)).toEqual({ seconds: 999, name: "Anonymous" });
    expect(bestTimeOf(nextVisit, EXPERT)).toEqual({ seconds: 120, name: "Edsger" });
    expect(offeredName(nextVisit)).toBe("Edsger");
    expect(waitingForName(nextVisit)).toBeUndefined();
  });

  it("reads the Best Times and the last name as earlier versions stored them", () => {
    const store = memoryStorage({
      "minesweeper.bestTimes": '{"Beginner":{"seconds":7,"name":"Ada"}}',
      "minesweeper.lastName": "Ada",
    });

    const bestTimes = loadBestTimes(store);

    expect(bestTimeOf(bestTimes, BEGINNER)).toEqual({ seconds: 7, name: "Ada" });
    expect(offeredName(bestTimes)).toBe("Ada");
  });

  it.each([
    ["not JSON", "{Beginner: 7"],
    ["JSON but not an object", "42"],
    ["null", "null"],
    ["an entry that is not an object", '{"Beginner":7}'],
    ["seconds that are not a whole number", '{"Beginner":{"seconds":7.5,"name":"Ada"}}'],
    ["seconds below 0", '{"Beginner":{"seconds":-1,"name":"Ada"}}'],
    ["seconds past 999", '{"Beginner":{"seconds":1000,"name":"Ada"}}'],
    ["seconds written as text", '{"Beginner":{"seconds":"7","name":"Ada"}}'],
    ["a name that is not text", '{"Beginner":{"seconds":7,"name":42}}'],
  ])("reads stored Best Times holding %s as the starting Best Time", (_, stored) => {
    const bestTimes = loadBestTimes(memoryStorage({ "minesweeper.bestTimes": stored }));

    expect(bestTimeOf(bestTimes, BEGINNER)).toEqual({ seconds: 999, name: "Anonymous" });
  });

  it("keeps the readable Best Times when others are broken or belong to no Difficulty", () => {
    const stored = JSON.stringify({
      Beginner: { seconds: 7.5, name: "Ada" },
      Easy: { seconds: 1, name: "Nobody" },
      Expert: { seconds: 120, name: "Edsger" },
    });

    const bestTimes = loadBestTimes(memoryStorage({ "minesweeper.bestTimes": stored }));

    expect(bestTimeOf(bestTimes, BEGINNER)).toEqual({ seconds: 999, name: "Anonymous" });
    expect(bestTimeOf(bestTimes, EXPERT)).toEqual({ seconds: 120, name: "Edsger" });
    expect(bestTimeOf(bestTimes, { name: "Easy", width: 9, height: 9, mines: 10 })).toEqual({
      seconds: 999,
      name: "Anonymous",
    });
  });
});
