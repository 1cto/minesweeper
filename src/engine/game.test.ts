import { describe, expect, it } from "vitest";
import {
  applyAction,
  BEGINNER,
  cellView,
  layoutOf,
  mineCount,
  mineCounter,
  newGame,
  statusOf,
} from "./game";
import {
  cellsOf,
  cycleMarker,
  layoutFrom,
  picture,
  reveal,
  revealAll,
  revealOrMark,
  seededRandom,
  SQUARE_3,
  unusedRandom,
  WIDE_5x3,
} from "./testHelpers";

describe("a new Game", () => {
  it("is ready with every Cell Hidden", () => {
    const game = newGame(BEGINNER, { random: unusedRandom });

    expect(statusOf(game)).toBe("ready");
    expect(cellsOf(BEGINNER).every((cell) => cellView(game, cell).kind === "hidden")).toBe(true);
  });
});

describe("the Mine count", () => {
  it("is the Difficulty's Mine count before the Layout is fixed", () => {
    expect(mineCount(newGame(BEGINNER, { random: unusedRandom }))).toBe(10);
  });

  it("is the number of Mines in an explicit Layout", () => {
    const game = newGame(SQUARE_3, {
      random: unusedRandom,
      layout: layoutFrom(["x..", "...", "..."]),
    });

    expect(mineCount(game)).toBe(1);
  });
});

describe("Reveal", () => {
  it("shows the Clue of the Revealed Cell", () => {
    const game = newGame(SQUARE_3, {
      random: unusedRandom,
      layout: layoutFrom(["x..", "...", "..x"]),
    });

    const next = applyAction(game, reveal({ row: 1, col: 1 }));

    expect(cellView(next, { row: 1, col: 1 })).toEqual({ kind: "revealed", clue: 2 });
  });

  it("Cascades from a Cell whose Clue is 0 and stops at Cells with a Clue", () => {
    const game = newGame(WIDE_5x3, {
      random: unusedRandom,
      layout: layoutFrom(["..x..", "..x..", "..x.."]),
    });

    const next = applyAction(game, reveal({ row: 0, col: 4 }));

    expect(picture(next)).toEqual(["###20", "###30", "###20"]);
  });
});

describe("Reveal with markers", () => {
  const game = () =>
    newGame(WIDE_5x3, {
      random: unusedRandom,
      layout: layoutFrom(["..x..", "..x..", "..x.."]),
    });

  it("leaves a Flagged Cell Hidden", () => {
    const mine = { row: 0, col: 2 };

    const next = revealOrMark(game(), [cycleMarker(mine), reveal(mine)]);

    expect({ status: statusOf(next), view: cellView(next, mine).kind }).toEqual({
      status: "ready",
      view: "flag",
    });
  });

  it("Reveals a Cell that carries a Question", () => {
    const cell = { row: 1, col: 3 };

    const next = revealOrMark(game(), [cycleMarker(cell), cycleMarker(cell), reveal(cell)]);

    expect(cellView(next, cell)).toEqual({ kind: "revealed", clue: 3 });
  });

  it("Cascades through Questions but leaves Flagged Cells Hidden", () => {
    const next = revealOrMark(game(), [
      cycleMarker({ row: 1, col: 4 }),
      cycleMarker({ row: 0, col: 3 }),
      cycleMarker({ row: 0, col: 3 }),
      reveal({ row: 0, col: 4 }),
    ]);

    // The Flag on the 0-Clue Cell (1, 4) also stops the Cascade from reaching row 2.
    expect(picture(next)).toEqual(["###20", "###3F", "#####"]);
  });
});

describe("the end of a Game", () => {
  it("is a Loss when a Cell with a Mine is Revealed", () => {
    const game = newGame(SQUARE_3, {
      random: unusedRandom,
      layout: layoutFrom(["x..", "...", "..x"]),
    });

    const playing = applyAction(game, reveal({ row: 1, col: 1 }));

    const next = applyAction(playing, reveal({ row: 0, col: 0 }));

    expect(statusOf(next)).toBe("lost");
    expect(cellView(next, { row: 0, col: 0 })).toEqual({ kind: "exploded" });
  });

  it("is a Win once every Cell without a Mine is Revealed", () => {
    // No Cell here has a Clue of 0, so each Reveal opens exactly one Cell.
    const rows = ["x.x", "...", ".x."];
    const game = newGame(SQUARE_3, { random: unusedRandom, layout: layoutFrom(rows) });
    const safeCells = cellsOf(SQUARE_3).filter(({ row, col }) => rows[row]?.[col] === ".");

    const allButOne = revealAll(game, safeCells.slice(0, -1));
    const all = revealAll(allButOne, safeCells.slice(-1));

    expect(statusOf(allButOne)).toBe("playing");
    expect(statusOf(all)).toBe("won");
  });

  it("ignores every Reveal after a Loss", () => {
    const game = newGame(SQUARE_3, {
      random: unusedRandom,
      layout: layoutFrom(["x..", "...", "..x"]),
    });
    const lost = applyAction(game, reveal({ row: 0, col: 0 }));

    const after = applyAction(lost, reveal({ row: 1, col: 1 }));

    expect(statusOf(after)).toBe("lost");
    expect(cellView(after, { row: 1, col: 1 })).toEqual({ kind: "hidden" });
  });

  it("ignores every Reveal after a Win", () => {
    const game = newGame(WIDE_5x3, {
      random: unusedRandom,
      layout: layoutFrom(["x....", ".....", "....."]),
    });
    const won = applyAction(game, reveal({ row: 2, col: 4 }));

    const after = applyAction(won, reveal({ row: 0, col: 0 }));

    expect(statusOf(won)).toBe("won");
    expect(statusOf(after)).toBe("won");
    expect(cellView(after, { row: 0, col: 0 })).toEqual({ kind: "flag" });
  });
});

