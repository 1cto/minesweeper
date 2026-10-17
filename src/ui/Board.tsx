import { cellView, type CellView, type Coord, type Game } from "../engine/game";

const CELL_SIZE = 24;

function cellText(view: CellView): string {
  if (view.kind === "exploded") return "*";
  if (view.kind === "revealed" && view.clue > 0) return String(view.clue);
  return "";
}

export function Board({ game, onReveal }: { game: Game; onReveal: (cell: Coord) => void }) {
  const { width, height } = game.difficulty;
  const cells: Coord[] = [];
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) cells.push({ row, col });
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${width}, ${CELL_SIZE}px)`,
        gridAutoRows: `${CELL_SIZE}px`,
      }}
    >
      {cells.map((cell) => {
        const view = cellView(game, cell);
        return (
          <button
            key={`${cell.row}-${cell.col}`}
            type="button"
            data-testid={`cell-${cell.row}-${cell.col}`}
            data-state={view.kind}
            aria-label={`Row ${cell.row + 1}, column ${cell.col + 1}`}
            onClick={() => onReveal(cell)}
          >
            {cellText(view)}
          </button>
        );
      })}
    </div>
  );
}
