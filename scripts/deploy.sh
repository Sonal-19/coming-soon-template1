#!/usr/bin/env bash
# Build the coming-soon page and upload it to the web server.
#
#   REMOTE=root@php REMOTE_DIR=/var/www/<site>/front-end bash scripts/deploy.sh
#
# REMOTE defaults to root@php (same host the dApp deploys to). REMOTE_DIR is
# required on purpose: point it at the folder nginx serves for the domain.
# Pointing it at the dApp's live front-end folder replaces the dApp there.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REMOTE="${REMOTE:-root@php}"
: "${REMOTE_DIR:?Set REMOTE_DIR to the folder nginx serves, e.g. REMOTE_DIR=/var/www/gmc/coming-soon}"

cd "$ROOT"
echo "🔨 Building…"
npm run build

echo "📤 Uploading to $REMOTE:$REMOTE_DIR"
ssh -n "$REMOTE" "mkdir -p '$REMOTE_DIR'"
# hashed media first, without --delete, so open tabs keep working…
rsync -av --exclude=".DS_Store" dist/static/ "$REMOTE:$REMOTE_DIR/static/"
# …then swap in index.html and the root files
rsync -av --delete --exclude="static/" --exclude=".DS_Store" dist/ "$REMOTE:$REMOTE_DIR/"

echo "✅ Deployed."
