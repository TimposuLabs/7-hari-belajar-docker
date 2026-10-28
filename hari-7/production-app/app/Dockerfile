# Image produksi: multi-stage, non-root, versi tercatat di label + ENV.
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:24-alpine AS runtime
WORKDIR /app

# Diisi saat build: --build-arg VERSION=1.0.0 --build-arg GIT_SHA=abc1234
ARG VERSION=dev
ARG GIT_SHA=unknown
LABEL org.opencontainers.image.title="production-app" \
      org.opencontainers.image.description="API Node.js + PostgreSQL untuk latihan deployment" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${GIT_SHA}" \
      org.opencontainers.image.source="https://github.com/TimposuLabs/7-hari-belajar-docker"

ENV NODE_ENV=production PORT=3000 APP_VERSION=${VERSION} GIT_SHA=${GIT_SHA}

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src/ ./src/

# npm tidak dibutuhkan saat runtime
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --retries=3 --start-period=30s \
  CMD ["wget", "-qO-", "http://127.0.0.1:3000/health"]
CMD ["node", "src/server.js"]
