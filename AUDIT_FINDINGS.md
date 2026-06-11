# Cactus Pro — Full Problem Audit

_6-dimension fan-out (functionality, wiring, UI/UX, data-flow, correctness, robustness) across the whole codebase, each finding adversarially verified. **46 confirmed, 16 low (finder-reported), 2 refuted.** Severities are the verified/corrected levels for a ~10–20 user internal tool._

> The single biggest theme: **the sync engine only correctly transforms `financial_periods` and the 4 new company-nested sheets. Every other sync target writes raw/mis-shaped/orphan data that no screen reads** — so "Sync succeeded" is frequently a lie. This is the cluster to fix first.

---

## 🔴 HIGH — data loss, silent write failure, or whole features that don't work

### Sync engine (the dominant cluster)

1. **Most sync targets write a junk store field nothing reads.** `KV_KEY_TO_STORE_FIELD` (backend/src/routes/sync.js:228) is missing: `pipeline→deals`, `co_investors→coInvestors`, `ref_checks→referenceChecks`, `intro_requests→introRequests`, `recruitment→candidates`, `lp_summary→lps`. Mapping any of these syncs "successfully" but the data never appears. **Fix:** add the mappings + per-collection transforms.

2. **Non-`financial_periods` syncs store raw CSV-header-keyed objects, not the app's camelCase shape.** Even correctly-mapped collections (Valuation Log, Founder Contacts, Company Health, Portfolio Updates, Tasks, Meeting Notes, IC Memos…) render blank because the app reads `m.companyId` etc. but the row has `{"Company ID": ...}`. (sync.js:446-462) **Fix:** per-kvKey column maps + Company-Name→companyId resolution + id generation, like `transformFinancialPeriods`.

3. **Generic-template sync writes raw sheet JSON directly into typed collections, corrupting them.** Any kvKey that isn't `financial_periods` or a `NESTED_TARGET` replaces the real array with garbage. (sync.js:446-463) **Fix:** reject/ignore kvKeys without a real transformer, or add transformers for each.

4. **`et:*` / `fund_1::*` / `pm:Portfolio` write into the `store` blob, but the Finance tab reads them as SEPARATE `kv_store` rows** (`fin_tbl_*`, `fin_fmv_*`, `fin_dyn_*`). (sync.js:441-471, ExpensesPage.tsx:51) So Fund Metrics / Cash Flows / Fund/IM Expenses / Portfolio Snapshot syncs are no-ops on screen. **Fix:** write these as their own rows in the finance store's expected shape, or drop them from presets.

5. **`fund_metric_cards` sync clobbers `fundMetrics` with raw CSV objects** → all homepage/portfolio metric cards vanish. (sync.js:244) **Fix:** transform to `{id,label,value,delta,deltaDirection,visible}` and merge by id.

### Namespace / persistence

6. **Portfolio "Valuations" CSV import silently lost.** `valuationMarks` is a `finance`-namespace field, but the import is offered to portfolio roles in PortfolioAdmin. Marks appear, then vanish on next poll (portfolio role can't persist `finance`). (CsvImportPanel.tsx:224, AppContext.tsx:879) **Fix:** move `valuationMarks` to `PORTFOLIO_FIELDS` (it's read+written by portfolio screens) or hide the tab for non-finance roles.

7. **Per-browser migrations (`cactus_*_v1/v3/v5`, doctpl, toolkit) re-seed `defaultConfig` and overwrite shared server data.** A colleague opening a fresh browser silently resurrects deleted/edited roles, sector KPIs, doc templates, toolkit tools, sector assignments. (AppContext.tsx:465-567) **Fix:** gate on a shared server flag (`kv app:migrations`), or run only for super_admin after `loading===false`.

### Functionality / wiring

8. **Three incompatible quarter-string formats** (`Q2 2026`, `FY2026-Q1`, `Q4 FY25`) written to the same `companyHealth.quarter` / `valuationMarks.quarter` field. **Portfolio health reviews never appear on the Health Dashboard** (exact-string join fails); Valuation Log sort breaks. (PortfolioAdmin.tsx:39, HealthDashboard.tsx, ValuationLog.tsx:291) **Fix:** one `lib/quarter.ts` (parse/format/normalize) used everywhere.

---

## 🟠 MEDIUM — wrong numbers, dead admin features, silent failures

### Dead/disconnected admin features (write-only — admin edits go nowhere)
9. **NavigationManager** → `store.navConfig`; Header renders a hardcoded `NAV_ITEMS` and never reads it. Reorder/hide/rename are no-ops. (Header.tsx:14)
10. **EmailTemplatesManager** → `store.emailTemplates`; MailComposer uses a static `TEMPLATES` const and never reads it. (Also the two use disjoint template keys.) (MailComposer.tsx:26)
11. **ContentManager** → `store.contentConfig`; no page reads section headers/descriptions. (ContentManager.tsx:28) _(verified low)_

### Permissions / reset
12. **`portfolio_viewer` (read-only) can add/edit/delete in PortfolioFundView** — buttons have no `canEditPortfolio()` gate. (PortfolioFundView.tsx:708,852)
13. **`resetToDefaults` only writes the `app` namespace** (and dumps the whole store into it). Finance/portfolio/investment/operations revert to stale server values on next poll. (AppContext.tsx:912) **Fix:** reset via `splitStoreByNamespace` like the normal save path.

