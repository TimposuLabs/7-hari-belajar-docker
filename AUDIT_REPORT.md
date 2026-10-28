# AUDIT REPORT — 7 Hari Belajar Docker

Tanggal audit: 2026-10-28
Cakupan: seluruh manuskrip (`buku-7-hari-docker/`) dan repository source (`7-hari-belajar-docker-src/`).

> **Catatan kejujuran cakupan.** Bab Hari 4 dibaca penuh. Bab Hari 5–7 dibaca pada bagian yang
> berisi perintah, Compose, Dockerfile, dan konfigurasi (bukan setiap baris). Pendahuluan, Hari 1–3,
> penutup, dan cheat sheet diaudit lewat pemindaian terarah (pencarian pola, versi image, referensi
> silang) dan pembacaan sebagian. Temuan di bab-bab tersebut **belum lengkap** dan bersifat audit-only.

## 1. Ringkasan eksekutif

- Struktur pembelajaran buku bagus dan konsisten. Masalah utama bukan pada alur, tetapi pada
  **ketepatan teknis beberapa perintah**, **versi image yang kedaluwarsa**, dan **tidak adanya source code
  Hari 4–7** di repository.
- Ditemukan beberapa bug yang **membuat contoh gagal jika diikuti persis** (lihat Critical/High), antara lain:
  Nginx gagal start pada urutan `docker run` Hari 4, klaim `resolver` Nginx yang tidak berlaku untuk blok
  `upstream`, publish port pada network `internal: true`, dan baris lanjutan `\` dengan komentar di Bash.
- Banyak password contoh ditanam sebagai nilai default di kode (`rahasia123`) dan perintah `docker run -e`.
- Beberapa versi sudah EOL: `node:18`, `mysql:8.0` (EOL April 2026), Spring Boot 3.2.x, `nginx:1.25`.
- Repository source: `hari-2/` dan `hari-3/` ada; `hari-1/`, `hari-4/`–`hari-7/` belum ada walau README
  utama mencantumkannya. README utama juga masih memuat URL placeholder dan struktur yang tidak sesuai.

## 2. Lingkungan yang diperiksa (fakta, bukan asumsi)

| Item | Hasil |
|---|---|
| Docker Engine | 29.9.2 (Linux, cgroup v2, systemd), bukan Docker Desktop |
| Compose | `docker compose` v5.6.1 (plugin v2+). Perintah legacy `docker-compose` tidak dipakai |
| Git / gh | git 2.43.0, gh 2.103.3, login GitHub `TopekoX` (scope `repo`, protokol SSH) |
| Docker Hub | Login sebagai `timposulabs` (kredensial tidak ditampilkan) |
| Runtime | Node 24, Python 3.12 di host. Go tidak ada (tidak diperlukan) |
| Tool keamanan | `docker scout`, `trivy`, `hadolint`, `dive` **tidak** terpasang di host; akan dijalankan via container resmi bila memungkinkan |
| Repo source | `origin` = `https://github.com/TimposuLabs/7-hari-belajar-docker.git`, branch `main`, working tree bersih saat audit dimulai |
| Repo buku | `origin` = `https://github.com/TopekoX/buku-7-hari-docker.git` (repository **berbeda** dari source), working tree bersih |
| Docker Hub existing | `springboot-hello`, `springboot-crud-demo`, `demo-crud-express`, `docker-python-app`, `docker-spring-app`, `docker-node-app` (tag `1.0` / `v1.x`) |

Resource Docker yang sudah ada sebelum pekerjaan (tidak boleh disentuh): image `postgres:17-alpine`,
`redis:6`, `redis:latest`; volume `bdi-volume` dan dua volume anonim; tanpa container.

## 3. Inventaris bab

