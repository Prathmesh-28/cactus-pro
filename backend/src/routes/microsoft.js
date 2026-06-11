/**
 * Microsoft OAuth2 (Azure AD) — for SharePoint/OneDrive file access
 *
 * Flow:
 *   GET  /api/microsoft/connect         → redirects user to Microsoft login
 *   GET  /api/microsoft/callback        → exchanges code for tokens, stores in DB
 *   GET  /api/microsoft/status          → returns connection status
 *   POST /api/microsoft/disconnect      → removes stored tokens
 */

const express = require('express');
const router  = express.Router();
const fetch   = require('node-fetch');
const { pool } = require('../db');
const { authenticate } = require('../middleware/auth');

const CLIENT_ID     = process.env.MICROSOFT_CLIENT_ID;
const CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET;
const TENANT_ID     = process.env.MICROSOFT_TENANT_ID;
const REDIRECT_URI  = process.env.MICROSOFT_REDIRECT_URI || 'https://cactus-pro-render.onrender.com/api/microsoft/callback';
const FRONTEND_URL  = process.env.FRONTEND_URL || 'https://cactus-pro-pi.vercel.app';

const SCOPES = 'https://graph.microsoft.com/Files.Read.All https://graph.microsoft.com/Sites.Read.All offline_access';

// ─── DB helper: ensure ms_tokens table exists ─────────────────────────────────
async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ms_tokens (
      id SERIAL PRIMARY KEY,
      access_token TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

// ─── Get a valid access token (auto-refresh if expired) ───────────────────────
async function getAccessToken() {
  await ensureTable();
  const { rows } = await pool.query('SELECT * FROM ms_tokens ORDER BY updated_at DESC LIMIT 1');
  if (!rows.length) return null;

  const token = rows[0];
  const expiresAt = new Date(token.expires_at);

  // If still valid (with 5 min buffer), return it
  if (expiresAt > new Date(Date.now() + 5 * 60 * 1000)) {
    return token.access_token;
  }

  // Refresh the token
  const params = new URLSearchParams({
    client_id:     CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type:    'refresh_token',
    refresh_token: token.refresh_token,
    scope:         SCOPES,
  });

  const res = await fetch(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  const data = await res.json();
  if (!data.access_token) throw new Error('Token refresh failed: ' + (data.error_description || data.error));

  const newExpiry = new Date(Date.now() + data.expires_in * 1000);
  await pool.query(
    `UPDATE ms_tokens SET access_token=$1, refresh_token=$2, expires_at=$3, updated_at=NOW() WHERE id=$4`,
    [data.access_token, data.refresh_token || token.refresh_token, newExpiry, token.id]
  );

  return data.access_token;
}

// ─── Download a SharePoint file using Graph API ────────────────────────────────
async function downloadSharePointFile(sharingUrl) {
  const token = await getAccessToken();
  if (!token) throw new Error('Microsoft account not connected. Connect in Finance Admin → Data Sync.');

  // Encode the sharing URL for Graph API
  // format: base64url("u={url}") with padding stripped
  const encoded = Buffer.from('u=' + sharingUrl).toString('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  // Try Graph API sharing link endpoint
  const graphRes = await fetch(
    `https://graph.microsoft.com/v1.0/shares/${encoded}/driveItem/content`,
    {
      headers: { Authorization: `Bearer ${token}` },
      redirect: 'follow',
    }
  );

  if (!graphRes.ok) {
    const errText = await graphRes.text();
    throw new Error(`Graph API error ${graphRes.status}: ${errText.slice(0, 200)}`);
  }

  const buf = await graphRes.buffer();
  return buf;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /api/microsoft/connect  → start OAuth flow
router.get('/connect', authenticate, (req, res) => {
  if (!CLIENT_ID || !TENANT_ID) {
    return res.status(500).json({ error: 'Microsoft OAuth not configured. Set MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_TENANT_ID in Render env vars.' });
  }
  const params = new URLSearchParams({
    client_id:     CLIENT_ID,
    response_type: 'code',
    redirect_uri:  REDIRECT_URI,
    scope:         SCOPES,
    response_mode: 'query',
    prompt:        'select_account',
  });
  res.redirect(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/authorize?${params}`);
});

// GET /api/microsoft/callback  → Microsoft redirects here after login
router.get('/callback', async (req, res) => {
  const { code, error, error_description } = req.query;
  if (error) {
    return res.redirect(`${FRONTEND_URL}?ms_error=${encodeURIComponent(error_description || error)}`);
  }
  if (!code) {
    return res.redirect(`${FRONTEND_URL}?ms_error=no_code`);
  }

  try {
    const params = new URLSearchParams({
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type:    'authorization_code',
      code,
      redirect_uri:  REDIRECT_URI,
      scope:         SCOPES,
    });

    const tokenRes = await fetch(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });

    const data = await tokenRes.json();
    if (!data.access_token) throw new Error(data.error_description || 'Token exchange failed');

    await ensureTable();
    const expiry = new Date(Date.now() + data.expires_in * 1000);

    // Upsert — only keep one token row (org-wide)
    const { rows } = await pool.query('SELECT id FROM ms_tokens LIMIT 1');
    if (rows.length) {
      await pool.query(
        `UPDATE ms_tokens SET access_token=$1, refresh_token=$2, expires_at=$3, updated_at=NOW() WHERE id=$4`,
        [data.access_token, data.refresh_token, expiry, rows[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO ms_tokens (access_token, refresh_token, expires_at) VALUES ($1, $2, $3)`,
        [data.access_token, data.refresh_token, expiry]
      );
    }

    res.redirect(`${FRONTEND_URL}?ms_connected=1`);
  } catch (err) {
    res.redirect(`${FRONTEND_URL}?ms_error=${encodeURIComponent(err.message)}`);
  }
});

// GET /api/microsoft/status  → check if connected
router.get('/status', authenticate, async (req, res) => {
  try {
    await ensureTable();
    const { rows } = await pool.query('SELECT expires_at, updated_at FROM ms_tokens LIMIT 1');
    if (!rows.length) return res.json({ connected: false });
    const expired = new Date(rows[0].expires_at) < new Date();
    res.json({ connected: true, expiresAt: rows[0].expires_at, needsRefresh: expired });
  } catch { res.json({ connected: false }); }
});

// POST /api/microsoft/disconnect
router.post('/disconnect', authenticate, async (req, res) => {
  try {
    await pool.query('DELETE FROM ms_tokens');
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = { router, downloadSharePointFile, getAccessToken };
