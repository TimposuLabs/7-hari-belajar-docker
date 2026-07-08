from flask import Flask, jsonify
import os
from datetime import datetime
 
app = Flask(__name__)
 
@app.route('/')
def index():
    return jsonify({
        'pesan': 'Halo dari Docker dengan Python!',
        'versi': '1.0.0',
        'environment': os.environ.get('FLASK_ENV', 'development')
    })
 
@app.route('/health')
def health():
    return jsonify({
        'status': 'ok',
        'timestamp': datetime.utcnow().isoformat()
    })
 
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)