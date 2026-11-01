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
import { offeredName, waitingForName } from "./bestTimes";
import { applyBoardEvent } from "./boardState";
import { GameMenuBar } from "./GameMenuBar";
import { NewBestTimeDialog } from "./NewBestTimeDialog";
import { isUnderWay, type MouseInput } from "./press";
import { StatusPanel, type Face } from "./StatusPanel";
import { loadQuestionsEnabled, saveDifficulty, saveQuestionsEnabled } from "./storage";
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
  const [questionsEnabled, setQuestionsEnabled] = useState(loadQuestionsEnabled);
  const [{ game, press }, dispatch] = useReducer(applyBoardEvent, undefined, () => ({
    game: newGame(initialDifficulty, { random: Math.random, layout: initialLayout }),
    press: undefined,
  }));
  const status = statusOf(game);
  // A Press never starts in a finished Game, so the surprised face never hides a Win or a Loss.
  const face: Face = isUnderWay(press) ? "surprised" : FACE[status];
  const now = useClock(status === "playing");
  const { bestTimes, recordName, resetScores } = useBestTimes(game);
  const newBestTime = waitingForName(bestTimes);

  const onMouse = (input: MouseInput) =>
    dispatch({ type: "mouse", input, now: Date.now(), questionsEnabled });
  const startGame = (difficulty: Difficulty) =>
    dispatch({ type: "newGame", game: newGame(difficulty, { random: Math.random }) });
  const startNewGame = () => startGame(game.difficulty);
  const chooseDifficulty = (choice: Difficulty) => {
    saveDifficulty(choice);
    startGame(choice);
  };
  const toggleQuestionsEnabled = () => {
    setQuestionsEnabled(!questionsEnabled);
    saveQuestionsEnabled(!questionsEnabled);
  };

  return (
    <Window>
      <GameMenuBar
        difficulty={game.difficulty}
        onNewGame={startNewGame}
        onChooseDifficulty={chooseDifficulty}
        questionsEnabled={questionsEnabled}
        onToggleQuestionsEnabled={toggleQuestionsEnabled}
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
          initialName={offeredName(bestTimes)}
          onOk={recordName}
        />
      )}
    </Window>
  );
}
