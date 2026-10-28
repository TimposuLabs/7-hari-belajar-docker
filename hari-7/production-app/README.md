# Hari 7 — Deployment ke Production: `production-app`

Contoh deployment yang bisa dicoba **di komputer sendiri** (tanpa server, domain, atau layanan berbayar), dengan langkah yang sama seperti di VPS: image dibuat dan diberi versi, dikirim ke registry (Docker Hub), lalu ditarik dan dijalankan memakai Docker Compose.

## Tujuan pembelajaran
- Membuat image produksi dengan **versi tercatat** (label OCI + `/version`).
- **Tagging**: versi semantik (`1.0.0`) dan versi+commit (`1.0.0-sha-<commit>`); `latest` hanya untuk rilis stabil yang disengaja.
- Konfigurasi lewat **environment variable** dan **secret via file**.
- **Health check**, **log JSON**, batas sumber daya, dan hardening (Hari 6) pada Compose produksi.
- **Deploy**, **backup**, dan **rollback** dengan skrip yang sederhana dan bisa dibaca.

## Prasyarat
- Docker Engine + `docker compose`, `curl`, `jq` (opsional), `openssl`.
- Untuk **menarik** image publik dari Docker Hub: tidak perlu akun.
- Untuk **push** image milikmu sendiri: akun Docker Hub dan `docker login` (lihat bagian Push).

## Struktur
```text
production-app/
├── app/                      kode + Dockerfile produksi
│   ├── Dockerfile            multi-stage, non-root, ARG VERSION/GIT_SHA → label + ENV
│   ├── src/ (server.js, db.js, routes/products.js)
│   └── package.json  package-lock.json  .dockerignore
├── docker-compose.yml        API + PostgreSQL, image dari registry
├── .env.example              konfigurasi non-rahasia (IMAGE_REPO, IMAGE_TAG, DB, port)
├── secrets/db_password.txt.example
└── scripts/
    ├── build-and-push.sh     build (+ push dengan --push)
    ├── deploy.sh             backup → up -d → tunggu healthy → rollback otomatis jika gagal
    ├── rollback.sh           kembali ke versi sebelumnya
    └── backup.sh             pg_dump ke backups/
```

## Cara kerja
- **Dua network.** `edge-net` (biasa) agar port aplikasi dapat dipublikasikan dan aplikasi bisa keluar jika perlu; `data-net` dengan `internal: true` khusus untuk database, sehingga PostgreSQL tidak punya akses ke luar maupun sebaliknya. Network `internal` **tidak dapat** mempublikasikan port, karena itu aplikasi berada di keduanya.
- **Port** hanya diikat ke `127.0.0.1:3000`. Di server nyata, reverse proxy di host (Nginx/Caddy) meneruskan trafik HTTPS ke port ini; pengaturannya ada di bab (bagian VPS **tidak diuji** di proyek ini).
- **Secret**: password database ada di `secrets/db_password.txt`; aplikasi membaca lewat `DB_PASSWORD_FILE`, PostgreSQL lewat `POSTGRES_PASSWORD_FILE`. Tidak ada password di image, `.env`, atau Git.
- **Versi**: `docker build --build-arg VERSION=1.0.0 --build-arg GIT_SHA=<commit>` menyimpan versi di label image dan di `GET /version`.
- **Deploy** (`deploy.sh`): pakai image lokal bila ada (atau `pull`), backup jika DB berjalan, `up -d`, tunggu `healthy` (maks 90 dtk), jika gagal pulihkan tag sebelumnya.
  Jika `pull` gagal (tag tidak ada), skrip berhenti **sebelum** menyentuh aplikasi yang sedang berjalan.

## Menjalankan
### A. Memakai image publik (cara termudah)
```bash
git clone https://github.com/TimposuLabs/7-hari-belajar-docker.git
cd 7-hari-belajar-docker/hari-7/production-app

cp .env.example .env                              # boleh ubah POSTGRES_DB/USER, APP_PORT
openssl rand -hex 16 > secrets/db_password.txt    # password acak milikmu
chmod 644 secrets/db_password.txt                 # agar bisa dibaca user non-root di dalam container

./scripts/deploy.sh 1.0.0                         # menarik timposulabs/production-app:1.0.0 dan menjalankannya
```

