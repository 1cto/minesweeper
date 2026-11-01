import { useState } from "react";
import type { Game } from "../engine/game";
import {
  considerGame,
  loadBestTimes,
  recordName,
  resetScores,
  saveBestTimes,
  type BestTimes,
} from "./bestTimes";
import { browserStorage } from "./storage";

/**
 * The Best Times, held in memory and kept in browser storage, so a failing storage only costs
 * remembering them after a reload. Every Game shown is handed to them, so a Win faster than its
 * Difficulty's Best Time waits for the player's name.
 */
export function useBestTimes(game: Game) {
  const [held, setHeld] = useState(() => loadBestTimes(browserStorage));
  const bestTimes = considerGame(held, game);
  if (bestTimes !== held) setHeld(bestTimes);

  /** Keeps a change the player made for later visits. */
  const change = (next: BestTimes) => {
    setHeld(next);
    saveBestTimes(browserStorage, next);
  };

  return {
    bestTimes,
    recordName: (name: string) => change(recordName(bestTimes, name)),
    resetScores: () => change(resetScores(bestTimes)),
  };
}
