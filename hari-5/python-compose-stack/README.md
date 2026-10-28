# Hari 5 — Docker Compose: Nginx + Flask API + PostgreSQL

Struktur dan konsep sama dengan [`../node-compose-stack`](../node-compose-stack/README.md) (baca README itu untuk penjelasan field YAML). Perbedaan:

- `api/` adalah aplikasi **Flask + Gunicorn** (`app.py`) dengan driver `psycopg2`.
- Healthcheck memakai `python -c "import urllib.request..."` karena image `python:slim` tidak punya `wget`/`curl`.
- Aplikasi mencoba terhubung ke database sampai 15 kali; `advisory lock` mencegah dua worker Gunicorn mengisi data awal bersamaan.

## Tujuan
Menjalankan stack Python lengkap dengan satu perintah, memahami service-name DNS, healthcheck, dan volume.

## Prasyarat
Docker Engine + `docker compose`, `curl`, `jq` (opsional).

## Menjalankan (dari direktori `hari-5/python-compose-stack`)
```bash
cp .env.example .env            # ganti POSTGRES_PASSWORD
docker compose up -d --build
docker compose ps               # tunggu api & postgres: (healthy)
```

## Verifikasi
```bash
curl -s http://localhost:8080/health                  # {"database":"connected","status":"ok",...}
curl -s http://localhost:8080/api/products | jq .total   # 3
curl -s -X POST http://localhost:8080/api/products -H "Content-Type: application/json" \
  -d '{"nama":"Webcam","harga":950000}'
curl -s -X DELETE http://localhost:8080/api/products/4
docker compose logs api | head
```

## Kesalahan umum
| Gejala | Penyebab | Solusi |
|---|---|---|
| `required variable ... is missing a value` | file `.env` belum dibuat / kosong | `cp .env.example .env`, lalu isi nilainya |
| `port is already allocated` / `address already in use` | port host dipakai proses lain | ubah `HTTP_PORT` di `.env` |
| service `unhealthy` | aplikasi gagal start | `docker compose logs api` |
| perubahan kode tidak terlihat | image lama masih dipakai | `docker compose up -d --build` |
| password baru tidak berlaku | volume database lama menyimpan password lama | `docker compose down -v` (MENGHAPUS data) lalu `up` lagi |
| `api` unhealthy padahal log normal | healthcheck memanggil tool yang tak ada di image | pakai `python -c` (sudah dilakukan di file ini) |

## Membersihkan
`docker compose down -v`
