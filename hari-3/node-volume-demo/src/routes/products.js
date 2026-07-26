const express  = require('express');
const router   = express.Router();
const { pool } = require('../db');
 
// GET /api/products
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM products ORDER BY created_at DESC'
    );
    res.json({ success: true, total: rows.length, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
 
// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM products WHERE id = $1', [req.params.id]
    );
    if (!rows.length)
      return res.status(404).json({ success: false, error: 'Produk tidak ditemukan' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
 
// POST /api/products
router.post('/', async (req, res) => {
  const { nama, harga, stok = 0 } = req.body;
  if (!nama || harga === undefined)
    return res.status(400).json({ success: false, error: 'nama dan harga wajib' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO products (nama, harga, stok) VALUES ($1,$2,$3) RETURNING *',
      [nama, harga, stok]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
 
// PUT /api/products/:id
router.put('/:id', async (req, res) => {
  const { nama, harga, stok } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE products
         SET nama  = COALESCE($1, nama),
             harga = COALESCE($2, harga),
             stok  = COALESCE($3, stok)
       WHERE id = $4 RETURNING *`,
      [nama, harga, stok, req.params.id]
    );
    if (!rows.length)
      return res.status(404).json({ success: false, error: 'Produk tidak ditemukan' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
 
// DELETE /api/products/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM products WHERE id = $1 RETURNING *', [req.params.id]
    );
    if (!rows.length)
      return res.status(404).json({ success: false, error: 'Produk tidak ditemukan' });
    res.json({ success: true, message: 'Produk berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
 
module.exports = router;