import { cellView, statusOf, type Coord, type Game } from "../engine/game";
import type { Intent } from "./press";

/** A position on screen, in CSS pixels. */
export type Point = { readonly x: number; readonly y: number };

/**
 * What a finger or a stylus does on the Board. `pointer` is the browser's id for it, so the lift
 * of one finger is never taken for another's.
 */
export type TouchInput =
  | { readonly type: "down"; readonly pointer: number; readonly cell: Coord; readonly at: Point }
  | { readonly type: "move"; readonly pointer: number; readonly at: Point }
  | { readonly type: "up"; readonly pointer: number }
  | { readonly type: "cancel"; readonly pointer: number }
  | { readonly type: "held" };

/** How long a finger must stay on a Hidden Cell for its Touch to become a Long Touch. */
export const LONG_TOUCH_MS = 400;

/** How far, in CSS pixels on screen, a finger may wander before its Touch is cancelled. */
const TOUCH_SLOP_PX = 10;

declare const sealed: unique symbol;
/** The Touch under way, or `undefined` when there is none. Only this module looks inside it. */
export type Touch = { readonly [sealed]: true } | undefined;

/**
 * The finger on the Board, the Cell it began on, where and when it went down, and whether the
 * Touch has become a Long Touch.
 */
type Held = {
  readonly pointer: number;
  readonly cell: Coord;
  readonly origin: Point;
  readonly since: number;
  readonly long: boolean;
};

const open = (touch: Touch) => touch as unknown as Held | undefined;
const seal = (held: Held | undefined) => held as unknown as Touch;

/**
 * The Touch after `input` at time `now`, and the action it asks of the engine, if any. Once the
 * finger has been held for `LONG_TOUCH_MS`, the Touch becomes a Long Touch and cycles the marker
 * at once, as the right button does; lifting the finger before that Reveals the Cell the Touch
 * began on, and after it asks for nothing more. The finger wandering more than `TOUCH_SLOP_PX`,
 * the browser taking it over, or a second finger going down ends the Touch with no action; a
 * marker already cycled stays. Only the Touch's own finger moves, lifts or cancels it, and no
 * Touch starts in a finished Game. An input that changes nothing returns the same Touch.
 */
export function applyTouch(
  touch: Touch,
  game: Game,
  input: TouchInput,
  now: number,
): { touch: Touch; intent?: Intent } {
  const held = open(touch);
  if (input.type === "down") {
    if (held) return { touch: undefined };
    // A finished Game ignores every action, so no Touch starts there either.
    const status = statusOf(game);
    if (status === "won" || status === "lost") return { touch };
    const { pointer, cell, at } = input;
    return { touch: seal({ pointer, cell, origin: at, since: now, long: false }) };
  }
  if (!held || ("pointer" in input && input.pointer !== held.pointer)) return { touch };
  if (input.type === "cancel") return { touch: undefined };
  if (input.type === "move") {
    const wandered = Math.hypot(input.at.x - held.origin.x, input.at.y - held.origin.y);
    return { touch: wandered > TOUCH_SLOP_PX ? undefined : touch };
  }
  // The moment is measured from the event times, so a lift that comes after it is a Long Touch
  // even when the moment itself was delivered late.
  const becomesLong = !held.long && now - held.since >= LONG_TOUCH_MS;
  const cycle: Intent = { type: "cycleMarker", cell: held.cell };
  if (input.type === "held") {
    return becomesLong ? { touch: seal({ ...held, long: true }), intent: cycle } : { touch };
  }
  if (becomesLong) return { touch: undefined, intent: cycle };
  if (held.long) return { touch: undefined };
  return { touch: undefined, intent: { type: "reveal", cell: held.cell } };
}

/** Whether a Touch is under way; the smiley shows the surprised face while one is. */
export function isUnderWay(touch: Touch): boolean {
  return touch !== undefined;
}

/**
 * Whether `cell` looks pressed in: the Cell the Touch began on does until the Touch becomes a
 * Long Touch. Only a Hidden Cell, or one with a Question, can look pressed in.
 */
export function looksPressedIn(touch: Touch, game: Game, cell: Coord): boolean {
  const held = open(touch);
  if (!held || held.long || held.cell.row !== cell.row || held.cell.col !== cell.col) return false;
  const { kind } = cellView(game, cell);
  return kind === "hidden" || kind === "question";
}
