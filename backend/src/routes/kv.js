/**
 * Key-Value store route — replaces localStorage for all finance/app data.
 * GET  /api/kv/:namespace/:key        → get value
 * PUT  /api/kv/:namespace/:key        → set value (body: { value })
 * GET  /api/kv/:namespace             → get all keys in namespace
 * DELETE /api/kv/:namespace/:key      → delete key
 */
const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// GET all keys in a namespace
router.get('/:namespace', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT key, value, updated_at FROM kv_store WHERE namespace=$1 ORDER BY key',
      [req.params.namespace]
    );
    const obj = {};
    rows.forEach(r => { obj[r.key] = r.value; });
    res.json({ namespace: req.params.namespace, data: obj });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single key
router.get('/:namespace/:key(*)', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT value, updated_at FROM kv_store WHERE namespace=$1 AND key=$2',
      [req.params.namespace, req.params.key]
    );
    if (!rows.length) return res.json({ value: null });
    res.json({ value: rows[0].value, updated_at: rows[0].updated_at });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT (upsert) single key
router.put('/:namespace/:key(*)', async (req, res) => {
  const { value } = req.body;
  if (value === undefined) return res.status(400).json({ error: 'value required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO kv_store (namespace, key, value, updated_at)
       VALUES ($1, $2, $3::jsonb, NOW())
       ON CONFLICT (namespace, key) DO UPDATE
         SET value = $3::jsonb, updated_at = NOW()
       RETURNING key, updated_at`,
      [req.params.namespace, req.params.key, JSON.stringify(value)]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE single key
router.delete('/:namespace/:key(*)', async (req, res) => {
  try {
    await pool.query('DELETE FROM kv_store WHERE namespace=$1 AND key=$2',
      [req.params.namespace, req.params.key]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
