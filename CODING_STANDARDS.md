# Coding standards

Rules a reviewer applies to a diff. Types, lint rules, formatting and the test-hook guard are enforced by `pnpm typecheck`, `pnpm lint`, `pnpm format:check` and `pnpm check:no-test-hooks`; this file holds only the judgement calls those checks cannot make.

## Language

- Domain words come from `CONTEXT.md`, spelled and capitalised as there (Board, Cell, Reveal, Flag, Chord, Press, Timer, Best Time, …), and never a word from a term's _Avoid_ list. A new domain concept gets its `CONTEXT.md` entry in the same change.
- Code reads like the surrounding code: the same naming, idiom and comment density. Comments say why in full sentences, as the existing doc comments do.

## Design

- Game rules live in the engine, as pure functions over immutable state with time and randomness passed in (ADR-0001). UI code turns input into requests and draws the engine's answers; a rule computed in the UI is a finding.
- A sealed value (Game, Press, Best Times) is read through its module's queries. A new query earns its place by serving a real caller; one that restates a field for a single caller is shallow.

## Tests

- Tests go through a module's public interface at its seam: the engine and the pure UI modules (Press, the Board's reducer, Best Times) in Vitest; wiring, browser behaviour and the look in Playwright. A rule tested only in the browser when a pure module could test it is a finding.
- Expected values come from an independent source: a literal, a worked example, the spec. A value recomputed the way the code computes it proves nothing.
- A changed test keeps its scenario and its strength: every `expect` stays, and matchers stay as strict. Its name stays true, and a helper documented in terms of what the player sees keeps that meaning.
- Screenshot baselines change only where the change means them to, and each image diff stays inside the area that changed; the pull request says which.

## Docs

- A change to behaviour or architecture that `README.md` or `CONTEXT.md` describes updates them in the same pull request.
