# Hari 6 — Best Practice & Keamanan Container

Bab buku: `07_day_6_Best_Practice_Keamanan_Container.md`

| Direktori | Isi |
|---|---|
| [`secure-node-app/`](secure-node-app/README.md) | Dockerfile & Compose yang di-hardening, perbandingan dengan contoh buruk, skrip audit dan scan |
| [`lb-production/`](lb-production/README.md) | Load balancing yang diperkeras: rate limiting, header keamanan, Nginx `read_only`, scaling |

Ringkasan praktik yang diuji di sini: user non-root, tag spesifik, multi-stage, `.dockerignore`, secret via file,
`read_only`, `cap_drop: ALL`, `no-new-privileges`, batas sumber daya, Hadolint, Trivy.
Tidak ada container `--privileged` dan tidak ada akses ke Docker daemon dari dalam container.
