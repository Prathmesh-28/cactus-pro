const express = require('express');
const router = express.Router();
const multer = require('multer');
const { pool } = require('../db');

// Store files in memory (saved to Postgres as binary)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB limit
  fileFilter: (_, file, cb) => {
    // Accept all image formats + documents
    const allowed = [
      'image/png', 'image/jpeg', 'image/jpg', 'image/webp',
      'image/svg+xml', 'image/gif', 'image/avif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
    ];
    // Also accept anything that starts with image/ as a safety net
    cb(null, allowed.includes(file.mimetype) || file.mimetype.startsWith('image/'));
  },
});

// GET /api/files/:companyId — list files (no binary data)
router.get('/:companyId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, company_id, original_name, mime_type, file_size, uploaded_at FROM files WHERE company_id = $1 ORDER BY uploaded_at DESC',
      [req.params.companyId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/files/:companyId — upload a file
router.post('/:companyId', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded or unsupported type' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO files (company_id, original_name, mime_type, file_size, file_data)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, company_id, original_name, mime_type, file_size, uploaded_at`,
      [req.params.companyId, req.file.originalname, req.file.mimetype, req.file.size, req.file.buffer]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/files/download/:fileId — download a file
router.get('/download/:fileId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT original_name, mime_type, file_data FROM files WHERE id = $1',
      [req.params.fileId]
    );
    if (!rows.length) return res.status(404).json({ error: 'File not found' });
    const file = rows[0];
    res.setHeader('Content-Type', file.mime_type);
    res.setHeader('Content-Disposition', `inline; filename="${file.original_name}"`);
    res.send(file.file_data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/files/:fileId
router.delete('/:fileId', async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM files WHERE id = $1', [req.params.fileId]);
    if (!rowCount) return res.status(404).json({ error: 'File not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
