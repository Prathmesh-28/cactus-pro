require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const bcrypt  = require('bcryptjs');
const { initDb, pool } = require('./db');
const { authenticate } = require('./middleware/auth');

const notesRouter = require('./routes/notes');
const filesRouter = require('./routes/files');
const kvRouter    = require('./routes/kv');
const syncRouter  = require('./routes/sync');
const authRouter  = require('./routes/auth');
const usersRouter = require('./routes/users');
const aiRouter    = require('./routes/ai');
const { router: microsoftRouter } = require('./routes/microsoft');

const app  = express();
const PORT = process.env.PORT || 4000;

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:4173',
  'capacitor://localhost',   // iOS Capacitor app origin
  'https://localhost',       // Android Capacitor app origin
];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) cb(null, true);
    else cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));

// ── Public routes (no auth) ───────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.use('/auth', authRouter);         // /auth/login, /auth/refresh, etc.

// File downloads: IMAGES are public (logos/avatars must render in <img> tags that
// can't send a JWT). Non-image files (PDFs, term sheets, cap tables, signed docs)
// require authentication — they were previously served to anyone who could guess a
// sequential file id (IDOR). The authenticated route lives in filesRouter.
const { pool: _p } = require('./db');
app.get('/api/files/download/:fileId', async (req, res, next) => {
  try {
    const { rows } = await _p.query(
      'SELECT original_name, mime_type, file_data FROM files WHERE id=$1',
      [req.params.fileId]
    );
    if (!rows.length) return res.status(404).json({ error: 'File not found' });
    const file = rows[0];
    // Only images are public here. Anything else falls through to the
    // authenticated /api/files router below.
    if (!file.mime_type || !file.mime_type.startsWith('image/')) {
      return authenticate(req, res, () => sendFile(res, file));
    }
    sendFile(res, file);
  } catch (err) { next(err); }
});

function sendFile(res, file) {
  res.setHeader('Content-Type', file.mime_type);
  res.setHeader('Content-Disposition', `inline; filename="${file.original_name}"`);
  res.setHeader('Cache-Control', 'public, max-age=86400'); // cache 24h
  res.send(file.file_data);
}

// ── Generic email send endpoint ───────────────────────────────────────────────
const { sendGeneric } = require('./lib/email');
app.post('/api/email/send', authenticate, async (req, res) => {
  try {
    const { to, subject, body, cc, bcc, from_name } = req.body;
    if (!to || !subject || !body) return res.status(400).json({ error: 'to, subject, body required' });
    await sendGeneric({ to, subject, body, cc, bcc, from_name: from_name || 'Cactus Partners' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Email send error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Protected routes (JWT required) ──────────────────────────────────────────
app.use('/api/notes', authenticate, notesRouter);
app.use('/api/files', authenticate, filesRouter); // upload/delete/list still auth-gated
app.use('/api/kv',    authenticate, kvRouter);
app.use('/api/sync',  authenticate, syncRouter);
app.use('/api/users', usersRouter);   // auth applied inside router
app.use('/api/ai',    authenticate, aiRouter);
app.use('/api/microsoft', microsoftRouter);  // public callback + authenticated routes    // Claude-backed assistant proxy

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Seed first super admin if no users exist ──────────────────────────────────
async function seedAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPass  = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPass) return;
  const { rows } = await pool.query('SELECT id FROM users WHERE email=$1', [adminEmail]);
  if (rows.length) return; // already exists
  const hash = await bcrypt.hash(adminPass, 12);
  await pool.query(
    'INSERT INTO users(email,name,role,password_hash,is_active) VALUES($1,$2,$3,$4,true)',
    [adminEmail, 'Super Admin', 'super_admin', hash]
  );
  console.log(`✓ Seeded admin: ${adminEmail}`);
}

initDb()
  .then(seedAdmin)
  .then(() => {
    app.listen(PORT, () => console.log(`Cactus backend running on port ${PORT}`));
  })
  .catch(err => {
    console.error('Failed to start:', err.message);
    process.exit(1);
  });
