import { useState } from "react";
import {
  applyAction,
  BEGINNER,
  mineCount,
  newGame,
  statusOf,
  type Coord,
  type GameStatus,
  type Layout,
} from "../engine/game";
import { Board } from "./Board";
import { StatusPanel } from "./StatusPanel";
import { Window } from "./Window";

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

  const reveal = (cell: Coord) =>
    setGame((current) => applyAction(current, { type: "reveal", cell, now: Date.now() }));
  const startNewGame = () => setGame(newGame(BEGINNER, { random: Math.random }));

  return (
    <Window>
      <div className="game" data-testid="game">
        <StatusPanel mines={mineCount(game)} onNewGame={startNewGame} />
        <Board game={game} onReveal={reveal} />
      </div>
      <p role="status" className="visually-hidden">
        {RESULT_TEXT[statusOf(game)]}
      </p>
    </Window>
  );
}
