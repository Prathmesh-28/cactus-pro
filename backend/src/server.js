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

const app  = express();
const PORT = process.env.PORT || 4000;

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:4173',
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

// ── Protected routes (JWT required) ──────────────────────────────────────────
app.use('/api/notes', authenticate, notesRouter);
app.use('/api/files', authenticate, filesRouter);
app.use('/api/kv',    authenticate, kvRouter);
app.use('/api/sync',  authenticate, syncRouter);
app.use('/api/users', usersRouter);   // auth applied inside router

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
