# Cactus Pro — Architecture Review & Production-Hardening Pass

_Reverse-engineered the full stack, traced the data flow end-to-end, ran a 60-agent
fan-out across 6 dimensions (architecture, duplication, performance, scalability,
maintainability, security), adversarially verified findings, then applied the
highest-leverage fixes. Build + 55 tests + new guard test all green; zero new lint
errors._

---

## 1. Clean Architecture Breakdown

**Shape:** React 19 + Vite SPA (Vercel) → Express + Postgres (Render) → Capacitor mobile shell.

**The spine is one client-side God store.** `AppContext` (`src/context/AppContext.tsx`)
holds the entire domain — ~50 collections (companies, deals, LPs, financial periods,
recruitment, configs) — as a single `AppStore` object, exposed through ~150 CRUD
closures consumed by 83 components via `useApp()`.

**Persistence is stale-while-revalidate, hand-rolled:**
1. **Boot** — render synchronously from `localStorage` (`cactus_store`), fall back to `defaultConfig`.
2. **Hydrate** — `kvGet(ns,'store')` for each namespace the role can access; shallow-merge into one store.
3. **Save** — every mutation → `setStore` → debounced (400 ms) `kvSet` per namespace.
4. **Poll** — every 5 s, re-fetch all accessible namespaces and merge (3 s grace window after a local write).

**Team isolation** is by **KV namespace** (`app` / `finance` / `portfolio` / `investment` /
`operations`). `fieldNamespace()` maps each store field to one namespace;
`accessibleNamespaces(role)` decides what a role reads/writes. The backend is a thin
KV/auth/sync API over a `kv_store(namespace, key, value jsonb)` table — each namespace's
whole blob is one row.

**Auth:** JWT access (15 m) + refresh (30 d) in `localStorage`; role travels in the signed JWT.

---

## 2. Critical Problem Areas (and what was fixed)

### 🔴 Server trusted the client for authorization — FIXED
The KV API (the persistence path for **100 % of domain data**) had only a generic
`authenticate` gate. The role→namespace matrix lived **only in the client**, read from a
user-editable `localStorage` value. Any logged-in user could
`GET /api/kv/finance/store` (read confidential LP/fund data) or `PUT`/`DELETE` any
namespace from the browser console.
**Fix:** server-side namespace authorization (`backend/src/lib/namespaces.js` +
middleware in `kv.js`) deriving the allowed set from the **DB-verified JWT role**, 403 on
out-of-scope access. A guard test (`namespaces.test.js`) asserts the server and client
matrices stay identical — a mismatch silently loses writes.

### 🔴 Unauthenticated, enumerable document download (IDOR) — FIXED
`GET /api/files/download/:fileId` was public with sequential integer ids, so anyone could
scrape every uploaded PDF/cap-table/term-sheet by incrementing `?fileId=`.
**Fix:** only `image/*` stays public (logos/avatars in `<img>` need no JWT); all other
mime types now require `authenticate`.

### 🟠 Forgeable JWTs if env unset — FIXED
Both signing and verifying defaulted to a hardcoded literal secret when the env var was
missing, and `render.yaml` never set them. **Fix:** single source (`lib/secrets.js`),
**fail-fast at boot in production**, dev-only fallback, and `JWT_SECRET` /
`JWT_REFRESH_SECRET` added to `render.yaml` with `generateValue: true`.

### 🟠 SSRF + cross-namespace injection via sync — FIXED
`/api/sync/*` (any authenticated user) fetched arbitrary server-side URLs and wrote into
any namespace, non-transactionally. **Fix:** `requireAdmin` on all sync routes; host
allowlist (Google Sheets / SharePoint / OneDrive) + private/loopback/link-local IP block
(defeats cloud-metadata SSRF and DNS-rebinding); the read-modify-write is now wrapped in a
transaction with `SELECT … FOR UPDATE`.

### 🟠 SharePoint sync was dead at runtime — FIXED
`require('node-fetch')` resolved to an ESM-only transitive dep, not callable under
`require()` — every Graph call threw "fetch is not a function". **Fix:** use Node's global
`fetch` (+ `arrayBuffer()` instead of node-fetch's `.buffer()`). No dependency needed.

### 🟠 OAuth CSRF / unauthenticated connect — FIXED
`/connect` and `/callback` had no auth and no `state` param. **Fix:** `/connect` verifies
the initiating admin's token (passed as a query param, since redirects can't send headers)
and mints a signed, 10-minute `state`; `/callback` verifies it.

### 🟡 Information-leaking error bodies + email abuse — FIXED
`/auth/test-email` leaked SMTP `code`/`command` and was open to any user. **Fix:**
`requireAdmin` + generic client message + server-side logging; rate limits added on
`forgot-password` and `set-password`.

---

## 3. Failure Explanation — the "data silently disappears" class of bugs

Traced two live bugs to the same root cause: **a write routed to a namespace the current
role can't persist is dropped with no error**, because the save loop is
`if (accessible.has(ns)) kvSet(...)` and `kvSet` failures are `.catch(() => {})`.

- **Namespace-set collision — FIXED.** `firmEvents` was in both `FINANCE_FIELDS` and
  `OPERATIONS_FIELDS`; `introRequests` in both `INVESTMENT_FIELDS` and `OPERATIONS_FIELDS`.
  `fieldNamespace` is first-match-wins, so they routed to finance/investment. But they're
  authored only from **Operations** features (EventCalendar, IntroTracker), so an
  operations-role write landed in a bucket that role can't persist → vanished on next poll.
  **Fix:** each field now lives in exactly one set (operations); finance roles (which have
  the Operations tab) gained the `operations` namespace so shared collections persist.

