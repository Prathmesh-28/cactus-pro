# Plan

Two independent changes. Both will be done in one turn.

## 1. Remove the Investor Requirements section

- Delete `src/routes/investors.tsx`.
- Delete `src/components/investor-matrix.tsx`.
- Remove the `Investor Requirements` entry from the sidebar nav in `src/components/dashboard-shell.tsx` (and its `SectionKey` usage if any).
- Remove the `"investors"` section badge from `PageHeader` types if it exists.
- Database tables `req_investors`, `req_rows`, `req_cells` are left in place (no destructive DB drop — the user said "delete the section from the dashboard" not "drop the tables"). I will not query them anywhere.

## 2. Make every table fully dynamic (Excel-driven schema)

### Concept

Today each table (`fund_expenses`, `im_expenses`, `fund_expenses_actual`, `im_expenses_actual`, `bank_accounts`, `pipeline_investments`, `performance` source rows, `fund_overview` "Original vs Current") has a fixed Postgres schema and a fixed `columns` prop. The user wants: **the moment an Excel is uploaded, the entire table reshapes to mirror that Excel exactly — header row becomes columns, every row becomes a row, column count grows or shrinks to match.**

A fixed-schema table can never do this. We need a generic, schema-less store.

### New storage model

One new table:

```
dynamic_tables (
  table_key  text primary key,        -- e.g. 'fund_expenses', 'fund_overview_orig_vs_current'
  columns    jsonb not null,          -- [{ key, label, type }]
  rows       jsonb not null,          -- [{ id, [col_key]: value, ... }]
  updated_at timestamptz,
  updated_by uuid
)
```

- One row per logical table. Entire shape (columns + rows) is overwritten on Excel upload.
- RLS: read by any authenticated user; write by `can_edit(auth.uid())`.
- Type inference per column: numeric if every non-empty cell parses as a number, else text. (Currency/percent formatting is dropped — generic display only — because the Excel doesn't carry that info reliably.)

### New `EditableTable` behaviour

- On mount: load `dynamic_tables` row for this `tableKey`. If present, render those columns + rows. If absent, fall back to the legacy fixed columns/rows (so the dashboard isn't empty before the first upload).
- Upload Excel: parse first sheet, row 1 = headers, rows 2+ = data, write the whole thing back to `dynamic_tables` (replacing whatever was there). UI reshapes immediately via query invalidation.
- Export: dump current columns/rows to xlsx.
- Template: download a one-row xlsx using current columns.
- Add row / edit cell / delete row: mutate `rows` jsonb (optimistic update + upsert).
- The `columns` prop becomes the **fallback** (initial seed) only.

### Things that will break and how I'll handle them

- **Cross-table formulas / computed columns** (variance %, totals across `fund_expenses_actual` + `im_expenses_actual` for Funds Available, performance % deltas): once a table is reshaped by upload, its columns may not exist anymore. Computed columns become opt-in only when the fallback (legacy) columns are still in effect; once dynamic data exists, they are dropped silently.
- **Snapshots / version history**: existing snapshots still restore the legacy tables. New uploads do NOT version into snapshots (out of scope for this turn).
- **Per-cell stat cards** that read named columns (`bank_balance`, `committed_capital`, `pipeline_total` on Investors page) — moot, because Investors page is being deleted.
- **Fund Overview "Fund Metrics" / "Cash Flows" rows**: those are NOT EditableTable instances, so they are untouched.
- **Performance table** (`PerformanceTable`): same generic treatment via a `tableKey` of `performance`.

### Files

- New migration: create `dynamic_tables` + grants + RLS.
- New hook: `useDynamicTable(tableKey)` + `useReplaceDynamicTable`, `useUpsertDynamicRow`, `useDeleteDynamicRow`, `useInsertDynamicRow` in `src/lib/data-hooks.ts`.
- Rewrite `src/components/editable-table.tsx` to use the dynamic store with legacy fallback; accept a new optional `tableKey` prop (defaults to `table`).
- Update `src/components/performance-table.tsx` upload path to write to `dynamic_tables` with key `performance` (keep its custom layout but reshape columns on upload).
- Delete investor files; update sidebar.

### Out of scope (explicitly)

- Migrating existing fixed-schema row data into `dynamic_tables` — the legacy fallback handles display until first upload.
- Multi-sheet upload (we use the first sheet only; if the user wants per-sheet, that's a follow-up).
- Re-deriving variance/total formulas on uploaded data — those formulas assume fixed column names.

## Order of operations

1. Run migration for `dynamic_tables`.
2. Add hooks.
3. Rewrite `EditableTable` + update `PerformanceTable` upload.
4. Delete `investors.tsx`, `investor-matrix.tsx`, remove nav entry.
