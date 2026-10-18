/** Shared helpers for engine tests: Boards drawn as text, fixed Layouts and seeded randomness. */
import {
  applyAction,
  cellView,
  type Action,
  type Coord,
  type Difficulty,
  type Game,
  type Layout,
  type RandomSource,
} from "./game";

export const unusedRandom = () => {
  throw new Error("random source should not be used");
};

/** Builds a Layout from rows where "x" marks a Mine and "." a Cell without one. */
export function layoutFrom(rows: string[]): Layout {
  return rows.flatMap((line, row) =>
    [...line].flatMap((char, col) => (char === "x" ? [{ row, col }] : [])),
  );
}

/** A small deterministic random source (mulberry32), so failures can be replayed by seed. */
export function seededRandom(seed: number): RandomSource {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function reveal(cell: Coord, now = 0) {
  return { type: "reveal", cell, now } as const;
}

/**
 * Draws the Board as the player sees it: "#" Hidden, "F" Flag, "?" Question,
 * a digit for a Revealed Cell's Clue; after a Loss, "!" the exploded Mine,
 * "*" another Mine and "X" a wrong Flag.
 */
export function picture(game: Game): string[] {
  const { width, height } = game.difficulty;
  return Array.from({ length: height }, (_, row) =>
    Array.from({ length: width }, (_, col) => {
      const view = cellView(game, { row, col });
      if (view.kind === "flag") return "F";
      if (view.kind === "question") return "?";
      if (view.kind === "exploded") return "!";
      if (view.kind === "mine") return "*";
      if (view.kind === "wrongFlag") return "X";
      return view.kind === "revealed" ? String(view.clue) : "#";
    }).join(""),
  );
}

export function cycleMarker(cell: Coord, questionsEnabled = true, now = 0) {
  return { type: "cycleMarker", cell, questionsEnabled, now } as const;
}

export function revealOrMark(game: Game, actions: Action[]): Game {
  return actions.reduce(applyAction, game);
}

export function revealAll(game: Game, cells: Coord[]): Game {
  return cells.reduce((current, cell) => applyAction(current, reveal(cell)), game);
}

export const SQUARE_3: Difficulty = { name: "Test 3×3", width: 3, height: 3, mines: 2 };
export const WIDE_5x3: Difficulty = { name: "Test 5×3", width: 5, height: 3, mines: 3 };

export function cellsOf(difficulty: Difficulty): Coord[] {
  const cells: Coord[] = [];
  for (let row = 0; row < difficulty.height; row++) {
    for (let col = 0; col < difficulty.width; col++) cells.push({ row, col });
  }
  return cells;
}
