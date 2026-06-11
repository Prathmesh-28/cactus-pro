/**
 * Guard the server namespace-authorization matrix.
 *
 * This is the authoritative copy of the role→namespace map. It MUST stay in sync
 * with accessibleNamespaces() in src/context/AppContext.tsx — a mismatch silently
 * loses writes (server 403 + fire-and-forget client save). The expected map below
 * is a literal mirror of the frontend; update both together.
 *
 * Run with: node src/lib/namespaces.test.js  (exits non-zero on failure)
 */
const assert = require('assert');
const { ROLE_NAMESPACES, namespacesForRole, roleCanAccessNamespace } = require('./namespaces');

// Mirror of the frontend accessibleNamespaces() — keep identical.
const FRONTEND = {
  super_admin:     ['app', 'finance', 'portfolio', 'investment', 'operations', 'compliance'],
  finance_team:    ['app', 'finance', 'operations'],
  finance_admin:   ['app', 'finance', 'operations'],
  finance_viewer:  ['app', 'finance', 'operations'],
  portfolio_team:  ['app', 'portfolio', 'operations', 'compliance'],
  portfolio_admin: ['app', 'portfolio', 'operations', 'compliance'],
  portfolio_viewer:['app', 'portfolio', 'operations', 'compliance'],
  investment_team: ['app', 'investment', 'operations'],
};

for (const [role, ns] of Object.entries(FRONTEND)) {
  assert.deepStrictEqual(
    [...namespacesForRole(role)].sort(),
    [...ns].sort(),
    `Server/client namespace mismatch for role "${role}"`
  );
}

// Unknown roles get the locked-down default, never broad access.
assert.deepStrictEqual(namespacesForRole('nonsense_role'), ['app', 'operations', 'compliance']);
assert.strictEqual(roleCanAccessNamespace('finance_viewer', 'portfolio'), false);
assert.strictEqual(roleCanAccessNamespace('finance_viewer', 'finance'), true);
assert.strictEqual(roleCanAccessNamespace(undefined, 'finance'), false);

// Every role keeps the shared 'app' namespace.
for (const role of Object.keys(ROLE_NAMESPACES)) {
  assert.ok(namespacesForRole(role).includes('app'), `role ${role} missing 'app'`);
}

console.log('namespaces.test.js: all assertions passed');
