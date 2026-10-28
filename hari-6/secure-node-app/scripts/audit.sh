#!/usr/bin/env bash
# Audit sederhana sebuah image. Pemakaian:  ./scripts/audit.sh nama-image:tag
# Hanya MEMBACA image; tidak mengubah apa pun.
set -u
IMAGE="${1:?pemakaian: $0 nama-image:tag}"
FAIL=0
check() { # check "deskripsi" kondisi(0=lulus)
  if [ "$2" -eq 0 ]; then echo "  PASS  $1"; else echo "  FAIL  $1"; FAIL=1; fi
}

echo "Audit image: $IMAGE"

USER_CFG=$(docker inspect --format '{{.Config.User}}' "$IMAGE")
[ -n "$USER_CFG" ] && [ "$USER_CFG" != "root" ] && [ "$USER_CFG" != "0" ]
check "image dikonfigurasi dengan USER non-root (USER='$USER_CFG')" $?

docker inspect --format '{{json .Config.Env}}' "$IMAGE" | grep -qiE 'PASS|SECRET|TOKEN|API_?KEY'
[ $? -ne 0 ]
check "tidak ada variabel bernama PASS/SECRET/TOKEN/KEY di ENV image" $?

docker history --no-trunc --format '{{.CreatedBy}}' "$IMAGE" | grep -qiE 'PASSWORD=|SECRET=|TOKEN=|API_?KEY='
[ $? -ne 0 ]
check "tidak ada kredensial pada riwayat build (docker history)" $?

HC=$(docker inspect --format '{{if .Config.Healthcheck}}ada{{end}}' "$IMAGE")
[ "$HC" = "ada" ]
check "HEALTHCHECK terdefinisi" $?

echo
[ $FAIL -eq 0 ] && echo "Hasil: LULUS" || echo "Hasil: ADA YANG GAGAL"
exit $FAIL
