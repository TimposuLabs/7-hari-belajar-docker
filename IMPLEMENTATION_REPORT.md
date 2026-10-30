# IMPLEMENTATION REPORT — 7 Hari Belajar Docker (Hari 4–7)

Tanggal: 2026-10-28. Lingkungan: Linux, Docker Engine 29.9.2, Docker Compose v5.6.1 (plugin), git 2.43.0, gh 2.103.3.

Laporan ini mencatat apa yang **benar-benar dijalankan**. Status: **PASS** (dijalankan, hasil sesuai), **FAIL**, **NOT RUN** (tidak dijalankan).
Menguji contoh **tidak berarti seluruh buku sudah divalidasi**; lihat "Batasan".

## 1. Ringkasan audit

Detail lengkap di [`AUDIT_REPORT.md`](AUDIT_REPORT.md). Temuan yang **terbukti lewat percobaan** (bukan sekadar dugaan):

| ID | Temuan | Bukti |
|---|---|---|
| C1 | Hari 4: Nginx yang di-`run` hanya di `frontend-net` lalu `network connect` gagal start | container exit 1, `[emerg] host not found in upstream "api-node:3000"` |
| C2 | Hari 4/5: `resolver` tidak membuat `upstream { server api:3000; }` memantau instance baru | setelah scale 1→3, 9/9 request tetap ke 1 container; dengan variabel + `resolver` 3 container menjawab |
| H9 | `hari-3/node-volume-demo` tidak bisa dibuild dari clone bersih | `"/package-lock.json": not found` (lockfile ter-ignore `.gitignore`); **tidak diubah** karena `hari-3/` dilindungi |
| H10 | `.NetworkSettings.IPAddress` kosong di Docker 29; healthcheck `wget` pada `python:slim` tak pernah sehat | terlihat saat pengujian |
| C3, C4, H5–H7 | network `internal` + `ports`, komentar setelah `\`, Trivy+docker.sock/path macOS, klaim `ARG`, `pg_dump ${VAR}` di shell host | ditemukan lewat pembacaan; C3 dan pola `pg_dump` dibenahi di source/bab dan diuji pada `production-app` |

Cakupan pembacaan: Hari 4 dibaca penuh; Hari 5–7 pada bagian kode/konfigurasi; pendahuluan, Hari 1–3, penutup, cheat sheet hanya lewat pemindaian terarah.

## 2. Berkas

### Repository source (`TimposuLabs/7-hari-belajar-docker`)
Dibuat: `AUDIT_REPORT.md`, `IMPLEMENTATION_REPORT.md`, `hari-4/` (6 proyek + README), `hari-5/` (4 proyek + README), `hari-6/secure-node-app`, `hari-7/production-app` (total 110 berkas pada commit pertama).
Diubah: `README.md` (ditulis ulang: placeholder URL dan struktur lama diganti), `.gitignore` (menambah `!hari-[4-7]/**/package-lock.json`).
**Tidak diubah:** `hari-2/`, `hari-3/` (diverifikasi: `git diff a2403a3 origin/main -- hari-2 hari-3` kosong).

### Repository naskah (`TopekoX/buku-7-hari-docker`, **belum di-commit**)
Dimodifikasi di working tree: `05_day_4_...md`, `06_day_5_...md`, `07_day_6_...md`, `08_day_7_...md`. Pendahuluan, Hari 1–3, penutup, cheat sheet, gambar, dan daftar isi **tidak disentuh**.
Kode di bab Hari 4–5 diambil langsung dari berkas source oleh skrip, dan diperiksa sama persis: setiap kode yang tertanam di bab Hari 4–5 identik dengan berkas source. Berkas salinan (`api/package.json` dan `pom.xml` di Hari 5) sengaja tidak ditanam ulang; bab hanya menjelaskan bahwa itu salinan. Kode `secure-node-app` (Hari 6) dan aplikasi `production-app` (Hari 7) tidak ditanam di bab; yang ditanam adalah Dockerfile, Compose, dan skrip deploy.

## 3. Hari demi hari

| Hari | Direktori | Isi | Perubahan bab |
|---|---|---|---|
| 4 | `hari-4/network-basics` | default bridge vs custom, DNS, `--network none` | koreksi catatan output, `network prune`, contoh `--network host` |
| 4 | `node-postgres-app` | Express + PostgreSQL, retry koneksi, `/health`, `/which`, non-root | seluruh bagian Node.js ditulis ulang agar sama dengan source |
| 4 | `flask-redis-app` | Flask + Redis cache-aside, gunicorn | bagian Python ditulis ulang |
| 4 | `spring-mysql-app` | Spring Boot 3.5.16 + MySQL 8.4, multi-stage | bagian Spring ditulis ulang (spasi pada JDBC URL, tanpa Lombok/password default) |
| 4 | `multi-container-app` | Nginx + API + DB, dua network | urutan `create → connect → start` (C1) |
| 4 | `lb-demo` | 3 instance + Nginx, failover | bagian LB ditulis ulang; klaim "Docker yang mengurus distribusi" dikoreksi |
| 5 | `node/python/spring-compose-stack` | Compose: healthcheck, `depends_on`, `.env`, `${VAR:?}`, volume, 2 network | tiga bagian stack ditulis ulang + tabel penjelasan YAML |
| 5 | `lb-demo` | `--scale`, Nginx dengan resolusi DNS saat runtime (C2) | bagian LB ditulis ulang |
| 6 | `secure-node-app` | non-root, read-only, cap_drop, no-new-privileges, secrets, init, limit; audit.sh, scan.sh (Hadolint+Trivy via container) | perbaikan C4/H5/H6/M10/M11, versi image, bagian "Praktik Langsung" baru, catatan "referensi" |
| 7 | `production-app` | Dockerfile produksi + label versi, Compose produksi, deploy/rollback/backup, push ke Docker Hub | bagian "Latihan Lokal" baru, perbaikan C3/H7, catatan bagian VPS tidak diuji |

## 4. Perintah dan pengujian yang dijalankan

| Area | Pengujian | Hasil |
|---|---|---|
| Lingkungan | `docker info`, `docker compose version`, `gh auth status`, login Docker Hub (tanpa menampilkan kredensial) | PASS |
| network-basics | ping IP vs nama (default bridge gagal; custom berhasil), `nslookup`, `--network none` | PASS |
| node-postgres-app | build, CRUD via curl, DNS nama, `pg_isready`, persistensi setelah container dihapus, cleanup | PASS |
| flask-redis-app | build, miss ≈1,00 s vs hit ≈0,001 s, flush, `/health` saat Redis dimatikan (503 degraded) | PASS |
| spring-mysql-app | build, health, CRUD, validasi 400, search/low-stock, persistensi, start tanpa `sleep` | PASS (diulang setelah patch) |
| multi-container-app | alur benar; alur lama (C1) direproduksi gagal; API tidak dapat diakses langsung | PASS |
| hari-4 lb-demo | round-robin, header `X-Served-By`, failover (6×200 dengan api-2 mati), pulih | PASS |
| hari-5 node-compose-stack | `compose config` (juga gagal jelas tanpa `.env`), up, healthy, CRUD, `psql`, API tidak terpublikasi, `down`→`up` data tetap (6 produk), rebuild `api`, `down -v` | PASS |
| hari-5 python-compose-stack | up, health, CRUD. Bug healthcheck `wget` ditemukan lalu diperbaiki, lalu diuji ulang | PASS (setelah perbaikan) |
| hari-5 spring-compose-stack | up, health, 5 produk, Adminer HTTP 200, query via `mysql` | PASS |
| hari-5 lb-demo | 1→3→2 instance, distribusi, `mem_limit`; C2 direproduksi (statis gagal, dinamis berhasil) | PASS |
| hari-6 secure-node-app | `/security-info` (uid 1000, FS read-only, cap 0, no-new-privs, secret terbaca), `touch` gagal, `audit.sh` hardened PASS / insecure FAIL | PASS |
| hari-6 Hadolint | semua 9 Dockerfile proyek baru: 0 warning/error pada pemindaian akhir (insecure/Dockerfile sengaja dikecualikan); info DL3066 hanya pada hari-6/hari-7 yang memakai `USER node` | PASS |
| hari-6 Trivy 0.76.1 | secure-node-app 0 HIGH/CRITICAL (7 sebelum `npm` dibuang); insecure 459 | PASS |
| hari-6 secret dengan uid berbeda dari 1000 | tidak diuji | NOT RUN |
| hari-7 production-app | build, `deploy 1.0.0`, `/version`, `/api/products`, FS read-only, upgrade 1.0.1, `rollback`, deploy tag tidak ada (aplikasi tak terganggu), deploy tag rusak (rollback otomatis), backup | PASS |
| Image publik | pull `timposulabs/production-app:1.0.0` dari Hub lalu `deploy.sh` → `/version` = 1.0.0, gitSha 45b598b, healthy | PASS |
| Pre-publish | `audit.sh` + Trivy secret scan 4 image: 0 secret; isi `/app` tanpa `.env` | PASS |
| `docker scout`, `dive` | tidak terpasang | NOT RUN |
| Build `linux/arm64` | hanya `amd64` dibuild | NOT RUN |
| Menjalankan README **persis seperti ditulis** oleh pembaca baru | perintah yang setara dijalankan, namun bukan salinan literal dari README oleh orang lain | sebagian |
| Hari 5: bagian Override file / Scaling+resource limits dari bab | contoh tidak dibuat; diberi catatan "belum teruji" di bab | NOT RUN |
| Hari 6: Dockerfile Python/Spring "production-ready", logging 3 bahasa, LB produksi | pola dibuktikan hanya pada Node (`secure-node-app`); sisanya diberi catatan referensi | NOT RUN |
| Hari 7: VPS, UFW, domain, Certbot, GitHub Actions, zero-downtime script, monitoring, UptimeRobot | tidak ada server/otorisasi; diberi catatan "tidak diuji" | NOT RUN |

Sisa temuan Trivy pada image yang dipublikasikan (28-10-2026, `--severity HIGH,CRITICAL`):
`node-postgres-app` 0; `production-app` 0; `flask-redis-app` 0 yang punya perbaikan (sisanya paket Debian tanpa perbaikan); `spring-mysql-app` 2 yang perbaikannya hanya di versi mayor (`spring-webmvc` 7.x). Hasil ini akan berubah seiring waktu.

## 5. Image Docker Hub

Namespace: `timposulabs` — <https://hub.docker.com/u/timposulabs>. Repository lama (`docker-*-app`, `springboot-*`, `demo-crud-express`) **tidak disentuh**; keempat repository di bawah belum ada sebelumnya.

| Image | Tag | Digest | Sumber | Bab |
|---|---|---|---|---|
| `timposulabs/node-postgres-app` | `1.0.0` | `sha256:6f28d112ac83…` | `hari-4/node-postgres-app` | Hari 4 |
| `timposulabs/flask-redis-app` | `1.0.0` | `sha256:3c4f9f96e1e6…` | `hari-4/flask-redis-app` | Hari 4 |
| `timposulabs/spring-mysql-app` | `1.0.0` | `sha256:539afaec21eb…` | `hari-4/spring-mysql-app` | Hari 4 |
| `timposulabs/production-app` | `1.0.0`, `1.0.0-sha-45b598b` | `sha256:4bc08957ca3f…` | `hari-7/production-app/app` | Hari 7 |

- Hanya platform **linux/amd64** (diverifikasi lewat API Hub).
- Tag `latest` **sengaja tidak dibuat**; gunakan tag eksplisit.
- Image Compose (Hari 5/6) dan image `lb-*` tidak dipublikasikan: dibuild dari source oleh pembaca.
- Setiap image: berjalan non-root, tanpa secret (Trivy secret scan + `audit.sh`), `HEALTHCHECK` ada.
- Port/ENV/volume: Node `3000` (`DB_HOST,DB_PORT,DB_NAME,DB_USER,DB_PASSWORD`), Flask `5000` (`REDIS_HOST,REDIS_PORT`), Spring `8080` (`DB_HOST,DB_PORT,DB_NAME,DB_USER,DB_PASSWORD`), production-app `3000` (`DB_*` atau `DB_PASSWORD_FILE`). Aplikasi tidak menyimpan data sendiri; data ada di PostgreSQL/MySQL/Redis (volume milik database).

## 6. Git dan GitHub

- Repository: <https://github.com/TimposuLabs/7-hari-belajar-docker> (branch `main`, remote `origin` sudah benar).
- Commit: `50eb566` "add hari 4-7: networking, compose, keamanan, deploy + audit" dan `45b598b` "harden image hari 4-5: ...". Commit laporan ini menyusul (lihat `git log`).
- Push: `a2403a3..50eb566..45b598b`, fast-forward, tanpa force. Diverifikasi: `gh api .../commits/main` → `45b598b`; 0 berkas `.env`/secret di tree remote; `hari-2/`, `hari-3/` identik dengan sebelum pekerjaan.

## 7. Batasan yang diketahui

- Angka waktu/ID/IP pada bab adalah contoh; yang tertera di blok "contoh" berasal dari percobaan ini tetapi akan berbeda di komputer pembaca.
- Versi (Node 24, Python 3.13, Spring Boot 3.5.16, PostgreSQL 17, MySQL 8.4, Nginx 1.28) dipilih karena masih didukung per 2026-10-28; hasil Trivy dan tag `-alpine`/`-slim` bergeser seiring waktu.
- `hari-3/node-volume-demo` tetap tidak bisa dibuild dari clone bersih sampai `package-lock.json` ditambahkan oleh pemilik.
- Bagian buku di luar Hari 4–7 belum diaudit baris-per-baris, dan masih banyak referensi "Docker Desktop" di pendahuluan.
- Selama pengujian, satu kali port 3000 di host terdeteksi dipakai proses lain yang bukan milik pengujian; pengujian diulang pada port lain (`APP_PORT`), proses itu tidak disentuh.

## 8. Tindakan manual yang masih tersisa

1. **Review dan commit perubahan bab** di `TopekoX/buku-7-hari-docker` (4 berkas diubah, belum di-commit/di-push; remote itu bukan tujuan publikasi tugas ini).
2. **Isi "Overview" repository Docker Hub** untuk 4 repository baru (butuh login web/token yang tidak dipakai di sini). Teks siap-tempel:
   - `node-postgres-app`: "Express REST API + PostgreSQL untuk buku 7 Hari Belajar Docker (Hari 4). Port 3000. Env: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD (wajib). Jalankan di network yang sama dengan PostgreSQL. Panduan: https://github.com/TimposuLabs/7-hari-belajar-docker/tree/main/hari-4/node-postgres-app"
   - `flask-redis-app`: "Flask API + Redis cache. Port 5000. Env: REDIS_HOST (nama container Redis), REDIS_PORT. https://github.com/TimposuLabs/7-hari-belajar-docker/tree/main/hari-4/flask-redis-app"
   - `spring-mysql-app`: "Spring Boot 3.5 REST API + MySQL 8.4. Port 8080. Env: DB_HOST, DB_NAME, DB_USER, DB_PASSWORD (wajib), DB_PORT. https://github.com/TimposuLabs/7-hari-belajar-docker/tree/main/hari-4/spring-mysql-app"
   - `production-app`: "Contoh image produksi (Hari 7): non-root, label versi, GET /version, DB_PASSWORD_FILE. Gunakan tag eksplisit (tanpa latest). https://github.com/TimposuLabs/7-hari-belajar-docker/tree/main/hari-7/production-app"
3. Pemilik `hari-3`: commit `package-lock.json` untuk `hari-3/node-volume-demo` (atau hapus `package-lock.json` dari `.gitignore` lalu commit).
4. Jika ingin dukungan Apple Silicon/ARM: build multi-platform (`docker buildx build --platform linux/amd64,linux/arm64 --push`).
5. Uji bagian VPS/HTTPS/CI-CD Hari 7 dan Dockerfile Python/Spring Hari 6 di lingkungan sendiri sebelum mengandalkannya.

## 9. Pembaruan 2026-10-30: Day 1–3

- `hari-2/` dan `hari-3/` kini **diubah** atas permintaan pemilik (sebelumnya dilindungi): versi dasar, `package-lock.json`, tanpa password default, driver SQLAlchemy eksplisit, hardening image, README. Commit `abbfa6e`, di-push ke `main`.
- Enam image dipublikasikan di Docker Hub (tag `1.0`, amd64): `docker-node-app`, `docker-python-app`, `docker-spring-app` (menimpa tag lama), `node-volume-demo`, `python-volume-demo`, `spring-volume-demo` (baru). Diverifikasi lewat API Hub, pull dari nol, dan menjalankan salah satunya.
- Pengujian: build, jalan, CRUD, dan persistensi semua image Day 2–3: **PASS**; Trivy: 0 secret; temuan sisa dicatat di `hasil_audit.md` (di luar repo ini, di direktori kerja naskah).
- Bagian "Day 2–3" pada laporan awal ("tidak diubah") sudah tidak berlaku.
