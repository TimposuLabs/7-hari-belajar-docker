# Hari 6 — Keamanan Container: `secure-node-app`

## Tujuan pembelajaran
- Menjalankan container sebagai **user non-root**.
- Memakai **base image kecil dan ber-tag spesifik**, multi-stage build, dan `.dockerignore`.
- Menjaga **secret** di luar Dockerfile, image, kode, dan Git (secret dibaca dari file saat runtime).
- Membatasi container: **read-only filesystem**, `cap_drop: ALL`, `no-new-privileges`, batas memori/CPU/proses.
- Memeriksa image dengan **Hadolint** (lint Dockerfile) dan **Trivy** (kerentanan + secret).

## Prasyarat
Docker Engine + `docker compose`, `curl`, `jq` (opsional). Hadolint dan Trivy dijalankan sebagai container (tidak perlu dipasang; pertama kali akan mengunduh image-nya). Tidak ada container yang diberi `--privileged`, dan **tidak ada** yang memasang `/var/run/docker.sock`.

## Struktur
```text
secure-node-app/
├── src/server.js          Express: /health, /security-info (menampilkan kondisi keamanan proses)
├── package.json / package-lock.json
├── Dockerfile             versi hardened
├── docker-compose.yml     read_only, cap_drop, no-new-privileges, secrets, init, limits
├── insecure/Dockerfile    CONTOH BURUK untuk perbandingan (secret palsu, root, tag latest)
├── scripts/audit.sh       memeriksa user, ENV, history, HEALTHCHECK suatu image
├── scripts/scan.sh        Hadolint + Trivy via container (tanpa docker.sock)
├── secrets/app_secret.txt.example   template; berkas asli di-.gitignore
├── .env.example  .dockerignore  .gitignore
```

## Cara kerja
`/security-info` mengembalikan fakta tentang proses yang sedang berjalan, tanpa membocorkan secret (hanya 8 karakter pertama hash SHA-256 sebagai "sidik jari"):
`nonRoot`, `rootFilesystemWritable`, `tmpWritable`, `noNewPrivileges`, `effectiveCapabilities`, `secretLoaded`.

| Pengaturan | Efek | Batasan |
|---|---|---|
| `USER node` | proses bukan root (uid 1000) | file yang ditulis harus dimiliki/dapat ditulis user itu |
| `read_only: true` + `tmpfs: /tmp` | penyerang tidak bisa menulis ke filesystem image; `/tmp` di memori | aplikasi yang menulis ke tempat lain akan error; tambahkan `tmpfs` atau volume |
| `cap_drop: [ALL]` | tanpa capability Linux (mis. mengubah owner, bind port <1024) | tambahkan `cap_add` bila memang perlu |
| `no-new-privileges` | setuid tidak menaikkan hak akses | — |
| `init: true` | `tini` menjadi PID 1 (sinyal, proses zombie) | — |
| `pids_limit`, `mem_limit`, `cpus` | batas sumber daya | angka harus disesuaikan beban |
| `secrets:` (file) | secret dipasang di `/run/secrets/app_secret` (tmpfs), tidak masuk image/ENV | file di host harus **dapat dibaca user di container** (mode `0644`, atau pemilik uid 1000). Pada Compose non-Swarm ini hanya bind mount, bukan enkripsi |

## Menjalankan (dari direktori `hari-6/secure-node-app`)
```bash
cp .env.example .env
mkdir -p secrets
openssl rand -hex 16 > secrets/app_secret.txt    # nilai acak milikmu sendiri; berkas ini tidak di-commit
chmod 644 secrets/app_secret.txt                 # agar bisa dibaca user "node" di dalam container

docker compose up -d --build
docker compose ps                                # tunggu (healthy)
```
Jika `openssl` tidak tersedia: `head -c 16 /dev/urandom | od -An -tx1 | tr -d ' \n' > secrets/app_secret.txt`.

## Verifikasi
```bash
curl -s http://localhost:3000/security-info | jq .
# nonRoot: true
# rootFilesystemWritable: false
# tmpWritable: true
# noNewPrivileges: true
# effectiveCapabilities: "0000000000000000"
# secretLoaded: true

docker compose exec app sh -c 'touch /app/x'     # touch: /app/x: Read-only file system
docker inspect secure-node-app-app-1 --format '{{.HostConfig.ReadonlyRootfs}} {{.HostConfig.CapDrop}} {{.HostConfig.SecurityOpt}}'
# true [ALL] [no-new-privileges:true]

./scripts/audit.sh secure-node-app:1.0.0         # semua PASS
```

## Perbandingan dengan contoh buruk
```bash
docker build -f insecure/Dockerfile -t secure-node-app:insecure-demo .
./scripts/audit.sh secure-node-app:insecure-demo         # FAIL: root, secret di ENV, tanpa HEALTHCHECK
docker inspect secure-node-app:insecure-demo --format '{{json .Config.Env}}'   # DB_PASSWORD terlihat jelas
docker run --rm secure-node-app:insecure-demo id -un     # root
```
Pada pengujian di buku ini: image hardened 249 MB vs. insecure 1,79 GB.

## Memindai
```bash
./scripts/scan.sh secure-node-app:1.0.0
```
Hadolint memberi *saran* (mis. DL3066: user non-numerik; dapat diabaikan atau diganti `USER 1000:1000`). Trivy memindai kerentanan HIGH/CRITICAL dan secret pada isi image.
Hasil pada pengujian (Trivy 0.76.1, database kerentanan 2026-10-28): image hardened **0** temuan HIGH/CRITICAL, sedangkan image insecure **459** (442 HIGH, 17 CRITICAL).
Sebelum `npm` dibuang dari image runtime ada 7 temuan HIGH/CRITICAL (dari paket bawaan npm yang tidak dipakai aplikasi), sehingga membuang alat yang tak diperlukan juga mengurangi permukaan serangan.
**Catatan:** hasil scan berubah setiap hari karena database kerentanan diperbarui. Jalankan ulang secara berkala dan bangun ulang image (`docker compose build --pull`).

### Docker Scout
`docker scout` adalah plugin terpisah pada Docker Engine dan tidak digunakan di sini (tidak terpasang pada mesin pengujian).

## Kesalahan umum
| Gejala | Penyebab | Solusi |
|---|---|---|
| `secretLoaded: false` | berkas `secrets/app_secret.txt` tidak ada, atau tidak dapat dibaca oleh user (uid 1000) di dalam container | buat berkas, `chmod 644` |
| `EROFS: read-only file system` pada log | aplikasi menulis ke direktori selain `/tmp` | tambah `tmpfs:` untuk direktori itu |
| `bind: permission denied` untuk port <1024 | `cap_drop: ALL` | pakai port ≥1024 (di sini 3000) atau `cap_add: NET_BIND_SERVICE` |
| `docker compose` error `secrets ... no such file` | belum membuat `secrets/app_secret.txt` | lihat langkah Menjalankan |
| Trivy lambat pertama kali | mengunduh database kerentanan | normal; di-cache di `~/.cache/trivy` |

## Membersihkan
```bash
docker compose down
docker rmi secure-node-app:insecure-demo         # jika dibuat
rm -f secrets/app_secret.txt                     # secret milikmu sendiri
```
