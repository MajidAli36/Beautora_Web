#!/usr/bin/env bash
# Beautora — Contabo production deploy (Docker Compose)
# Run on the VPS from the app directory (default: /var/www/beautora).
#
# Usage:
#   ./scripts/deploy-contabo.sh
#   ./scripts/deploy-contabo.sh --no-pull
#   ./scripts/deploy-contabo.sh --rollback
#
# Never overwrites .env.production.local
# Never touches Supabase / databases

set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/beautora}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
ENV_FILE="${ENV_FILE:-.env.production.local}"
IMAGE_NAME="beautora-web"
SERVICE_NAME="beautora"
HEALTH_URL="http://127.0.0.1:3000/api/health"
PREVIOUS_TAG="${IMAGE_NAME}:previous"
LATEST_TAG="${IMAGE_NAME}:latest"

DO_PULL=1
DO_ROLLBACK=0

for arg in "$@"; do
  case "$arg" in
    --no-pull) DO_PULL=0 ;;
    --rollback) DO_ROLLBACK=1 ;;
    -h|--help)
      sed -n '2,20p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      exit 1
      ;;
  esac
done

log() { printf '\n==> %s\n' "$*"; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

cd "$APP_DIR" || die "Cannot cd to $APP_DIR"

[[ -f "$COMPOSE_FILE" ]] || die "Missing $COMPOSE_FILE in $APP_DIR"
[[ -f "$ENV_FILE" ]] || die "Missing $ENV_FILE — create it from .env.production.example (do not commit secrets)"

compose() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

health_check() {
  local tries=30
  local i
  for ((i = 1; i <= tries; i++)); do
    if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
      log "Health check OK ($HEALTH_URL)"
      curl -fsS "$HEALTH_URL" || true
      echo
      return 0
    fi
    printf '  waiting for health (%s/%s)...\n' "$i" "$tries"
    sleep 2
  done
  return 1
}

rollback() {
  log "Rolling back to $PREVIOUS_TAG"
  if ! docker image inspect "$PREVIOUS_TAG" >/dev/null 2>&1; then
    die "No previous image tagged as $PREVIOUS_TAG — cannot rollback"
  fi
  docker tag "$PREVIOUS_TAG" "$LATEST_TAG"
  compose up -d --no-build --force-recreate "$SERVICE_NAME"
  if health_check; then
    log "Rollback succeeded"
    compose ps
    exit 0
  fi
  die "Rollback started but health check failed — inspect: docker compose logs --tail=200 $SERVICE_NAME"
}

if [[ "$DO_ROLLBACK" -eq 1 ]]; then
  rollback
fi

log "Working directory: $APP_DIR"

if [[ "$DO_PULL" -eq 1 ]]; then
  if [[ -d .git ]]; then
    log "Fetching latest code (preserving local env files)"
    # Do not reset or clean; never touch env files
    git fetch --prune origin
    BRANCH="$(git rev-parse --abbrev-ref HEAD)"
    git pull --ff-only origin "$BRANCH" || die "git pull failed — resolve conflicts manually"
  else
    log "No .git directory — skipping pull (ensure code is already updated)"
  fi
else
  log "Skipping git pull (--no-pull)"
fi

# Tag current image as previous (for rollback) if it exists
if docker image inspect "$LATEST_TAG" >/dev/null 2>&1; then
  log "Saving current image as $PREVIOUS_TAG"
  docker tag "$LATEST_TAG" "$PREVIOUS_TAG"
else
  log "No existing $LATEST_TAG — first deploy (no rollback image yet)"
fi

log "Building and starting containers"
compose build "$SERVICE_NAME"
compose up -d --remove-orphans "$SERVICE_NAME"

log "Container status"
compose ps

if health_check; then
  log "Deploy complete"
  compose ps
  exit 0
fi

log "Health check failed — attempting automatic rollback"
if docker image inspect "$PREVIOUS_TAG" >/dev/null 2>&1; then
  docker tag "$PREVIOUS_TAG" "$LATEST_TAG"
  compose up -d --no-build --force-recreate "$SERVICE_NAME"
  if health_check; then
    die "New deploy failed health; rolled back to previous image successfully. Inspect build/logs before retrying."
  fi
  die "New deploy failed and rollback also unhealthy. Check: docker compose logs --tail=300 $SERVICE_NAME"
fi

die "New deploy failed health and no previous image available. Check logs."
