import { useState } from "react";
import {
  applyAction,
  BEGINNER,
  elapsedSeconds,
  mineCounter,
  newGame,
  statusOf,
  type Coord,
  type GameStatus,
  type Layout,
} from "../engine/game";
import { Board } from "./Board";
import { StatusPanel, type Face } from "./StatusPanel";
import { useClock } from "./useClock";
import { Window } from "./Window";

/** Until the Marks (?) menu item exists, the right button can always place Questions. */
const QUESTIONS_ENABLED = true;

const FACE: Record<GameStatus, Face> = {
  ready: "normal",
  playing: "normal",
  won: "cool",
  lost: "dead",
};

export function App({ initialLayout }: { initialLayout?: Layout }) {
  const [game, setGame] = useState(() =>
    newGame(BEGINNER, { random: Math.random, layout: initialLayout }),
  );
  /** Whether a mouse button pressed on the Board is still held. */
  const [holding, setHolding] = useState(false);
  const status = statusOf(game);
  // The Win and Loss faces outrank the surprised face shown while a button is held.
  const face: Face = holding && FACE[status] === "normal" ? "surprised" : FACE[status];
  const now = useClock(status === "playing");

  const reveal = (cell: Coord) =>
    setGame((current) => applyAction(current, { type: "reveal", cell, now: Date.now() }));
  const cycleMarker = (cell: Coord) =>
    setGame((current) =>
      applyAction(current, {
        type: "cycleMarker",
        cell,
        questionsEnabled: QUESTIONS_ENABLED,
        now: Date.now(),
      }),
    );
  const startNewGame = () => setGame(newGame(BEGINNER, { random: Math.random }));

  return (
    <Window>
      <div className="game" data-testid="game">
        <StatusPanel
          mines={mineCounter(game)}
          seconds={elapsedSeconds(game, now)}
          face={face}
          onNewGame={startNewGame}
        />
        <Board
          game={game}
          onReveal={reveal}
          onCycleMarker={cycleMarker}
          onHoldChange={setHolding}
        />
      </div>
    </Window>
  );
}
