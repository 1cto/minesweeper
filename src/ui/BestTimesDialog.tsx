import { DIFFICULTIES } from "../engine/game";
import { Dialog } from "./Dialog";
import { bestTimeOf, type BestTimes } from "./storage";

type BestTimesDialogProps = {
  bestTimes: BestTimes;
  onResetScores: () => void;
  onClose: () => void;
};

/** The Best Time and its holder for each Difficulty. Reset Scores asks for no confirmation. */
export function BestTimesDialog({ bestTimes, onResetScores, onClose }: BestTimesDialogProps) {
  return (
    <Dialog title="Best Times" onClose={onClose}>
      <div className="best-times">
        <table>
          <tbody>
            {DIFFICULTIES.map((difficulty) => {
              const { seconds, name } = bestTimeOf(bestTimes, difficulty);
              return (
                <tr key={difficulty.name}>
                  <th scope="row">
                    <span className="dialog-text best-time-difficulty" data-testid="dialog-text">
                      {difficulty.name}:
                    </span>
                  </th>
                  <td>
                    <span className="dialog-text best-time-seconds" data-testid="dialog-text">
                      {seconds} seconds
                    </span>
                  </td>
                  <td>
                    <span className="dialog-text best-time-name" data-testid="dialog-text">
                      {name}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <button type="button" className="dialog-button reset-scores" onClick={onResetScores}>
          <span className="dialog-text" data-testid="dialog-text">
            Reset Scores
          </span>
        </button>
        <button type="button" className="dialog-button" onClick={onClose}>
          <span className="dialog-text" data-testid="dialog-text">
            OK
          </span>
        </button>
      </div>
    </Dialog>
  );
}
