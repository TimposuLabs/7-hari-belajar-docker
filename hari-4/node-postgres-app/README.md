# Hari 4 — Express API + PostgreSQL pada custom network

## Tujuan pembelajaran
- Menghubungkan dua container (API dan database) lewat **custom bridge network** memakai **nama container**.
- Membedakan **port publishing** (`-p`, untuk akses dari host) dan komunikasi internal (nama container, tanpa `-p`).
- Menyimpan data PostgreSQL pada **named volume**.
- Mengelola password lewat file `.env`, bukan dikode.

## Prasyarat
Docker Engine, `curl`. (Opsional: `jq` untuk merapikan JSON; tanpa `jq`, hapus bagian `| jq ...`.)

## Struktur
```text
node-postgres-app/
├── src/
│   ├── db.js              koneksi PostgreSQL, membuat tabel + data awal (dengan retry)
│   ├── routes/products.js endpoint CRUD /api/products
│   └── server.js          entry point, /health, /which, graceful shutdown
├── package.json / package-lock.json
├── Dockerfile             multi-stage, non-root (user node), HEALTHCHECK
├── .dockerignore
└── .env.example           template variabel (salin menjadi .env)
```

## Cara kerja singkat
- `db.js` membaca `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` dari environment. `DB_HOST` berisi **nama container database**.
- Saat start, aplikasi mencoba terhubung sampai 15 kali (jeda 2 detik) karena PostgreSQL butuh beberapa detik untuk siap. Tidak perlu `sleep` manual.
- `/health` memeriksa koneksi database sehingga status `healthy` Docker benar-benar berarti "API + DB siap".

## Menjalankan (semua perintah dari direktori `hari-4/node-postgres-app`)
```bash
# 1. Siapkan variabel. Edit .env dan GANTI password sebelum lanjut.
cp .env.example .env

# 2. Build image
docker build -t node-postgres-app:1.0.0 .

# 3. Network dan volume
docker network create backend-net
docker volume create pg-data

# 4. Database. Tidak ada -p: database tidak bisa diakses dari luar Docker.
docker run -d --name postgres-db --network backend-net \
  --env-file .env \
  -v pg-data:/var/lib/postgresql/data \
  postgres:17-alpine

# 5. API. -p 127.0.0.1:3000:3000 = hanya bisa diakses dari komputer ini.
#    Isi nilai di bawah SAMA dengan isi .env milikmu.
docker run -d --name api-node --network backend-net \
  -p 127.0.0.1:3000:3000 \
  -e DB_HOST=postgres-db -e DB_NAME=toko -e DB_USER=admin \
  -e DB_PASSWORD=ISI_PASSWORD_DARI_.env \
  node-postgres-app:1.0.0
```
`--env-file .env` meneruskan `POSTGRES_DB/USER/PASSWORD` ke PostgreSQL (nama variabel ini yang dipahami image `postgres`).
Image `postgres` hanya membuat database dan user pada **inisialisasi pertama** volume; mengganti `.env` kemudian tidak mengubah password lama (hapus volume jika ingin mengulang).

## Verifikasi
```bash
docker ps --format 'table {{.Names}}\t{{.Status}}'      # tunggu api-node: Up ... (healthy)
curl -s http://localhost:3000/health
curl -s http://localhost:3000/api/products | jq '.total'   # → 5
curl -s -X POST http://localhost:3000/api/products -H "Content-Type: application/json" \
  -d '{"nama":"Webcam HD","harga":650000,"stok":20}'
curl -s -X PUT  http://localhost:3000/api/products/1 -H "Content-Type: application/json" -d '{"stok":5}'
curl -s -X DELETE http://localhost:3000/api/products/6

# Bukti DNS internal bekerja (perintah di dalam container api-node):
docker exec api-node nslookup postgres-db
docker network inspect backend-net --format '{{range .Containers}}{{.Name}}: {{.IPv4Address}}{{"\n"}}{{end}}'
docker exec postgres-db pg_isready -U admin -d toko     # → accepting connections
```
Output yang diharapkan: `/health` → `"status":"ok","database":"connected"`; `docker port api-node` → `3000/tcp -> 127.0.0.1:3000`.

### Uji persistensi
```bash
docker rm -f api-node postgres-db             # hapus container, volume tetap ada
# jalankan ulang langkah 4 dan 5 → data (termasuk stok yang kamu ubah) masih ada
```

## Kesalahan umum
| Gejala | Penyebab | Solusi |
|---|---|---|
| `[DB] Belum siap (percobaan n/15)` di log | PostgreSQL masih start | normal; tunggu beberapa detik |
| `password authentication failed` | password `-e DB_PASSWORD` ≠ `.env`, atau volume lama dibuat dengan password lain | samakan, atau `docker volume rm pg-data` lalu ulangi |
| `bind: address already in use` | port 3000 dipakai proses lain | ganti `-p 127.0.0.1:3001:3000` |
| `curl: (7) Failed to connect` | container belum healthy / crash | `docker logs api-node` |
| `getaddrinfo ENOTFOUND postgres-db` | container tidak di network yang sama | `docker network inspect backend-net` |

## Membersihkan
```bash
docker rm -f api-node postgres-db
docker network rm backend-net
docker volume rm pg-data          # MENGHAPUS data database. Lewati jika ingin menyimpannya.
```
