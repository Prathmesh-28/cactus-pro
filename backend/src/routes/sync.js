/**
 * SharePoint / OneDrive Excel sync route.
 *
 * POST /api/sync/fetch   → fetch Excel from URL, parse, return sheets as JSON
 * GET  /api/sync/sources → list saved sync sources
 * POST /api/sync/sources → save a new sync source
 * PUT  /api/sync/sources/:id → update source
 * DELETE /api/sync/sources/:id → remove source
 * POST /api/sync/sources/:id/run → run sync now (fetch + store in kv_store)
 */
const express = require('express');
const router = express.Router();
const https = require('https');
const http = require('http');
const XLSX = require('xlsx');
const { pool } = require('../db');

// ─── Helper: follow redirects and download file buffer ────────────────────────

function downloadBuffer(url, maxRedirects = 8) {
  return new Promise((resolve, reject) => {
    const follow = (currentUrl, remaining) => {
      const mod = currentUrl.startsWith('https') ? https : http;
      const req = mod.get(currentUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 CactusProSync/1.0',
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,*/*',
        },
      }, (res) => {
        // Follow redirects
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          if (remaining <= 0) return reject(new Error('Too many redirects'));
          const next = res.headers.location.startsWith('http')
            ? res.headers.location
            : new URL(res.headers.location, currentUrl).toString();
          res.resume();
          return follow(next, remaining - 1);
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode} from ${currentUrl}`));
        }
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      });
      req.on('error', reject);
      req.setTimeout(30000, () => { req.destroy(); reject(new Error('Request timed out')); });
    };
    follow(url, maxRedirects);
  });
}

// ─── Convert SharePoint sharing URL to a direct download URL ─────────────────

function toDirectDownloadUrl(url) {
  // OneDrive/SharePoint "share" URLs → append &download=1
  if (url.includes('sharepoint.com') || url.includes('onedrive.live.com') || url.includes('1drv.ms')) {
    const sep = url.includes('?') ? '&' : '?';
    return url + sep + 'download=1';
  }
  return url;
}

// ─── Parse Excel buffer to JSON (all sheets) ──────────────────────────────────

function parseExcel(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const result = {};
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    result[sheetName] = XLSX.utils.sheet_to_json(ws, { defval: null, raw: false });
  }
  return { sheets: Object.keys(wb.SheetNames ? wb.SheetNames : []), sheetData: result };
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// POST /api/sync/fetch  { url }  → parse Excel, return sheets preview
router.post('/fetch', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });
  try {
    const downloadUrl = toDirectDownloadUrl(url.trim());
    const buffer = await downloadBuffer(downloadUrl);
    const { sheetData } = parseExcel(buffer);
    const sheets = Object.keys(sheetData);
    // Return preview: sheet names + first 5 rows each
    const preview = {};
    sheets.forEach(s => { preview[s] = sheetData[s].slice(0, 5); });
    res.json({ sheets, preview, rowCounts: Object.fromEntries(sheets.map(s => [s, sheetData[s].length])) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sync/sources
router.get('/sources', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, url, sheet_mappings, last_synced_at, last_sync_status, last_sync_error FROM sync_sources ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sync/sources  { name, url, sheet_mappings }
router.post('/sources', async (req, res) => {
  const { name, url, sheet_mappings = [] } = req.body;
  if (!name || !url) return res.status(400).json({ error: 'name and url required' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO sync_sources (name, url, sheet_mappings) VALUES ($1, $2, $3) RETURNING *',
      [name, url, JSON.stringify(sheet_mappings)]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/sync/sources/:id
router.put('/sources/:id', async (req, res) => {
  const { name, url, sheet_mappings } = req.body;
  try {
    const sets = [];
    const vals = [];
    let i = 1;
    if (name)           { sets.push(`name=$${i++}`);           vals.push(name); }
    if (url)            { sets.push(`url=$${i++}`);            vals.push(url); }
    if (sheet_mappings) { sets.push(`sheet_mappings=$${i++}`); vals.push(JSON.stringify(sheet_mappings)); }
    if (!sets.length)   return res.status(400).json({ error: 'nothing to update' });
    vals.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE sync_sources SET ${sets.join(',')} WHERE id=$${i} RETURNING *`, vals
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/sync/sources/:id
router.delete('/sources/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM sync_sources WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sync/sources/:id/run  → fetch + store data in kv_store
router.post('/sources/:id/run', async (req, res) => {
  let source;
  try {
    const { rows } = await pool.query('SELECT * FROM sync_sources WHERE id=$1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Source not found' });
    source = rows[0];

    const downloadUrl = toDirectDownloadUrl(source.url);
    const buffer = await downloadBuffer(downloadUrl);
    const { sheetData } = parseExcel(buffer);

    const mappings = source.sheet_mappings || [];
    const stored = [];

    for (const mapping of mappings) {
      const { sheet, kvNamespace, kvKey } = mapping;
      const data = sheetData[sheet];
      if (!data) continue;

      await pool.query(
        `INSERT INTO kv_store (namespace, key, value, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (namespace, key) DO UPDATE SET value=$3, updated_at=NOW()`,
        [kvNamespace, kvKey, JSON.stringify(data)]
      );
      stored.push({ sheet, kvNamespace, kvKey, rows: data.length });
    }

    await pool.query(
      `UPDATE sync_sources SET last_synced_at=NOW(), last_sync_status='success', last_sync_error=NULL WHERE id=$1`,
      [source.id]
    );

    res.json({ success: true, stored, syncedAt: new Date().toISOString() });
  } catch (err) {
    if (source) {
      await pool.query(
        `UPDATE sync_sources SET last_sync_status='error', last_sync_error=$1 WHERE id=$2`,
        [err.message, source.id]
      ).catch(() => {});
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
