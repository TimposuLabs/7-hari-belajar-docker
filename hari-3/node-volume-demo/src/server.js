const express       = require('express');
const { initDB }    = require('./db');
const productsRoute = require('./routes/products');
 
const app  = express();
const PORT = process.env.PORT || 3000;
 
app.use(express.json());
 
app.get('/health', (req, res) => {
  res.json({
    status:    'ok',
    service:   'node-volume-demo',
    db:        process.env.DB_HOST,
    timestamp: new Date().toISOString(),
  });
});
 
app.use('/api/products', productsRoute);
 
app.use((req, res) => {
  res.status(404).json({ error: `${req.method} ${req.path} tidak ditemukan` });
});
 
(async () => {
  await initDB();
  app.listen(PORT, () =>
    console.log(`[API] Berjalan di port ${PORT}`)
  );
  process.on('SIGTERM', () => process.exit(0));
})();