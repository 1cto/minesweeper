import { useEffect, useEffectEvent } from "react";
import { cellView, difficultyOf, type Coord, type Game } from "../engine/game";
import { looksPressedIn, type Button, type MouseInput, type Press } from "./press";
import { cellSprite } from "./sprites";

/** The buttons a Press knows, by `MouseEvent.button`; the Board ignores any other button. */
const BUTTONS: readonly Button[] = ["left", "middle", "right"];

/** The Cell a mouse event happened over, or none off the Board. */
function cellAt(target: EventTarget | null): Coord | undefined {
  const element = target instanceof Element ? target.closest<HTMLElement>("[data-row]") : null;
  if (!element) return undefined;
  return { row: Number(element.dataset.row), col: Number(element.dataset.col) };
}

type BoardProps = {
  game: Game;
  press: Press;
  /** Receives the presses and pointer moves over the Cells, and every release anywhere. */
  onMouse: (input: MouseInput) => void;
};

/**
 * Draws the Board and hands the mouse to the Press. A release reaches one listener wherever it
 * happens: over a Cell it acts on that Cell, anywhere else it only ends the Press.
 */
export function Board({ game, press, onMouse }: BoardProps) {
  const { width, height } = difficultyOf(game);
  const cells: Coord[] = [];
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) cells.push({ row, col });
  }

  const release = useEffectEvent((event: MouseEvent) => {
    const button = BUTTONS[event.button];
    if (button) onMouse({ type: "up", button, cell: cellAt(event.target) });
  });
  useEffect(() => {
    document.addEventListener("mouseup", release);
    return () => document.removeEventListener("mouseup", release);
  }, []);

  // Each column is as wide as its Cells, which the stylesheet sizes; `auto` columns could stretch.
  return (
    <div className="board" style={{ gridTemplateColumns: `repeat(${width}, max-content)` }}>
      {cells.map((cell) => {
        const view = cellView(game, cell);
        const isPressed = looksPressedIn(press, game, cell);
        return (
          <button
            key={`${cell.row}-${cell.col}`}
            type="button"
            className="cell sprite"
            style={{ backgroundImage: cellSprite(view, isPressed) }}
            data-testid={`cell-${cell.row}-${cell.col}`}
            data-state={view.kind}
            data-clue={view.kind === "revealed" ? view.clue : undefined}
            data-pressed={isPressed || undefined}
            data-row={cell.row}
            data-col={cell.col}
            aria-label={`Row ${cell.row + 1}, column ${cell.col + 1}`}
            onMouseDown={(event) => {
              const button = BUTTONS[event.button];
              if (button) onMouse({ type: "down", button, cell });
            }}
            onMouseEnter={() => onMouse({ type: "point", cell })}
            onMouseLeave={() => onMouse({ type: "point" })}
          />
        );
      })}
    </div>
  );
}
