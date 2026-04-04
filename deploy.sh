#!/usr/bin/env bash

set -euo pipefail

APP_DIR="${APP_DIR:-/home/ec2-user/app}"
BRANCH="${BRANCH:-main}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
API_CONTAINER="${API_CONTAINER:-app-api-1}"
RESTORE_STASH="${RESTORE_STASH:-false}"

cd "$APP_DIR"

stash_created=0

if ! git diff --quiet || ! git diff --cached --quiet || [ -n "$(git ls-files --others --exclude-standard)" ]; then
  git stash push --include-untracked -m "deploy.sh auto-stash $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  stash_created=1
fi

git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

docker-compose -f "$COMPOSE_FILE" down && docker-compose -f "$COMPOSE_FILE" up -d --build && docker exec "$API_CONTAINER" /app/.venv/bin/alembic upgrade head

if [ "$stash_created" -eq 1 ]; then
  if [ "$RESTORE_STASH" = "true" ]; then
    git stash pop
  else
    printf 'Local changes were stashed. Reapply with: git stash pop\n'
  fi
fi
