import { useState } from "react";
import {
  applyAction,
  BEGINNER,
  mineCounter,
  newGame,
  statusOf,
  type Coord,
  type GameStatus,
  type Layout,
} from "../engine/game";
import { Board } from "./Board";
import { StatusPanel, type Face } from "./StatusPanel";
import { Window } from "./Window";

/** Until the Marks (?) menu item exists, the right button can always place Questions. */
const QUESTIONS_ENABLED = true;

const RESULT_TEXT: Record<GameStatus, string> = {
  ready: "",
  playing: "",
  won: "You won!",
  lost: "You lost.",
};

export function App({ initialLayout }: { initialLayout?: Layout }) {
  const [game, setGame] = useState(() =>
    newGame(BEGINNER, { random: Math.random, layout: initialLayout }),
  );
  /** Whether a mouse button pressed on the Board is still held. */
  const [holding, setHolding] = useState(false);
  const face: Face = holding ? "surprised" : "normal";

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
        <StatusPanel mines={mineCounter(game)} face={face} onNewGame={startNewGame} />
        <Board
          game={game}
          onReveal={reveal}
          onCycleMarker={cycleMarker}
          onHoldChange={setHolding}
        />
      </div>
      <p role="status" className="visually-hidden">
        {RESULT_TEXT[statusOf(game)]}
      </p>
    </Window>
  );
}
