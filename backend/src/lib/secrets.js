/**
 * Single source of truth for JWT secrets.
 *
 * Previously both middleware/auth.js and lib/jwt.js each defaulted the secret to a
 * hardcoded literal when the env var was unset — meaning an environment that forgot
 * to set JWT_SECRET would run on a publicly-known key and accept forged tokens. We
 * now fail fast at boot instead, and export the secrets from one place so the
 * signing and verifying paths can never drift apart.
 *
 * In non-production (NODE_ENV !== 'production') we fall back to a dev-only default
 * so local `npm run dev` works without env setup; in production the vars are required.
 */

const isProd = process.env.NODE_ENV === 'production';

function required(name, devDefault) {
  const val = process.env[name];
  if (val) return val;
  if (isProd) {
    throw new Error(`${name} is required in production. Set it in the environment (e.g. Render env vars).`);
  }
  return devDefault;
}

const ACCESS_SECRET  = required('JWT_SECRET',         'dev-only-access-secret-not-for-production');
const REFRESH_SECRET = required('JWT_REFRESH_SECRET', 'dev-only-refresh-secret-not-for-production');

module.exports = { ACCESS_SECRET, REFRESH_SECRET };