| Berkas | Topik | Baris |
|---|---|---|
| `01_pengenalan_docker.md` | Konsep container, VM vs container, instalasi | 438 |
| `02_day_1_...` | Image & container dasar | 488 |
| `03_day_2_...` | Dockerfile (Node, Python, Spring) | 1725 |
| `04_day_3_...` | Volume, bind mount, dev workflow | 2612 |
| `05_day_4_...` | Networking, port mapping, 3 stack, Nginx, load balancing manual | 2362 |
| `06_day_5_...` | Compose, healthcheck, 3 stack, override, scale, LB | 2623 |
| `07_day_6_...` | Keamanan, secret, scanning, read-only, logging, hardening | 2045 |
| `08_day_7_...` | Registry, VPS, HTTPS, CI/CD, zero-downtime, monitoring | 1955 |
| `09_penutup.md`, `10_bonus_cheat_sheet.md` | Penutup, cheat sheet | 458 / 188 |

Source existing: `hari-2/` (3 aplikasi), `hari-3/` (5 aplikasi). Tidak ada README per proyek.

## 4. Temuan teknis

Tingkat: **Critical** (contoh gagal / berisiko keamanan nyata), **High**, **Medium**, **Low**.

### Critical

| ID | Lokasi | Temuan | Perbaikan |
|---|---|---|---|
| C1 | Hari 4, "Deploy seluruh arsitektur" | Nginx dijalankan hanya di `frontend-net` lalu `network connect backend-net` **setelah** start. Nginx me-resolve `api-node` saat start, sehingga **gagal start** (`[emerg] host not found in upstream`). **Terbukti**: container keluar dengan exit code 1. | Jalankan Nginx dengan `docker create` + connect kedua network sebelum `docker start`, atau mulai di `backend-net` lalu connect `frontend-net`. Diverifikasi di `hari-4/multi-container-app`. |
| C2 | Hari 4 (LB) & Hari 5 (`resolver 127.0.0.11 valid=10s`) | Klaim bahwa `resolver` me-refresh IP `server api:3000` di blok `upstream` **salah** pada Nginx open source: DNS di-resolve sekali saat start. Setelah `--scale api=3` Nginx tetap hanya melihat IP lama. | Gunakan variabel pada `proxy_pass` (`set $api http://api:3000; proxy_pass $api;`) bersama `resolver`, atau reload Nginx setelah scale. **Terbukti**: setelah scale 1→3, semua 9 request tetap dijawab 1 container; dengan variabel + `resolver`, ketiga container menjawab. Diuji di `hari-5/lb-demo`. |
| C3 | Hari 7, compose produksi | `backend-net` bersifat `internal: true` **dan** `ports: 127.0.0.1:3000:3000`. Port tidak dipublikasikan untuk container yang hanya ada di network internal, sehingga Nginx host tidak dapat mencapai API. | Tambahkan network non-internal untuk service yang perlu published port, atau letakkan Nginx dalam Compose. Diuji di `hari-7/`. |
| C4 | Hari 6, `docker run --tmpfs /tmp \   # komentar` | Komentar setelah `\` merusak line-continuation Bash; perintah terpotong dan baris berikutnya dijalankan sebagai perintah terpisah. | Pindahkan komentar ke baris sendiri di atas perintah. |

### High

| ID | Lokasi | Temuan | Perbaikan |
|---|---|---|---|
| H1 | Hari 4 Spring `application.properties` | `.../ ${DB_NAME:toko}?...` ada **spasi** pada JDBC URL, koneksi gagal. | Hapus spasi. |
| H2 | Hari 4/5 Node | `COPY package.json ./` + `npm install` (tanpa lockfile) → build tidak reproducible; `.gitignore` repo juga **mengabaikan** `package-lock.json`. Dockerfile Hari 3 memakai `npm ci` + `package-lock.json`, tetapi lockfile tidak ada di Git → **build dari clone bersih gagal** (`hari-3/node-volume-demo`, read-only, hanya dilaporkan). | Commit `package-lock.json` untuk proyek baru dan tambahkan pengecualian di `.gitignore`. |
| H3 | Banyak lokasi | Password contoh (`rahasia123`, `root123`) ditanam sebagai **nilai default di kode** (`db.js`, `application.properties`) dan di perintah `docker run -e`. Pembaca terbiasa menyalin pola ini ke produksi. | Tanpa default password di kode; gunakan `--env-file`/`.env` (di-ignore Git) + `.env.example`. |
| H4 | Hari 4 | Aplikasi tidak menunggu database siap; solusi `sleep 5/30` rapuh. Spring Hikari `initialization-fail-timeout=60000` baru disebutkan tanpa penjelasan. | Retry koneksi di aplikasi + `docker exec ... pg_isready` / healthcheck; jelaskan tujuan. |
| H5 | Hari 6, Trivy via Docker | Alias memakai cache macOS `$HOME/Library/Caches` dan mount `/var/run/docker.sock` (memberi akses penuh ke daemon). Tidak valid di Linux dan kurang aman. | Pindai tarball `docker save` (tanpa socket) dengan cache `~/.cache/trivy`. |
| H6 | Hari 6, "Kesalahan 2: ARG" | Contoh `ARG` lalu `ENV X=${ARG}` **menyimpan nilai di image final** (terlihat di `docker inspect`), tetapi teks menyatakan "tidak tersimpan di final image". | Koreksi penjelasan; tunjukkan `docker history` / `inspect`. |
| H7 | Hari 7 | Backup `docker compose exec postgres pg_dump -U ${POSTGRES_USER} ...`: variabel dievaluasi di **shell host** (kosong). `docker compose run --rm api node src/migrate.js` merujuk berkas yang tidak ada. | Gunakan `sh -c '... "$POSTGRES_USER"'` di dalam container; tandai migrasi sebagai contoh. |
| H9 | Hari 3 (read-only) | `hari-3/node-volume-demo/Dockerfile` memakai `npm ci` + `package-lock.json`, tetapi lockfile tidak ada di Git. **Terbukti**: `docker build` gagal `"/package-lock.json": not found`. | Tidak diubah (hari-3 dilindungi). Pemilik perlu menjalankan `npm install --package-lock-only` dan meng-commit lockfile. |
| H10 | Hari 4-5 | `{{.NetworkSettings.IPAddress}}` kosong pada Docker 29 (field lama dihapus); gunakan `{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}`. Healthcheck `wget` disalin ke image `python:slim` yang tidak punya `wget`, sehingga service tidak pernah `healthy`. **Terbukti** saat menguji `python-compose-stack`. | Diperbaiki di source; dicatat di bab. |
| H8 | Hari 7 | Alur utama (VPS, domain, HTTPS, GitHub Actions) tidak dapat diverifikasi tanpa server; tidak ada contoh yang bisa dicoba pembaca secara lokal; registry yang dipakai GHCR, sedangkan image proyek ada di Docker Hub. | Tambahkan rehearsal produksi **lokal** + push/pull ke Docker Hub; bagian VPS ditandai tidak diuji di lingkungan ini. |

### Medium

| ID | Lokasi | Temuan |
|---|---|---|
| M1 | Hari 2–6 | Base image kedaluwarsa: `node:18*` (EOL), `python:3.11`, `mysql:8.0` (EOL), Spring Boot 3.2.3, `nginx:1.25`. Perlu diganti ke versi yang masih didukung dan diberi alasan. |
| M2 | Hari 4/5 | Nginx: `return 200 '...'; add_header Content-Type application/json;` → Content-Type menjadi `text/plain` karena `add_header` tidak mengganti tipe default. Gunakan `default_type application/json;`. |
| M3 | Hari 4/5 | Port host 80 dipakai tanpa catatan; sering bentrok. Gunakan 8080 yang dapat diubah (`HTTP_PORT`). |
| M4 | Hari 4 | `docker run` contoh memakai `$(pwd)` pada bind mount tanpa penjelasan direktori eksekusi dan `readonly` multi-baris yang rapuh. |
| M5 | Hari 4/5 | Output contoh (IP, container ID, `time`) bersifat rekaan, bahkan ada karakter heksadesimal tidak valid (`c5f4d3e9g6b7`). Beri label "contoh; nilai di komputermu akan berbeda". |
| M6 | Hari 4 | `docker network inspect ... \| grep postgres` kurang andal; gunakan `--format`. |
| M7 | Hari 4/5 | `python3 -m json.tool` dipakai untuk semua `curl`; bergantung Python di host. Perlu catatan prasyarat atau `jq`/tanpa pretty-print. |
| M8 | Hari 5 | `container_name` dipakai pada service yang kemudian di-scale; ditangani di bab LB, tetapi sebaiknya diperingatkan lebih awal. |
| M9 | Hari 5 | `deploy.resources.limits` pada Compose non-Swarm: berlaku di Compose v2, perlu dijelaskan; `mem_limit` sebagai alternatif. |
| M10 | Hari 6 | `docker scout` disebut "terbundel di Docker CLI"; pada Docker Engine biasa itu **plugin terpisah** (tidak terpasang di mesin ini). |
| M11 | Hari 6 | `git filter-branch` sudah tidak direkomendasikan; sebut `git filter-repo`/BFG dan tekankan: rotasi secret lebih dulu. |
| M12 | Hari 6/7 | Stack LB memakai `internal: true` untuk backend tetapi API butuh akses keluar (mis. update); jelaskan trade-off. |

### Low

- Banyak istilah (iptables, NAT, veth, CVE, SBOM, PID 1) muncul tanpa pengantar singkat.
- Perintah macOS (`brew`) dan Windows (`netstat -ano`) bercampur dengan Linux tanpa label host.
- README root: URL `github.com/username/...`, struktur `latihan/`, `mini-project/` yang tidak ada, menyebut Docker Desktop.
- `datetime.utcnow()` dipakai pada Flask (deprecated sejak Python 3.12).
- Pendahuluan menyebut Docker Desktop sebanyak 19 kali; bab lain berbasis Engine di Linux. Ada ketidakkonsistenan prasyarat (audit-only).

## 5. Perintah yang tidak valid / usang / tidak konsisten (ringkas)

- `docker-compose` (legacy) tidak ditemukan di bab Hari 4–7 (baik).
- `version:` pada Compose file tidak dipakai (baik).
- `docker scout` (butuh plugin), `trivy` (butuh instalasi) belum disertai prasyarat.
- `watch docker compose ps`: `watch` tidak ada di semua distro; beri alternatif.
- Port 80/443 di host: butuh catatan bahwa Docker yang mem-bind, bukan user.

## 6. Prasyarat, output, dan verifikasi yang belum ada

- Hari 4–7 jarang menyebut direktori kerja untuk tiap perintah → ditambahkan.
- Banyak langkah tanpa "cara memverifikasi" (hanya `sleep`). Ditambahkan `docker ps`, `pg_isready`, `curl` + hasil nyata.
- Cleanup memakai nama generik (`docker network prune`) yang dapat menghapus resource milik orang lain → diganti nama spesifik proyek.

## 7. Keamanan (ringkasan)

- Password default di kode & README (H3).
- Container berjalan sebagai root pada contoh Hari 4/5 (Dockerfile tanpa `USER`).
- Tidak ada `.env.example` + `.gitignore` yang disiplin pada beberapa contoh.
- Mount `docker.sock` untuk Trivy (H5).
- Port database tidak dipublish (baik) — dipertahankan.

## 8. Ketidaksesuaian manuskrip ↔ source

| Item | Manuskrip | Source |
|---|---|---|
| Hari 4–7 | Berisi ratusan baris kode | Tidak ada `hari-4`…`hari-7` |
| `hari-1/` | Dicantumkan di README root | Tidak ada |
| Struktur README | `latihan/`, `mini-project/` | Tidak ada |
| Hari 3 Node | `npm ci` + `package-lock.json` | Lockfile tidak di-commit (ter-ignore) |
| Versi Spring/Java | Boot 3.2.3, Java 17 | Hari 3 sama; proyek baru memakai Boot terbaru 3.5.x, Java 17 tetap |

## 9. Jalur dan referensi ambigu

- Hari 4 menyebut `lb-demo/` memiliki `docker-compose.prod.yml` (Hari 7) yang tidak didefinisikan di bab yang sama.
- Nama image tidak konsisten antar bab (`my-api`, `node-postgres-app`, `lb-node-api`, `ghcr.io/YOUR_USERNAME/...`).
- Kode Node yang sama muncul tiga kali dengan variasi kecil (`/init` vs inisialisasi saat startup).

## 10. Contoh source yang hilang

Hari 4: `node-postgres-app`, `flask-redis-app`, `spring-mysql-app`, `multi-container-app`, `lb-demo`.
Hari 5: `node-compose-stack`, `python-compose-stack`, `spring-compose-stack`, `lb-demo` (Compose + scale).
Hari 6: Dockerfile/Compose hardened + skrip audit.
Hari 7: Dockerfile produksi, Compose produksi, skrip deploy/rollback.

## 11. Rekomendasi per prioritas

1. **Critical**: perbaiki C1–C4 dengan contoh teruji.
2. **High**: hilangkan password default, tambahkan lockfile, ganti Trivy via socket, koreksi klaim ARG, perbaiki backup Postgres.
3. **Medium**: perbarui versi base image, perbaiki Nginx `default_type`, port host yang dapat diatur, label output.
4. **Low**: istilah, label host, README root.

## 12. Rencana implementasi Hari 4–7

Prinsip: satu aplikasi kecil dipakai berulang (Node + PostgreSQL) agar fokus pada Docker, bukan pada aplikasi;
Flask+Redis dan Spring+MySQL tetap ada sesuai bab. Tidak ada framework baru.

| Hari | Direktori | Isi | Image Docker Hub (rencana) |
|---|---|---|---|
| 4 | `hari-4/node-postgres-app` | Express + PostgreSQL di custom network | `timposulabs/node-postgres-app` |
| 4 | `hari-4/flask-redis-app` | Flask + Redis cache | `timposulabs/flask-redis-app` |
| 4 | `hari-4/spring-mysql-app` | Spring Boot + MySQL | `timposulabs/spring-mysql-app` |
| 4 | `hari-4/multi-container-app` | Nginx + API + PostgreSQL, dua network (skrip) | (memakai image Node) |
| 4 | `hari-4/lb-demo` | 3 instance API + Nginx (skrip) | (memakai image `node-postgres-app`) |
| 5 | `hari-5/node-compose-stack` | Compose: Nginx + API + PostgreSQL | (memakai image Node) |
| 5 | `hari-5/python-compose-stack` | Compose: Flask + PostgreSQL + Nginx | — |
| 5 | `hari-5/spring-compose-stack` | Compose: Spring + MySQL + Adminer | — |
| 5 | `hari-5/lb-demo` | Compose `--scale` + Nginx dinamis | — |
| 6 | `hari-6/secure-node-app` | Dockerfile hardened, non-root, read-only, cap_drop, secret via env file, skrip audit | `timposulabs/secure-node-app` |
| 7 | `hari-7/production-app` | Dockerfile produksi, Compose produksi, rollback, tag semver, rehearsal lokal | `timposulabs/production-app` |

Publikasi: hanya image yang menjadi artefak utama bab, dengan tag semver eksplisit `1.0.0` (+ `latest`
untuk rilis stabil). Dev/intermediate image tidak dipublikasikan.

Batasan yang sudah diketahui sejak awal: bagian VPS/HTTPS/GitHub Actions di Hari 7 tidak dapat diuji di mesin
ini tanpa server dan otorisasi; akan ditandai **tidak diuji** dan tidak diklaim berhasil.
