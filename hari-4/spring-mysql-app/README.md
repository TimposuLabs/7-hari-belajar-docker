# Hari 4 — Spring Boot REST API + MySQL pada custom network

## Tujuan pembelajaran
- Multi-stage build untuk aplikasi Java.
- Menghubungkan Spring Boot dengan MySQL lewat nama container.
- Memahami bahwa MySQL butuh waktu start lebih lama dan bagaimana aplikasi menunggunya.

## Prasyarat
Docker Engine, `curl`, `jq` (opsional). Build pertama mengunduh dependency Maven (±1–2 menit).

## Struktur
```text
spring-mysql-app/
├── pom.xml                         Spring Boot 3.5.16, Java 17
├── src/main/resources/application.properties   konfigurasi dari environment variable
├── src/main/java/com/belajardocker/
│   ├── SpringMysqlAppApplication.java   entry point + data awal
│   ├── model/Product.java               entity + validasi
│   ├── repository/ProductRepository.java
│   ├── service/ProductService.java
│   └── controller/ProductController.java   endpoint /api/products
├── Dockerfile                      2 tahap: Maven+JDK → JRE; user non-root; HEALTHCHECK
├── .dockerignore
└── .env.example
```

## Cara kerja
- `pom.xml` menimpa `tomcat.version` dan `jackson-bom.version` (versi yang dikelola Spring Boot) untuk menambal CVE yang sudah punya perbaikan. Pada pemindaian Trivy 28-10-2026 masih tersisa 2 temuan HIGH yang sudah ada perbaikannya hanya di versi mayor (`spring-webmvc` 7.x); itu tidak diambil agar tetap sesuai Spring Boot 3.5.x.
- `application.properties` memakai `${DB_HOST}`, `${DB_NAME}`, `${DB_USER}`, `${DB_PASSWORD}`. Tidak ada password default.
- `hikari.initialization-fail-timeout=120000` membuat aplikasi menunggu sampai 120 detik sampai MySQL siap, sehingga tidak perlu `sleep 30`.
- `ddl-auto=update` membuat tabel otomatis (cukup untuk belajar; produksi sebaiknya memakai migrasi).
- Actuator menyediakan `/actuator/health` yang dipakai `HEALTHCHECK`.

## Menjalankan (dari direktori `hari-4/spring-mysql-app`)
```bash
cp .env.example .env            # lalu edit dan GANTI kedua password

docker build -t spring-mysql-app:1.0.0 .

docker network create spring-net
docker volume create mysql-data

docker run -d --name mysql-db --network spring-net \
  --env-file .env \
  -v mysql-data:/var/lib/mysql \
  mysql:8.4

docker run -d --name api-springboot --network spring-net \
  -p 127.0.0.1:8080:8080 \
  -e DB_HOST=mysql-db -e DB_NAME=toko -e DB_USER=admin \
  -e DB_PASSWORD=ISI_MYSQL_PASSWORD_DARI_.env \
  spring-mysql-app:1.0.0
```
Variabel `MYSQL_*` di `.env` dipahami image `mysql` (membuat database `toko` dan user `admin`).

## Verifikasi
```bash
docker ps --format 'table {{.Names}}\t{{.Status}}'     # tunggu api-springboot (healthy), ± 30–90 detik
docker logs api-springboot | grep -E "Started|Aplikasi siap"

curl -s http://localhost:8080/actuator/health          # {"status":"UP"}
curl -s http://localhost:8080/api/products | jq '.total'      # 5
curl -s -X POST http://localhost:8080/api/products -H "Content-Type: application/json" \
  -d '{"nama":"SSD 1TB NVMe","harga":1250000,"stok":15}' | jq .
curl -s -X PUT http://localhost:8080/api/products/1 -H "Content-Type: application/json" -d '{"stok":7}' | jq .data.stok
curl -s "http://localhost:8080/api/products/search?nama=laptop" | jq .
curl -s "http://localhost:8080/api/products/low-stock?threshold=10" | jq .
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:8080/api/products \
  -H "Content-Type: application/json" -d '{"nama":"","harga":-1}'      # 400 (validasi)
```

## Kesalahan umum
| Gejala | Penyebab | Solusi |
|---|---|---|
| `Communications link failure` terus-menerus | `DB_HOST` salah / beda network | cek `docker network inspect spring-net` |
| `Access denied for user 'admin'` | password beda dengan `.env`, atau volume lama | samakan, atau hapus `mysql-data` lalu ulangi |
| `Unknown database 'toko'` | `MYSQL_DATABASE` tidak diset saat inisialisasi pertama | hapus volume dan ulangi |
| Status `unhealthy` | masih start (cek `start-period` 90s) atau error | `docker logs api-springboot` |
| Build lama / gagal unduh Maven | jaringan | ulangi `docker build` (layer dependency di-cache) |

## Membersihkan
```bash
docker rm -f api-springboot mysql-db
docker network rm spring-net
docker volume rm mysql-data       # menghapus data MySQL
```
