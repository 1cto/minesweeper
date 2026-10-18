import { useState } from "react";
import type { Difficulty } from "../engine/game";
import { Dialog } from "./Dialog";
import { ANONYMOUS } from "./storage";

/** Short enough to fit in the Best Times dialog. */
const MAX_NAME_LENGTH = 32;

/** The name as recorded: trimmed and capped at 32 characters, with "Anonymous" for no name. */
function recordedName(input: string): string {
  return input.trim().slice(0, MAX_NAME_LENGTH) || ANONYMOUS;
}

type NewBestTimeDialogProps = {
  difficulty: Difficulty;
  /** The name the field starts with. */
  initialName: string;
  onOk: (name: string) => void;
};

/**
 * Asks the player who just set a new Best Time for their name. Like the original, it only has OK;
 * the title bar's close button records the name too, so nothing throws a new Best Time away.
 */
export function NewBestTimeDialog({ difficulty, initialName, onOk }: NewBestTimeDialogProps) {
  const [name, setName] = useState(initialName);
  const ok = () => onOk(recordedName(name));
  return (
    <Dialog title="New Best Time" onClose={ok}>
      <form
        className="new-best-time"
        onSubmit={(event) => {
          event.preventDefault();
          ok();
        }}
      >
        <p className="dialog-text" data-testid="dialog-text">
          You have the fastest time
        </p>
        <p className="dialog-text" data-testid="dialog-text">
          for {difficulty.name}.
        </p>
        <p className="dialog-text" data-testid="dialog-text">
          Please enter your name.
        </p>
        <div className="name-field">
          <input
            className="dialog-text"
            data-testid="dialog-text"
            aria-label="Name"
            maxLength={MAX_NAME_LENGTH}
            value={name}
            onChange={(event) => setName(event.target.value)}
            // Like the original, the offered name starts selected, so typing replaces it.
            autoFocus
            onFocus={(event) => event.currentTarget.select()}
          />
        </div>
        <button type="submit" className="dialog-button">
          <span className="dialog-text" data-testid="dialog-text">
            OK
          </span>
        </button>
      </form>
    </Dialog>
  );
}
