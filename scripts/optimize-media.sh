#!/usr/bin/env bash
# Generates web-sized copies of the coming-soon media into assets/coming-soon/web/.
# The originals in assets/ are never modified. Re-run after replacing a poster or video.
# Requires ffmpeg (brew install ffmpeg).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/assets/coming-soon"
OUT="$SRC/web"
mkdir -p "$OUT"

command -v ffmpeg >/dev/null || { echo "ffmpeg not found - install it with: brew install ffmpeg"; exit 1; }

# Posters (4:5). Full size for the lightbox, small for the cards.
i=1
for f in poster1.jpeg poste2.jpeg poster3.jpeg poster4.jpeg; do
  ffmpeg -v error -y -i "$SRC/$f" -vf "scale=1280:-2" -c:v libwebp -quality 82 "$OUT/poster$i.webp"
  ffmpeg -v error -y -i "$SRC/$f" -vf "scale=640:-2"  -c:v libwebp -quality 78 "$OUT/poster$i-sm.webp"
  i=$((i + 1))
done

# Still frames shown while each video loads.
for n in 1 2 3; do
  ffmpeg -v error -y -ss 0.4 -i "$SRC/video$n.mp4" -frames:v 1 -vf "scale=540:-2" -c:v libwebp -quality 75 "$OUT/video$n.webp"
done

# Logo
ffmpeg -v error -y -i "$ROOT/assets/gmc.webp" -vf "scale=1000:-2" -c:v libwebp -quality 88 "$OUT/gmc-logo.webp"
ffmpeg -v error -y -i "$ROOT/assets/gmc-icon.png" -vf "scale=320:-2" -c:v libwebp -quality 88 "$OUT/gmc-icon.webp"

# Fixed-path files served from the site root (public/)
PUB="$ROOT/public"
mkdir -p "$PUB"
cp "$ROOT/assets/favicon.ico" "$PUB/favicon.ico"
ffmpeg -v error -y -i "$ROOT/assets/gmc-icon.png" -vf "scale=180:-2" "$PUB/apple-touch-icon.png"
# Social share image (1200x630): poster 1 on an ivory canvas
ffmpeg -v error -y -f lavfi -i "color=c=0xfaf3e3:s=1200x630" -i "$SRC/poster1.jpeg" \
  -filter_complex "[1:v]scale=-2:630[p];[0:v][p]overlay=(W-w)/2:0" -frames:v 1 -q:v 3 "$PUB/og-image.jpg"

echo "Optimized media written to $OUT"
ls -lh "$OUT"
