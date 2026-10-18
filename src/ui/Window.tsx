import { useRef, type ReactNode } from "react";
import { TITLE_SPRITES } from "./sprites";
import { useIntegerScale } from "./useIntegerScale";

/**
 * A Windows 95/98 window on a teal desktop, drawn at the largest whole-number scale that fits
 * the viewport. The title bar buttons are drawn but inert.
 */
export function Window({ children }: { children: ReactNode }) {
  const windowRef = useRef<HTMLDivElement>(null);
  useIntegerScale(windowRef);
  return (
    <div className="desktop">
      {/* The right button belongs to the game, so the browser's context menu never opens here. */}
      <div
        ref={windowRef}
        className="window"
        data-testid="window"
        onContextMenu={(event) => event.preventDefault()}
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
