# Hari 4 — Networking: Menghubungkan Container

Bab buku: `05_day_4_Networking_Menghubungkan_Container.md`

| Direktori | Isi | Image (Docker Hub) |
|---|---|---|
| [`network-basics/`](network-basics/README.md) | default bridge vs custom network, DNS, `--network none` | — |
| [`node-postgres-app/`](node-postgres-app/README.md) | Express API + PostgreSQL | `timposulabs/node-postgres-app:1.0.0` |
| [`flask-redis-app/`](flask-redis-app/README.md) | Flask API + Redis cache | `timposulabs/flask-redis-app:1.0.0` |
| [`spring-mysql-app/`](spring-mysql-app/README.md) | Spring Boot + MySQL | `timposulabs/spring-mysql-app:1.0.0` |
| [`multi-container-app/`](multi-container-app/README.md) | Nginx + API + PostgreSQL, dua network | memakai image `node-postgres-app` |
| [`lb-demo/`](lb-demo/README.md) | Load balancing 3 instance | memakai image `node-postgres-app` |

Urutan belajar yang disarankan: `network-basics` → satu dari tiga aplikasi → `multi-container-app` → `lb-demo`.
Semua README menjelaskan prasyarat, perintah, hasil yang diharapkan, kesalahan umum, dan cara membersihkan.

Catatan keamanan: password tidak ada di kode. Salin `.env.example` menjadi `.env` (sudah di-`.gitignore`) dan isi sendiri.
Port API dipublikasikan ke `127.0.0.1` saja agar tidak terbuka ke jaringan lokal.
