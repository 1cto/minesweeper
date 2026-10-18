import type { CSSProperties } from "react";
import { LED_DIGITS, LED_MINUS, SMILEY_SPRITES } from "./sprites";

/** Three counter characters: "-07" for negatives down to -99, "042" otherwise up to 999. */
function ledText(value: number): string {
  if (value < 0) return "-" + String(Math.min(-value, 99)).padStart(2, "0");
  return String(Math.min(value, 999)).padStart(3, "0");
}

function LedCounter({ label, value, testId }: { label: string; value: number; testId: string }) {
  const text = ledText(value);
  return (
    <div className="led" role="img" aria-label={`${label}: ${text}`} data-testid={testId}>
      {[...text].map((char, i) => (
        <span
          key={i}
          className="led-digit sprite"
          style={{ backgroundImage: char === "-" ? LED_MINUS : LED_DIGITS[Number(char)] }}
        />
      ))}
    </div>
  );
}

/** The smiley's expression. */
export type Face = "normal" | "surprised" | "cool" | "dead";

type StatusPanelProps = {
  mines: number;
  seconds: number;
  face: Face;
  onNewGame: () => void;
};

export function StatusPanel({ mines, seconds, face, onNewGame }: StatusPanelProps) {
  const smileyStyle = {
    "--sprite": SMILEY_SPRITES[face],
    "--sprite-pressed": SMILEY_SPRITES.pressed,
  } as CSSProperties;

  return (
    <div className="status-panel">
      <LedCounter label="Mine counter" value={mines} testId="mine-counter" />
      <button
        type="button"
        aria-label="New game"
        className="smiley sprite"
        style={smileyStyle}
        data-face={face}
        onClick={onNewGame}
      />
      <LedCounter label="Timer" value={seconds} testId="timer" />
    </div>
  );
}
