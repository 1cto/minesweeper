import { useReducer, useState } from "react";
import {
  elapsedSeconds,
  mineCounter,
  newGame,
  statusOf,
  type Difficulty,
  type GameStatus,
  type Layout,
} from "../engine/game";
import { Board } from "./Board";
import { applyBoardEvent } from "./boardState";
import { GameMenuBar } from "./GameMenuBar";
import { NewBestTimeDialog } from "./NewBestTimeDialog";
import { isUnderWay, type MouseInput } from "./press";
import { StatusPanel, type Face } from "./StatusPanel";
import { loadMarks, saveDifficulty, saveMarks } from "./storage";
import { useBestTimes } from "./useBestTimes";
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
  const [{ game, press }, dispatch] = useReducer(applyBoardEvent, undefined, () => ({
    game: newGame(initialDifficulty, { random: Math.random, layout: initialLayout }),
    press: undefined,
  }));
  const status = statusOf(game);
  // The Win and Loss faces outrank the surprised face shown while a button is held.
  const face: Face = isUnderWay(press) && FACE[status] === "normal" ? "surprised" : FACE[status];
  const now = useClock(status === "playing");
  const { bestTimes, lastName, newBestTime, recordName, resetScores } = useBestTimes(game, now);

  const onMouse = (input: MouseInput) =>
    dispatch({ type: "mouse", input, now: Date.now(), questionsEnabled: marks });
  const startNewGame = () =>
    dispatch({ type: "newGame", game: newGame(difficulty, { random: Math.random }) });
  const chooseDifficulty = (choice: Difficulty) => {
    setDifficulty(choice);
    saveDifficulty(choice);
    dispatch({ type: "newGame", game: newGame(choice, { random: Math.random }) });
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
        bestTimes={bestTimes}
        onResetScores={resetScores}
      />
      <div className="game" data-testid="game">
        <StatusPanel
          mines={mineCounter(game)}
          seconds={elapsedSeconds(game, now)}
          face={face}
          onNewGame={startNewGame}
        />
        <Board game={game} press={press} onMouse={onMouse} />
      </div>
      {newBestTime && (
        <NewBestTimeDialog
          difficulty={newBestTime.difficulty}
          initialName={lastName}
          onOk={recordName}
        />
      )}
    </Window>
  );
}
