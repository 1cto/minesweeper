# Minesweeper

A faithful browser recreation of Windows 95/98 Minesweeper, built with React and TypeScript.

**Play it: https://1cto.github.io/minesweeper/**

![A Beginner Game in progress: Flags, a Question, Clues, the mine counter at 007 and the timer at 037](docs/screenshot.png)

## Features

- The classic rules: three Difficulties (Beginner, Intermediate, Expert), a first Reveal that is never a Mine, Cascades, Flags and Questions on the right button, and the Chord on the middle button or both buttons.
- The original feel: Cells press in under the mouse and open on release, the smiley reacts, the timer counts to 999 and the mine counter can go negative.
- The original look: a Windows 98 window with Game and Help menus, Win and Loss presentations, and Best Times with player names kept in the browser.
- Drawn at the largest whole-number scale (×1, ×2 or ×3) that fits the screen, so every pixel stays crisp.

## Run it locally

You need Node.js 22 and pnpm 10.

```sh
pnpm install        # dependencies
pnpm dev            # dev server at http://localhost:5173/minesweeper/
pnpm test           # engine and UI module tests (Vitest)
pnpm test:e2e       # browser tests (Playwright; builds and serves a test build)
pnpm build          # production build in dist/
```

`pnpm typecheck`, `pnpm lint` and `pnpm format:check` run the remaining checks that CI runs on every pull request.

## Stack

React 19, TypeScript in strict mode, Vite, pnpm, Vitest, Playwright, ESLint and Prettier. GitHub Actions checks every pull request and publishes `main` to GitHub Pages.

## How it is built

The vocabulary used in the code, tests and issues (Board, Cell, Reveal, Flag, Chord, Cascade, Layout, Best Time, …) is defined in the domain glossary, [`CONTEXT.md`](CONTEXT.md).

- **Engine** (`src/engine/`): the rules as pure functions over immutable state, with no framework and no access to the clock or global randomness. `newGame(difficulty, { random, layout? })` creates a Game and `applyAction(game, action)` returns the next one; every action carries the current time. A Game is sealed: outside the engine it is read only through queries such as `cellView`, `mineCounter` and `elapsedSeconds`, which describe what the player sees. Why it is shaped this way: [ADR 0001](docs/adr/0001-pure-game-engine.md).
- **UI** (`src/ui/`): React components that draw the window, plus pure modules for the rules that live outside the engine. The Press module (`press.ts`) turns mouse input into requests for the engine: press, drag, release and the Chord. A reducer (`boardState.ts`) applies each request to the Game in the same step, and `Board.tsx` only translates browser events. The Best Times module (`bestTimes.ts`) decides when a Win is a new Best Time and what is recorded. Every graphic is original pixel art written as rows of characters in `sprites.ts` and turned into crisp SVG images; the integer scale uses CSS `zoom`.
- **Browser storage** (`src/ui/storage.ts`): a key-to-string store whose reads and writes never throw, so the game keeps working when storage is blocked. It keeps the chosen Difficulty and the Marks (?) setting, and the Best Times module keeps the Best Times and the last name entered through it.

## Testing

Tests sit at agreed seams and check only what a user of that seam can observe.

- **Engine** (Vitest, `src/engine/*.test.ts`): every rule is tested through the engine's public interface. Small Boards are drawn as text (`"x"` for a Mine), and the first-Reveal safety is checked across hundreds of seeded random sources.
- **UI modules** (Vitest, `src/ui/*.test.ts`): the Press module, the Board's reducer and the Best Times module are pure, so their rules are tested through their interfaces without a browser, including Best Times saved in a broken or unreadable form.
- **Browser** (Playwright, `e2e/`): real mouse input against a test build.
  - A test-only `?layout=` URL parameter fixes where the Mines are. It only exists in test builds, and `pnpm check:no-test-hooks` fails CI if it ever reaches the public build.
  - Playwright's clock controls time, so timer and Best Time tests are exact.
  - Screenshot baselines pin the look pixel for pixel; text drawn with the system font is masked, so the baselines match on any machine.

## Process

The project was planned and built in the open: a spec ([#1](https://github.com/1cto/minesweeper/issues/1)) broken into vertical-slice issues, each delivered test-first in its own pull request. An architecture review afterwards moved the mouse rules, the Best Time rule and the Timer's clock into small modules with deep interfaces, so they are tested without a browser ([#31](https://github.com/1cto/minesweeper/issues/31)–[#47](https://github.com/1cto/minesweeper/issues/47)).

## Legal

This is an independent fan recreation. It is not affiliated with, endorsed by or connected to Microsoft. All graphics are original; no Microsoft images, fonts or other assets are used.

Released under the [MIT License](LICENSE).
