# Tahap 1: pasang dependency produksi (npm ci memakai package-lock.json)
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Tahap 2: image runtime yang kecil dan berjalan sebagai user non-root
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src/ ./src/
# npm tidak dibutuhkan saat runtime; membuangnya mengurangi permukaan serangan
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --retries=3 --start-period=30s \
  CMD ["wget", "-qO-", "http://127.0.0.1:3000/health"]
CMD ["node", "src/server.js"]
