const express = require('express');
const fs      = require('fs');
const os      = require('os');
const crypto  = require('crypto');

const app  = express();
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');

// ── Secret dibaca dari FILE saat runtime (bukan dari ENV / Dockerfile) ──────
// Docker Compose "secrets" memasang file di /run/secrets/<nama>.
function readSecret() {
  const file = process.env.APP_SECRET_FILE;
  if (!file) return null;
  try {
    return fs.readFileSync(file, 'utf8').trim();
  } catch (err) {
    return null;
  }
}
const SECRET = readSecret();

function canWrite(dir) {
  try {
    const f = `${dir}/.tulis-${process.pid}`;
    fs.writeFileSync(f, 'x');
    fs.unlinkSync(f);
    return true;
  } catch (err) {
    return false;
  }
}

function procStatus(key) {
  try {
    const line = fs.readFileSync('/proc/self/status', 'utf8')
      .split('\n').find((l) => l.startsWith(`${key}:`));
    return line ? line.split(':')[1].trim() : null;
  } catch (err) {
    return null;
  }
}

// Struktur JSON sederhana: tidak pernah mengembalikan nilai secret.
app.get('/security-info', (req, res) => {
  res.json({
    user: { uid: process.getuid(), gid: process.getgid() },
    nonRoot: process.getuid() !== 0,
    rootFilesystemWritable: canWrite('/app'),
    tmpWritable: canWrite('/tmp'),
    noNewPrivileges: procStatus('NoNewPrivs') === '1',
    effectiveCapabilities: procStatus('CapEff'),   // 0000000000000000 = tanpa capability
    secretLoaded: SECRET !== null,
    secretFingerprint: SECRET
      ? crypto.createHash('sha256').update(SECRET).digest('hex').slice(0, 8)
      : null,
    hostname: os.hostname(),
  });
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.get('/', (req, res) => res.json({ message: 'Halo dari container yang di-hardening', docs: '/security-info' }));

const server = app.listen(PORT, () => console.log(`Server berjalan di port ${PORT}`));

// Graceful shutdown untuk SIGTERM (docker stop)
process.on('SIGTERM', () => server.close(() => process.exit(0)));
