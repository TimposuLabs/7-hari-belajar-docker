FROM python:3.13-slim

WORKDIR /app
ENV PYTHONUNBUFFERED=1 PORT=5000

COPY requirements.txt .
# pip dibuang setelah dependency terpasang: tidak dibutuhkan saat runtime
RUN pip install --no-cache-dir -r requirements.txt \
 && pip uninstall -y pip setuptools wheel

COPY app.py gunicorn.conf.py ./

# Jalankan sebagai user biasa, bukan root
RUN useradd --system --no-create-home appuser
USER appuser

EXPOSE 5000
HEALTHCHECK --interval=15s --timeout=5s --retries=3 --start-period=10s \
  CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:5000/health')"]

CMD ["gunicorn", "--config", "gunicorn.conf.py", "app:app"]
