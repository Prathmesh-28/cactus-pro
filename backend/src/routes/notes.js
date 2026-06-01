const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// GET /api/notes/:companyId
router.get('/:companyId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT content, updated_at FROM notes WHERE company_id = $1',
      [req.params.companyId]
    );
    res.json(rows[0] ?? { content: '', updated_at: null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/notes/:companyId
router.put('/:companyId', async (req, res) => {
  const { content } = req.body;
  if (content === undefined) return res.status(400).json({ error: 'content required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO notes (company_id, content, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (company_id) DO UPDATE
         SET content = $2, updated_at = NOW()
       RETURNING *`,
      [req.params.companyId, content]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