- **PortfolioFundView read/write mismatch — FIXED.** The component **read**
  `store.portfolioFundView` but **wrote** via `addFundInvestment` (the finance-namespace
  `fundInvestments`). Edits never appeared (different collection) and, for portfolio roles,
  never persisted (different namespace). **Fix:** handlers now use the matching
  `add/update/deletePortfolioFundView` setters — same pattern PortfolioAdmin already used.

---

## 4. Hidden Edge Cases Caught

- **`compliance` is a dead namespace.** Portfolio roles list it in `accessibleNamespaces`,
  but no field maps to it and `splitStoreByNamespace`'s bucket object omits it. Harmless
  today, but a future `COMPLIANCE_FIELDS` would write to an uninitialized bucket →
  `undefined[k] = v` crashes the entire save. **Hardened:** buckets are now created lazily.
- **Server/client matrix drift = silent write loss.** Codified the contract in a guard test.
- **`finance_viewer` write-gating is client-only.** Server treats read-only roles as
  read-write within their namespaces. Left as a documented follow-up (changing it touches
  the super-admin preview flow) — see §6.

---

## 5. Performance / Scalability Fixes Applied (behavior-preserving)

- **5 s poll no-op short-circuit.** The poll JSON-stringifies the merged blob and skips
  `setState` + the 83-consumer re-render + the localStorage rewrite when the server
  returned byte-identical data. Idle tabs now do nothing every 5 s instead of re-rendering.
- **Debounced localStorage write.** `setStore` previously stringified the whole ~280 KB
  store **synchronously on every keystroke** for inputs bound to the store. Now coalesced
  into the existing 400 ms timer with the KV write (React state stays authoritative).
- **Memoized context value.** `AppContext`'s value object (~150 closures) was rebuilt every
  render, defeating React's bail-out for all consumers. Now `useMemo`'d on
  `[store, loading, currentRole, user]`.

---

## 6. Recommended Next Steps (scoped, not yet applied)

These are real but either behavior-changing or large; recommended in priority order:

1. **Optimistic concurrency on KV writes** (HIGH). Whole-namespace blobs are last-writer-
   wins; two concurrent editors silently clobber each other. Add a `version`/`updated_at`
   check: client sends last-read version, server `UPDATE … WHERE version=$expected`, 409 on
   mismatch, client re-merges. This is the top remaining scalability risk.
2. **Surface save failures** (HIGH). Replace `.catch(() => {})` on `kvSet` with the existing
   `useSaveState` error bus + a retry banner; have `kvGet` distinguish "absent" from
   "network/permission error" so a backend outage can't silently fall back to stale data.
3. **Conditional GET on poll** (MEDIUM). `kv_store.updated_at` already exists — add
   `If-Modified-Since`/`?since=` so unchanged polls return ~304 instead of the full blob;
   pause polling on `document.hidden`. Cuts O(users × storeSize × 12/min) DB load.
4. **CRUD factory** (MEDIUM). ~35 identical `add/update/delete` triplets + 5 `batchUpsert`
   bodies → one typed `makeCrud<T>(field)` factory. Removes ~250 lines and all the `any` casts.
5. **One quarter/money/CSV codec each** (MEDIUM). Three incompatible `quarter` string
   formats are written to the same field (reviews saved on one screen invisible on another);
   money parsing is reimplemented in ~8 files; two naive `line.split(',')` CSV parsers
   corrupt quoted fields. Canonicalize into `lib/quarter.ts`, `lib/money.ts`, `lib/csvImport.ts`.
6. **Hoist god components** (MEDIUM). `CompanyDrawer` (1725 LOC) / `RecruitmentHub` (2068)
   declare tab sub-components inside the parent render → full remount (recharts teardown) on
   every store change. Hoist to module scope.
7. **Schema-versioned migrations** (MEDIUM). The five `cactus_*_v{1,3,5}` localStorage-flag
   migrations replay on every new browser and rewrite shared server data from the compiled-in
   `defaultConfig` — manual data corrections silently revert. Move the version into the data.
8. **Delete dead code** (~990 LOC): `FundOverview.tsx`, `ExpensesSection.tsx`,
   `CompliancesSection.tsx`, `MasterSheetManager.tsx` (verified zero importers).
9. **TLS cert verification** for Postgres (`rejectUnauthorized: false` → provide CA).
10. **Object storage for file uploads** (BYTEA in a 1 GB free-tier DB shares the kv-blob ceiling).

---

## Files changed in this pass

**Backend:** `lib/namespaces.js` (new), `lib/namespaces.test.js` (new), `lib/secrets.js`
(new), `lib/jwt.js`, `middleware/auth.js`, `routes/kv.js`, `routes/auth.js`,
`routes/sync.js`, `routes/microsoft.js`, `server.js`, `db.js`, `render.yaml`.

**Frontend:** `context/AppContext.tsx`, `features/portfolio/PortfolioFundView.tsx`,
`components/ui/TeamSyncPanel.tsx`.

**Verification:** `npm run build` ✓ · `npm test` 55/55 ✓ · `node src/lib/namespaces.test.js` ✓
· lint errors unchanged (76→76, no new) · all backend modules load + prod fail-fast confirmed.
