/**
 * KV-backed data layer for the Finance tab.
 * All data is stored in the 'finance' KV namespace (PostgreSQL via the API server)
 * so every user sees the same state. No localStorage is used anywhere here.
 *
 * Provides the same hook/function shapes as before so UI components are unchanged.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { kvGet, kvSet, kvGetAll } from '../../../lib/api';
import { getActiveFund } from './fund-context';

// ─── Constants ────────────────────────────────────────────────────────────────

const NS = 'finance'; // KV namespace

// ─── Cross-component reactivity (same browser, same session) ─────────────────
// When we write to KV we also fire a local event so sibling components refresh
// immediately without waiting for a round-trip.

const EVT = 'fin-store-changed';

function dispatchLocal(key: string) {
  window.dispatchEvent(new CustomEvent(EVT, { detail: { key } }));
}

function useListen(keys: string[], cb: () => void) {
  useEffect(() => {
    const h = (e: Event) => {
      const k = (e as CustomEvent).detail?.key as string;
      if (!keys.length || keys.some(kk => kk === k || k?.startsWith(kk))) cb();
    };
    window.addEventListener(EVT, h);
    return () => window.removeEventListener(EVT, h);
  }, [keys.join(',')]); // eslint-disable-line
}

// ─── KV helpers ───────────────────────────────────────────────────────────────

// In-memory cache — populated on write so hooks read instantly without waiting
// for KV round-trip. KV is the durable source; cache is the fast path.
const memCache = new Map<string, unknown>();

async function kvRead<T>(key: string): Promise<T | null> {
  if (memCache.has(key)) return memCache.get(key) as T;
  const v = await kvGet(NS, key);
  if (v !== null && v !== undefined) memCache.set(key, v);
  return (v as T) ?? null;
}

// Debounce KV writes per key; update cache and fire local event immediately.
const writeTimers: Record<string, ReturnType<typeof setTimeout>> = {};
function kvWrite(key: string, val: unknown) {
  memCache.set(key, val);   // instant in-memory update
  dispatchLocal(key);        // notify same-browser listeners — they read from cache
  if (writeTimers[key]) clearTimeout(writeTimers[key]);
  writeTimers[key] = setTimeout(() => {
    kvSet(NS, key, val).catch(() => {});
    delete writeTimers[key];
  }, 350);
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type DynColType = 'text' | 'number' | 'date';
export type DynColumn = { key: string; label: string; type: DynColType };
export type DynRow    = Record<string, unknown> & { id: string };
export type DynamicShape = {
  table_key: string;
  columns: DynColumn[];
  rows: DynRow[];
  updated_at?: string | null;
};

export type TableName =
  | 'fund_overview' | 'fund_performance_metrics'
  | 'fund_expenses' | 'im_expenses'
  | 'fund_expenses_actual' | 'im_expenses_actual'
  | 'req_rows' | 'req_investors' | 'req_cells'
  | 'bank_accounts' | 'pipeline_investments' | 'work_updates';

export type SectionKey = 'fund_overview' | 'expenses' | 'investors' | 'available_balances' | 'work_updates';

// ─── Key helpers ──────────────────────────────────────────────────────────────

function dynKey(fund: string, tableKey: string) {
  return `fin_dyn_${fund}::${tableKey}`;
}
function tableKey2(fund: string, table: TableName) {
  return `fin_tbl_${fund}::${table}`;
}
function fmvKey(fund: string, rowType: string) {
  return `fin_fmv_${fund}::${rowType}`;
}

// ─── genId ────────────────────────────────────────────────────────────────────

export function genId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

// ─── Auth stub ────────────────────────────────────────────────────────────────

export function useAuth() {
  return {
    canEdit: true,
    isAdmin: true,
    session: { user: { id: 'local' } },
    loading: false,
    rolesLoading: false,
    signOut: async () => {},
  };
}

// ─── Section timestamps (noop) ────────────────────────────────────────────────

export async function bumpSectionTimestamps(_sections: SectionKey[]) { /* noop */ }
export function useSectionTimestamp(_section: SectionKey): string | null { return null; }
export function sectionsForTable(_table: TableName): SectionKey[] { return []; }

// ─── Dynamic tables ───────────────────────────────────────────────────────────

