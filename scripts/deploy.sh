#!/usr/bin/env bash
# Build the coming-soon page and upload it to https://beta.genxmeta.io.
#
#   bun run deploy        (or: npm run deploy / bash scripts/deploy.sh)
#
# REMOTE defaults to php (Tailscale node srv1753994, see README) and
# REMOTE_DIR to /var/www/gmc/beta, the folder nginx serves for
# beta.genxmeta.io. The live dApp at genxmeta.io lives in
# /var/www/gmc/front-end and is never deployed to from here.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REMOTE="${REMOTE:-php}"
REMOTE_DIR="${REMOTE_DIR:-/var/www/gmc/beta}"
SITE_URL="${SITE_URL:-https://beta.genxmeta.io}"

case "${REMOTE_DIR%/}" in
  /var/www/gmc/front-end)
    echo "❌ $REMOTE_DIR is the live genxmeta.io dApp - refusing to deploy there." >&2
    exit 1
    ;;
esac

cd "$ROOT"
echo "🔌 Checking SSH to ${REMOTE}…"
if ! ssh -o ConnectTimeout=10 -n "$REMOTE" true; then
  echo "❌ Can't reach $REMOTE. Is Tailscale on (ravionline333) and 'Host php' in ~/.ssh/config?" >&2
  exit 1
fi

echo "🔨 Building…"
if command -v bun >/dev/null; then bun run build; else npm run build; fi

echo "📤 Uploading to $REMOTE:$REMOTE_DIR"
ssh -n "$REMOTE" "mkdir -p '$REMOTE_DIR'"
# files go up world-readable whatever their local mode (public/ is 600 here,
# and nginx answers 403 for files it cannot read).
chmod -R u=rwX,go=rX dist
# hashed media first, without --delete, so open tabs keep working…
rsync -av --exclude=".DS_Store" dist/static/ "$REMOTE:$REMOTE_DIR/static/"
# …then swap in index.html and the root files
rsync -av --delete --exclude="static/" --exclude=".DS_Store" dist/ "$REMOTE:$REMOTE_DIR/"

status="$(curl -s -o /dev/null -w '%{http_code}' "$SITE_URL/" || true)"
echo "✅ Deployed → $SITE_URL (HTTP $status)"
