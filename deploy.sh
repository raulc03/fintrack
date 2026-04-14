#!/usr/bin/env bash

set -euo pipefail

APP_DIR="${APP_DIR:-/home/ec2-user/app}"
BRANCH="${BRANCH:-main}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
DOCKER_COMPOSE_BIN="${DOCKER_COMPOSE_BIN:-docker-compose}"

cd "$APP_DIR"

compose() {
  "$DOCKER_COMPOSE_BIN" -f "$COMPOSE_FILE" "$@"
}

git fetch origin "$BRANCH"
git checkout "$BRANCH"
git reset --hard "origin/$BRANCH"
git clean -fd

compose down && \
compose build api web && \
compose up -d db && \
compose run --rm --no-deps api /app/.venv/bin/alembic upgrade head && \
compose up -d api && \
API_CONTAINER_ID="$(compose ps -q api)" && \
until [ -n "$API_CONTAINER_ID" ] && [ "$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}starting{{end}}' "$API_CONTAINER_ID")" = "healthy" ]; do \
  sleep 2; \
  API_CONTAINER_ID="$(compose ps -q api)"; \
done && \
compose up -d web
