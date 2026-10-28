#!/usr/bin/env bash
# Backup database ke backups/backup-YYYYmmdd-HHMMSS.sql
# Perintah pg_dump berjalan DI DALAM container postgres; $POSTGRES_USER/$POSTGRES_DB
# dibaca dari environment container itu (bukan dari shell host).
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p backups
FILE="backups/backup-$(date +%Y%m%d-%H%M%S).sql"
docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > "$FILE"
[ -s "$FILE" ] || { echo "Backup kosong!" >&2; rm -f "$FILE"; exit 1; }
echo "Backup selesai: $FILE ($(wc -c < "$FILE") byte)"
