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
import { StatusPanel, type Face } from "./StatusPanel";
import { loadMarks, saveDifficulty, saveMarks } from "./storage";
import { useClock } from "./useClock";
import { Window } from "./Window";

const FACE: Record<GameStatus, Face> = {
  ready: "normal",
  playing: "normal",
  won: "cool",
  lost: "dead",
};

type AppProps = { initialDifficulty: Difficulty; initialLayout?: Layout };

export function App({ initialDifficulty, initialLayout }: AppProps) {
  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [marks, setMarks] = useState(loadMarks);
  const [game, setGame] = useState(() =>
    newGame(difficulty, { random: Math.random, layout: initialLayout }),
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
