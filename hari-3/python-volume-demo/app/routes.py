from flask import Blueprint, jsonify, request
from .models import db, Product
 
bp = Blueprint('api', __name__, url_prefix='/api')
 
 
@bp.route('/products', methods=['GET'])
def get_products():
    products = Product.query.order_by(Product.created_at.desc()).all()
    return jsonify({'success': True, 'total': len(products),
                    'data': [p.to_dict() for p in products]})
 
 
@bp.route('/products/<int:pid>', methods=['GET'])
def get_product(pid):
    p = Product.query.get_or_404(pid, description='Produk tidak ditemukan')
    return jsonify({'success': True, 'data': p.to_dict()})
 
 
@bp.route('/products', methods=['POST'])
def create_product():
    d = request.get_json() or {}
    if not d.get('nama') or d.get('harga') is None:
        return jsonify({'success': False,
                        'error': 'nama dan harga wajib'}), 400
    p = Product(nama=d['nama'], harga=d['harga'], stok=d.get('stok', 0))
    db.session.add(p)
    db.session.commit()
    return jsonify({'success': True, 'data': p.to_dict()}), 201
 
 
@bp.route('/products/<int:pid>', methods=['PUT'])
def update_product(pid):
    p = Product.query.get_or_404(pid)
    d = request.get_json() or {}
    if 'nama'  in d: p.nama  = d['nama']
    if 'harga' in d: p.harga = d['harga']
    if 'stok'  in d: p.stok  = d['stok']
    db.session.commit()
    return jsonify({'success': True, 'data': p.to_dict()})
 
 
@bp.route('/products/<int:pid>', methods=['DELETE'])
def delete_product(pid):
    p = Product.query.get_or_404(pid)
    db.session.delete(p)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Produk berhasil dihapus'})