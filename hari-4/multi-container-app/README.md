# Hari 4 — Nginx + Node.js API + PostgreSQL (dua network)

## Tujuan pembelajaran
- Memisahkan lalu lintas ke **dua network**: `frontend-net` (publik) dan `backend-net` (privat).
- Menempatkan Nginx sebagai satu-satunya pintu masuk (reverse proxy); API dan database **tidak dipublikasikan** ke host.
- Memahami bahwa Nginx me-resolve nama upstream **saat start**, sehingga urutan perintah penting.

## Prasyarat
- Image `node-postgres-app:1.0.0` sudah dibuild (lihat `../node-postgres-app/README.md`, langkah build).
- Docker Engine, `curl`, `jq` (opsional).

## Struktur
```text
multi-container-app/
├── nginx-conf/default.conf   konfigurasi reverse proxy
└── .env.example
```
`default.conf` meneruskan `/api/*` dan `/health` ke `api-node:3000`; `/nginx-health` dijawab Nginx sendiri.
`default_type application/json;` membuat respons `return 200 '...'` bertipe JSON.

## Topologi
```text
host:8080 ─► nginx-proxy ──(backend-net)──► api-node ──► postgres-db
           (frontend-net + backend-net)    (backend-net)  (backend-net)
```

## Menjalankan (dari direktori `hari-4/multi-container-app`)
```bash
cp .env.example .env            # edit: ganti password
set -a; . ./.env; set +a        # memuat isi .env ke shell ini (agar bisa dipakai sebagai $POSTGRES_PASSWORD, dll.)

docker network create frontend-net
docker network create backend-net
docker volume create pg-multi-data

docker run -d --name postgres-db --network backend-net \
  --env-file .env -v pg-multi-data:/var/lib/postgresql/data postgres:17-alpine

# API: tanpa -p, hanya ada di backend-net
docker run -d --name api-node --network backend-net \
  -e DB_HOST=postgres-db -e DB_NAME="$POSTGRES_DB" \
  -e DB_USER="$POSTGRES_USER" -e DB_PASSWORD="$POSTGRES_PASSWORD" \
  node-postgres-app:1.0.0

# Nginx: BUAT dulu, sambungkan ke backend-net, baru START.
docker create --name nginx-proxy --network frontend-net \
  -p 127.0.0.1:8080:80 \
  -v "$PWD/nginx-conf/default.conf:/etc/nginx/conf.d/default.conf:ro" \
  nginx:1.28-alpine
docker network connect backend-net nginx-proxy
docker start nginx-proxy
```
**Kenapa tidak `docker run` lalu `network connect`?** Container Nginx langsung mencoba me-resolve `api-node` saat start. Jika ia baru ada di `frontend-net`, nama itu tidak ditemukan dan Nginx berhenti dengan `[emerg] host not found in upstream "api-node:3000"`. `docker create` + `network connect` + `docker start` memastikan kedua network sudah terpasang sebelum Nginx berjalan.
`$PWD` = direktori kerja saat ini; karena itu perintah harus dijalankan dari `hari-4/multi-container-app`.

## Verifikasi
```bash
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

curl -s http://localhost:8080/                       # {"message":"API Gateway aktif",...}
curl -s http://localhost:8080/api/products | jq .total   # 5
curl -s http://localhost:8080/nginx-health           # {"status":"ok","service":"nginx"}

# API tidak boleh bisa diakses langsung dari host (tidak ada -p):
curl -m 3 http://localhost:3000/api/products         # gagal: Connection refused / timeout

docker network inspect frontend-net --format '{{range .Containers}}{{.Name}} {{end}}'
# nginx-proxy
docker network inspect backend-net  --format '{{range .Containers}}{{.Name}} {{end}}'
# postgres-db nginx-proxy api-node   (urutan bisa berbeda)
```

## Kesalahan umum
| Gejala | Penyebab | Solusi |
|---|---|---|
| `nginx-proxy` berstatus `Exited (1)` | `[emerg] host not found in upstream` (lihat `docker logs nginx-proxy`) | pastikan `api-node` jalan dan ada di `backend-net`, sambungkan sebelum `docker start` |
| `502 Bad Gateway` | API belum siap / crash | `docker logs api-node` |
| `address already in use` pada 8080 | port terpakai | ganti `-p 127.0.0.1:8081:80` |

## Membersihkan
```bash
docker rm -f nginx-proxy api-node postgres-db
docker network rm frontend-net backend-net
docker volume rm pg-multi-data
```