describe("the Layout", () => {
  const seeds = Array.from({ length: 300 }, (_, i) => i + 1);

  it("never puts a Mine under the first Reveal", () => {
    for (const seed of seeds) {
      const firstCell = { row: seed % 9, col: Math.floor(seed / 9) % 9 };
      const game = newGame(BEGINNER, { random: seededRandom(seed) });

      const next = applyAction(game, reveal(firstCell));

      expect(statusOf(next), `seed ${seed}`).not.toBe("lost");
    }
  });

  it("holds exactly the Difficulty's Mine count, on distinct Cells of the Board", () => {
    for (const seed of seeds) {
      const game = newGame(BEGINNER, { random: seededRandom(seed) });

      const layout = layoutOf(applyAction(game, reveal({ row: 4, col: 4 }))) ?? [];

      const distinct = new Set(layout.map(({ row, col }) => `${row},${col}`));
      const onBoard = layout.every(({ row, col }) => row >= 0 && row < 9 && col >= 0 && col < 9);
      expect({ count: distinct.size, onBoard }, `seed ${seed}`).toEqual({
        count: 10,
        onBoard: true,
      });
    }
  });

  it("uses an explicit Layout as-is, even under the first Reveal", () => {
    const game = newGame(SQUARE_3, {
      random: unusedRandom,
      layout: layoutFrom(["x..", "...", "..x"]),
    });

    const next = applyAction(game, reveal({ row: 0, col: 0 }));

    expect(statusOf(next)).toBe("lost");
  });
});

describe("Flags and Questions", () => {
  const corner = { row: 0, col: 0 };

  it("cycles a Hidden Cell from unmarked to Flag to Question and back", () => {
    const game = newGame(SQUARE_3, { random: unusedRandom });

    const flagged = applyAction(game, cycleMarker(corner));
    const questioned = applyAction(flagged, cycleMarker(corner));
    const unmarked = applyAction(questioned, cycleMarker(corner));

    expect([flagged, questioned, unmarked].map((g) => cellView(g, corner).kind)).toEqual([
      "flag",
      "question",
      "hidden",
    ]);
  });

  it("toggles only a Flag when Questions are disabled, clearing an existing Question", () => {
    const game = newGame(SQUARE_3, { random: unusedRandom });
    const questioned = revealOrMark(game, [cycleMarker(corner), cycleMarker(corner)]);

    const cleared = applyAction(questioned, cycleMarker(corner, false));
    const flagged = applyAction(cleared, cycleMarker(corner, false));
    const unflagged = applyAction(flagged, cycleMarker(corner, false));

    expect([cleared, flagged, unflagged].map((g) => cellView(g, corner).kind)).toEqual([
      "hidden",
      "flag",
      "hidden",
    ]);
  });

  it("ignores the marker cycle on a Revealed Cell", () => {
    const game = newGame(SQUARE_3, {
      random: unusedRandom,
      layout: layoutFrom(["x..", "...", "..x"]),
    });
    const center = { row: 1, col: 1 };

    const next = revealOrMark(game, [reveal(center), cycleMarker(center)]);

    expect(cellView(next, center)).toEqual({ kind: "revealed", clue: 2 });
  });

  it("ignores the marker cycle after the Game ends", () => {
    const game = newGame(SQUARE_3, {
      random: unusedRandom,
      layout: layoutFrom(["x..", "...", "..x"]),
    });

    const next = revealOrMark(game, [reveal(corner), cycleMarker({ row: 2, col: 2 })]);

    expect(cellView(next, { row: 2, col: 2 }).kind).toBe("mine");
  });
});

describe("the mine counter", () => {
  const twoMines = () =>
    newGame(SQUARE_3, { random: unusedRandom, layout: layoutFrom(["x..", "...", "..x"]) });

  it("is the Mine count minus the Flags, and Questions don't count", () => {
    const next = revealOrMark(twoMines(), [
      cycleMarker({ row: 0, col: 1 }),
      cycleMarker({ row: 0, col: 2 }),
      cycleMarker({ row: 0, col: 2 }),
    ]);

    expect(mineCounter(next)).toBe(1);
  });

  it("goes negative when there are more Flags than Mines", () => {
    const next = revealOrMark(twoMines(), [
      cycleMarker({ row: 0, col: 1 }),
      cycleMarker({ row: 0, col: 2 }),
      cycleMarker({ row: 1, col: 0 }),
    ]);

    expect(mineCounter(next)).toBe(-1);
  });

  it("is unchanged by the marker cycle on a Revealed Cell", () => {
    const center = { row: 1, col: 1 };

    const next = revealOrMark(twoMines(), [reveal(center), cycleMarker(center)]);

    expect(mineCounter(next)).toBe(2);
  });
});
