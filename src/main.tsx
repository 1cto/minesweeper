import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import type { Difficulty, Layout } from "./engine/game";
import { layoutFromSearch } from "./testHooks/layoutParam";
import { App } from "./ui/App";
import { loadDifficulty } from "./ui/storage";
import "./ui/retro.css";

/** The test-only Layout override; the MODE check lets public builds drop it entirely. */
function initialLayout(difficulty: Difficulty): Layout | undefined {
  if (import.meta.env.MODE !== "e2e") return undefined;
  return layoutFromSearch(window.location.search, difficulty);
}

const root = createRoot(document.getElementById("root") as HTMLElement);
try {
  // The Game on page load is on the Difficulty chosen last, and so is any test-only Layout.
  const difficulty = loadDifficulty();
  const layout = initialLayout(difficulty);
  root.render(
    <StrictMode>
      <App initialDifficulty={difficulty} initialLayout={layout} />
    </StrictMode>,
  );
} catch (error) {
  root.render(<pre role="alert">{String(error)}</pre>);
}
