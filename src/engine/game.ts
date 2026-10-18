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
    };

export type Game = {
  readonly difficulty: Difficulty;
  readonly random: RandomSource;
  readonly status: GameStatus;
  /** Cell indexes holding a Mine; absent until the Layout is fixed by the first Reveal. */
  readonly mines?: ReadonlySet<number>;
  readonly revealed: ReadonlySet<number>;
  readonly markers: ReadonlyMap<number, Marker>;
  readonly exploded?: Coord;
};

export function newGame(
  difficulty: Difficulty,
  options: { random: RandomSource; layout?: Layout },
): Game {
  const mines = options.layout && new Set(options.layout.map((cell) => indexOf(difficulty, cell)));
  return {
    difficulty,
    random: options.random,
    status: "ready",
    mines,
    revealed: new Set(),
    markers: new Map(),
  };
}

export function applyAction(game: Game, action: Action): Game {
  if (game.status === "won" || game.status === "lost") return game;
  switch (action.type) {
    case "reveal":
      return reveal(game, action.cell);
    case "cycleMarker":
      return cycleMarker(game, action.cell, action.questionsEnabled);
  }
}

/** Unmarked → Flag → Question → unmarked; without Questions, unmarked ↔ Flag. */
function cycleMarker(game: Game, cell: Coord, questionsEnabled: boolean): Game {
  const index = indexOf(game.difficulty, cell);
  if (game.revealed.has(index)) return game;
  const markers = new Map(game.markers);
  const current = markers.get(index);
  if (current === undefined) markers.set(index, "flag");
  else if (current === "flag" && questionsEnabled) markers.set(index, "question");
  else markers.delete(index);
  return { ...game, markers };
}

function reveal(game: Game, cell: Coord): Game {
  const { difficulty } = game;
  const target = indexOf(difficulty, cell);
  if (game.markers.get(target) === "flag") return game;
  const mines = game.mines ?? placeMines(difficulty, target, game.random);
  if (mines.has(target)) {
    return { ...game, mines, status: "lost", exploded: cell };
  }
  const revealed = new Set(game.revealed);
  const markers = new Map(game.markers);
  const pending = [cell];
  for (let next = pending.pop(); next; next = pending.pop()) {
    const index = indexOf(difficulty, next);
    if (revealed.has(index) || markers.get(index) === "flag") continue;
    revealed.add(index);
    markers.delete(index);
    if (clueAt(difficulty, mines, next) === 0) pending.push(...neighborsOf(difficulty, next));
  }
  const won = revealed.size === difficulty.width * difficulty.height - mines.size;
  // On a Win every Mine gets a Flag, replacing any Question, so the mine counter reads 0.
  if (won) for (const mine of mines) markers.set(mine, "flag");
  return { ...game, mines, status: won ? "won" : "playing", revealed, markers };
}

export function layoutOf(game: Game): Layout | undefined {
  if (!game.mines) return undefined;
  const { width } = game.difficulty;
  return [...game.mines].map((index) => ({ row: Math.floor(index / width), col: index % width }));
}

/** The number of Mines in the Game: the Difficulty's, or an explicit Layout's. */
export function mineCount(game: Game): number {
  return game.mines?.size ?? game.difficulty.mines;
}

/** The Mine count minus the number of Flags; negative when the player over-flags. */
export function mineCounter(game: Game): number {
  const flags = [...game.markers.values()].filter((marker) => marker === "flag").length;
  return mineCount(game) - flags;
}

export function statusOf(game: Game): GameStatus {
  return game.status;
}

export function cellView(game: Game, cell: Coord): CellView {
  if (game.exploded && sameCell(game.exploded, cell)) return { kind: "exploded" };
  const index = indexOf(game.difficulty, cell);
  if (game.revealed.has(index)) {
    return { kind: "revealed", clue: clueAt(game.difficulty, game.mines ?? new Set(), cell) };
  }
  const marker = game.markers.get(index);
  if (game.status === "lost") {
    const hasMine = game.mines?.has(index) ?? false;
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

function sameCell(a: Coord, b: Coord): boolean {
  return a.row === b.row && a.col === b.col;
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
