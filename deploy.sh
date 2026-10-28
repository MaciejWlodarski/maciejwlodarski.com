#!/usr/bin/env bash
set -euo pipefail

# Run from the development machine. The server checkout must be a clean main
# branch; pull the new script before executing it so deploy logic and code match.
ssh oracle 'set -eu
  cd "$HOME/docker/maciejwlodarski.com"
  # Keep the same lock through the pull and the server-side deployment.
  exec 9>"$(git rev-parse --git-path deploy-site.lock)"
  if ! flock -n 9; then
    echo "Another deployment is running." >&2
    exit 1
  fi
  if [ "$(git branch --show-current)" != main ]; then
    echo "Server checkout must be on main." >&2
    exit 1
  fi
  if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "Server checkout has tracked modifications; commit or resolve them first." >&2
    exit 1
  fi
  git pull --ff-only origin main
  exec ./scripts/deploy-site.sh --lock-held
'
