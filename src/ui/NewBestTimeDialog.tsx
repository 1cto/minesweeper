import { useState } from "react";
import type { Difficulty } from "../engine/game";
import { Dialog } from "./Dialog";
import { MAX_NAME_LENGTH } from "./bestTimes";

type NewBestTimeDialogProps = {
  difficulty: Difficulty;
  /** The name the field starts with. */
  initialName: string;
  /** Receives the name as the player entered it. */
  onOk: (name: string) => void;
};

/**
 * Asks the player who just set a new Best Time for their name. Like the original, it only has OK;
 * the title bar's close button records the name too, so nothing throws a new Best Time away.
 */
export function NewBestTimeDialog({ difficulty, initialName, onOk }: NewBestTimeDialogProps) {
  const [name, setName] = useState(initialName);
  const ok = () => onOk(name);
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
