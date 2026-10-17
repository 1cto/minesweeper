import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BEGINNER, type Layout } from "./engine/game";
import { layoutFromSearch } from "./testHooks/layoutParam";
import { App } from "./ui/App";
import "./ui/retro.css";

/** The test-only Layout override; the MODE check lets public builds drop it entirely. */
function initialLayout(): Layout | undefined {
  if (import.meta.env.MODE !== "e2e") return undefined;
  return layoutFromSearch(window.location.search, BEGINNER);
}

const root = createRoot(document.getElementById("root") as HTMLElement);
try {
  const layout = initialLayout();
  root.render(
    <StrictMode>
      <App initialLayout={layout} />
    </StrictMode>,
  );
} catch (error) {
  root.render(<pre role="alert">{String(error)}</pre>);
}
