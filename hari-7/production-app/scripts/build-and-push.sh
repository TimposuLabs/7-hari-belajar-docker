#!/usr/bin/env bash
# Build image produksi dengan tag versi + tag commit. Push HANYA jika diberi --push.
# Pemakaian (dari direktori production-app):
#   ./scripts/build-and-push.sh 1.0.0            # hanya build lokal
#   ./scripts/build-and-push.sh 1.0.0 --push     # build lalu push (butuh `docker login`)
set -euo pipefail
cd "$(dirname "$0")/.."

VERSION="${1:?pemakaian: $0 VERSI [--push]   contoh: $0 1.0.0 --push}"
PUSH="${2:-}"
REPO="${IMAGE_REPO:-timposulabs/production-app}"
SHA="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"

echo "Build $REPO:$VERSION (git $SHA)"
docker build \
  --build-arg VERSION="$VERSION" \
  --build-arg GIT_SHA="$SHA" \
  -t "$REPO:$VERSION" \
  -t "$REPO:$VERSION-sha-$SHA" \
  ./app

if [ "$PUSH" = "--push" ]; then
  docker push "$REPO:$VERSION"
  docker push "$REPO:$VERSION-sha-$SHA"
  echo "Terkirim: $REPO:$VERSION dan $REPO:$VERSION-sha-$SHA"
  echo "Tag 'latest' TIDAK diubah otomatis. Beri tag dan push manual hanya untuk rilis stabil:"
  echo "  docker tag $REPO:$VERSION $REPO:latest && docker push $REPO:latest"
else
  echo "Selesai (belum di-push). Tambahkan --push untuk mengirim ke registry."
fi
