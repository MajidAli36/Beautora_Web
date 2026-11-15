#!/usr/bin/env bash
# Quick Contabo status helper for Beautora
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/beautora}"
ENV_FILE="${ENV_FILE:-.env.production.local}"

cd "$APP_DIR"
docker compose --env-file "$ENV_FILE" ps
echo
curl -fsS http://127.0.0.1:3000/api/health || echo "health endpoint unreachable"
echo
docker compose --env-file "$ENV_FILE" logs --tail=40 beautora
