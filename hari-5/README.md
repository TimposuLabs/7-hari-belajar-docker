# Hari 5 — Docker Compose

Bab buku: `06_day_5_Docker_Compose _Orkestrasi_Multi-Container.md`

| Direktori | Isi |
|---|---|
| [`node-compose-stack/`](node-compose-stack/README.md) | Nginx + Express + PostgreSQL (mulai dari sini; penjelasan YAML lengkap) |
| [`python-compose-stack/`](python-compose-stack/README.md) | Nginx + Flask + PostgreSQL |
| [`spring-compose-stack/`](spring-compose-stack/README.md) | Spring Boot + MySQL + Adminer |
| [`lb-demo/`](lb-demo/README.md) | Load balancing dengan `--scale` |
| [`override-demo/`](override-demo/README.md) | Override file: development vs production, batas resource |

Setiap stack mandiri: masuk ke direktorinya, `cp .env.example .env`, ganti password, lalu `docker compose up -d --build`.
Semua memakai `docker compose` (Compose v2). Port diikat ke `127.0.0.1`, password tidak disimpan di Git.
