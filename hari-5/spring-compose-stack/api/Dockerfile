# ═══ Tahap 1: build (JDK + Maven, dibuang setelah selesai) ═══
FROM maven:3.9-eclipse-temurin-17-alpine AS builder
WORKDIR /build

# pom.xml disalin lebih dulu agar dependency Maven ter-cache di layer sendiri
COPY pom.xml .
RUN mvn -B -q dependency:go-offline

COPY src/ ./src/
RUN mvn -B -q clean package -DskipTests

# ═══ Tahap 2: runtime (hanya JRE + file JAR) ═══
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

COPY --from=builder /build/target/*.jar app.jar

# Jalankan sebagai user biasa, bukan root
RUN apk upgrade --no-cache && addgroup -S spring && adduser -S spring -G spring
USER spring:spring

ENV PORT=8080
EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --retries=5 --start-period=90s \
  CMD ["sh", "-c", "wget -qO- http://127.0.0.1:8080/actuator/health | grep -q '\"status\":\"UP\"'"]

ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
