import { applyAction, type Action, type Game } from "../engine/game";
import { applyMouse, type Intent, type MouseInput, type Press } from "./press";

/** The Game being played and the Press under way on its Board, if any. */
export type BoardState = { readonly game: Game; readonly press: Press };

export type BoardEvent =
  | {
      readonly type: "mouse";
      readonly input: MouseInput;
      readonly now: number;
      readonly questionsEnabled: boolean;
    }
  | { readonly type: "newGame"; readonly game: Game };

type MouseBoardEvent = Extract<BoardEvent, { type: "mouse" }>;

/**
 * The state after `event`: a mouse event moves the Press on and applies its request to the Game in
 * the same step, so a release delivered twice finds the Press already over. An event that changes
 * nothing returns `state` itself. A new Game ends any Press.
 */
export function applyBoardEvent(state: BoardState, event: BoardEvent): BoardState {
  if (event.type === "newGame") return { game: event.game, press: undefined };
  const { press, intent } = applyMouse(state.press, state.game, event.input);
  if (!intent) return press === state.press ? state : { game: state.game, press };
  return { game: applyAction(state.game, toAction(intent, event)), press };
}

function toAction({ type, cell }: Intent, { now, questionsEnabled }: MouseBoardEvent): Action {
  return type === "cycleMarker" ? { type, cell, questionsEnabled, now } : { type, cell, now };
}
