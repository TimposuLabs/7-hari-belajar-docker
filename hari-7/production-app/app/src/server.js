const express  = require('express');
const os       = require('os');
const { initDB, pool } = require('./db');
const products = require('./routes/products');

const app  = express();
const PORT = process.env.PORT || 3000;

// Hostname di dalam container = Container ID. Dipakai untuk melihat
// container mana yang menjawab request (berguna saat load balancing).
const INSTANCE = {
  id:        os.hostname(),
  startedAt: new Date().toISOString(),
};

app.disable('x-powered-by');
app.use(express.json());

// Log terstruktur (1 baris JSON per request) ke stdout → dibaca `docker logs`
app.use((req, res, next) => {
  const start = Date.now();
  const path  = req.originalUrl.split('?')[0];   // tanpa query string (bisa berisi data sensitif)
  res.on('finish', () => {
    if (path === '/health') return;           // jangan banjiri log dengan health check
    console.log(JSON.stringify({
      time: new Date().toISOString(), level: 'info', msg: 'request',
      method: req.method, path, status: res.statusCode,
      ms: Date.now() - start, instance: INSTANCE.id,
    }));
  });
  next();
});

app.use((req, res, next) => {
  res.setHeader('X-Served-By', INSTANCE.id);
  next();
});

// Health check: dipakai oleh HEALTHCHECK Docker dan Docker Compose
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status:    'ok',
      service:   'node-postgres-api',
      instance:  INSTANCE.id,
      uptime:    `${Math.floor(process.uptime())}s`,
      database:  'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

// Versi yang sedang berjalan: jawaban untuk "image mana yang ada di production?"
app.get('/version', (req, res) => {
  res.json({
    version: process.env.APP_VERSION || 'dev',
    gitSha:  process.env.GIT_SHA || 'unknown',
    node:    process.version,
  });
});

// Menunjukkan container mana yang melayani request
app.get('/which', (req, res) => {
  res.json({
    message:   'Request ini dilayani oleh container:',
    container: INSTANCE.id,
    startedAt: INSTANCE.startedAt,
  });
});

app.use('/api/products', products);

app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} tidak ditemukan` });
});

let server;
(async () => {
  try {
    await initDB();
    server = app.listen(PORT, () => {
      console.log(`[${INSTANCE.id}] API berjalan di port ${PORT}`);
    });
  } catch (err) {
    console.error('[FATAL] Gagal startup:', err.message);
    process.exit(1);
  }
})();

// Graceful shutdown: dipanggil saat "docker stop" mengirim SIGTERM
process.on('SIGTERM', () => {
  console.log(`[${INSTANCE.id}] SIGTERM diterima, menutup server...`);
  if (!server) process.exit(0);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
});