### Namespace routing mismatches (synced data invisible / clobbers edits)
14. **`portfolioSnapshot` + `fundMetrics` synced into `finance` blob but route to `app`** — invisible to portfolio roles, clobbers manual edits. (sync.js:233, presets) **Fix:** map `pm:Portfolio` + `fund_metric_cards` to `app`.
15. **`lp_summary` writes an orphan field; app reads `store.lps`.** LP data invisible after sync. (SyncManager.tsx:32)
16. **`financialPeriods` sync merges by `companyId` only**, nuking manually-entered periods for synced companies; id scheme differs from the UI composite key. (sync.js:329) **Fix:** merge by the same composite key as `batchUpsertFinancialPeriods`.
17. **`Churn % (monthly)` column silently dropped** on financial_periods import — `normalizeCol` strips the parenthetical so it never matches the map key `churn % monthly`. (sync.js:257)
18. **Server sync drops financial-period rows that omit the `Period` column** (0 rows imported) though the in-app CSV path synthesizes the label. (sync.js:308)
19. **Compliance Calendar preset** maps to `compliance`/`events` with no backend mapping and no template — junk write. (SyncManager.tsx:112)

### Calculation / formatting correctness
20. **CapitalCallTracker silently switches Lakhs↔Crores at the 100 boundary** — a ₹99L call and a ₹101L call render in different units; summary cards/progress bars corrupt. (CapitalCallTracker.tsx:20)
21. **FundOverview stores money in raw rupees while every other view uses ₹Cr** — cross-view numbers are 1e7× off. (FundOverview.tsx:64)
22. **`parseQ` returns NaN for `FY2026-Q1`-style quarters in ValuationLog** → chart/latest-mark sort randomly. (ValuationLog.tsx:291)
23. **Per-tranche MOIC/IRR in CompanyDrawer are fictitious** — `Math.pow(blendedMoic, 365/days)` apportions total FMV pro-rata to each round. (CompanyDrawer.tsx:690)
24. **TVPI/DPI/MOIC computed 4 different ways** across FundLedger, PortfolioFundView, CompanyDrawer, exported PDFs — same fund shows different numbers. (FundLedger.tsx:169) **Fix:** route all through `lib/fundEconomics`/`fundDerive`.

### Robustness
25. **Hydration/poll falls back to `defaultConfig` when localStorage is empty** — a transient/partial KV read can splice defaults into the store and persist them to shared KV. (AppContext.tsx:356)
26. **`inv.followOns` accessed without a null guard** — a synced/CSV-imported/legacy fund-view record without `followOns` crashes the whole Fund View page. (PortfolioFundView.tsx:1073) **Fix:** normalize `followOns ?? []` on read or sanitize on hydration. _(directly relevant to the new CSV templates.)_
27. **`kvSet`/`kvGet`/poll swallow all errors** — a failed save (403/500/network) looks successful; the edit silently disappears on next poll. (api.ts:104, AppContext.tsx:479)

---

## 🟡 LOW — papercuts, dead code, cosmetic/consistency (32 items, grouped)

**Dead / no-op UI:** SectorMetricsPanel (~420 lines) never imported · InvestmentSettings drag-handle does nothing ("coming soon") · `getFinanceData` exposed but unused · mobile "Sync" button never triggers sync · HealthDashboard Export button is a no-op · PortfolioFundView "Open Full Drawer" flickers/fails · `company_metrics` / `et:im_expenses_actual` offered as sync targets with no backend handling.

**Cosmetic correctness:** HomePage hardcodes "3 Office Cities" / "9+ sectors" instead of `firm.locations.length`/`sectors.length` · Portfolio "Successful Exits" card hardcodes "Rubix" · FundOverview percent precision relies on locale luck · HealthDashboard "Auto-suggest" only fills 2 of 6 signals.

**Money/number parsing:** `₹`/`Cr`/`L`/comma strings parse to 0 in FundLedger & PortfolioFundView · non-ASCII hyphen (U+2011) parses to 0/wrong sign · `localeCompare` used to sort numeric/date strings (`'10' < '9'`) · Avg IRR is a naive mean while blended IRR is invested-weighted.

**Data-flow hygiene:** `seedPortfolioFundView` re-seeds whenever the array is empty (undoes a deliberate full delete) · `opsConfig` routed to `finance` instead of `operations` · `financeData→localStorage` hydration writes raw keys (collision risk; field is otherwise dead) · `deleteCompany` cascades `ddChecklists` by name not id (orphans/wrong-deletes) · `getRoleConfig` falls back to `roles[0]` (can over-grant super_admin perms before v3 migration).

**Sync usability:** auto-wire fuzzy matcher (`slice(0,5)`) mis-maps "Fund …" sheets · nested sheets key only on Company ID (blank/wrong id → silent 0-row import, no name fallback) · Master Sheet preset sheet-name mismatch (`FY Returns (MOIC-IRR)` vs template `Valuation Log`).

**Perf:** `normaliseSectors`/backfill run inside every 5s poll tick + full-store `JSON.stringify` to localStorage · NewsFeed refresh fires serial GNews calls, one `addNewsItem` store-write per article, no cancel · PortfolioFundView list rows use keyless `<>` fragments + `min-h-screen` inside a tab.

**Concurrency:** 5s poll vs 400ms debounced save vs 3s grace window race can still drop a write under specific timing.

---

## ✅ Already fixed earlier this session (not re-listed above)
KV namespace authorization (server-side), file-download IDOR, JWT fail-fast, SSRF guard + admin gate on sync, OAuth CSRF state, `node-fetch` runtime break, error-body leaks + rate limits, the PortfolioFundView read/write-to-wrong-collection bug, the firmEvents/introRequests namespace collision, memoized AppContext, poll/localStorage debounce, and the company-nested-sync namespace+guard (this last one the audit independently re-verified as fixed).

## Refuted by verification (not real)
- "Nested-array sync writes companies into the wrong namespace" — already fixed (preset → `app` + backend guard).
- "CSV import vs sync use different upsert keys → duplicate rows" — dedup is by composite key on both paths, not id; no duplication (one narrow blank-`periodType` edge remains, low).
