import { Dialog } from "./Dialog";
import { TITLE_SPRITES } from "./sprites";

const SOURCE = "https://github.com/1cto/minesweeper";

export function AboutDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog title="About Minesweeper" onClose={onClose}>
      <div className="about">
        <span className="about-icon sprite" style={{ backgroundImage: TITLE_SPRITES.icon }} />
        <div className="about-text">
          <p className="dialog-text about-name" data-testid="dialog-text">
            Minesweeper
          </p>
          <p className="dialog-text" data-testid="dialog-text">
            by 1cto
          </p>
          <a
            className="dialog-text"
            data-testid="dialog-text"
            href={SOURCE}
            target="_blank"
            rel="noreferrer"
          >
            github.com/1cto/minesweeper
          </a>
        </div>
        <button type="button" className="dialog-button" onClick={onClose}>
          <span className="dialog-text" data-testid="dialog-text">
            OK
          </span>
        </button>
      </div>
    </Dialog>
  );
}
