const express  = require('express');
const bcrypt   = require('bcryptjs');
const crypto   = require('crypto');
const router   = express.Router();
const { pool } = require('../db');
const { signAccess, signRefresh, verifyRefresh, revokeRefresh, revokeAllRefresh } = require('../lib/jwt');
const { sendInvite, sendPasswordReset } = require('../lib/email');
const { authenticate, requireAdmin, audit } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});
// Throttle reset/invite email generation to stop email-bombing and provider-quota abuse.
const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── POST /auth/test-email — test SMTP config (super_admin only) ──────────────
router.post('/test-email', authenticate, requireAdmin, async (req, res) => {
  const { to } = req.body;
  if (!to) return res.status(400).json({ error: 'to email required' });
  try {
    const { sendPasswordReset: spw } = require('../lib/email');
    await spw({ to, token: 'test-token-123' });
    res.json({ success: true, message: `Test email sent to ${to}` });
  } catch (err) {
    // Log details server-side; don't leak SMTP code/command to the client.
    console.error('test-email failed:', err.message, err.code, err.command);
    res.status(500).json({ error: 'Failed to send test email. Check SMTP settings.' });
  }
});

// ── POST /auth/login ──────────────────────────────────────────────────────────
router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE email=$1', [email.toLowerCase()]);
    const user = rows[0];
    if (!user)              return res.status(401).json({ error: 'Invalid email or password' });
    if (!user.is_active)   return res.status(403).json({ error: 'Account is deactivated' });
    if (!user.password_hash) return res.status(403).json({ error: 'Invite not accepted yet. Check your email.' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    // Update last_login
    await pool.query('UPDATE users SET last_login=NOW() WHERE id=$1', [user.id]);

    const accessToken  = signAccess(user);
    const refreshToken = await signRefresh(user.id);
    await audit(user.id, user.email, 'login', 'auth', req.ip);

    res.json({
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, avatarUrl: user.avatar_url },
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /auth/refresh ────────────────────────────────────────────────────────
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });
  try {
    const payload = await verifyRefresh(refreshToken);
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE id=$1 AND is_active=true', [payload.sub]
    );
    if (!rows.length) return res.status(401).json({ error: 'User not found' });
    const user = rows[0];
    await revokeRefresh(refreshToken);                  // rotate token
    const newRefresh = await signRefresh(user.id);
    res.json({ accessToken: signAccess(user), refreshToken: newRefresh });
  } catch (err) { res.status(401).json({ error: 'Invalid refresh token' }); }
});

// ── POST /auth/logout ─────────────────────────────────────────────────────────
router.post('/logout', authenticate, async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) await revokeRefresh(refreshToken).catch(() => {});
  await audit(req.user.id, req.user.email, 'logout', 'auth', req.ip);
  res.json({ success: true });
});

// ── GET /auth/me ──────────────────────────────────────────────────────────────
router.get('/me', authenticate, (req, res) => {
  const u = req.user;
  res.json({ id: u.id, email: u.email, name: u.name, role: u.role, avatarUrl: u.avatar_url });
});

// ── PUT /auth/me — update your OWN profile (name, avatar) ─────────────────────
router.put('/me', authenticate, async (req, res) => {
  const { name, avatarUrl } = req.body;
  try {
    const sets = []; const vals = [];
    if (name      !== undefined) { sets.push(`name=$${vals.length + 1}`);       vals.push(String(name).trim()); }
    if (avatarUrl !== undefined) { sets.push(`avatar_url=$${vals.length + 1}`); vals.push(avatarUrl || null); }
    if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });
    vals.push(req.user.id);
    const { rows } = await pool.query(
      `UPDATE users SET ${sets.join(',')} WHERE id=$${vals.length} RETURNING id,email,name,role,avatar_url`,
      vals
    );
    await audit(req.user.id, req.user.email, 'updated_own_profile', 'auth', req.ip);
    const u = rows[0];
    res.json({ id: u.id, email: u.email, name: u.name, role: u.role, avatarUrl: u.avatar_url });
  } catch (err) {
    console.error('update profile error:', err.message);
    res.status(500).json({ error: 'Could not update profile' });
  }
});

// ── POST /auth/change-password — change your OWN password (verify current) ────
router.post('/change-password', authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Current and new password required' });
  if (newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });
  try {
    const { rows } = await pool.query('SELECT password_hash FROM users WHERE id=$1', [req.user.id]);
    const hash = rows[0]?.password_hash;
    if (!hash) return res.status(400).json({ error: 'No password set for this account' });
    const ok = await bcrypt.compare(currentPassword, hash);
    if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });
    const newHash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [newHash, req.user.id]);
    // Revoke all other sessions for safety (keeps current session's access token valid
    // until it expires; refresh will require re-login elsewhere).
    await revokeAllRefresh(req.user.id);
    await audit(req.user.id, req.user.email, 'changed_own_password', 'auth', req.ip);
    res.json({ success: true });
  } catch (err) {
    console.error('change-password error:', err.message);
    res.status(500).json({ error: 'Could not change password' });
  }
});

// ── POST /auth/forgot-password ────────────────────────────────────────────────
router.post('/forgot-password', resetLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE email=$1', [email.toLowerCase()]);
    // Always return success (don't reveal if email exists)
    if (!rows.length) return res.json({ success: true });
    const user = rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await pool.query(
      'INSERT INTO password_reset_tokens(user_id,token,type,expires_at) VALUES($1,$2,$3,$4)',
      [user.id, token, 'reset', expiresAt]
    );
    try {
      await sendPasswordReset({ to: user.email, token });
    } catch (emailErr) {
      console.error('Failed to send password reset email:', emailErr.message, emailErr.code);
    }
    await audit(user.id, user.email, 'forgot_password', 'auth', req.ip);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /auth/set-password ───────────────────────────────────────────────────
// Used for both invite acceptance and password reset
router.post('/set-password', resetLimiter, async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and password required' });
  if (password.length < 8)  return res.status(400).json({ error: 'Password must be at least 8 characters' });
  try {
    const { rows } = await pool.query(
      `SELECT prt.*, u.email, u.name, u.role, u.id as uid
       FROM password_reset_tokens prt
       JOIN users u ON u.id = prt.user_id
       WHERE prt.token=$1 AND prt.used_at IS NULL AND prt.expires_at > NOW()`,
      [token]
    );
    if (!rows.length) return res.status(400).json({ error: 'Token is invalid or has expired' });
    const row = rows[0];
    const hash = await bcrypt.hash(password, 12);
    await pool.query('UPDATE users SET password_hash=$1, is_active=true WHERE id=$2', [hash, row.uid]);
    await pool.query('UPDATE password_reset_tokens SET used_at=NOW() WHERE id=$1', [row.id]);
    // Revoke all existing refresh tokens (force re-login everywhere)
    await revokeAllRefresh(row.uid);
    // Log in automatically after setting password
    const user = { id: row.uid, email: row.email, name: row.name, role: row.role };
    const accessToken  = signAccess(user);
    const refreshToken = await signRefresh(row.uid);
    await audit(row.uid, row.email, row.type === 'invite' ? 'invite_accepted' : 'password_reset', 'auth', req.ip);
    res.json({ accessToken, refreshToken, user });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
