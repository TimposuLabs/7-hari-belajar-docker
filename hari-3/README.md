# Hari 3 — Manajemen Data dengan Volume

Bab buku: `04_day_3_Manajemen_Data_dengan_Volume.md`

| Direktori | Isi | Image Docker Hub |
|---|---|---|
| `node-volume-demo/` | Express + PostgreSQL (`Dockerfile` produksi, `Dockerfile.dev` untuk bind mount) | `timposulabs/node-volume-demo:1.0` |
| `python-volume-demo/` | Flask + SQLAlchemy + PostgreSQL (multi-stage) | `timposulabs/python-volume-demo:1.0` |
| `spring-volume-demo/` | Spring Boot + JPA + PostgreSQL | `timposulabs/spring-volume-demo:1.0` |
| `dev-node-app/`, `dev-python-app/` | contoh live-reload dengan bind mount | — (hanya `Dockerfile.dev`) |

## Prasyarat
Docker Engine. Password tidak ada di kode: aplikasi membaca `DB_PASSWORD` dari environment dan **gagal start** jika kosong.

## Menjalankan (contoh Node)
```bash
export DB_PASSWORD='ganti-dengan-password-latihanmu'      # terminal yang sama dipakai untuk semua perintah

docker network create demo-net
docker volume create pg-data
docker run -d --name postgres-db --network demo-net \
  --mount type=volume,source=pg-data,target=/var/lib/postgresql/data \
  -e POSTGRES_DB=toko -e POSTGRES_USER=admin -e POSTGRES_PASSWORD="$DB_PASSWORD" \
  -e PGDATA=/var/lib/postgresql/data/pgdata \
  postgres:17-alpine

# dari hari-3/node-volume-demo
docker build -t node-volume-demo:1.0 .
docker run -d --name node-api --network demo-net -p 127.0.0.1:3000:3000 \
  -e DB_HOST=postgres-db -e DB_NAME=toko -e DB_USER=admin -e DB_PASSWORD="$DB_PASSWORD" \
  node-volume-demo:1.0
```
Verifikasi: `docker ps` (tunggu `(healthy)`), `curl http://localhost:3000/api/products`. Uji persistensi: `docker rm -f node-api postgres-db`, jalankan lagi dengan volume `pg-data` yang sama, data tetap ada.

Python (`python-volume-demo`): port `5000`, `DB_NAME` database yang sudah ada. Spring (`spring-volume-demo`): port `8080`, endpoint `/api/products` dan `/actuator/health` (tunggu ±30 detik).

Port PostgreSQL tidak dipublikasikan di contoh ini. Jika perlu mengaksesnya dari host, gunakan `-p 127.0.0.1:5432:5432`.

## Catatan
- Versi dasar: Node 24, Python 3.13, Spring Boot 3.5.16 (Java 17), PostgreSQL 17 pada contoh di atas (bab memakai 15/16 untuk demo versi).
- `node-volume-demo` dan `python-volume-demo` memakai `postgresql+psycopg2://`; driver ditulis eksplisit karena SQLAlchemy versi baru mengganti driver bawaan.
- Image berjalan non-root dan memiliki HEALTHCHECK; Trivy (30-10-2026): Node 0, Python 0 yang bisa diperbaiki, Spring 2 (perbaikan hanya di versi mayor).
- Hanya platform `linux/amd64`.

## Membersihkan
```bash
docker rm -f node-api postgres-db
docker network rm demo-net
docker volume rm pg-data          # menghapus data
```
