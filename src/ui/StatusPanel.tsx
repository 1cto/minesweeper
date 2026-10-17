import type { CSSProperties } from "react";
import { LED_DIGITS, SMILEY_SPRITES } from "./sprites";

function LedCounter({ label, value, testId }: { label: string; value: number; testId: string }) {
  const digits = String(Math.min(Math.max(value, 0), 999)).padStart(3, "0");
  return (
    <div className="led" role="img" aria-label={`${label}: ${digits}`} data-testid={testId}>
      {[...digits].map((digit, i) => (
        <span
          key={i}
          className="led-digit sprite"
          style={{ backgroundImage: LED_DIGITS[Number(digit)] }}
        />
      ))}
    </div>
  );
}

export function StatusPanel({ mines, onNewGame }: { mines: number; onNewGame: () => void }) {
  const smileyStyle = {
    "--sprite": SMILEY_SPRITES.normal,
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
        onClick={onNewGame}
      />
      <LedCounter label="Timer" value={0} testId="timer" />
    </div>
  );
}