export function useDynamicTable(tableKey: string) {
  const fund = getActiveFund();
  const lk = dynKey(fund, tableKey);
  const [data, setData] = useState<DynamicShape | null>(null);

  const refresh = useCallback(async () => {
    const d = await kvRead<DynamicShape>(lk);
    setData(d);
  }, [lk]);

  useListen([lk], () => { void refresh(); });
  useEffect(() => { void refresh(); }, [fund, tableKey]); // eslint-disable-line

  return { data };
}

export function useDynamicTablesByPrefix(prefix: string) {
  const fund = getActiveFund();
  const [sheets, setSheets] = useState<DynamicShape[]>([]);
  const isLoading = useRef(false);

  const refresh = useCallback(async () => {
    if (isLoading.current) return;
    isLoading.current = true;
    try {
      const all = await kvGetAll(NS);
      const fullPrefix = `fin_dyn_${fund}::${prefix}`;
      const results: DynamicShape[] = Object.entries(all)
        .filter(([k]) => k.startsWith(fullPrefix))
        .map(([k, v]) => {
          const d = v as DynamicShape;
          return { ...d, table_key: k.replace(`fin_dyn_${fund}::`, '') };
        });
      setSheets(results);
    } finally {
      isLoading.current = false;
    }
  }, [fund, prefix]);

  useListen([`fin_dyn_${fund}::${prefix}`], () => { void refresh(); });
  useEffect(() => { void refresh(); }, [fund, prefix]); // eslint-disable-line

  return { data: sheets };
}

export function useMutateDynamicTable(_section?: SectionKey) {
  const fund = getActiveFund();
  return {
    isPending: false,
    mutateAsync: async (v: { tableKey: string; columns: DynColumn[]; rows: DynRow[] }) => {
      const lk = dynKey(fund, v.tableKey);
      const shape: DynamicShape = { table_key: v.tableKey, columns: v.columns, rows: v.rows, updated_at: new Date().toISOString() };
      kvWrite(lk, shape);
    },
  };
}

export function useReplaceDynamicTable(_section?: SectionKey) {
  const fund = getActiveFund();
  return {
    isPending: false,
    mutateAsync: async (v: { tableKey: string; columns: DynColumn[]; rows: DynRow[] }) => {
      const lk = dynKey(fund, v.tableKey);
      const shape: DynamicShape = { table_key: v.tableKey, columns: v.columns, rows: v.rows, updated_at: new Date().toISOString() };
      kvWrite(lk, shape);
    },
  };
}

export function useDeleteDynamicTable(_section?: SectionKey) {
  const fund = getActiveFund();
  return {
    isPending: false,
    mutateAsync: async (tableKey: string) => {
      const lk = dynKey(fund, tableKey);
      memCache.delete(lk);
      await kvSet(NS, lk, null);
      dispatchLocal(lk);
    },
  };
}

// ─── Regular table (fund_expenses etc.) ──────────────────────────────────────

export function useTable<T = Record<string, unknown>>(table: TableName) {
  const fund = getActiveFund();
  const lk = tableKey2(fund, table);
  const [data, setData] = useState<T[]>([]);

  const refresh = useCallback(async () => {
    const d = await kvRead<T[]>(lk);
    setData(d ?? []);
  }, [lk]);

  useListen([lk], () => { void refresh(); });
  useEffect(() => { void refresh(); }, [fund, table]); // eslint-disable-line

  return { data, isLoading: false };
}

// ─── Fund metric values ───────────────────────────────────────────────────────

export type MetricRow = {
  id: string;
  fund: string;
  row_type: string;
  period: string;
  metric_key: string;
  value: number | null;
};

export function useFundMetricValues(rowType: string) {
  const fund = getActiveFund();
  const lk = fmvKey(fund, rowType);
  const [data, setData] = useState<MetricRow[]>([]);

  const refresh = useCallback(async () => {
    const d = await kvRead<MetricRow[]>(lk);
    setData(d ?? []);
  }, [lk]);

  useListen([lk], () => { void refresh(); });
  useEffect(() => { void refresh(); }, [fund, rowType]); // eslint-disable-line

  return { data };
}

export async function upsertFundMetricValue(
  fund: string, rowType: string, period: string, metricKey: string, value: number | null
) {
  const lk = fmvKey(fund, rowType);
  const rows: MetricRow[] = (await kvRead<MetricRow[]>(lk)) ?? [];
  const idx = rows.findIndex(r => r.period === period && r.metric_key === metricKey);
  const row: MetricRow = { id: idx >= 0 ? rows[idx].id : genId(), fund, row_type: rowType, period, metric_key: metricKey, value };
  if (idx >= 0) rows[idx] = row; else rows.push(row);
  kvWrite(lk, rows);
}

