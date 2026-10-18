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
