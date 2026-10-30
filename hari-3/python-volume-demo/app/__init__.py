import os
import time
from flask import Flask, jsonify
from sqlalchemy.exc import OperationalError
from .models import db
 
 
def create_app():
    app = Flask(__name__)
 
    app.config['SQLALCHEMY_DATABASE_URI'] = (
        f"postgresql+psycopg2://{os.environ['DB_USER']}:{os.environ['DB_PASSWORD']}"
        f"@{os.environ['DB_HOST']}:{os.environ.get('DB_PORT', '5432')}"
        f"/{os.environ['DB_NAME']}"
    )
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
 
    db.init_app(app)
 
    from .routes import bp
    app.register_blueprint(bp)
 
    @app.route('/health')
    def health():
        return jsonify({
            'status':  'ok',
            'service': 'python-volume-demo',
            'db':      os.environ.get('DB_HOST'),
        })
 
    # PostgreSQL butuh beberapa detik sebelum siap: coba lagi daripada langsung crash
    with app.app_context():
        for attempt in range(1, 16):
            try:
                db.create_all()
                _seed()
                break
            except OperationalError as err:
                db.session.rollback()
                print(f'[DB] Belum siap (percobaan {attempt}/15): {err.orig}', flush=True)
                time.sleep(2)
        else:
            raise RuntimeError('Database tidak dapat dihubungi')
 
    return app
 
 
def _seed():
    from .models import Product
 
    if Product.query.count() == 0:
        db.session.add_all([
            Product(nama='Laptop Pro X',       harga=18500000, stok=10),
            Product(nama='Keyboard Mechanical', harga=850000,   stok=25),
            Product(nama='Mouse Wireless',      harga=320000,   stok=50),
        ])
        db.session.commit()
        print('[DB] Seed data berhasil dimasukkan')
