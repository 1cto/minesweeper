import { cellView, statusOf, type Coord, type Game } from "../engine/game";

export type Button = "left" | "middle" | "right";

/** What the mouse does on the Board; a missing `cell` means off the Board. */
export type MouseInput =
  | { readonly type: "down"; readonly button: Button; readonly cell: Coord }
  | { readonly type: "up"; readonly button: Button; readonly cell?: Coord }
  | { readonly type: "point"; readonly cell?: Coord };

/** The engine action a Press asks for, without the time or the Marks (?) preference. */
export type Intent = { readonly type: "reveal" | "cycleMarker" | "chord"; readonly cell: Coord };

declare const sealed: unique symbol;
/** The Press under way, or `undefined` when there is none. Only this module looks inside it. */
export type Press = { readonly [sealed]: true } | undefined;

/** The buttons held since the Press began and the Cell under the pointer. */
type Held = { readonly buttons: ReadonlySet<Button>; readonly over?: Coord };

const open = (press: Press) => press as unknown as Held | undefined;
const seal = (held: Held | undefined) => held as unknown as Press;

function leftAlone(held: Held): boolean {
  return held.buttons.size === 1 && held.buttons.has("left");
}

/** A Chord is the middle button, or the left and right buttons held together. */
function chording(held: Held): boolean {
  const { buttons } = held;
  return buttons.has("middle") || (buttons.has("left") && buttons.has("right"));
}

/**
 * The Press after `input`, and the action it asks of the engine, if any, like the original: the
 * right button cycles the marker as soon as it goes down, the left button Reveals the Cell it is
 * released over, and the middle button, or the left and right buttons held together, Chord on the
 * Cell released over. An input that changes nothing returns the same Press.
 */
export function applyMouse(
  press: Press,
  game: Game,
  input: MouseInput,
): { press: Press; intent?: Intent } {
  const held = open(press);
  if (input.type === "point") return { press: held && seal({ ...held, over: input.cell }) };
  if (input.type === "down") {
    // A finished Game ignores every action, so no Press starts there either.
    const status = statusOf(game);
    if (status === "won" || status === "lost") return { press };
    const next = seal({ buttons: new Set(held?.buttons).add(input.button), over: input.cell });
    // A lone right press cycles the marker at once. As in the original, the change stays even if
    // a left press then turns the Press into a Chord; a right press added to a held left one
    // starts the Chord without touching the marker.
    if (!held && input.button === "right") {
      return { press: next, intent: { type: "cycleMarker", cell: input.cell } };
    }
    return { press: next };
  }
  // Releasing any held button ends the Press; a release over a Cell, not off the Board, acts on it.
  if (!held?.buttons.has(input.button)) return { press };
  const { cell } = input;
  if (!cell) return { press: undefined };
  if (chording(held)) return { press: undefined, intent: { type: "chord", cell } };
  if (leftAlone(held)) return { press: undefined, intent: { type: "reveal", cell } };
  return { press: undefined };
}

/** Whether a Press is under way; the smiley shows the surprised face while one is. */
export function isUnderWay(press: Press): boolean {
  return press !== undefined;
}

/**
 * Whether `cell` looks pressed in: under the left button alone, the Cell under the pointer does;
 * during a Chord, so do its Neighbors, the 3×3 block the original pushes in. Only a Hidden Cell,
 * or one with a Question, can look pressed in.
 */
export function looksPressedIn(press: Press, game: Game, cell: Coord): boolean {
  const held = open(press);
  if (!held?.over) return false;
  const rows = Math.abs(cell.row - held.over.row);
  const cols = Math.abs(cell.col - held.over.col);
  const under = chording(held)
    ? rows <= 1 && cols <= 1
    : leftAlone(held) && rows === 0 && cols === 0;
  if (!under) return false;
  const { kind } = cellView(game, cell);
  return kind === "hidden" || kind === "question";
}
