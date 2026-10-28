# Hari 4 — Dasar Jaringan Container (default bridge vs custom network)

## Tujuan pembelajaran
- Membuktikan bahwa **default bridge** tidak punya DNS nama container.
- Membuktikan bahwa **custom bridge network** meresolvasi nama container ke IP.
- Memahami `--network none` dan perintah inspeksi jaringan.

## Prasyarat
Docker Engine berjalan (`docker version`). Tidak butuh source code; semua perintah dijalankan dari direktori mana saja.
Image `alpine` akan diunduh otomatis.

## Percobaan 1 — default bridge: ping lewat IP berhasil, lewat nama gagal
```bash
docker run -d --name container-a alpine sleep 600
docker run -d --name container-b alpine sleep 600

# Ambil IP container-b (host command; `range` dipakai karena container bisa punya >1 network)
docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' container-b
# contoh hasil: 172.17.0.3  (di komputermu bisa berbeda)

docker exec container-a ping -c 2 172.17.0.3        # ganti dengan IP milikmu → BERHASIL
docker exec container-a ping -c 2 container-b       # → ping: bad address 'container-b'

docker rm -f container-a container-b                # bersihkan
```
**Kenapa:** default bridge tidak menjalankan DNS internal. IP bisa berubah saat container dibuat ulang, jadi IP bukan alamat yang andal.

## Percobaan 2 — custom bridge: ping lewat nama berhasil
```bash
docker network create demo-net
docker run -d --name server-a --network demo-net alpine sleep 600
docker run -d --name server-b --network demo-net alpine sleep 600

docker exec server-a ping -c 2 server-b
# PING server-b (172.18.0.3): 56 data bytes
# 64 bytes from 172.18.0.3: seq=0 ttl=64 time=0.110 ms

docker exec server-a nslookup server-b
# Name:   server-b
# Address: 172.18.0.3          ← "Server: 127.0.0.11" adalah DNS internal Docker

docker network inspect demo-net --format '{{range .Containers}}{{.Name}}: {{.IPv4Address}}{{"\n"}}{{end}}'
# server-b: 172.18.0.3/16
# server-a: 172.18.0.2/16
```

## Percobaan 3 — tanpa jaringan
```bash
docker run --rm --network none alpine ping -c 1 google.com
# ping: bad address 'google.com'
```

## Verifikasi
Percobaan 1 menampilkan `bad address` untuk nama, percobaan 2 menampilkan balasan `64 bytes from ...` untuk nama.

## Kesalahan umum
| Gejala | Penyebab | Solusi |
|---|---|---|
| `Conflict. The container name "/server-a" is already in use` | sisa percobaan sebelumnya | `docker rm -f server-a server-b` |
| `network demo-net has active endpoints` saat `network rm` | masih ada container | hapus containernya dulu |
| IP berbeda dengan buku | Docker mengambil subnet kosong berikutnya | wajar; gunakan nama, bukan IP |

## Membersihkan
```bash
docker rm -f server-a server-b
docker network rm demo-net
```
Hanya resource berawalan nama di atas yang dihapus. Jangan memakai `docker network prune` jika kamu punya network lain yang sedang tidak dipakai tetapi masih diperlukan.
