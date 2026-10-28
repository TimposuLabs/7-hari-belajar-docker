const express  = require('express');
const router   = express.Router();
const { pool } = require('../db');

const instanceId = require('os').hostname();

function isValidId(value) {
  return /^[0-9]+$/.test(value);
}

// GET /api/products : ambil semua produk
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM products ORDER BY id'
    );
    res.json({ success: true, total: rows.length, servedBy: instanceId, data: rows });
  } catch (err) {
    console.error('[ERROR] GET /api/products:', err.message);
    res.status(500).json({ success: false, error: 'Gagal membaca data' });
  }
});

// GET /api/products/:id : ambil satu produk
router.get('/:id', async (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ success: false, error: 'ID harus berupa angka' });
  }
  try {
    const { rows } = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Produk tidak ditemukan' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[ERROR] GET /api/products/:id:', err.message);
    res.status(500).json({ success: false, error: 'Gagal membaca data' });
  }
});

// POST /api/products : tambah produk baru
router.post('/', async (req, res) => {
  const { nama, harga, stok = 0 } = req.body || {};
  if (!nama || harga === undefined) {
    return res.status(400).json({ success: false, error: 'nama dan harga wajib diisi' });
  }
  try {
    const { rows } = await pool.query(
      'INSERT INTO products (nama, harga, stok) VALUES ($1, $2, $3) RETURNING *',
      [nama, harga, stok]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[ERROR] POST /api/products:', err.message);
    res.status(500).json({ success: false, error: 'Gagal menyimpan data' });
  }
});

// PUT /api/products/:id : ubah sebagian atau seluruh field
router.put('/:id', async (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ success: false, error: 'ID harus berupa angka' });
  }
  const { nama, harga, stok } = req.body || {};
  try {
    const { rows } = await pool.query(
      `UPDATE products SET
         nama  = COALESCE($1, nama),
         harga = COALESCE($2, harga),
         stok  = COALESCE($3, stok)
       WHERE id = $4 RETURNING *`,
      [nama, harga, stok, req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Produk tidak ditemukan' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[ERROR] PUT /api/products/:id:', err.message);
    res.status(500).json({ success: false, error: 'Gagal mengubah data' });
  }
});

// DELETE /api/products/:id : hapus produk
router.delete('/:id', async (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ success: false, error: 'ID harus berupa angka' });
  }
  try {
    const { rows } = await pool.query('DELETE FROM products WHERE id = $1 RETURNING id', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Produk tidak ditemukan' });
    }
    res.json({ success: true, message: 'Produk berhasil dihapus' });
  } catch (err) {
    console.error('[ERROR] DELETE /api/products/:id:', err.message);
    res.status(500).json({ success: false, error: 'Gagal menghapus data' });
  }
});

module.exports = router;
