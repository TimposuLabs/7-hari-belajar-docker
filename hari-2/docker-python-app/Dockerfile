# Base image Python versi 3.11 varian slim (lebih kecil dari full)
FROM python:3.13-slim
 
# Set direktori kerja
WORKDIR /app
 
# Salin file requirements TERLEBIH DAHULU (manfaatkan cache)
COPY requirements.txt .
 
# Install dependencies Python
# --no-cache-dir: jangan simpan cache pip (hemat ruang)
# --upgrade pip: pastikan pip versi terbaru
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt
 
# Salin kode aplikasi
COPY . .
 
# Set environment variable
ENV FLASK_ENV=production \
    PORT=5000
 
# Dokumentasikan port
EXPOSE 5000
 
# Gunakan gunicorn untuk production (lebih baik dari flask run)
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "app:app"]