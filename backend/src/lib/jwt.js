const jwt = require('jsonwebtoken');
const { pool } = require('../db');

const ACCESS_SECRET  = process.env.JWT_SECRET  || 'cactus-access-secret-change-in-prod';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'cactus-refresh-secret-change-in-prod';
const ACCESS_EXPIRY  = '15m';   // short-lived access token
const REFRESH_EXPIRY = '30d';   // long-lived refresh token

function signAccess(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, name: user.name },
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRY }
  );
}

async function signRefresh(userId) {
  const token = jwt.sign({ sub: userId }, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRY });
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await pool.query(
    'INSERT INTO refresh_tokens(user_id, token, expires_at) VALUES($1,$2,$3)',
    [userId, token, expiresAt]
  );
  return token;
}

async function verifyRefresh(token) {
  const payload = jwt.verify(token, REFRESH_SECRET);
  const { rows } = await pool.query(
    'SELECT * FROM refresh_tokens WHERE token=$1 AND expires_at > NOW()',
    [token]
  );
  if (!rows.length) throw new Error('Refresh token not found or expired');
  return payload;
}

async function revokeRefresh(token) {
  await pool.query('DELETE FROM refresh_tokens WHERE token=$1', [token]);
}

async function revokeAllRefresh(userId) {
  await pool.query('DELETE FROM refresh_tokens WHERE user_id=$1', [userId]);
}

module.exports = { signAccess, signRefresh, verifyRefresh, revokeRefresh, revokeAllRefresh };
