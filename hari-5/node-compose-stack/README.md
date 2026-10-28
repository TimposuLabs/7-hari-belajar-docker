# Hari 5 — Docker Compose: Nginx + Express API + PostgreSQL

## Tujuan pembelajaran
- Menggantikan belasan perintah `docker run` Hari 4 dengan **satu file** `docker-compose.yml`.
- Komunikasi antar service lewat **nama service** (`postgres`, `api`).
- Konfigurasi dari `.env` tanpa menyimpan secret di Git.
- `healthcheck` + `depends_on: condition: service_healthy` menggantikan `sleep`.
- Mengelola siklus hidup: `up`, `ps`, `logs`, `exec`, `down`, rebuild.

## Prasyarat
Docker Engine dengan plugin Compose v2 (`docker compose version`). Perintah `docker-compose` (dengan tanda hubung) adalah versi lama dan tidak dipakai di sini. `curl`, `jq` (opsional).

## Struktur
```text
node-compose-stack/
├── docker-compose.yml     definisi 3 service, 2 network, 1 volume
├── .env.example           template variabel (salin menjadi .env)
├── nginx/default.conf     reverse proxy ke service "api"
└── api/                   aplikasi Express (salinan mandiri dari Hari 4)
    ├── Dockerfile  .dockerignore  package.json  package-lock.json
    └── src/ (server.js, db.js, routes/products.js)
```

## Membaca `docker-compose.yml`
YAML memakai **spasi** (bukan Tab); anak sebuah kunci menjorok 2 spasi. Satu spasi salah = error.

| Bagian | Fungsi |
|---|---|
| `name:` | awalan nama container/network/volume (`node-compose-stack-api-1`) |
| `services:` | daftar container; nama service (`api`) otomatis menjadi hostname di network |
| `image:` / `build:` | pakai image jadi / bangun dari Dockerfile di folder tersebut |
| `ports: "127.0.0.1:8080:80"` | HOST:CONTAINER; hanya `nginx` yang dipublikasikan, dan hanya ke komputer ini |
| `environment:` | variabel untuk container; `${VAR:?pesan}` = wajib diisi di `.env`, kalau kosong Compose berhenti dengan pesan jelas |
| `volumes:` | `pg-data:/var/lib/postgresql/data` = named volume agar data bertahan; `./nginx/default.conf:...:ro` = bind mount hanya-baca |
| `networks:` | `frontend-net` (publik) dan `backend-net` (`internal: true`: tanpa akses keluar) |
| `healthcheck:` | perintah yang menentukan service "sehat" |
| `depends_on ... service_healthy` | urutan start berdasarkan kesehatan, bukan sekadar "sudah start" |
| `restart: unless-stopped` | hidup lagi setelah reboot/crash, kecuali dihentikan manual |
| `$${POSTGRES_USER}` | `$$` = tanda `$` literal, agar dibaca di dalam container, bukan oleh Compose |

## Menjalankan (dari direktori `hari-5/node-compose-stack`)
```bash
cp .env.example .env            # edit .env dan ganti POSTGRES_PASSWORD
docker compose config           # validasi + tampilkan hasil interpolasi (perhatikan: menampilkan password)
docker compose up -d --build    # build + jalankan semua service di background
docker compose ps               # tunggu api & postgres: (healthy)
```

## Verifikasi
```bash
curl -s http://localhost:8080/                      # {"gateway":"nginx","status":"ok",...}
curl -s http://localhost:8080/health                # status ok, database connected
curl -s http://localhost:8080/api/products | jq .total      # 5
curl -s -X POST http://localhost:8080/api/products -H "Content-Type: application/json" \
  -d '{"nama":"Webcam 4K","harga":950000,"stok":12}'
docker compose exec postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT id,nama FROM products;"'
curl -m 3 http://localhost:3000/health              # gagal: API tidak dipublikasikan
```
Perintah `psql` berjalan **di dalam container** `postgres`; tanda kutip tunggal mencegah shell host mengisi `$POSTGRES_USER`.

## Siklus hidup
```bash
docker compose logs -f api       # ikuti log satu service (Ctrl+C untuk berhenti melihat)
docker compose stop              # hentikan, container & data tetap ada
docker compose start             # nyalakan lagi
docker compose down              # hapus container + network, VOLUME TETAP ADA (data aman)
docker compose up -d --build api # build ulang & ganti hanya service api
docker compose down -v           # hapus juga volume = data database HILANG
```

## Kesalahan umum
| Gejala | Penyebab | Solusi |
|---|---|---|
| `required variable ... is missing a value` | file `.env` belum dibuat / kosong | `cp .env.example .env`, lalu isi nilainya |
| `port is already allocated` / `address already in use` | port host dipakai proses lain | ubah `HTTP_PORT` di `.env` |
| service `unhealthy` | aplikasi gagal start | `docker compose logs api` |
| perubahan kode tidak terlihat | image lama masih dipakai | `docker compose up -d --build` |
| password baru tidak berlaku | volume database lama menyimpan password lama | `docker compose down -v` (MENGHAPUS data) lalu `up` lagi |

## Membersihkan
`docker compose down -v` (hanya resource milik project `node-compose-stack`; tidak menyentuh resource lain).
