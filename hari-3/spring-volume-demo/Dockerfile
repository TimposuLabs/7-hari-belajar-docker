FROM maven:3.9-eclipse-temurin-17-alpine AS builder
WORKDIR /build
COPY pom.xml .
RUN mvn dependency:go-offline -q
COPY src/ ./src/
RUN mvn clean package -DskipTests -q
 
FROM eclipse-temurin:17-jre-alpine AS runtime
WORKDIR /app
COPY --from=builder /build/target/*.jar app.jar
RUN apk upgrade --no-cache && addgroup -S spring && adduser -S spring -G spring && \
    chown spring:spring app.jar
USER spring:spring
ENV PORT=8080
HEALTHCHECK --interval=30s --timeout=10s --retries=5 --start-period=90s \
  CMD wget -qO- http://localhost:8080/actuator/health \
      | grep -q '"status":"UP"' || exit 1
EXPOSE 8080
ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-jar", "app.jar"]