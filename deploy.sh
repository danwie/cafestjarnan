#!/usr/bin/env bash
set -euo pipefail
HOST="${DEPLOY_HOST:-rpi4.local}"
ssh "$HOST" 'cd ~/Docker/cafestjarnan && docker compose pull && docker compose up -d && docker image prune -f'
