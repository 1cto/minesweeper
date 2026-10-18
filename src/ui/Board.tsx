import { useEffect, useEffectEvent, useState } from "react";
import { cellView, statusOf, type CellView, type Coord, type Game } from "../engine/game";
import { CELL_SPRITES } from "./sprites";

/** `MouseEvent.button` values. */
const LEFT_BUTTON = 0;
const RIGHT_BUTTON = 2;

/**
 * A press that began on a Cell: the mouse buttons held since and the Cell under the pointer.
 * It ends when one of those buttons is released.
 */
type Gesture = { readonly buttons: ReadonlySet<number>; readonly over?: Coord };

function leftAlone(gesture: Gesture): boolean {
  return gesture.buttons.size === 1 && gesture.buttons.has(LEFT_BUTTON);
}

/** The Cell drawn pressed in: the one under the pointer while the left button alone is held. */
function pressedCell(gesture: Gesture | undefined): Coord | undefined {
  return gesture && leftAlone(gesture) ? gesture.over : undefined;
}

function spriteFor(view: CellView, pressed: boolean): string | undefined {
  // A Cell pressed in looks like a Revealed Cell without a Clue.
  if (pressed) return CELL_SPRITES.clues[0];
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
  /** Called with true when a press on the Board begins and with false when it ends. */
  onHoldChange: (holding: boolean) => void;
};

/**
 * Translates mouse gestures into engine actions, like the original: the right button cycles the
 * marker as soon as it is pressed, and the left button Reveals the Cell it is released over.
 */
export function Board({ game, onReveal, onCycleMarker, onHoldChange }: BoardProps) {
  const [gesture, setGesture] = useState<Gesture>();
  const { width, height } = game.difficulty;
  const cells: Coord[] = [];
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) cells.push({ row, col });
  }

  // A finished Game ignores every action, so a press there starts no gesture either.
  const ended = statusOf(game) === "won" || statusOf(game) === "lost";
  const press = (button: number, cell: Coord) => {
    if (ended) return;
    if (button === RIGHT_BUTTON) onCycleMarker(cell);
    onHoldChange(true);
    setGesture((current) => ({ buttons: new Set(current?.buttons).add(button), over: cell }));
  };
  /** Ends the gesture; a release over a Cell (rather than off the Board) acts on that Cell. */
  const release = (button: number, cell?: Coord) => {
    if (!gesture?.buttons.has(button)) return;
    setGesture(undefined);
    onHoldChange(false);
    if (cell && leftAlone(gesture)) onReveal(cell);
  };
  const pointTo = (cell: Coord | undefined) =>
    setGesture((current) => current && { ...current, over: cell });

  // A release over a Cell reaches that Cell first; one anywhere else only ends the gesture.
  const releaseOffBoard = useEffectEvent((event: MouseEvent) => release(event.button));
  const holding = gesture !== undefined;
  useEffect(() => {
    if (!holding) return;
    document.addEventListener("mouseup", releaseOffBoard);
    return () => document.removeEventListener("mouseup", releaseOffBoard);
  }, [holding]);

  const pressed = pressedCell(gesture);
  return (
    <div className="board" style={{ gridTemplateColumns: `repeat(${width}, 16px)` }}>
      {cells.map((cell) => {
        const view = cellView(game, cell);
        const isPressed =
          pressed?.row === cell.row &&
          pressed.col === cell.col &&
          (view.kind === "hidden" || view.kind === "question");
        return (
          <button
            key={`${cell.row}-${cell.col}`}
            type="button"
            className="cell sprite"
            style={{ backgroundImage: spriteFor(view, isPressed) }}
            data-testid={`cell-${cell.row}-${cell.col}`}
            data-state={view.kind}
            data-clue={view.kind === "revealed" ? view.clue : undefined}
            data-pressed={isPressed || undefined}
            aria-label={`Row ${cell.row + 1}, column ${cell.col + 1}`}
            onMouseDown={(event) => press(event.button, cell)}
            onMouseUp={(event) => release(event.button, cell)}
            onMouseEnter={() => pointTo(cell)}
            onMouseLeave={() => pointTo(undefined)}
          />
        );
      })}
    </div>
  );
}
