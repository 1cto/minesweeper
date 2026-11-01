#!/bin/bash
# Prepares a Claude Code cloud session: lets git fetch update remote-tracking branches, and installs
# the dependencies so checks and tests run straight away.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# The cloud clone has no fetch refspec, so `git fetch origin main` would leave origin/main stale
# and `git push --force-with-lease` would refuse with "stale info".
git config remote.origin.fetch '+refs/heads/*:refs/remotes/origin/*'

pnpm install --frozen-lockfile
