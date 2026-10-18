import { useId, type ReactNode } from "react";
import { TITLE_SPRITES } from "./sprites";

type DialogProps = { title: string; onClose: () => void; children: ReactNode };

/** A Windows 95/98 modal dialog centred over the desktop; the game ignores the mouse meanwhile. */
export function Dialog({ title, onClose, children }: DialogProps) {
  const titleId = useId();
  return (
    <div className="dialog-backdrop">
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="window dialog">
        <div className="title-bar">
          <span id={titleId} className="title-text" data-testid="dialog-title">
            {title}
          </span>
          <button
            type="button"
            aria-label="Close"
            className="title-button sprite"
            style={{ backgroundImage: TITLE_SPRITES.close }}
            onClick={onClose}
          />
        </div>
        {children}
      </div>
    </div>
  );
}
