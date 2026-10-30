# Hari 6 — Load balancing yang diperkeras (`lb-production`)

Bagian dari bab "Best Practice & Keamanan Container": Nginx dengan rate limiting dan security header, API yang di-scale, PostgreSQL di network internal, `read_only` dan `no-new-privileges`.

## Tujuan pembelajaran
- Rate limiting per IP, header keamanan, `server_tokens off`, dan menutup endpoint status dari luar.
- Menjalankan Nginx dengan filesystem `read_only` (hanya `tmpfs` yang bisa ditulis).
- Memahami cara Nginx menemukan instance baru setelah `--scale`.

## Prasyarat
Docker Engine + `docker compose`, `curl`, `jq`.

## Struktur
```text
lb-production/
├── docker-compose.yml   nginx (read_only), api (bisa di-scale), postgres
├── nginx/nginx.conf     rate limit 10 req/dtk (burst 20), header keamanan
├── api/                 aplikasi Express (salinan dari hari-5/lb-demo)
└── .env.example
```

## Menjalankan (dari direktori `hari-6/lb-production`)
```bash
cp .env.example .env            # ganti POSTGRES_PASSWORD
docker compose up -d --build --scale api=3
docker compose ps               # tunggu 3 instance api (healthy)
```

## Verifikasi (hasil pengujian di Docker 29)
```bash
# Rate limiting: 25 request berurutan → sekitar 22 sukses, sisanya HTTP 429
for i in $(seq 1 25); do curl -s -o /dev/null -w "%{http_code} " http://localhost:8080/api/products; done; echo

# Distribusi ke 3 container
for i in $(seq 1 12); do curl -s http://localhost:8080/which | jq -r .container; done | sort | uniq -c

# Header keamanan
curl -sI http://localhost:8080/health | grep -E "X-Frame|X-Content|Referrer"

# /nginx-status hanya boleh dari dalam container → 403 dari host
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/nginx-status

# Nginx berjalan read-only
docker inspect nginx-lb --format 'ro={{.HostConfig.ReadonlyRootfs}}'
```

## Penting: setelah `--scale`, reload Nginx
Nama `api` pada blok `upstream` diresolvasi saat Nginx **start atau reload**. Pada pengujian, setelah scale 3 → 5, hanya 3 container yang menerima request sampai Nginx di-reload:
```bash
docker compose up -d --scale api=5 --no-recreate
docker compose exec nginx nginx -s reload       # sekarang 5 container menerima request
```
Alternatif tanpa reload (resolusi per request) ada di `../../hari-5/lb-demo`, dengan konsekuensi tidak memakai `upstream` + `keepalive`.

## Catatan
- Header `X-XSS-Protection` sengaja tidak dipakai (usang; browser modern mengabaikannya).
- `deploy.resources.limits` (CPU, memori) dan `reservations.memory` dipakai Compose v2; `reservations.cpus` **tidak** diterapkan pada Docker biasa (bukan Swarm).
- Port hanya diikat ke `127.0.0.1`; ubah `HTTP_PORT` di `.env` jika bentrok.

## Kesalahan umum
| Gejala | Penyebab | Solusi |
|---|---|---|
| `nginx-lb` exit `host not found in upstream "api:3000"` | api belum ada saat Nginx start | `depends_on: api: service_healthy` (sudah ada); cek `docker compose ps` |
| Instance baru tidak menerima request | Nginx belum di-reload | `docker compose exec nginx nginx -s reload` |
| `port is already allocated` | port 8080 terpakai | ubah `HTTP_PORT` |

## Membersihkan
```bash
docker compose down -v
```
