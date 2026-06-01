require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDb } = require('./db');
const notesRouter = require('./routes/notes');
const filesRouter = require('./routes/files');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:5173',
    'http://localhost:4173',
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '1mb' }));

app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use('/api/notes', notesRouter);
app.use('/api/files', filesRouter);

app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

initDb()
  .then(() => {
    app.listen(PORT, () => console.log(`Cactus backend running on port ${PORT}`));
  })
  .catch(err => {
    console.error('Failed to initialise DB:', err.message);
    process.exit(1);
  });