### B. Build sendiri dari source
```bash
./scripts/build-and-push.sh 1.0.0                 # build lokal saja (tidak push)
./scripts/deploy.sh 1.0.0                         # image lokal dipakai, tidak ditarik
```
Jika kamu memakai akunmu sendiri: `export IMAGE_REPO=akunmu/production-app` sebelum menjalankan skrip.

## Verifikasi
```bash
docker compose ps                                  # app dan postgres: (healthy)
curl -s http://localhost:3000/health | jq .        # status ok, database connected
curl -s http://localhost:3000/version | jq .       # {"version":"1.0.0","gitSha":"…","node":"…"}
curl -s http://localhost:3000/api/products | jq .total
curl -s -X POST http://localhost:3000/api/products -H "Content-Type: application/json" \
  -d '{"nama":"Item","harga":1000}'

docker compose logs --tail 5 app                   # satu baris JSON per request
docker compose exec app sh -c 'touch /app/x'       # Read-only file system
docker inspect production-app-app-1 --format '{{.HostConfig.ReadonlyRootfs}} {{.HostConfig.CapDrop}}'
docker stats --no-stream --format 'table {{.Name}}\t{{.MemUsage}}\t{{.CPUPerc}}'
```
Cek isolasi database: tidak ada port PostgreSQL yang dipublikasikan (`docker compose ps` hanya menampilkan `5432/tcp` tanpa `->`).

## Update dan Rollback
```bash
./scripts/build-and-push.sh 1.0.1                  # versi baru
./scripts/deploy.sh 1.0.1                          # backup otomatis → deploy → tunggu healthy
curl -s http://localhost:3000/version              # 1.0.1

./scripts/rollback.sh                              # kembali ke 1.0.0
```
Data tetap ada karena database memakai named volume `production-app_pg-prod-data`. Rollback hanya mengganti **image aplikasi**; perubahan skema database tidak otomatis dibatalkan, jadi simpan backup (`backups/`) sebelum migrasi.

## Push ke Docker Hub (hanya untuk image milikmu)
```bash
docker login -u akunmu          # password/token diminta interaktif; JANGAN menulis token di skrip atau Git
export IMAGE_REPO=akunmu/production-app
./scripts/build-and-push.sh 1.0.0 --push
```
Tag `latest` tidak diubah otomatis; untuk rilis stabil: `docker tag … && docker push …:latest`.
Gunakan access token Docker Hub (Account Settings → Personal access tokens) dengan izin minimum, bukan password akun.

## Troubleshooting
| Gejala | Penyebab | Solusi |
|---|---|---|
| `Buat dulu secrets/db_password.txt` | belum dibuat | jalankan langkah `openssl rand …` |
| `pull access denied` / `not found` | tag/repo salah atau privat | cek `docker manifest inspect IMAGE:TAG`; `docker login` jika privat |
| Deploy berhenti `GAGAL: app tidak sehat` | aplikasi crash / DB tidak siap | baca log yang dicetak, atau `docker compose logs app` |
| `password authentication failed` | `db_password.txt` diganti setelah volume dibuat | password lama tersimpan di volume; kembalikan nilai lama atau hapus volume (menghapus data) |
| `permission denied` membaca `/run/secrets/…` | file secret tak terbaca user container | `chmod 644 secrets/db_password.txt` |
| Port 3000 terpakai | proses lain | ubah `APP_PORT` di `.env` |
| `required variable IMAGE_TAG` | menjalankan `docker compose` langsung tanpa tag | pakai `./scripts/deploy.sh TAG` atau `IMAGE_TAG=1.0.0 docker compose …` |

## Pertimbangan produksi (ringkas)
- **Sumber daya**: `mem_limit`, `cpus`, `pids_limit` dan rotasi log (`max-size`/`max-file`) sudah diatur; sesuaikan dengan beban nyata.
- **Keamanan**: non-root, filesystem read-only, tanpa capability, secret via file, database di network internal, port hanya ke localhost. Pindai image secara berkala (`../../hari-6/secure-node-app/scripts/scan.sh IMAGE:TAG`).
- **Tidak diuji di proyek ini**: provisioning VPS, UFW, domain/HTTPS (Certbot), dan GitHub Actions. Contoh konfigurasinya ada di bab sebagai referensi dan harus diuji di lingkungan milikmu.

## Membersihkan
```bash
docker compose down              # hentikan, DATA TETAP ADA
docker compose down -v           # hapus juga volume = data hilang
rm -rf backups .deployed_tag .previous_tag
```
