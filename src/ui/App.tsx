import { useState } from "react";
import {
  applyAction,
  BEGINNER,
  newGame,
  statusOf,
  type Coord,
  type GameStatus,
  type Layout,
} from "../engine/game";
import { Board } from "./Board";

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
    <main>
      <button type="button" aria-label="New game" onClick={startNewGame}>
        🙂
      </button>
      <p role="status">{RESULT_TEXT[statusOf(game)]}</p>
      <Board game={game} onReveal={reveal} />
    </main>
  );
}
