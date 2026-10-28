#!/usr/bin/env bash
# Deploy sebuah tag image. Jika versi baru tidak menjadi sehat, kembali otomatis ke tag sebelumnya.
# Pemakaian (dari direktori production-app):  ./scripts/deploy.sh 1.0.0
set -euo pipefail
cd "$(dirname "$0")/.."

TAG="${1:?pemakaian: $0 TAG   contoh: $0 1.0.0}"
REPO="${IMAGE_REPO:-$(grep -E '^IMAGE_REPO=' .env 2>/dev/null | cut -d= -f2- || true)}"
REPO="${REPO:-timposulabs/production-app}"
CURRENT="$(cat .deployed_tag 2>/dev/null || true)"
TIMEOUT="${DEPLOY_TIMEOUT:-90}"

[ -f secrets/db_password.txt ] || { echo "Buat dulu secrets/db_password.txt (lihat README)" >&2; exit 1; }
export IMAGE_REPO="$REPO"

# 1. Pastikan image tersedia: pakai yang lokal, kalau tidak ada tarik dari registry.
#    Jika gagal, skrip berhenti di sini dan aplikasi yang sedang berjalan TIDAK disentuh.
if ! docker image inspect "$REPO:$TAG" >/dev/null 2>&1; then
  echo "Menarik $REPO:$TAG ..."
  IMAGE_TAG="$TAG" docker compose pull app
fi

# 2. Backup jika database sudah berjalan
if [ -n "$(docker compose ps --status running -q postgres 2>/dev/null)" ]; then
  ./scripts/backup.sh
fi

# 3. Jalankan versi baru
echo "Deploy $REPO:$TAG (sebelumnya: ${CURRENT:-tidak ada})"
IMAGE_TAG="$TAG" docker compose up -d

# 4. Tunggu sampai sehat
for ((i = 0; i < TIMEOUT; i += 3)); do
  STATUS="$(IMAGE_TAG="$TAG" docker compose ps app --format '{{.Health}}')"
  [ "$STATUS" = "healthy" ] && break
  sleep 3
done

if [ "${STATUS:-}" != "healthy" ]; then
  echo "GAGAL: app tidak sehat dalam ${TIMEOUT}s. Log terakhir:" >&2
  IMAGE_TAG="$TAG" docker compose logs --tail 20 app >&2 || true
  if [ -n "$CURRENT" ] && [ "$CURRENT" != "$TAG" ]; then
    echo "Rollback otomatis ke $CURRENT ..." >&2
    IMAGE_TAG="$CURRENT" docker compose up -d
  fi
  exit 1
fi

[ -n "$CURRENT" ] && [ "$CURRENT" != "$TAG" ] && echo "$CURRENT" > .previous_tag
echo "$TAG" > .deployed_tag
echo "Berhasil: $REPO:$TAG berjalan dan sehat."
