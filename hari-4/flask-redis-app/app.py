import json
import os
import time
from datetime import datetime, timezone

import redis
from flask import Flask, jsonify, request

app = Flask(__name__)

# ─── Koneksi ke Redis ────────────────────────────────────────────────────────
# REDIS_HOST diisi lewat environment variable. Di Docker, nilainya adalah
# NAMA container Redis (mis. "redis-cache"), bukan "localhost".
REDIS_HOST = os.environ.get('REDIS_HOST', 'localhost')
redis_client = redis.Redis(
    host=REDIS_HOST,
    port=int(os.environ.get('REDIS_PORT', 6379)),
    db=0,
    decode_responses=True,       # otomatis ubah bytes menjadi string
    socket_connect_timeout=3,
    socket_timeout=3,
)

# ─── Data produk simulasi (pengganti database) ───────────────────────────────
PRODUCTS_DB = {
    "1": {"id": 1, "nama": "Laptop Pro X",        "harga": 18500000, "stok": 10},
    "2": {"id": 2, "nama": "Mechanical Keyboard", "harga": 850000,   "stok": 25},
    "3": {"id": 3, "nama": "Mouse Wireless",      "harga": 320000,   "stok": 50},
    "4": {"id": 4, "nama": "Monitor 27\" 4K",     "harga": 5200000,  "stok": 8},
    "5": {"id": 5, "nama": "USB-C Hub 7-in-1",    "harga": 450000,   "stok": 30},
}

CACHE_TTL = 30  # cache berlaku 30 detik


def simulate_slow_query(seconds=1):
    """Simulasi query database yang lambat."""
    time.sleep(seconds)


def now_iso():
    return datetime.now(timezone.utc).isoformat()


@app.route('/health')
def health():
    redis_ok = False
    try:
        redis_client.ping()
        redis_ok = True
    except redis.RedisError:
        pass
    return jsonify({
        'status':     'ok' if redis_ok else 'degraded',
        'service':    'flask-redis-api',
        'redis':      'connected' if redis_ok else 'disconnected',
        'redis_host': REDIS_HOST,
        'timestamp':  now_iso(),
    }), (200 if redis_ok else 503)


@app.route('/api/products')
def get_products():
    """Cache-aside: cek Redis dulu; jika tidak ada, ambil dari 'database' lalu simpan ke cache."""
    cache_key = 'products:all'
    start = time.time()

    cached = redis_client.get(cache_key)
    if cached:
        return jsonify({
            'success': True, 'source': 'cache',
            'elapsed_ms': round((time.time() - start) * 1000, 2),
            'data': json.loads(cached),
        })

    simulate_slow_query(1)
    products = list(PRODUCTS_DB.values())
    redis_client.setex(cache_key, CACHE_TTL, json.dumps(products))
    return jsonify({
        'success': True, 'source': 'database',
        'elapsed_ms': round((time.time() - start) * 1000, 2),
        'data': products,
    })


@app.route('/api/products/<int:product_id>')
def get_product(product_id):
    cache_key = f'products:{product_id}'
    start = time.time()

    cached = redis_client.get(cache_key)
    if cached:
        return jsonify({
            'success': True, 'source': 'cache',
            'elapsed_ms': round((time.time() - start) * 1000, 2),
            'data': json.loads(cached),
        })

    product = PRODUCTS_DB.get(str(product_id))
    if not product:
        return jsonify({'success': False, 'error': 'Produk tidak ditemukan'}), 404

    simulate_slow_query(0.5)
    redis_client.setex(cache_key, CACHE_TTL, json.dumps(product))
    return jsonify({
        'success': True, 'source': 'database',
        'elapsed_ms': round((time.time() - start) * 1000, 2),
        'data': product,
    })


@app.route('/api/products', methods=['POST'])
def create_product():
    data = request.get_json(silent=True)
    if not data or not data.get('nama') or not data.get('harga'):
        return jsonify({'success': False, 'error': 'nama dan harga wajib diisi'}), 400

    new_id = max(int(k) for k in PRODUCTS_DB) + 1
    product = {
        'id': new_id, 'nama': data['nama'],
        'harga': data['harga'], 'stok': data.get('stok', 0),
    }
    PRODUCTS_DB[str(new_id)] = product
    redis_client.delete('products:all')  # daftar lama tidak berlaku lagi
    return jsonify({'success': True, 'data': product}), 201


@app.route('/cache/flush', methods=['DELETE'])
def flush_cache():
    """Hapus cache aplikasi ini saja (hanya key berawalan 'products:')."""
    deleted = 0
    for key in redis_client.scan_iter('products:*'):
        deleted += redis_client.delete(key)
    return jsonify({'success': True, 'message': 'Cache dihapus', 'keys_deleted': deleted})


@app.route('/cache/stats')
def cache_stats():
    info = redis_client.info()
    keys = sorted(redis_client.scan_iter('products:*'))
    return jsonify({
        'total_keys':        len(keys),
        'product_keys':      keys,
        'used_memory_human': info.get('used_memory_human'),
        'connected_clients': info.get('connected_clients'),
        'total_commands':    info.get('total_commands_processed'),
    })


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)), debug=False)
