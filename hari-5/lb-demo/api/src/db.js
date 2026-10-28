const { Pool } = require('pg');

// Semua nilai koneksi berasal dari environment variable.
// Tidak ada password default di kode: jika kosong, koneksi gagal dengan jelas.
const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max:                     10,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis:       30000,
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Database butuh beberapa detik sebelum siap menerima koneksi.
// Daripada memakai "sleep" manual di terminal, aplikasi mencoba lagi sendiri.
async function connectWithRetry(attempts = 15, delayMs = 2000) {
  for (let i = 1; i <= attempts; i++) {
    try {
      const client = await pool.connect();
      return client;
    } catch (err) {
      console.log(`[DB] Belum siap (percobaan ${i}/${attempts}): ${err.message}`);
      await sleep(delayMs);
    }
  }
  throw new Error('Database tidak dapat dihubungi');
}

async function initDB() {
  const client = await connectWithRetry();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id         SERIAL PRIMARY KEY,
        nama       VARCHAR(100)   NOT NULL,
        harga      DECIMAL(12, 2) NOT NULL,
        stok       INTEGER        DEFAULT 0,
        created_at TIMESTAMP      DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const { rows } = await client.query('SELECT COUNT(*) AS total FROM products');
    if (parseInt(rows[0].total, 10) === 0) {
      await client.query(`
        INSERT INTO products (nama, harga, stok) VALUES
          ('Laptop Pro X',        18500000, 10),
          ('Keyboard Mechanical',   850000, 25),
          ('Mouse Wireless',        320000, 50),
          ('Monitor 4K 27"',       5200000,  8),
          ('USB-C Hub 7in1',        450000, 30)
      `);
      console.log('[DB] Data awal berhasil dimasukkan');
    }
    console.log(`[DB] Terhubung ke PostgreSQL di host: ${process.env.DB_HOST}`);
  } finally {
    client.release();
  }
}

module.exports = { pool, initDB };
