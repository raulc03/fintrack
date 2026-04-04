#!/usr/bin/env bash

set -euo pipefail

APP_DIR="${APP_DIR:-/home/ec2-user/app}"
BRANCH="${BRANCH:-main}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
API_CONTAINER="${API_CONTAINER:-app-api-1}"

cd "$APP_DIR"

git fetch origin "$BRANCH"
git checkout "$BRANCH"
git reset --hard "origin/$BRANCH"
git clean -fd

docker-compose -f "$COMPOSE_FILE" down && docker-compose -f "$COMPOSE_FILE" up -d --build && docker exec "$API_CONTAINER" /app/.venv/bin/alembic upgrade head
