/**
 * Browser storage and the preferences kept in it. Storage may be missing, full or blocked (a
 * private window, blocked site data), so nothing here ever throws: a failed read gives the
 * first-visit value and a failed write is dropped, while the game carries on with the values
 * it holds in memory.
 */
import { BEGINNER, DIFFICULTIES, type Difficulty } from "../engine/game";

// Every project page of the GitHub Pages site shares one origin, hence the prefix.
// The Marks (?) preference keeps the key it was first stored under.
const KEYS = { difficulty: "minesweeper.difficulty", questionsEnabled: "minesweeper.marks" };

/**
 * Strings kept by key, never throwing: a failed read gives `null` and a failed write is dropped.
 */
export type KeyValueStore = {
  readonly read: (key: string) => string | null;
  readonly write: (key: string, value: string) => void;
};

/** The browser's local storage. */
export const browserStorage: KeyValueStore = {
  read: (key) => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  write: (key, value) => {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Unavailable storage only costs remembering the value after a reload.
    }
  },
};

/** Storage that lives only in memory, starting with `entries`; for tests. */
export function memoryStorage(entries: Readonly<Record<string, string>> = {}): KeyValueStore {
  const values = new Map(Object.entries(entries));
  return {
    read: (key) => values.get(key) ?? null,
    write: (key, value) => void values.set(key, value),
  };
}

const { read, write } = browserStorage;

/** The Difficulty chosen last, or Beginner on the first visit. */
export function loadDifficulty(): Difficulty {
  const name = read(KEYS.difficulty);
  return DIFFICULTIES.find((difficulty) => difficulty.name === name) ?? BEGINNER;
}

export function saveDifficulty(difficulty: Difficulty): void {
  write(KEYS.difficulty, difficulty.name);
}

/** The last Marks (?) setting, or on for the first visit. */
export function loadQuestionsEnabled(): boolean {
  return read(KEYS.questionsEnabled) !== "off";
}

export function saveQuestionsEnabled(questionsEnabled: boolean): void {
  write(KEYS.questionsEnabled, questionsEnabled ? "on" : "off");
}
