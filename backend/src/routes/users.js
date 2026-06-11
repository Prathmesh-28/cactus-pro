/**
 * User management — super_admin only except GET /users/me
 */
const express  = require('express');
const bcrypt   = require('bcryptjs');
const crypto   = require('crypto');
const router   = express.Router();
const { pool } = require('../db');
const { sendInvite } = require('../lib/email');
const { authenticate, requireAdmin, audit } = require('../middleware/auth');
const { revokeAllRefresh } = require('../lib/jwt');

const VALID_ROLES = ['super_admin', 'portfolio_team', 'finance_team', 'investment_team', 'portfolio_admin', 'portfolio_viewer', 'finance_admin', 'finance_viewer'];

// All routes require authentication
router.use(authenticate);

// ── GET /api/users — list all users (admin only) ──────────────────────────────
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.email, u.name, u.role, u.is_active, u.avatar_url,
              u.last_login, u.created_at,
              inv.name AS invited_by_name
       FROM users u
       LEFT JOIN users inv ON inv.id = u.invited_by
       ORDER BY u.created_at ASC`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/users/invite — invite a new user ────────────────────────────────
router.post('/invite', requireAdmin, async (req, res) => {
  const { email, name, role } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  if (role && !VALID_ROLES.includes(role)) return res.status(400).json({ error: 'Invalid role' });
  try {
    // Check if user already exists
    const existing = await pool.query('SELECT id FROM users WHERE email=$1', [email.toLowerCase()]);
    if (existing.rows.length) return res.status(409).json({ error: 'User with this email already exists' });

    // Create user (no password yet)
    const { rows } = await pool.query(
      'INSERT INTO users(email,name,role,is_active,invited_by) VALUES($1,$2,$3,false,$4) RETURNING *',
      [email.toLowerCase(), name || '', role || 'portfolio_team', req.user.id]
    );
    const user = rows[0];

    // Create invite token (48 hours)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    await pool.query(
      'INSERT INTO password_reset_tokens(user_id,token,type,expires_at) VALUES($1,$2,$3,$4)',
      [user.id, token, 'invite', expiresAt]
    );

    try {
      await sendInvite({ to: user.email, name: user.name, token, inviterName: req.user.name });
    } catch (emailErr) {
      console.error('Invite email failed:', emailErr.message, emailErr.code);
      // Delete the user and token so invite can be retried cleanly
      await pool.query('DELETE FROM password_reset_tokens WHERE user_id=$1', [user.id]);
      await pool.query('DELETE FROM users WHERE id=$1', [user.id]);
      return res.status(500).json({
        error: `User created but email failed to send: ${emailErr.message}. Check SMTP settings in Render.`,
        code: emailErr.code,
      });
    }

    await audit(req.user.id, req.user.email, 'invited_user', user.email, req.ip);
    res.status(201).json({
      id: user.id, email: user.email, name: user.name,
      role: user.role, is_active: user.is_active,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PUT /api/users/:id — update role or name ──────────────────────────────────
router.put('/:id', requireAdmin, async (req, res) => {
  const { name, role, is_active } = req.body;
  const userId = parseInt(req.params.id);
  if (userId === req.user.id && is_active === false)
    return res.status(400).json({ error: 'Cannot deactivate your own account' });
  if (role && !VALID_ROLES.includes(role)) return res.status(400).json({ error: 'Invalid role' });
  try {
    const sets = []; const vals = [];
    if (name       !== undefined) { sets.push(`name=$${vals.length+1}`);      vals.push(name); }
    if (role       !== undefined) { sets.push(`role=$${vals.length+1}`);      vals.push(role); }
    if (is_active  !== undefined) { sets.push(`is_active=$${vals.length+1}`); vals.push(is_active); }
    if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });
    vals.push(userId);
    const { rows } = await pool.query(
      `UPDATE users SET ${sets.join(',')} WHERE id=$${vals.length} RETURNING id,email,name,role,is_active`,
      vals
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    // If deactivated, revoke all their sessions
    if (is_active === false) await revokeAllRefresh(userId);
    await audit(req.user.id, req.user.email, 'updated_user', rows[0].email, req.ip);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/users/:id/resend-invite ─────────────────────────────────────────
router.post('/:id/resend-invite', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE id=$1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    const user = rows[0];
    if (user.password_hash) return res.status(400).json({ error: 'User has already accepted invite' });
    // Expire old tokens, create new one
    await pool.query("UPDATE password_reset_tokens SET used_at=NOW() WHERE user_id=$1 AND type='invite' AND used_at IS NULL", [user.id]);
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    await pool.query('INSERT INTO password_reset_tokens(user_id,token,type,expires_at) VALUES($1,$2,$3,$4)', [user.id, token, 'invite', expiresAt]);
    await sendInvite({ to: user.email, name: user.name, token, inviterName: req.user.name });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── DELETE /api/users/:id — hard delete (admin only) ─────────────────────────
router.delete('/:id', requireAdmin, async (req, res) => {
  const userId = parseInt(req.params.id);
  if (userId === req.user.id) return res.status(400).json({ error: 'Cannot delete your own account' });
  try {
    const { rows } = await pool.query('SELECT email FROM users WHERE id=$1', [userId]);
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    await revokeAllRefresh(userId);
    await pool.query('DELETE FROM users WHERE id=$1', [userId]);
    await audit(req.user.id, req.user.email, 'deleted_user', rows[0].email, req.ip);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/users/audit — audit log (admin only) ─────────────────────────────
router.get('/audit', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 200'
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
