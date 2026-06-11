const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { ACCESS_SECRET } = require('../lib/secrets');

// Attach req.user if valid JWT present
async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, ACCESS_SECRET);
    // Verify user still active in DB
    const { rows } = await pool.query(
      'SELECT id, email, name, role, is_active FROM users WHERE id=$1',
      [payload.sub]
    );
    if (!rows.length || !rows[0].is_active) {
      return res.status(401).json({ error: 'Account not found or deactivated' });
    }
    req.user = rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Require super_admin role
function requireAdmin(req, res, next) {
  if (req.user?.role !== 'super_admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Require any authenticated user
function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  next();
}

// Log audit event (fire-and-forget)
async function audit(userId, email, action, resource, ip) {
  try {
    await pool.query(
      'INSERT INTO audit_log(user_id,user_email,action,resource,ip_address) VALUES($1,$2,$3,$4,$5)',
      [userId, email, action, resource, ip]
    );
  } catch {}
}

module.exports = { authenticate, requireAdmin, requireAuth, audit };
