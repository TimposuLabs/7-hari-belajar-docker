# Hari 4 — Flask API + Redis cache pada custom network

## Tujuan pembelajaran
- Menghubungkan API Python dengan Redis lewat nama container.
- Memahami pola **cache-aside** dan melihat perbedaan waktu *cache miss* vs *cache hit*.

## Prasyarat
Docker Engine, `curl`, `jq` (opsional).

## Struktur
```text
flask-redis-app/
├── app.py             endpoint /health, /api/products, /cache/*
├── gunicorn.conf.py   konfigurasi server produksi (bind, workers)
├── requirements.txt   flask, redis, gunicorn (versi dikunci)
├── Dockerfile         python:3.13-slim, user non-root, HEALTHCHECK
└── .dockerignore
```

## Cara kerja
`REDIS_HOST` berisi nama container Redis. Saat `GET /api/products`: jika key `products:all` ada di Redis → dijawab dari **cache** (cepat); jika tidak → "query lambat" 1 detik, hasil disimpan di Redis selama 30 detik (`CACHE_TTL`).

## Menjalankan (dari direktori `hari-4/flask-redis-app`)
```bash
docker build -t flask-redis-app:1.0.0 .
docker network create cache-net
docker run -d --name redis-cache --network cache-net redis:7-alpine
docker run -d --name api-python --network cache-net \
  -p 127.0.0.1:5000:5000 -e REDIS_HOST=redis-cache flask-redis-app:1.0.0
```

## Verifikasi
```bash
curl -s http://localhost:5000/health | jq .
# "redis": "connected", "redis_host": "redis-cache"

curl -s -o /dev/null -w "%{time_total}s\n" http://localhost:5000/api/products   # ± 1.0s  (cache miss)
curl -s -o /dev/null -w "%{time_total}s\n" http://localhost:5000/api/products   # ± 0.001s (cache hit)
curl -s http://localhost:5000/api/products | jq -c '[.source,.elapsed_ms]'      # ["cache", ...]

curl -s http://localhost:5000/cache/stats | jq .
docker exec redis-cache redis-cli keys '*'                                      # products:all
curl -s -X DELETE http://localhost:5000/cache/flush                              # hapus cache aplikasi
curl -s http://localhost:5000/api/products | jq .source                          # "database" lagi
```
Setelah 30 detik tanpa request, cache kedaluwarsa dan request berikutnya kembali "database".

### Percobaan: Redis mati
```bash
docker stop redis-cache
curl -s http://localhost:5000/health        # "status":"degraded","redis":"disconnected" (HTTP 503)
docker start redis-cache
```

## Kesalahan umum
| Gejala | Penyebab | Solusi |
|---|---|---|
| `"redis": "disconnected"` | `REDIS_HOST` salah / beda network | `docker network inspect cache-net` |
| `Error 111 connecting to localhost:6379` | `REDIS_HOST` tidak diisi (default `localhost`) | tambahkan `-e REDIS_HOST=redis-cache` |
| `Conflict. The container name "/redis-cache" is already in use` | sisa percobaan | `docker rm -f redis-cache` |

## Membersihkan
```bash
docker rm -f api-python redis-cache
docker network rm cache-net
```
