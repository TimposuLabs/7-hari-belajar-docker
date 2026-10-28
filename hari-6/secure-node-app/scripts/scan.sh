#!/usr/bin/env bash
# Lint Dockerfile (Hadolint) dan pindai image (Trivy) memakai container resmi.
# Tidak memasang tool di host dan TIDAK memerlukan akses ke /var/run/docker.sock:
# image diekspor dulu dengan `docker save`, lalu dipindai dari file tar.
# Pemakaian (dari direktori secure-node-app):  ./scripts/scan.sh secure-node-app:1.0.0
set -eu
IMAGE="${1:?pemakaian: $0 nama-image:tag}"
HADOLINT=hadolint/hadolint:v2.15.1
TRIVY=aquasec/trivy:0.76.1
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$HOME/.cache/trivy"

echo "== Hadolint: Dockerfile"
docker run --rm -i "$HADOLINT" < Dockerfile || echo "(catatan Hadolint di atas, jika ada, bersifat saran)"

echo
echo "== Trivy: kerentanan HIGH/CRITICAL dan secret pada $IMAGE"
docker save "$IMAGE" -o "$TMP/image.tar"
if docker run --rm \
  -v "$HOME/.cache/trivy:/root/.cache/" \
  -v "$TMP/image.tar:/image.tar:ro" \
  "$TRIVY" image --input /image.tar --severity HIGH,CRITICAL --scanners vuln,secret \
  --exit-code 1 --quiet > "$TMP/trivy.txt" 2>&1; then
  echo "Trivy: tidak ada temuan HIGH/CRITICAL dan tidak ada secret."
else
  cat "$TMP/trivy.txt"
  echo "Trivy: ADA temuan di atas. Perbarui base image/dependency lalu build ulang."
  exit 1
fi
