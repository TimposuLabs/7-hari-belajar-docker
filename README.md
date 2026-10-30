# 🐳 7 Hari Belajar Docker

Repository ini berisi **source code** untuk eBook **7 Hari Belajar Docker**: contoh aplikasi, Dockerfile, dan konfigurasi Docker Compose untuk belajar Docker dari dasar sampai deployment.

- 📖 Naskah buku: <https://github.com/TopekoX/buku-7-hari-docker>
- 🐳 Image Docker: <https://hub.docker.com/u/timposulabs>

## 👥 Untuk siapa

Pemula yang ingin belajar Docker secara bertahap, dengan contoh Node.js, Python (Flask), dan Java (Spring Boot). Semua penjelasan README dalam Bahasa Indonesia.

## 🗺️ Peta belajar

| Hari | Topik | Bab buku | Direktori | Image Docker Hub |
|---|---|---|---|---|
| 1 | Image & container dasar | `02_day_1_...` | (hanya perintah CLI, tanpa source code) | — |
| 2 | Dockerfile | `03_day_2_...` | [`hari-2/`](hari-2/README.md) | `docker-node-app`, `docker-python-app`, `docker-spring-app` (tag `1.0`) |
| 3 | Volume & data | `04_day_3_...` | [`hari-3/`](hari-3/README.md) | `node-volume-demo`, `python-volume-demo`, `spring-volume-demo` (tag `1.0`) |
| 4 | Networking | `05_day_4_...` | [`hari-4/`](hari-4/README.md) | `node-postgres-app`, `flask-redis-app`, `spring-mysql-app` (tag `1.0.0`) |
| 5 | Docker Compose | `06_day_5_...` | [`hari-5/`](hari-5/README.md) | — (stack dibuild dari source) |
| 6 | Keamanan container | `07_day_6_...` | [`hari-6/`](hari-6/README.md) | — (dibuild dari source) |
| 7 | Deploy ke production | `08_day_7_...` | [`hari-7/`](hari-7/README.md) | `production-app` (tag `1.0.0`) |

Semua image berada di namespace `timposulabs` (mis. `timposulabs/node-postgres-app:1.0.0`).

## 📁 Struktur

```text
7-hari-belajar-docker/
├── hari-2/   docker-node-app, docker-python-app, docker-spring-app
├── hari-3/   dev-*-app, node/python/spring-volume-demo
├── hari-4/   network-basics, node-postgres-app, flask-redis-app, spring-mysql-app,
│             multi-container-app, lb-demo
├── hari-5/   node-compose-stack, python-compose-stack, spring-compose-stack, lb-demo
├── hari-6/   secure-node-app
├── hari-7/   production-app
├── AUDIT_REPORT.md            audit naskah dan rencana
├── IMPLEMENTATION_REPORT.md   apa yang dibuat dan diuji
└── README.md
```

Setiap proyek Hari 4-7 memiliki README sendiri berisi tujuan, prasyarat, langkah, hasil yang diharapkan, verifikasi, kesalahan umum, dan cara membersihkan.

## 📋 Prasyarat

- **Docker Engine** di Linux (diuji pada Docker Engine 29). Docker Desktop juga bisa, tetapi tidak diasumsikan.
- **Docker Compose v2** (plugin): cek dengan `docker compose version`. Perintah lama `docker-compose` tidak dipakai.
- `git`, `curl`. Opsional: `jq` (merapikan JSON), `openssl` (membuat password acak).
- Koneksi internet untuk mengunduh image dasar dan dependency.

```bash
docker version
docker compose version
```

## 🚀 Cara menjalankan

```bash
git clone https://github.com/TimposuLabs/7-hari-belajar-docker.git
cd 7-hari-belajar-docker/hari-5/node-compose-stack      # contoh: pilih proyek
cat README.md                                           # baca langkahnya
cp .env.example .env                                    # isi password milikmu
docker compose up -d --build
```

Kebanyakan proyek memerlukan file `.env` yang dibuat dari `.env.example`. **Jangan commit file `.env`** (sudah di-`.gitignore`).

## 🔒 Catatan keamanan

- Tidak ada password di source code; semua dari `.env` atau file secret (yang di-`.gitignore`).
- Port aplikasi dipublikasikan ke `127.0.0.1` saja, tidak ke seluruh jaringan.
- Database tidak dipublikasikan ke host; hanya bisa dicapai dari network Docker.
- Image Hari 4-7 berjalan sebagai user non-root.
- Contoh di Hari 6/7 memakai `read_only`, `cap_drop: ALL`, dan `no-new-privileges`.
- Tidak ada contoh yang memakai container `--privileged` atau membuka Docker daemon lewat TCP.
- Password di `.env.example` sengaja berupa placeholder (`GANTI_...`); ganti sebelum dipakai.

## ⚠️ Catatan tentang Hari 2-3

`hari-2/` dan `hari-3/` diperbarui pada 2026-10-30: versi dasar (Node 24, Python 3.13, Spring Boot 3.5.16), file `package-lock.json` ditambahkan (sebelumnya tidak ada sehingga `docker build` Node gagal), password default dihapus dari kode, driver SQLAlchemy ditulis eksplisit, dan image dibangun ulang lalu dipublikasikan. Lihat `hasil_audit.md` di repo naskah dan `IMPLEMENTATION_REPORT.md`.

## 🤝 Kontribusi

Perbaikan materi, latihan, dan dokumentasi sangat terbuka melalui Issue atau Pull Request.

## 📄 Lisensi

Proyek ini dibuat untuk tujuan pembelajaran dan dapat digunakan secara bebas untuk kebutuhan edukasi.

---

**Happy Learning Docker! 🐳🚀**
