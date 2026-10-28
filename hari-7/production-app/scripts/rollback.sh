#!/usr/bin/env bash
# Kembali ke tag yang berjalan sebelum deploy terakhir (dicatat di .previous_tag).
set -euo pipefail
cd "$(dirname "$0")/.."
PREV="$(cat .previous_tag 2>/dev/null || true)"
[ -n "$PREV" ] || { echo "Tidak ada versi sebelumnya yang tercatat." >&2; exit 1; }
echo "Rollback ke $PREV"
exec ./scripts/deploy.sh "$PREV"
