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

export type CellView =
  | { readonly kind: "hidden" }
  | { readonly kind: "revealed"; readonly clue: number }
  | { readonly kind: "exploded" };

export type Action = { readonly type: "reveal"; readonly cell: Coord; readonly now: number };

export type Game = {
  readonly difficulty: Difficulty;
  readonly random: RandomSource;
  readonly status: GameStatus;
  /** Cell indexes holding a Mine; absent until the Layout is fixed by the first Reveal. */
  readonly mines?: ReadonlySet<number>;
  readonly revealed: ReadonlySet<number>;
  readonly exploded?: Coord;
};

export function newGame(
  difficulty: Difficulty,
  options: { random: RandomSource; layout?: Layout },
): Game {
  const mines = options.layout && new Set(options.layout.map((cell) => indexOf(difficulty, cell)));
  return { difficulty, random: options.random, status: "ready", mines, revealed: new Set() };
}

export function applyAction(game: Game, action: Action): Game {
  if (game.status === "won" || game.status === "lost") return game;
  const { difficulty } = game;
  const mines = game.mines ?? placeMines(difficulty, indexOf(difficulty, action.cell), game.random);
  if (mines.has(indexOf(difficulty, action.cell))) {
    return { ...game, mines, status: "lost", exploded: action.cell };
  }
  const revealed = new Set(game.revealed);
  const pending = [action.cell];
  for (let cell = pending.pop(); cell; cell = pending.pop()) {
    const index = indexOf(difficulty, cell);
    if (revealed.has(index)) continue;
    revealed.add(index);
    if (clueAt(difficulty, mines, cell) === 0) pending.push(...neighborsOf(difficulty, cell));
  }
  const won = revealed.size === difficulty.width * difficulty.height - mines.size;
  return { ...game, mines, status: won ? "won" : "playing", revealed };
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

export function statusOf(game: Game): GameStatus {
  return game.status;
}

export function cellView(game: Game, cell: Coord): CellView {
  if (game.exploded && sameCell(game.exploded, cell)) return { kind: "exploded" };
  if (!game.revealed.has(indexOf(game.difficulty, cell))) return { kind: "hidden" };
  return { kind: "revealed", clue: clueAt(game.difficulty, game.mines ?? new Set(), cell) };
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
