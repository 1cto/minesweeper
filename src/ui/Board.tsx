import { cellView, type CellView, type Coord, type Game } from "../engine/game";
import { CELL_SPRITES } from "./sprites";

function spriteFor(view: CellView): string | undefined {
  switch (view.kind) {
    case "hidden":
      return CELL_SPRITES.hidden;
    case "flag":
      return CELL_SPRITES.flag;
    case "question":
      return CELL_SPRITES.question;
    case "revealed":
      return CELL_SPRITES.clues[view.clue];
    case "exploded":
      return CELL_SPRITES.exploded;
    case "mine":
      return CELL_SPRITES.mine;
    case "wrongFlag":
      return CELL_SPRITES.wrongFlag;
  }
}

type BoardProps = {
  game: Game;
  onReveal: (cell: Coord) => void;
  onCycleMarker: (cell: Coord) => void;
};

export function Board({ game, onReveal, onCycleMarker }: BoardProps) {
  const { width, height } = game.difficulty;
  const cells: Coord[] = [];
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) cells.push({ row, col });
  }

  return (
    <div className="board" style={{ gridTemplateColumns: `repeat(${width}, 16px)` }}>
      {cells.map((cell) => {
        const view = cellView(game, cell);
        return (
          <button
            key={`${cell.row}-${cell.col}`}
            type="button"
            className="cell sprite"
            style={{ backgroundImage: spriteFor(view) }}
            data-testid={`cell-${cell.row}-${cell.col}`}
            data-state={view.kind}
            data-clue={view.kind === "revealed" ? view.clue : undefined}
            aria-label={`Row ${cell.row + 1}, column ${cell.col + 1}`}
            onClick={() => onReveal(cell)}
            onMouseDown={(event) => {
              if (event.button === 2) onCycleMarker(cell);
            }}
          />
        );
      })}
    </div>
  );
}
