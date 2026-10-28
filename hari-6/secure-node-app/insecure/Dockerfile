# ⚠️ CONTOH BURUK — JANGAN DIPAKAI. Hanya untuk membandingkan dengan Dockerfile hardened.
# Nilai secret di bawah adalah PALSU dan memang disengaja untuk didemonstrasikan.
FROM node:latest
WORKDIR /app
ENV DB_PASSWORD=PALSU_hanya_untuk_demo_123
COPY . .
RUN npm install
EXPOSE 3000
CMD ["node", "src/server.js"]
