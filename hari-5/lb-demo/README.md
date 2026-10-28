# Hari 5 — Load balancing dengan `docker compose --scale`

## Tujuan pembelajaran
- Menjalankan beberapa instance satu service: `docker compose up -d --scale api=3`.
- Memahami syarat service yang di-scale: **tanpa `container_name`** dan **tanpa `ports` statis**.
- Memahami bagaimana Nginx menemukan instance baru lewat DNS Docker.

## Prasyarat
Docker Engine + `docker compose`, `curl`, `jq`.

## Struktur
```text
lb-demo/
├── docker-compose.yml    nginx, api (bisa di-scale), postgres
├── nginx/nginx.conf      memakai `resolver 127.0.0.11` + variabel pada proxy_pass
├── api/                  aplikasi Express (salinan mandiri)
└── .env.example
```

## Penting: cara Nginx menemukan instance baru
Docker DNS mengembalikan **semua IP** instance untuk nama `api`. Namun pada konfigurasi
```nginx
upstream node_api { server api:3000; }     # BERBAHAYA untuk scaling
```
Nginx hanya me-resolve nama itu **sekali saat start**; instance yang ditambah kemudian **tidak** ikut menerima request (sudah diuji: setelah scale ke 3, semua request tetap ke 1 container) meskipun ada direktif `resolver`.
Solusi di `nginx.conf` ini: simpan alamat di variabel (`set $api_upstream http://api:3000; proxy_pass $api_upstream;`) sehingga Nginx me-resolve per request memakai `resolver 127.0.0.11 valid=5s`. Distribusi menjadi **kira-kira** merata (bukan selalu urut 1-2-3).

## Menjalankan (dari direktori `hari-5/lb-demo`)
```bash
cp .env.example .env            # ganti POSTGRES_PASSWORD
docker compose up -d --build    # 1 instance api
docker compose up -d --scale api=3 --no-recreate
docker compose ps               # tunggu 3 instance api: (healthy)
```
`--no-recreate` mempertahankan container yang sudah ada dan hanya menambah yang baru.

## Verifikasi
```bash
for i in $(seq 1 12); do curl -s http://localhost:8080/which | jq -r .container; done | sort | uniq -c
# contoh: tiga ID berbeda muncul (jumlahnya tidak persis sama)

curl -s http://localhost:8080/api/products | jq '{total, servedBy}'
docker compose up -d --scale api=2         # scale turun
docker stats --no-stream --format 'table {{.Name}}\t{{.MemUsage}}' $(docker compose ps -q api)
```
Batas memori per instance diatur `mem_limit: 256m` (kolom LIMIT pada `docker stats`).

## Kesalahan umum
| Gejala | Penyebab | Solusi |
|---|---|---|
| `port is already allocated` saat scale | ada `ports:` statis di service api | hapus `ports:` dari service yang di-scale |
| `container name ... already in use` | ada `container_name:` di service api | hapus `container_name` |
| Hanya satu container yang menjawab | upstream statis (`upstream { server api:3000; }`) | pakai variabel + `resolver` seperti file ini |
| `required variable ... is missing a value` | file `.env` belum dibuat / kosong | `cp .env.example .env`, lalu isi nilainya |
| `port is already allocated` / `address already in use` | port host dipakai proses lain | ubah `HTTP_PORT` di `.env` |
| service `unhealthy` | aplikasi gagal start | `docker compose logs api` |
| perubahan kode tidak terlihat | image lama masih dipakai | `docker compose up -d --build` |
| password baru tidak berlaku | volume database lama menyimpan password lama | `docker compose down -v` (MENGHAPUS data) lalu `up` lagi |

## Membersihkan
`docker compose down -v`
