/**
 * Push-notification device-token registry.
 *
 * Mobile clients POST their device token here after registering with APNs/FCM. The
 * actual SENDING of pushes (when an IC memo needs approval, a capital call is due, a
 * health flag turns red, etc.) requires APNs/FCM credentials to be configured — see
 * MOBILE_FEATURES.md. This route just stores tokens so a future sender can target them.
 */
const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// POST /api/push/register  { token, platform }
router.post('/register', async (req, res) => {
  const { token, platform } = req.body;
  if (!token) return res.status(400).json({ error: 'token required' });
  try {
    await pool.query(
      `INSERT INTO push_tokens (user_id, token, platform, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (token) DO UPDATE SET user_id=$1, platform=$3, updated_at=NOW()`,
      [req.user.id, token, platform || null]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('push register error:', err.message);
    res.status(500).json({ error: 'Could not register device' });
  }
});

// DELETE /api/push/register/:token  — unregister (on logout / disable)
router.delete('/register/:token', async (req, res) => {
  try {
    await pool.query('DELETE FROM push_tokens WHERE token=$1 AND user_id=$2', [req.params.token, req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Could not unregister device' });
  }
});

module.exports = router;
