import { applyAction, type Action, type Coord, type Game } from "../engine/game";
import {
  applyMouse,
  isUnderWay as pressUnderWay,
  looksPressedIn as pressedInByPress,
  type Intent,
  type MouseInput,
  type Press,
} from "./press";
import {
  applyTouch,
  isUnderWay as touchUnderWay,
  looksPressedIn as pressedInByTouch,
  type Touch,
  type TouchInput,
} from "./touch";

/** The Game being played and the Press or Touch under way on its Board, if any. */
export type BoardState = { readonly game: Game; readonly press: Press; readonly touch: Touch };

export type BoardEvent =
  | {
      readonly type: "mouse";
      readonly input: MouseInput;
      readonly now: number;
      readonly questionsEnabled: boolean;
    }
  | {
      readonly type: "touch";
      readonly input: TouchInput;
      readonly now: number;
      readonly questionsEnabled: boolean;
    }
  | { readonly type: "newGame"; readonly game: Game };

type InputBoardEvent = Exclude<BoardEvent, { type: "newGame" }>;

/**
 * The state after `event`: a mouse or touch event moves the Press or the Touch on and applies its
 * request to the Game in the same step, so a release delivered twice finds the Press already over.
 * One device at a time: a finger going down while a Press is under way, or a button going down
 * while a Touch is, is ignored. An event that changes nothing returns `state` itself. A new Game
 * ends any Press or Touch.
 */
export function applyBoardEvent(state: BoardState, event: BoardEvent): BoardState {
  if (event.type === "newGame") return { game: event.game, press: undefined, touch: undefined };
  const starts = event.input.type === "down";
  if (event.type === "touch") {
    if (starts && pressUnderWay(state.press)) return state;
    const { touch, intent } = applyTouch(state.touch, state.game, event.input, event.now);
    if (!intent) return touch === state.touch ? state : { ...state, touch };
    return { ...state, game: applyAction(state.game, toAction(intent, event)), touch };
  }
  if (starts && touchUnderWay(state.touch)) return state;
  const { press, intent } = applyMouse(state.press, state.game, event.input);
  if (!intent) return press === state.press ? state : { ...state, press };
  return { ...state, game: applyAction(state.game, toAction(intent, event)), press };
}

function toAction({ type, cell }: Intent, { now, questionsEnabled }: InputBoardEvent): Action {
  return type === "cycleMarker" ? { type, cell, questionsEnabled, now } : { type, cell, now };
}

/** Whether a Press or a Touch is under way; the smiley shows the surprised face while one is. */
export function isPressOrTouchUnderWay({ press, touch }: BoardState): boolean {
  return pressUnderWay(press) || touchUnderWay(touch);
}

/** Whether `cell` looks pressed in under the Press or the Touch under way. */
export function looksPressedIn({ game, press, touch }: BoardState, cell: Coord): boolean {
  return pressedInByPress(press, game, cell) || pressedInByTouch(touch, game, cell);
}
