# Hari 2 — Membangun Image dengan Dockerfile

Bab buku: `03_day_2_Membangun_Image_Sendiri_dengan_Dockerfile.md`

| Direktori | Isi | Port | Image Docker Hub |
|---|---|---|---|
| `docker-node-app/` | Express, Dockerfile bertahap | 3000 | `timposulabs/docker-node-app:1.0` |
| `docker-python-app/` | Flask + Gunicorn | 5000 | `timposulabs/docker-python-app:1.0` |
| `docker-spring-app/` | Spring Boot, multi-stage, non-root | 8080 | `timposulabs/docker-spring-app:1.0` |

## Prasyarat
Docker Engine. `docker-node-app` membutuhkan `package-lock.json` (sudah ada di repo; jika kamu mengetik ulang dari bab, buat dengan `npm install --package-lock-only`).

## Menjalankan salah satu (dari direktori proyek)
```bash
docker build -t docker-node-app:1.0 .          # atau docker-python-app / docker-spring-app
docker run -d -p 127.0.0.1:3000:3000 --name node-app docker-node-app:1.0
curl http://localhost:3000/                     # {"pesan":"Halo dari Docker!",...}
curl http://localhost:3000/health
docker rm -f node-app                           # bersihkan
```
Python: port `5000`, `curl http://localhost:5000/`. Spring: port `8080`, `curl http://localhost:8080/api/hello` dan `/actuator/health` (butuh ±20–30 detik untuk siap; cek `docker ps` sampai `(healthy)`).

Atau pakai image jadi: `docker run -d -p 127.0.0.1:3000:3000 timposulabs/docker-node-app:1.0`.

## Catatan
- Versi dasar: Node 24, Python 3.13, Java 17 (Temurin) dengan Spring Boot 3.5.16.
- Image Node dan Python di hari ini berjalan sebagai **root** dan tanpa HEALTHCHECK karena tujuannya mengenalkan Dockerfile; praktik yang lebih aman dibahas di Hari 6 (`../hari-6`). Image Spring sudah non-root.
- Pemindaian Trivy (30-10-2026): Node 6 dan Python 5 temuan HIGH/CRITICAL yang bisa diperbaiki, semuanya berasal dari npm/pip bawaan base image; Spring 2 temuan yang perbaikannya hanya di versi mayor. Hasil berubah dari waktu ke waktu.
- Hanya platform `linux/amd64`.

## Kesalahan umum
| Gejala | Penyebab | Solusi |
|---|---|---|
| `"/package-lock.json": not found` | lockfile belum ada | `npm install --package-lock-only` |
| `port is already allocated` | port host terpakai | ganti `-p 127.0.0.1:3001:3000` |
