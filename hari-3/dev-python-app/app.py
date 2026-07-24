from flask import Flask, jsonify
import os
 
app = Flask(__name__)
 
@app.route('/')
def index():
    # Coba ubah pesan ini setelah container berjalan!
    return jsonify({'pesan': 'Versi 1 — ubah saya!', 'env': 'development'})
 
if __name__ == '__main__':
    # debug=True mengaktifkan auto-reload Flask
    app.run(host='0.0.0.0', port=5000, debug=True)