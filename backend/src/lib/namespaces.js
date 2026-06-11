/**
 * Server-side team-namespace authorization.
 *
 * The frontend (src/context/AppContext.tsx :: accessibleNamespaces) decides which
 * KV namespaces a role may read/write, but that check is client-side only and the
 * role is read from a user-editable localStorage value. This module is the
 * authoritative copy: it derives the allowed namespaces from req.user.role, which
 * comes from the DB-verified JWT, so a forged client cannot reach another team's data.
 *
 * Keep this in sync with accessibleNamespaces() in the frontend.
 */

// role → namespaces it may touch. MUST mirror accessibleNamespaces() in the frontend
// exactly: if the server forbids a namespace the client tries to write, the write is
// rejected (403) and — because the client save is fire-and-forget — silently lost.
// Finance roles include 'operations' because they have the Operations tab and shared
// collections (tasks, meetingNotes, firmEvents) live in the operations namespace.
const ROLE_NAMESPACES = {
  super_admin:     ['app', 'finance', 'portfolio', 'investment', 'operations', 'compliance'],
  finance_team:    ['app', 'finance', 'operations'],
  finance_admin:   ['app', 'finance', 'operations'],
  finance_viewer:  ['app', 'finance', 'operations'],
  portfolio_team:  ['app', 'portfolio', 'operations', 'compliance'],
  portfolio_admin: ['app', 'portfolio', 'operations', 'compliance'],
  portfolio_viewer:['app', 'portfolio', 'operations', 'compliance'],
  investment_team: ['app', 'investment', 'operations'],
};
// Fallback for any unknown role — same as the frontend default branch.
const DEFAULT_NAMESPACES = ['app', 'operations', 'compliance'];

function namespacesForRole(role) {
  return ROLE_NAMESPACES[role] || DEFAULT_NAMESPACES;
}

function roleCanAccessNamespace(role, namespace) {
  return namespacesForRole(role).includes(namespace);
}

module.exports = { ROLE_NAMESPACES, namespacesForRole, roleCanAccessNamespace };
