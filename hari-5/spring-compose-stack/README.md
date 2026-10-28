# Hari 5 — Docker Compose: Spring Boot + MySQL + Adminer

Konsep YAML sama dengan [`../node-compose-stack`](../node-compose-stack/README.md). Hal khusus di sini:

- **MySQL** butuh waktu start lebih lama → healthcheck `mysqladmin ping` dengan `start_period: 30s`; Spring menunggu lewat `depends_on: service_healthy` **dan** pengaturan Hikari `initialization-fail-timeout`.
- **Adminer** (UI web database) hanya untuk development, dibatasi ke `127.0.0.1:8081`.
- API memakai network `frontend-net` (agar port-nya bisa dipublikasikan) dan `backend-net` (agar bisa menjangkau MySQL).
- `$$MYSQL_ROOT_PASSWORD` pada healthcheck dibaca **di dalam container** MySQL.

## Prasyarat
Docker Engine + `docker compose`, `curl`, `jq` (opsional). Build pertama mengunduh dependency Maven (±1–2 menit).

## Struktur
```text
spring-compose-stack/
├── docker-compose.yml
├── .env.example
└── api/ (pom.xml, Dockerfile, src/…)    Spring Boot 3.5.6, Java 17
```

## Menjalankan (dari direktori `hari-5/spring-compose-stack`)
```bash
cp .env.example .env            # ganti MYSQL_ROOT_PASSWORD dan MYSQL_PASSWORD
docker compose up -d --build
docker compose ps               # tunggu api & mysql: (healthy)
```

## Verifikasi
```bash
curl -s http://localhost:8080/actuator/health         # {"status":"UP"}
curl -s http://localhost:8080/api/products | jq .total   # 5
docker compose exec mysql sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "SELECT id,nama FROM products LIMIT 3;"'
```
Buka http://localhost:8081 → System **MySQL**, Server `mysql`, isi username/password dari `.env`.

## Kesalahan umum
| Gejala | Penyebab | Solusi |
|---|---|---|
| `required variable ... is missing a value` | file `.env` belum dibuat / kosong | `cp .env.example .env`, lalu isi nilainya |
| `port is already allocated` / `address already in use` | port host dipakai proses lain | ubah `HTTP_PORT` di `.env` |
| service `unhealthy` | aplikasi gagal start | `docker compose logs api` |
| perubahan kode tidak terlihat | image lama masih dipakai | `docker compose up -d --build` |
| password baru tidak berlaku | volume database lama menyimpan password lama | `docker compose down -v` (MENGHAPUS data) lalu `up` lagi |
| Adminer: `Connection refused` | MySQL belum healthy | tunggu, `docker compose ps` |

## Membersihkan
`docker compose down -v`
