import { useState } from "react";
import {
  applyAction,
  elapsedSeconds,
  mineCounter,
  newGame,
  statusOf,
  type Coord,
  type Difficulty,
  type GameStatus,
  type Layout,
} from "../engine/game";
import { Board } from "./Board";
import { GameMenuBar } from "./GameMenuBar";
import { StatusPanel } from "./StatusPanel";
import { loadMarks, saveDifficulty, saveMarks } from "./storage";
import { useClock } from "./useClock";
import { Window } from "./Window";

const RESULT_TEXT: Record<GameStatus, string> = {
  ready: "",
  playing: "",
  won: "You won!",
  lost: "You lost.",
};

type AppProps = { initialDifficulty: Difficulty; initialLayout?: Layout };

export function App({ initialDifficulty, initialLayout }: AppProps) {
  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [marks, setMarks] = useState(loadMarks);
  const [game, setGame] = useState(() =>
    newGame(difficulty, { random: Math.random, layout: initialLayout }),
  );
  const now = useClock(statusOf(game) === "playing");

  const reveal = (cell: Coord) =>
    setGame((current) => applyAction(current, { type: "reveal", cell, now: Date.now() }));
  const cycleMarker = (cell: Coord) =>
    setGame((current) =>
      applyAction(current, {
        type: "cycleMarker",
        cell,
        questionsEnabled: marks,
        now: Date.now(),
      }),
    );
  const startNewGame = () => setGame(newGame(difficulty, { random: Math.random }));
  const chooseDifficulty = (choice: Difficulty) => {
    setDifficulty(choice);
    saveDifficulty(choice);
    setGame(newGame(choice, { random: Math.random }));
  };
  const toggleMarks = () => {
    setMarks(!marks);
    saveMarks(!marks);
  };

  return (
    <Window>
      <GameMenuBar
        difficulty={difficulty}
        onNewGame={startNewGame}
        onChooseDifficulty={chooseDifficulty}
        marks={marks}
        onToggleMarks={toggleMarks}
      />
      <div className="game" data-testid="game">
        <StatusPanel
          mines={mineCounter(game)}
          seconds={elapsedSeconds(game, now)}
          onNewGame={startNewGame}
        />
        <Board game={game} onReveal={reveal} onCycleMarker={cycleMarker} />
      </div>
      <p role="status" className="visually-hidden">
        {RESULT_TEXT[statusOf(game)]}
      </p>
    </Window>
  );
}
