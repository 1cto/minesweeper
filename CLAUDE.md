## Agent skills

### Issue tracker

Issues and specs live in GitHub Issues for `1cto/minesweeper`; cloud sessions reach them only through REST (`gh api`). See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Workflow

- Ticket work follows the `implement` skill's steps, whoever starts it: `tdd` at agreed seams, then `code-review` against `main`, then commit and open the pull request.
- Choosing test seams (`to-spec`, `tdd`): the Tests section of `CODING_STANDARDS.md` says which seam each kind of rule belongs at.
