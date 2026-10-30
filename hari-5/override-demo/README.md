# Hari 5 — Override file dan multi-environment (`override-demo`)

## Tujuan pembelajaran
- Memisahkan konfigurasi **development** dan **production** tanpa menduplikasi seluruh file Compose.
- Memahami penggabungan otomatis `docker-compose.override.yml` dan penggabungan eksplisit dengan `-f`.
- Melihat hasil gabungan dengan `docker compose config`.

## Prasyarat
Docker Engine + `docker compose`, `curl`, `jq`.

## Struktur
```text
override-demo/
├── docker-compose.yml            BASE: api + postgres (sama untuk semua environment)
├── docker-compose.override.yml   DEV: dibaca otomatis (Dockerfile.dev, port debug, bind mount, port DB)
├── docker-compose.prod.yml       PROD: nginx, batas resource, restart, rotasi log (dipanggil dengan -f)
├── api/ (Dockerfile, Dockerfile.dev, src/, package*.json)
├── nginx/default.conf
└── .env.example
```

## Cara kerja
- `docker compose up -d` → menggabungkan **base + override** (nama `docker-compose.override.yml` otomatis dibaca).
- `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d` → **base + prod**; file override **tidak** ikut karena `-f` dipakai.
- Aturan merge: nilai tunggal (mis. `restart`, `command`) ditimpa file berikutnya; map (`environment`) digabung; daftar (`ports`, `volumes`) ditambahkan.

## Menjalankan (dari direktori `hari-5/override-demo`)
```bash
cp .env.example .env            # ganti POSTGRES_PASSWORD

# Development
docker compose config | grep -E "dockerfile|published"       # lihat hasil merge
docker compose up -d --build
curl -s http://localhost:3000/health                          # API langsung (port dev dibuka)
docker compose down

# Production
docker compose -f docker-compose.yml -f docker-compose.prod.yml config
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
curl -s http://localhost:8080/health                          # lewat Nginx
curl -m 3 http://localhost:3000/health                        # gagal: API tidak dipublikasikan
```

## Verifikasi (hasil pengujian)
```bash
P="-f docker-compose.yml -f docker-compose.prod.yml"
docker inspect override-demo-api-1 --format 'mem={{.HostConfig.Memory}} nanocpus={{.HostConfig.NanoCpus}} restart={{.HostConfig.RestartPolicy.Name}}'
# mem=536870912 nanocpus=1000000000 restart=always
docker stats --no-stream $(docker compose $P ps -q)           # kolom LIMIT: 512MiB (api), 1GiB (postgres)
```
Catatan: pada mode development, kode di `api/src` tampil di container lewat bind mount, tetapi `node` tidak memuat ulang otomatis; jalankan `docker compose restart api` setelah mengubah kode (atau pakai `nodemon`).

## Scaling dan port
- Service dengan `ports: "127.0.0.1:3000:3000"` **tidak bisa** di-scale (`Bind for ... failed: port is already allocated`, terbukti).
- `ports: - "80"` (hanya port container) memberi port host acak per instance (terbukti: 32768, 32769).
- `reservations.cpus` pada `deploy.resources` **tidak** diterapkan oleh Docker biasa; `limits` (cpus, memory) dan `reservations.memory` diterapkan.

## Kesalahan umum
| Gejala | Penyebab | Solusi |
|---|---|---|
| Override tidak terbaca | nama file salah atau memakai `-f` | namanya harus `docker-compose.override.yml` dan jangan pakai `-f` saat dev |
| Berkas override tidak ikut Git | `.gitignore` repo ini mengabaikan `docker-compose.override.yml` | sudah ada pengecualian untuk folder ini |
| `required variable ... is missing` | `.env` belum dibuat | `cp .env.example .env` |

## Membersihkan
```bash
docker compose down -v
docker compose -f docker-compose.yml -f docker-compose.prod.yml down -v
```