// ─── Dynamic table builder helpers ───────────────────────────────────────────

export function buildShapeFromAOA(aoa: unknown[][]): { columns: DynColumn[]; rows: DynRow[] } {
  if (!aoa.length) return { columns: [], rows: [] };
  const headerRow = (aoa[0] as unknown[]).map((h, i) => String(h ?? '').trim() || `Column ${i + 1}`);
  const seen = new Map<string, number>();
  const columns: DynColumn[] = headerRow.map(label => {
    const base = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'col';
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return { key: n === 1 ? base : `${base}_${n}`, label, type: 'text' as DynColType };
  });
  const dataRows = aoa.slice(1) as unknown[][];
  columns.forEach((col, i) => {
    let hasAny = false, allNumeric = true;
    for (const r of dataRows) {
      const v = r[i];
      if (v === '' || v == null) continue;
      hasAny = true;
      if (!Number.isFinite(Number(String(v).replace(/[₹$,%\s]/g, '')))) { allNumeric = false; break; }
    }
    if (hasAny && allNumeric) col.type = 'number';
  });
  const rows: DynRow[] = dataRows.map(r => {
    const row: DynRow = { id: genId() };
    let anyVal = false;
    columns.forEach((col, i) => {
      const raw = r[i];
      if (raw === '' || raw == null) { row[col.key] = null; return; }
      anyVal = true;
      if (col.type === 'number') {
        const n = Number(String(raw).replace(/[₹$,%\s]/g, ''));
        row[col.key] = Number.isFinite(n) ? n : null;
      } else { row[col.key] = raw; }
    });
    return anyVal ? row : null;
  }).filter((r): r is DynRow => r !== null);
  return { columns, rows };
}

export function newDynRow(columns: DynColumn[]): DynRow {
  const row: DynRow = { id: genId() };
  columns.forEach(c => { row[c.key] = c.type === 'text' ? '' : null; });
  return row;
}

export function formatDynCell(v: unknown, type: DynColType): string {
  if (v === null || v === undefined || v === '') return '—';
  if (type === 'number') {
    const n = Number(v);
    if (!Number.isFinite(n)) return String(v);
    return (n / 1e7).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  }
  return String(v);
}

export function coerceDynValue(value: string, type: DynColType): unknown {
  if (value === '') return null;
  if (type === 'number') {
    const n = Number(value.replace(/,/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  return value;
}

// ─── Upsert / insert / delete row for regular tables ─────────────────────────

export function useUpsertRow(table: TableName) {
  const fund = getActiveFund();
  const lk = tableKey2(fund, table);
  return {
    isPending: false,
    mutateAsync: async (row: Record<string, unknown>) => {
      const rows: Record<string, unknown>[] = (await kvRead<Record<string, unknown>[]>(lk)) ?? [];
      const idx = rows.findIndex(r => r.id === row.id);
      if (idx >= 0) rows[idx] = { ...rows[idx], ...row }; else rows.push({ ...row, fund });
      kvWrite(lk, rows);
    },
  };
}

export function useInsertRow(table: TableName) {
  const fund = getActiveFund();
  const lk = tableKey2(fund, table);
  return {
    isPending: false,
    mutateAsync: async (row: Record<string, unknown>) => {
      const rows: Record<string, unknown>[] = (await kvRead<Record<string, unknown>[]>(lk)) ?? [];
      rows.push({ id: genId(), ...row, fund });
      kvWrite(lk, rows);
    },
  };
}

export function useDeleteRow(table: TableName) {
  const fund = getActiveFund();
  const lk = tableKey2(fund, table);
  return {
    isPending: false,
    mutateAsync: async (id: string) => {
      const rows: Record<string, unknown>[] = (await kvRead<Record<string, unknown>[]>(lk)) ?? [];
      kvWrite(lk, rows.filter(r => r.id !== id));
    },
  };
}

export function useReplaceTable(table: TableName) {
  const fund = getActiveFund();
  const lk = tableKey2(fund, table);
  return {
    isPending: false,
    mutateAsync: async (rows: Record<string, unknown>[]) => {
      kvWrite(lk, rows.map(r => ({ ...r, fund })));
    },
  };
}
