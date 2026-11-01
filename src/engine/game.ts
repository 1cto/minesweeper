export type Coord = { readonly row: number; readonly col: number };

/** The positions of all Mines on a Board. */
export type Layout = readonly Coord[];

export type RandomSource = () => number;

export type Difficulty = {
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly mines: number;
};

export const BEGINNER: Difficulty = { name: "Beginner", width: 9, height: 9, mines: 10 };
export const INTERMEDIATE: Difficulty = { name: "Intermediate", width: 16, height: 16, mines: 40 };
export const EXPERT: Difficulty = { name: "Expert", width: 30, height: 16, mines: 99 };

/** Every Difficulty, in the order the Game menu lists them. */
export const DIFFICULTIES: readonly Difficulty[] = [BEGINNER, INTERMEDIATE, EXPERT];

export type GameStatus = "ready" | "playing" | "won" | "lost";

/** The player's marker on a Hidden Cell. */
export type Marker = "flag" | "question";

export type CellView =
  | { readonly kind: "hidden" }
  | { readonly kind: Marker }
  | { readonly kind: "revealed"; readonly clue: number }
  | { readonly kind: "exploded" }
  /** After a Loss: a Mine that was neither Revealed nor Flagged. */
  | { readonly kind: "mine" }
  /** After a Loss: a Flag on a Cell without a Mine. */
  | { readonly kind: "wrongFlag" };

export type Action =
  | { readonly type: "reveal"; readonly cell: Coord; readonly now: number }
  | {
      readonly type: "cycleMarker";
      readonly cell: Coord;
      readonly questionsEnabled: boolean;
      readonly now: number;
    }
  | { readonly type: "chord"; readonly cell: Coord; readonly now: number };

declare const sealed: unique symbol;
/** One attempt to clear one Board. Only this module looks inside it. */
export type Game = { readonly [sealed]: true };

/** What a Game holds. */
type Held = {
  readonly difficulty: Difficulty;
  readonly random: RandomSource;
  readonly status: GameStatus;
  /** Cell indexes holding a Mine; absent until the Layout is fixed by the first Reveal. */
  readonly mines?: ReadonlySet<number>;
  readonly revealed: ReadonlySet<number>;
  readonly markers: ReadonlyMap<number, Marker>;
  /** Cell indexes of the Mines that lost the Game: one for a Reveal, one per wrong Flag for a Chord. */
  readonly exploded?: ReadonlySet<number>;
  /** The `now` of the first Reveal, which starts the timer. */
  readonly startedAt?: number;
  /** The `now` of the action that ended the Game, which stops the timer. */
  readonly endedAt?: number;
};

const open = (game: Game) => game as unknown as Held;
const seal = (held: Held) => held as unknown as Game;

export function newGame(
  difficulty: Difficulty,
  options: { random: RandomSource; layout?: Layout },
): Game {
  const mines = options.layout && new Set(options.layout.map((cell) => indexOf(difficulty, cell)));
  return seal({
    difficulty,
    random: options.random,
    status: "ready",
    mines,
    revealed: new Set(),
    markers: new Map(),
  });
}

/**
 * The Game after `action`. A finished Game, won or lost, ignores every action and returns that very
 * Game, so a caller can tell by identity that nothing changed. The promise ends there: during play,
 * an action that changes nothing, such as a Reveal on a Revealed Cell, may still return a new Game.
 */
export function applyAction(game: Game, action: Action): Game {
  const held = open(game);
  if (held.status === "won" || held.status === "lost") return game;
  return seal(clocked(held, play(held, action), action.now));
}

/** Starts the timer when an action takes the Game out of "ready" and stops it when the Game ends. */
function clocked(before: Held, after: Held, now: number): Held {
  const starts = before.status === "ready" && after.status !== "ready";
  const ends = after.status === "won" || after.status === "lost";
  if (!starts && !ends) return after;
  return { ...after, startedAt: starts ? now : after.startedAt, endedAt: ends ? now : undefined };
}

function play(held: Held, action: Action): Held {
  switch (action.type) {
    case "reveal":
      return reveal(held, action.cell);
    case "cycleMarker":
      return cycleMarker(held, action.cell, action.questionsEnabled);
    case "chord":
      return chord(held, action.cell);
  }
}

/**
 * On a Revealed Cell whose Clue equals its number of Flagged Neighbors, Reveals the other Hidden
 * Neighbors at once; on any other Cell it does nothing.
 */
function chord(held: Held, cell: Coord): Held {
  const { difficulty, mines } = held;
  if (!mines || !held.revealed.has(indexOf(difficulty, cell))) return held;
  const neighbors = neighborsOf(difficulty, cell);
  const flagged = (neighbor: Coord) => held.markers.get(indexOf(difficulty, neighbor)) === "flag";
  if (neighbors.filter(flagged).length !== clueAt(difficulty, mines, cell)) return held;
  const others = neighbors.filter((neighbor) => !flagged(neighbor));
  return uncover(held, mines, others);
}

/** Unmarked → Flag → Question → unmarked; without Questions, unmarked ↔ Flag. */
function cycleMarker(held: Held, cell: Coord, questionsEnabled: boolean): Held {
  const index = indexOf(held.difficulty, cell);
  if (held.revealed.has(index)) return held;
  const markers = new Map(held.markers);
  const current = markers.get(index);
  if (current === undefined) markers.set(index, "flag");
  else if (current === "flag" && questionsEnabled) markers.set(index, "question");
  else markers.delete(index);
  return { ...held, markers };
}

