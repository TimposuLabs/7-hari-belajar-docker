# Hari 4 — Load balancing dengan Nginx (tiga container API)

## Tujuan pembelajaran
- Menjalankan beberapa instance dari image yang sama dan membaginya lewat Nginx (round-robin).
- Melihat container mana yang menjawab lewat endpoint `/which` dan header `X-Served-By`.
- Mengamati **failover**: Nginx melewati container yang mati.

## Prasyarat
Image `node-postgres-app:1.0.0` sudah ada (dibuild dari `../node-postgres-app`). Aplikasi API yang sama dipakai di sini; yang baru hanya Nginx.

## Struktur
```text
lb-demo/
├── nginx/nginx.conf   daftar upstream api-1, api-2, api-3 + log "upstream="
└── .env.example
```

## Menjalankan (dari direktori `hari-4/lb-demo`)
```bash
cp .env.example .env            # edit: ganti password; boleh ubah POSTGRES_DB menjadi toko_lb
set -a; . ./.env; set +a

docker network create lb-frontend-net
docker network create lb-backend-net
docker volume create pg-lb-data

docker run -d --name postgres-lb --network lb-backend-net \
  --env-file .env -v pg-lb-data:/var/lib/postgresql/data postgres:17-alpine

# Tiga instance dari image yang sama; nama berbeda; tanpa -p
for n in 1 2 3; do
  docker run -d --name api-$n --network lb-backend-net \
    -e DB_HOST=postgres-lb -e DB_NAME="$POSTGRES_DB" \
    -e DB_USER="$POSTGRES_USER" -e DB_PASSWORD="$POSTGRES_PASSWORD" \
    node-postgres-app:1.0.0
done

# Tunggu semua (healthy), lalu siapkan Nginx (create → connect → start)
docker ps --format 'table {{.Names}}\t{{.Status}}'
docker create --name nginx-lb --network lb-frontend-net -p 127.0.0.1:8080:80 \
  -v "$PWD/nginx/nginx.conf:/etc/nginx/nginx.conf:ro" nginx:1.28-alpine
docker network connect lb-backend-net nginx-lb
docker start nginx-lb
```
Urutan yang sama seperti `multi-container-app` dipakai karena Nginx me-resolve `api-1..3` saat start.

## Verifikasi
```bash
# 6 request: container berputar 1 → 2 → 3 → 1 → 2 → 3 (ID di komputermu berbeda)
for i in $(seq 1 6); do curl -s http://localhost:8080/which | jq -r .container; done

curl -sI http://localhost:8080/health | grep -i x-served-by
docker ps --format '{{.Names}} {{.ID}}' | grep api-        # cocokkan nama ↔ ID

# Failover: matikan satu instance
docker stop api-2
for i in $(seq 1 6); do curl -s -o /dev/null -w '%{http_code} ' http://localhost:8080/which; done; echo
# 200 200 200 200 200 200  → semua tetap berhasil; hanya api-1 dan api-3 menjawab
docker start api-2          # api-2 ikut melayani lagi setelah beberapa saat

docker logs nginx-lb | grep upstream= | tail -3    # IP upstream per request
```
Request pertama setelah `docker stop` bisa sedikit lebih lambat karena Nginx mencoba api-2 dulu lalu pindah ke server lain (`proxy_next_upstream`).

## Kesalahan umum
| Gejala | Penyebab | Solusi |
|---|---|---|
| `nginx-lb` Exited, `host not found in upstream "api-1:3000"` | api-1..3 belum ada / beda network | jalankan API dulu, sambungkan Nginx ke `lb-backend-net` sebelum `start` |
| `502` | API belum healthy | tunggu `(healthy)` |

## Membersihkan
```bash
docker rm -f nginx-lb api-1 api-2 api-3 postgres-lb
docker network rm lb-frontend-net lb-backend-net
docker volume rm pg-lb-data
```
