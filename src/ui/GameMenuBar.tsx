import { useState } from "react";
import { DIFFICULTIES, type Difficulty } from "../engine/game";
import { AboutDialog } from "./AboutDialog";
import { BestTimesDialog } from "./BestTimesDialog";
import { MenuBar, type Menu } from "./MenuBar";
import type { BestTimes } from "./storage";

type GameMenuBarProps = {
  difficulty: Difficulty;
  onNewGame: () => void;
  onChooseDifficulty: (difficulty: Difficulty) => void;
  marks: boolean;
  onToggleMarks: () => void;
  bestTimes: BestTimes;
  onResetScores: () => void;
};

/** The Game and Help menus of the Minesweeper window. */
export function GameMenuBar({
  difficulty,
  onNewGame,
  onChooseDifficulty,
  marks,
  onToggleMarks,
  bestTimes,
  onResetScores,
}: GameMenuBarProps) {
  const [aboutOpen, setAboutOpen] = useState(false);
  const [bestTimesOpen, setBestTimesOpen] = useState(false);
  const menus: Menu[] = [
    {
      title: "Game",
      items: [
        { kind: "command", label: "New", onSelect: onNewGame },
        { kind: "separator" },
        ...DIFFICULTIES.map((choice) => ({
          kind: "radio" as const,
          label: choice.name,
          checked: choice === difficulty,
          onSelect: () => onChooseDifficulty(choice),
        })),
        { kind: "separator" },
        { kind: "checkbox", label: "Marks (?)", checked: marks, onSelect: onToggleMarks },
        { kind: "separator" },
        { kind: "command", label: "Best Times…", onSelect: () => setBestTimesOpen(true) },
      ],
    },
    {
      title: "Help",
      items: [{ kind: "command", label: "About Minesweeper…", onSelect: () => setAboutOpen(true) }],
    },
  ];
  return (
    <>
      <MenuBar menus={menus} />
      {bestTimesOpen && (
        <BestTimesDialog
          bestTimes={bestTimes}
          onResetScores={onResetScores}
          onClose={() => setBestTimesOpen(false)}
        />
      )}
      {aboutOpen && <AboutDialog onClose={() => setAboutOpen(false)} />}
    </>
  );
}
