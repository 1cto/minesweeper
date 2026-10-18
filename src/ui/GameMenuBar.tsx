import { useState } from "react";
import { DIFFICULTIES, type Difficulty } from "../engine/game";
import { AboutDialog } from "./AboutDialog";
import { MenuBar, type Menu } from "./MenuBar";

type GameMenuBarProps = {
  difficulty: Difficulty;
  onNewGame: () => void;
  onChooseDifficulty: (difficulty: Difficulty) => void;
  marks: boolean;
  onToggleMarks: () => void;
};

/** The Game and Help menus of the Minesweeper window. */
export function GameMenuBar({
  difficulty,
  onNewGame,
  onChooseDifficulty,
  marks,
  onToggleMarks,
}: GameMenuBarProps) {
  const [aboutOpen, setAboutOpen] = useState(false);
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
      {aboutOpen && <AboutDialog onClose={() => setAboutOpen(false)} />}
    </>
  );
}
