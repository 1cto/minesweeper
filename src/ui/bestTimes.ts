import {
  DIFFICULTIES,
  difficultyOf,
  finalSeconds,
  MAX_TIMER_SECONDS,
  statusOf,
  type Difficulty,
  type Game,
} from "../engine/game";
import type { KeyValueStore } from "./storage";

const ANONYMOUS = "Anonymous";

/** The longest name recorded; short enough to fit in the Best Times dialog. */
export const MAX_NAME_LENGTH = 32;

/** The time to beat on a Difficulty, in seconds, with the name of the player holding it. */
export type BestTime = { readonly seconds: number; readonly name: string };

/** A Win faster than its Difficulty's Best Time, waiting for the player's name. */
export type NewBestTime = { readonly difficulty: Difficulty; readonly seconds: number };

/** Every Difficulty's Best Time until a faster Win, and again after Reset Scores. */
const STARTING_BEST_TIME: BestTime = { seconds: MAX_TIMER_SECONDS, name: ANONYMOUS };

declare const sealed: unique symbol;
/** Each Difficulty's Best Time and what goes with them. Only this module looks inside. */
export type BestTimes = { readonly [sealed]: true };

type Held = {
  /** The Best Times beaten so far, by Difficulty name; the others are the starting one. */
  readonly beaten: Readonly<Partial<Record<string, BestTime>>>;
  /** The name recorded last, offered for the next new Best Time. */
  readonly lastName: string;
  readonly waiting?: NewBestTime;
  /** The last won Game compared with the Best Times. */
  readonly considered?: Game;
};

const open = (bestTimes: BestTimes) => bestTimes as unknown as Held;
const seal = (held: Held) => held as unknown as BestTimes;

// Every project page of the GitHub Pages site shares one origin, hence the prefix.
const KEYS = { bestTimes: "minesweeper.bestTimes", lastName: "minesweeper.lastName" };

/** The Best Times and the last name kept on earlier visits; anything unreadable counts as none. */
export function loadBestTimes(store: KeyValueStore): BestTimes {
  const stored = parseObject(store.read(KEYS.bestTimes));
  const beaten: Record<string, BestTime> = {};
  for (const { name } of DIFFICULTIES) {
    const bestTime = asBestTime(stored[name]);
    if (bestTime) beaten[name] = bestTime;
  }
  return seal({ beaten, lastName: store.read(KEYS.lastName) ?? ANONYMOUS });
}

/** Keeps the Best Times and the last name for later visits; a Win waiting for a name is not kept. */
export function saveBestTimes(store: KeyValueStore, bestTimes: BestTimes): void {
  const { beaten, lastName } = open(bestTimes);
  store.write(KEYS.bestTimes, JSON.stringify(beaten));
  store.write(KEYS.lastName, lastName);
}

/**
 * The Best Times after `game`: a Win faster than its Difficulty's Best Time waits for a name. Each
 * Win is compared once, so considering it again, even after Reset Scores, changes nothing. That
 * relies on the engine's promise on `applyAction`: every action a finished Game ignores returns
 * that very Game.
 */
export function considerGame(bestTimes: BestTimes, game: Game): BestTimes {
  const held = open(bestTimes);
  const seconds = finalSeconds(game);
  if (game === held.considered || statusOf(game) !== "won" || seconds === undefined) {
    return bestTimes;
  }
  const difficulty = difficultyOf(game);
  const faster = seconds < bestTimeOf(bestTimes, difficulty).seconds;
  const waiting = faster ? { difficulty, seconds } : held.waiting;
  return seal({ ...held, waiting, considered: game });
}

/**
 * The Best Times with the waiting Win recorded under the name the player entered: trimmed, at most
 * 32 characters, and Anonymous when empty.
 */
export function recordName(bestTimes: BestTimes, entered: string): BestTimes {
  const held = open(bestTimes);
  if (!held.waiting) return bestTimes;
  const { difficulty, seconds } = held.waiting;
  const name = entered.trim().slice(0, MAX_NAME_LENGTH) || ANONYMOUS;
  const beaten = { ...held.beaten, [difficulty.name]: { seconds, name } };
  return seal({ ...held, beaten, lastName: name, waiting: undefined });
}

/** The Best Times with every Difficulty back to its starting Best Time. */
export function resetScores(bestTimes: BestTimes): BestTimes {
  return seal({ ...open(bestTimes), beaten: {} });
}

export function bestTimeOf(bestTimes: BestTimes, difficulty: Difficulty): BestTime {
  return open(bestTimes).beaten[difficulty.name] ?? STARTING_BEST_TIME;
}

export function waitingForName(bestTimes: BestTimes): NewBestTime | undefined {
  return open(bestTimes).waiting;
}

export function offeredName(bestTimes: BestTimes): string {
  return open(bestTimes).lastName;
}

function parseObject(json: string | null): Readonly<Record<string, unknown>> {
  try {
    const value: unknown = JSON.parse(json ?? "{}");
    return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/**
 * A stored Best Time, if it is one the Timer could show. That includes 0, which earlier versions,
 * whose Timer started at 0, stored for a Win within its first second.
 */
function asBestTime(value: unknown): BestTime | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const { seconds, name } = value as Readonly<Record<string, unknown>>;
  if (typeof seconds !== "number" || typeof name !== "string") return undefined;
  const onTheTimer = Number.isInteger(seconds) && seconds >= 0 && seconds <= MAX_TIMER_SECONDS;
  return onTheTimer ? { seconds, name } : undefined;
}
