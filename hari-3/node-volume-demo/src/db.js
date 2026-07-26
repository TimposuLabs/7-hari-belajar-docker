const { Pool } = require('pg');
 
const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'toko',
  user:     process.env.DB_USER     || 'admin',
  password: process.env.DB_PASSWORD || 'rahasia',
  max: 10,
  connectionTimeoutMillis: 10000,
});
 
async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id         SERIAL PRIMARY KEY,
        nama       VARCHAR(100) NOT NULL,
        harga      DECIMAL(12,2) NOT NULL,
        stok       INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    const { rows } = await client.query(
      'SELECT COUNT(*) AS total FROM products'
    );
    if (parseInt(rows[0].total) === 0) {
      await client.query(`
        INSERT INTO products (nama, harga, stok) VALUES
          ('Laptop Pro X',        18500000, 10),
          ('Keyboard Mechanical',   850000, 25),
          ('Mouse Wireless',        320000, 50)
      `);
      console.log('[DB] Seed data berhasil dimasukkan');
    }
    console.log(`[DB] Terhubung ke PostgreSQL: ${process.env.DB_HOST}`);
  } finally {
    client.release();
  }
}
 
module.exports = { pool, initDB };