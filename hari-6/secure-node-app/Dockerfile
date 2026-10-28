# Praktik keamanan pada Dockerfile ini (lihat README untuk penjelasan):
#  1. Tag versi spesifik (bukan "latest") → build dapat diulang
#  2. Multi-stage → image akhir tanpa npm cache / alat build
#  3. npm ci --omit=dev + package-lock.json → dependency terkunci
#  4. USER node → proses tidak berjalan sebagai root
#  5. Tidak ada secret di Dockerfile (secret dibaca dari file saat runtime)
#  6. HEALTHCHECK tanpa tool tambahan
#  7. npm dibuang dari image runtime (tidak dibutuhkan saat berjalan)

FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3000

# File aplikasi dimiliki root dan hanya-baca bagi user "node"
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src/ ./src/

# Aplikasi tidak butuh npm/npx saat berjalan; membuangnya mengecilkan
# permukaan serangan (npm membawa banyak paket yang ikut terpindai CVE).
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --retries=3 --start-period=10s \
  CMD ["wget", "-qO-", "http://127.0.0.1:3000/health"]
CMD ["node", "src/server.js"]
