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
  const now = useClock(statusOf(game) === "playing");

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
          face={FACE[statusOf(game)]}
          onNewGame={startNewGame}
        />
        <Board game={game} onReveal={reveal} onCycleMarker={cycleMarker} />
      </div>
    </Window>
  );
}
