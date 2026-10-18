/**
 * Everything the game keeps in browser storage. Storage may be missing, full or blocked (a
 * private window, blocked site data), so nothing here ever throws: a failed read gives the
 * first-visit value and a failed write is dropped, while the game carries on with the values
 * it holds in memory.
 */
import { BEGINNER, DIFFICULTIES, type Difficulty } from "../engine/game";

// Every project page of the GitHub Pages site shares one origin, hence the prefix.
const KEYS = {
  difficulty: "minesweeper.difficulty",
  marks: "minesweeper.marks",
  bestTimes: "minesweeper.bestTimes",
  lastName: "minesweeper.lastName",
};

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Unavailable storage only costs remembering the value after a reload.
  }
}

/** The Difficulty chosen last, or Beginner on the first visit. */
export function loadDifficulty(): Difficulty {
  const name = read(KEYS.difficulty);
  return DIFFICULTIES.find((difficulty) => difficulty.name === name) ?? BEGINNER;
}

export function saveDifficulty(difficulty: Difficulty): void {
  write(KEYS.difficulty, difficulty.name);
}

/** The last Marks (?) setting, or on for the first visit. */
export function loadMarks(): boolean {
  return read(KEYS.marks) !== "off";
}

export function saveMarks(marks: boolean): void {
  write(KEYS.marks, marks ? "on" : "off");
}

export const ANONYMOUS = "Anonymous";

/** The fastest Win on a Difficulty, in seconds, with the name of the player who set it. */
export type BestTime = { readonly seconds: number; readonly name: string };

/** The Best Time of each Difficulty that has one, by Difficulty name. */
export type BestTimes = Readonly<Partial<Record<string, BestTime>>>;

/** A Difficulty without a Best Time counts as 999 seconds held by "Anonymous". */
export function bestTimeOf(bestTimes: BestTimes, difficulty: Difficulty): BestTime {
  return bestTimes[difficulty.name] ?? { seconds: 999, name: ANONYMOUS };
}

/** The Best Times set on earlier visits; anything unreadable counts as no Best Time. */
export function loadBestTimes(): BestTimes {
  const stored = parseObject(read(KEYS.bestTimes));
  const bestTimes: Record<string, BestTime> = {};
  for (const { name } of DIFFICULTIES) {
    const bestTime = asBestTime(stored[name]);
    if (bestTime) bestTimes[name] = bestTime;
  }
  return bestTimes;
}

export function saveBestTimes(bestTimes: BestTimes): void {
  write(KEYS.bestTimes, JSON.stringify(bestTimes));
}

/** The name entered for the last new Best Time, or "Anonymous" before the first. */
export function loadLastName(): string {
  return read(KEYS.lastName) ?? ANONYMOUS;
}

export function saveLastName(name: string): void {
  write(KEYS.lastName, name);
}

function parseObject(json: string | null): Readonly<Record<string, unknown>> {
  try {
    const value: unknown = JSON.parse(json ?? "{}");
    return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function asBestTime(value: unknown): BestTime | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const { seconds, name } = value as Readonly<Record<string, unknown>>;
  if (typeof seconds !== "number" || typeof name !== "string") return undefined;
  const onTheTimer = Number.isInteger(seconds) && seconds >= 0 && seconds <= 999;
  return onTheTimer ? { seconds, name } : undefined;
}
