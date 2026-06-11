# ================================================================
# Dockerfile untuk Spring Boot — Multi-Stage Build
# ================================================================
 
# ════════════════════════════════════════════════════════════════
# STAGE 1: BUILD
# Menggunakan image yang berisi JDK + Maven untuk kompilasi
# Image ini BESAR tapi tidak akan muncul di image final
# ════════════════════════════════════════════════════════════════
FROM maven:3.9.6-eclipse-temurin-17-alpine AS builder
 
LABEL stage="builder"
 
WORKDIR /build
 
# ── Trik penting: salin pom.xml DULU untuk cache dependencies ──
# Maven harus mengunduh semua dependencies dari internet.
# Ini adalah operasi paling lambat dalam build Java.
# Dengan menyalin pom.xml sebelum source code, Docker bisa
# menggunakan layer cache selama pom.xml tidak berubah.
COPY pom.xml .
 
# Unduh semua dependencies ke local Maven repository
# -q: quiet mode (kurangi output)
# go-offline: resolusi semua dependency tanpa akses internet berikutnya
RUN mvn dependency:go-offline -q
 
# ── Baru salin source code dan build ────────────────────────────
# Langkah ini hanya di-invalidate jika source code berubah,
# bukan setiap kali ada perubahan file apapun di proyek
COPY src/ ./src/
 
# Compile dan package menjadi JAR yang dapat dieksekusi
# -DskipTests: lewati pengujian untuk mempercepat build
# -q: quiet mode
RUN mvn clean package -DskipTests -q
 
# Verifikasi JAR berhasil dibuat
RUN ls -lh target/*.jar
 
 
# ════════════════════════════════════════════════════════════════
# STAGE 2: RUNTIME
# Hanya JRE (bukan JDK) — jauh lebih kecil dan lebih aman
# Stage ini yang menjadi image final yang akan di-push ke registry
# ════════════════════════════════════════════════════════════════
FROM eclipse-temurin:17-jre-alpine AS runtime
 
LABEL maintainer="namamu@email.com"
LABEL description="Spring Boot REST API"
 
WORKDIR /app
 
# Salin HANYA file JAR dari stage builder
# Semua file lain (source code, Maven repo, JDK) tidak ikut
COPY --from=builder /build/target/*.jar app.jar
 
# ── Non-root user untuk keamanan ─────────────────────────────
# Alpine menggunakan addgroup/adduser, berbeda dari Debian yang
# menggunakan groupadd/useradd
RUN addgroup -S spring && \
    adduser  -S spring -G spring && \
    chown spring:spring app.jar
 
USER spring:spring
 
# ── Environment variable ─────────────────────────────────────
ENV PORT=8080 \
    APP_VERSION=1.0.0 \
    SPRING_PROFILES_ACTIVE=production
 
# ── Healthcheck menggunakan Spring Actuator ──────────────────
# Actuator menyediakan endpoint /actuator/health yang mengembalikan
# status aplikasi dan semua health indicator yang dikonfigurasi
HEALTHCHECK --interval=30s --timeout=10s \
            --retries=3 --start-period=60s \
  CMD wget -qO- http://localhost:8080/actuator/health \
      | grep -q '"status":"UP"' || exit 1
 
EXPOSE 8080 
# ── JVM flags yang dioptimasi untuk berjalan di dalam container ─
#
# -XX:+UseContainerSupport
#   Aktifkan awareness container — JVM membaca CPU/RAM dari
#   cgroup container, bukan dari sistem operasi host.
#   Tersedia sejak Java 11, default aktif sejak Java 17.
#
# -XX:MaxRAMPercentage=75.0
#   Gunakan maksimal 75% dari RAM container untuk Java heap.
#   Sisa 25% untuk JVM overhead, thread stack, dan OS.
#   Contoh: container 512MB → heap maksimal ~384MB.
#
# -XX:InitialRAMPercentage=50.0
#   Mulai dengan heap 50% dari RAM container.
#   Mengurangi waktu GC di awal sebelum aplikasi warm-up.
#
# -Djava.security.egd=file:/dev/./urandom
#   Menggunakan non-blocking random number generator.
#   Tanpa ini, Spring Boot bisa hang saat startup di environment
#   yang kekurangan entropy (umum di VPS/container).
#
ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-XX:InitialRAMPercentage=50.0", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-jar", "app.jar"]