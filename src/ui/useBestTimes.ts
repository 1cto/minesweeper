import { useState } from "react";
import { elapsedSeconds, statusOf, type Difficulty, type Game } from "../engine/game";
import { bestTimeOf, loadBestTimes, loadLastName, saveBestTimes, saveLastName } from "./storage";

/** A Win in strictly fewer seconds than its Difficulty's Best Time, waiting for the player's name. */
type NewBestTime = { readonly difficulty: Difficulty; readonly seconds: number };

/**
 * The Best Times and the last name entered, held in memory and kept in storage, so a failing
 * storage only costs remembering them after a reload. Each Game is compared with the Best Times
 * once, when it is won, using the seconds its timer stopped at; a later Reset Scores never makes
 * a Game won earlier ask for a name.
 */
export function useBestTimes(game: Game, now: number) {
  const [bestTimes, setBestTimes] = useState(loadBestTimes);
  const [lastName, setLastName] = useState(loadLastName);
  const [newBestTime, setNewBestTime] = useState<NewBestTime>();
  const [lastWin, setLastWin] = useState<Game>();

  if (statusOf(game) === "won" && game !== lastWin) {
    setLastWin(game);
    const seconds = elapsedSeconds(game, now);
    if (seconds < bestTimeOf(bestTimes, game.difficulty).seconds) {
      setNewBestTime({ difficulty: game.difficulty, seconds });
    }
  }

  /** Records the pending new Best Time under `name`. */
  const recordName = (name: string) => {
    if (!newBestTime) return;
    const { difficulty, seconds } = newBestTime;
    const updated = { ...bestTimes, [difficulty.name]: { seconds, name } };
    setBestTimes(updated);
    saveBestTimes(updated);
    setLastName(name);
    saveLastName(name);
    setNewBestTime(undefined);
  };

  /** Clears the Best Time of every Difficulty. */
  const resetScores = () => {
    setBestTimes({});
    saveBestTimes({});
  };

  return { bestTimes, lastName, newBestTime, recordName, resetScores };
}
