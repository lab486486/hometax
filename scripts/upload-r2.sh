#!/usr/bin/env bash
# Upload public/images to R2, then set mediaBaseUrl in src/site.config.ts
#
# Prerequisites:
#   npx wrangler login
#   Create bucket + public access (r2.dev or custom domain)
#
# Usage:
#   BUCKET=blogincome-media ./scripts/upload-r2.sh

set -euo pipefail

BUCKET="${BUCKET:-blogincome-media}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CACHE_CONTROL="public, max-age=31536000, immutable"

echo "Uploading images to R2 bucket: $BUCKET"

upload() {
  local key="$1"
  local file="$2"
  local ct="$3"
  echo "→ $key ($ct)"
  npx wrangler r2 object put "$BUCKET/$key" --file "$file" \
    --remote \
    --content-type "$ct" \
    --cache-control "$CACHE_CONTROL"
}

content_type() {
  case "$1" in
    *.webp) echo "image/webp" ;;
    *.jpg|*.jpeg) echo "image/jpeg" ;;
    *.png) echo "image/png" ;;
    *.gif) echo "image/gif" ;;
    *.svg) echo "image/svg+xml" ;;
    *) echo "application/octet-stream" ;;
  esac
}

# Top-level images
for f in "$ROOT"/public/images/*; do
  [[ -f "$f" ]] || continue
  name="$(basename "$f")"
  upload "images/$name" "$f" "$(content_type "$name")"
done

# Blog images
if [[ -d "$ROOT/public/images/blog" ]]; then
  for f in "$ROOT"/public/images/blog/*; do
    [[ -f "$f" ]] || continue
    name="$(basename "$f")"
    upload "images/blog/$name" "$f" "$(content_type "$name")"
  done
fi

# Lecture posters if present
if [[ -d "$ROOT/public/images/lectures" ]]; then
  for f in "$ROOT"/public/images/lectures/*; do
    [[ -f "$f" ]] || continue
    name="$(basename "$f")"
    upload "images/lectures/$name" "$f" "$(content_type "$name")"
  done
fi

if [[ -f "$ROOT/public/favicon.webp" ]]; then
  upload "favicon.webp" "$ROOT/public/favicon.webp" "image/webp"
fi

echo
echo "Done. Cache-Control set to: $CACHE_CONTROL"
echo "Confirm mediaBaseUrl in src/site.config.ts"
