# =========================================================
# TAHAP 1: Tentukan base image
# Gunakan node versi 18 dengan alpine (ringan)
# =========================================================
FROM node:18-alpine
 
# =========================================================
# TAHAP 2: Set metadata (opsional, tapi praktik yang baik)
# =========================================================
LABEL maintainer="namamu@email.com"
LABEL description="Contoh aplikasi Node.js dengan Docker"
 
# =========================================================
# TAHAP 3: Tetapkan direktori kerja di dalam container
# =========================================================
WORKDIR /app
 
# =========================================================
# TAHAP 4: Salin file dependency TERLEBIH DAHULU
# (manfaatkan layer cache — lihat penjelasan di 2.3)
# =========================================================
COPY package.json package-lock.json ./
 
# =========================================================
# TAHAP 5: Install dependencies
# --omit=dev: hanya install production dependencies
# =========================================================
RUN npm install --omit=dev
 
# =========================================================
# TAHAP 6: Salin seluruh kode aplikasi
# (dilakukan SETELAH npm install agar cache efisien)
# =========================================================
COPY . .
 
# =========================================================
# TAHAP 7: Tetapkan environment variable
# =========================================================
ENV NODE_ENV=production \
    PORT=3000
 
# =========================================================
# TAHAP 8: Dokumentasikan port yang digunakan
# =========================================================
EXPOSE 3000
 
# =========================================================
# TAHAP 9: Perintah yang dijalankan saat container start
# =========================================================
CMD ["node", "server.js"]