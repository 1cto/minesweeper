import { useEffect, useEffectEvent, type PointerEvent as ReactPointerEvent } from "react";
import { cellView, difficultyOf, type Coord } from "../engine/game";
import { looksPressedIn, type BoardState } from "./boardState";
import type { Button, MouseInput } from "./press";
import { cellSprite } from "./sprites";
import { LONG_TOUCH_MS, type Point, type TouchInput } from "./touch";

/** The buttons a Press knows, by `MouseEvent.button`; the Board ignores any other button. */
const BUTTONS: readonly Button[] = ["left", "middle", "right"];

/** The Cell a mouse event happened over, or none off the Board. */
function cellAt(target: EventTarget | null): Coord | undefined {
  const element = target instanceof Element ? target.closest<HTMLElement>("[data-row]") : null;
  if (!element) return undefined;
  return { row: Number(element.dataset.row), col: Number(element.dataset.col) };
}

/** Whether a pointer is a finger or a stylus, which make a Touch; a mouse makes a Press. */
function isTouch(event: PointerEvent | ReactPointerEvent): boolean {
  return event.pointerType === "touch" || event.pointerType === "pen";
}

const positionOf = (event: PointerEvent | ReactPointerEvent): Point => ({
  x: event.clientX,
  y: event.clientY,
});

type BoardProps = {
  board: BoardState;
  /** Receives the presses and pointer moves over the Cells, and every release anywhere. */
  onMouse: (input: MouseInput) => void;
  /** Receives every finger or stylus going down on a Cell, and its moves, lift and cancellation. */
  onTouch: (input: TouchInput) => void;
};

/**
 * Draws the Board and hands the mouse to the Press and fingers to the Touch. A release reaches one
 * listener wherever it happens: over a Cell it acts on that Cell, anywhere else it only ends the
 * Press. A finger's moves and lift reach one listener too, since a Touch acts on the Cell it
 * began on wherever the finger goes.
 */
export function Board({ board, onMouse, onTouch }: BoardProps) {
  const { game } = board;
  const { width, height } = difficultyOf(game);
  const cells: Coord[] = [];
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) cells.push({ row, col });
  }

  const release = useEffectEvent((event: MouseEvent) => {
    const button = BUTTONS[event.button];
    if (button) onMouse({ type: "up", button, cell: cellAt(event.target) });
  });
  const follow = useEffectEvent((event: PointerEvent) => {
    if (!isTouch(event)) return;
    const pointer = event.pointerId;
    if (event.type === "pointermove") onTouch({ type: "move", pointer, at: positionOf(event) });
    else if (event.type === "pointerup") onTouch({ type: "up", pointer });
    else onTouch({ type: "cancel", pointer });
  });
  useEffect(() => {
    const fingerEvents = ["pointermove", "pointerup", "pointercancel"] as const;
    document.addEventListener("mouseup", release);
    for (const type of fingerEvents) document.addEventListener(type, follow);
    return () => {
      document.removeEventListener("mouseup", release);
      for (const type of fingerEvents) document.removeEventListener(type, follow);
    };
  }, []);

  const touchDown = (event: ReactPointerEvent, cell: Coord) => {
    if (!isTouch(event)) return;
    // Otherwise the browser follows a Tap with mouse events, which the Press would take for a click.
    event.preventDefault();
    onTouch({ type: "down", pointer: event.pointerId, cell, at: positionOf(event) });
    // The Touch decides from the event times whether it has become a Long Touch; this only
    // delivers the moment. Delivered after the Touch has ended, the moment changes nothing.
    setTimeout(() => onTouch({ type: "held" }), LONG_TOUCH_MS);
  };

  // Each column is as wide as its Cells, which the stylesheet sizes; `auto` columns could stretch.
  return (
    <div className="board" style={{ gridTemplateColumns: `repeat(${width}, max-content)` }}>
      {cells.map((cell) => {
        const view = cellView(game, cell);
        const isPressed = looksPressedIn(board, cell);
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
            onPointerDown={(event) => touchDown(event, cell)}
          />
        );
      })}
    </div>
  );
}
