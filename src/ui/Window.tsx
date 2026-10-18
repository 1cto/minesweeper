import { useRef, type MouseEvent, type ReactNode } from "react";
import { TITLE_SPRITES } from "./sprites";
import { useIntegerScale } from "./useIntegerScale";

/** Stops the middle button's autoscroll (on its press) and paste (with its click). */
function preventMiddleButtonDefault(event: MouseEvent) {
  if (event.button === 1) event.preventDefault();
}

/**
 * A Windows 95/98 window on a teal desktop, drawn at the largest whole-number scale that fits
 * the viewport. The title bar buttons are drawn but inert.
 */
export function Window({ children }: { children: ReactNode }) {
  const windowRef = useRef<HTMLDivElement>(null);
  useIntegerScale(windowRef);
  return (
    <div className="desktop">
      {/* The right and middle buttons belong to the game, not to the browser. */}
      <div
        ref={windowRef}
        className="window"
        data-testid="window"
        onContextMenu={(event) => event.preventDefault()}
        onMouseDown={preventMiddleButtonDefault}
        onAuxClick={preventMiddleButtonDefault}
      >
        <div className="title-bar">
          <span className="title-icon sprite" style={{ backgroundImage: TITLE_SPRITES.icon }} />
          <span className="title-text" data-testid="title-text">
            Minesweeper
          </span>
          <button
            type="button"
            aria-label="Minimise"
            className="title-button sprite"
            style={{ backgroundImage: TITLE_SPRITES.minimise }}
          />
          <button
            type="button"
            aria-label="Close"
            className="title-button sprite"
            style={{ backgroundImage: TITLE_SPRITES.close }}
          />
        </div>
        {children}
      </div>
    </div>
  );
}
