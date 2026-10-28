import os
import time
from datetime import datetime, timezone

import psycopg2
from psycopg2.extras import RealDictCursor
from flask import Flask, jsonify, request

app = Flask(__name__)


def get_conn():
    """Buka koneksi baru ke PostgreSQL. DB_HOST = nama service di Compose."""
    return psycopg2.connect(
        host=os.environ['DB_HOST'],
        port=os.environ.get('DB_PORT', '5432'),
        dbname=os.environ['DB_NAME'],
        user=os.environ['DB_USER'],
        password=os.environ['DB_PASSWORD'],
        connect_timeout=5,
    )


def init_db(attempts=15, delay=2):
    """Buat tabel dan data awal. Mencoba lagi jika database belum siap."""
    for i in range(1, attempts + 1):
        try:
            with get_conn() as conn, conn.cursor() as cur:
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS products (
                        id         SERIAL PRIMARY KEY,
                        nama       VARCHAR(100)   NOT NULL,
                        harga      DECIMAL(12, 2) NOT NULL,
                        stok       INTEGER        DEFAULT 0,
                        created_at TIMESTAMP      DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                # Advisory lock: hanya satu worker Gunicorn yang mengisi data awal
                cur.execute("SELECT pg_advisory_xact_lock(42)")
                cur.execute("SELECT COUNT(*) FROM products")
                if cur.fetchone()[0] == 0:
                    cur.execute("""
                        INSERT INTO products (nama, harga, stok) VALUES
                          ('Laptop Pro X', 18500000, 10),
                          ('Keyboard Mechanical', 850000, 25),
                          ('Mouse Wireless', 320000, 50)
                    """)
            print('[DB] Siap', flush=True)
            return
        except psycopg2.OperationalError as err:
            print(f'[DB] Belum siap ({i}/{attempts}): {err}'.strip(), flush=True)
            time.sleep(delay)
    raise RuntimeError('Database tidak dapat dihubungi')


init_db()


@app.route('/health')
def health():
    try:
        with get_conn() as conn, conn.cursor() as cur:
            cur.execute('SELECT 1')
        return jsonify({'status': 'ok', 'database': 'connected',
                        'timestamp': datetime.now(timezone.utc).isoformat()})
    except psycopg2.Error:
        return jsonify({'status': 'error', 'database': 'disconnected'}), 503


@app.route('/api/products', methods=['GET'])
def list_products():
    with get_conn() as conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute('SELECT * FROM products ORDER BY id')
        rows = cur.fetchall()
    return jsonify({'success': True, 'total': len(rows), 'data': rows})


@app.route('/api/products/<int:product_id>', methods=['GET'])
def get_product(product_id):
    with get_conn() as conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute('SELECT * FROM products WHERE id = %s', (product_id,))
        row = cur.fetchone()
    if not row:
        return jsonify({'success': False, 'error': 'Produk tidak ditemukan'}), 404
    return jsonify({'success': True, 'data': row})


@app.route('/api/products', methods=['POST'])
def create_product():
    data = request.get_json(silent=True) or {}
    if not data.get('nama') or data.get('harga') is None:
        return jsonify({'success': False, 'error': 'nama dan harga wajib diisi'}), 400
    with get_conn() as conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            'INSERT INTO products (nama, harga, stok) VALUES (%s, %s, %s) RETURNING *',
            (data['nama'], data['harga'], data.get('stok', 0)))
        row = cur.fetchone()
    return jsonify({'success': True, 'data': row}), 201


@app.route('/api/products/<int:product_id>', methods=['DELETE'])
def delete_product(product_id):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute('DELETE FROM products WHERE id = %s', (product_id,))
        deleted = cur.rowcount
    if not deleted:
        return jsonify({'success': False, 'error': 'Produk tidak ditemukan'}), 404
    return jsonify({'success': True, 'message': 'Produk berhasil dihapus'})
