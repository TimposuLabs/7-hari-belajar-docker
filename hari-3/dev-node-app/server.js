const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
 
app.get('/', (req, res) => {
  // Coba ubah pesan ini setelah container berjalan!
  res.json({ pesan: 'Versi 1 — ubah saya!' });
});
 
app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] Server berjalan di port ${PORT}`);
});