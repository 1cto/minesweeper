import type { ReactNode } from "react";
import { TITLE_SPRITES } from "./sprites";

/** A Windows 95/98 window on a teal desktop. The title bar buttons are drawn but inert. */
export function Window({ children }: { children: ReactNode }) {
  return (
    <div className="desktop">
      <div className="window">
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
