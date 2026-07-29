from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
 
db = SQLAlchemy()
 
class Product(db.Model):
    __tablename__ = 'products'
 
    id         = db.Column(db.Integer,        primary_key=True)
    nama       = db.Column(db.String(100),    nullable=False)
    harga      = db.Column(db.Numeric(12, 2), nullable=False)
    stok       = db.Column(db.Integer,        default=0)
    created_at = db.Column(db.DateTime,       default=datetime.utcnow)
 
    def to_dict(self):
        return {
            'id':         self.id,
            'nama':       self.nama,
            'harga':      float(self.harga),
            'stok':       self.stok,
            'created_at': self.created_at.isoformat(),
        }