function reveal(held: Held, cell: Coord): Held {
  const target = indexOf(held.difficulty, cell);
  if (held.markers.get(target) === "flag") return held;
  const mines = held.mines ?? placeMines(held.difficulty, target, held.random);
  return uncover(held, mines, [cell]);
}

/**
 * Reveals `cells`, which must not be Flagged, with Cascades. Revealing a Mine is a Loss, but the
 * Cells without a Mine are Revealed all the same.
 */
function uncover(held: Held, mines: ReadonlySet<number>, cells: Coord[]): Held {
  const { difficulty } = held;
  const exploded = new Set(
    cells.map((cell) => indexOf(difficulty, cell)).filter((index) => mines.has(index)),
  );
  const revealed = new Set(held.revealed);
  const markers = new Map(held.markers);
  const pending = cells.filter((cell) => !mines.has(indexOf(difficulty, cell)));
  for (let next = pending.pop(); next; next = pending.pop()) {
    const index = indexOf(difficulty, next);
    if (revealed.has(index) || markers.get(index) === "flag") continue;
    revealed.add(index);
    markers.delete(index);
    if (clueAt(difficulty, mines, next) === 0) pending.push(...neighborsOf(difficulty, next));
  }
  if (exploded.size > 0) return { ...held, mines, status: "lost", exploded, revealed, markers };
  const won = revealed.size === difficulty.width * difficulty.height - mines.size;
  // On a Win every Mine gets a Flag, replacing any Question, so the mine counter reads 0.
  if (won) for (const mine of mines) markers.set(mine, "flag");
  return { ...held, mines, status: won ? "won" : "playing", revealed, markers };
}

export function layoutOf(game: Game): Layout | undefined {
  const { difficulty, mines } = open(game);
  if (!mines) return undefined;
  const { width } = difficulty;
  return [...mines].map((index) => ({ row: Math.floor(index / width), col: index % width }));
}

/** The number of Mines in the Game: the Difficulty's, or an explicit Layout's. */
function mineCount(held: Held): number {
  return held.mines?.size ?? held.difficulty.mines;
}

/** The Mine count minus the number of Flags; negative when the player over-flags. */
export function mineCounter(game: Game): number {
  const held = open(game);
  const flags = [...held.markers.values()].filter((marker) => marker === "flag").length;
  return mineCount(held) - flags;
}

/** The Difficulty the Game is played on. */
export function difficultyOf(game: Game): Difficulty {
  return open(game).difficulty;
}

export function statusOf(game: Game): GameStatus {
  return open(game).status;
}

/** The timer's maximum in seconds, as in the original: it stays there however long a Game lasts. */
export const MAX_TIMER_SECONDS = 999;

/**
 * The seconds on the Timer at `now`, for any `now`: 0 until the first Reveal starts the Game, then,
 * as in the original, 1 plus the whole seconds since it, which a clock read earlier or set back
 * counts as none, and never past the Timer's maximum.
 */
export function elapsedSeconds(game: Game, now: number): number {
  const { startedAt, endedAt } = open(game);
  if (startedAt === undefined) return 0;
  const seconds = Math.floor(((endedAt ?? now) - startedAt) / 1000);
  return Math.min(Math.max(seconds, 0) + 1, MAX_TIMER_SECONDS);
}

/** The seconds on which a lost or won Game's timer stopped, or none while the Game goes on. */
export function finalSeconds(game: Game): number | undefined {
  const { endedAt } = open(game);
  return endedAt === undefined ? undefined : elapsedSeconds(game, endedAt);
}

export function cellView(game: Game, cell: Coord): CellView {
  const held = open(game);
  const index = indexOf(held.difficulty, cell);
  if (held.exploded?.has(index)) return { kind: "exploded" };
  if (held.revealed.has(index)) {
    return { kind: "revealed", clue: clueAt(held.difficulty, held.mines ?? new Set(), cell) };
  }
  const marker = held.markers.get(index);
  if (held.status === "lost") {
    const hasMine = held.mines?.has(index) ?? false;
    if (marker === "flag") return { kind: hasMine ? "flag" : "wrongFlag" };
    if (hasMine) return { kind: "mine" };
  }
  return { kind: marker ?? "hidden" };
}

/** Places the Difficulty's Mines uniformly at random on every Cell except `safeIndex`. */
function placeMines(difficulty: Difficulty, safeIndex: number, random: RandomSource): Set<number> {
  const candidates: number[] = [];
  for (let index = 0; index < difficulty.width * difficulty.height; index++) {
    if (index !== safeIndex) candidates.push(index);
  }
  const mines = new Set<number>();
  while (mines.size < difficulty.mines && candidates.length > 0) {
    const pick = Math.min(Math.floor(random() * candidates.length), candidates.length - 1);
    const [index] = candidates.splice(pick, 1);
    if (index !== undefined) mines.add(index);
  }
  return mines;
}

function clueAt(difficulty: Difficulty, mines: ReadonlySet<number>, cell: Coord): number {
  return neighborsOf(difficulty, cell).filter((neighbor) =>
    mines.has(indexOf(difficulty, neighbor)),
  ).length;
}

function indexOf(difficulty: Difficulty, cell: Coord): number {
  return cell.row * difficulty.width + cell.col;
}

function neighborsOf(difficulty: Difficulty, cell: Coord): Coord[] {
  const neighbors: Coord[] = [];
  for (let row = cell.row - 1; row <= cell.row + 1; row++) {
    for (let col = cell.col - 1; col <= cell.col + 1; col++) {
      const inside = row >= 0 && row < difficulty.height && col >= 0 && col < difficulty.width;
      if (inside && (row !== cell.row || col !== cell.col)) neighbors.push({ row, col });
    }
  }
  return neighbors;
}
