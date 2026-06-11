import { useState, useEffect, useCallback } from 'react';
import { Pencil, Check, X, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { kvGet, kvSet } from '../../lib/api';

// ─── KV-backed state hook ─────────────────────────────────────────────────────

const kvCache = new Map<string, unknown>();
const KV_EVT = 'fin-kv-state-changed';

function useKvState<T>(key: string, initial: T): [T, (v: T) => void] {
  const [val, setVal] = useState<T>((kvCache.get(key) as T) ?? initial);

  const refresh = useCallback(async () => {
    const v = await kvGet('finance', key);
    if (v !== null && v !== undefined) {
      kvCache.set(key, v);
      setVal(v as T);
    } else {
      // Seed KV with the default so other users see it too
      kvSet('finance', key, initial).catch(() => {});
    }
  }, [key]); // eslint-disable-line

  useEffect(() => { void refresh(); }, [key]); // eslint-disable-line
  useEffect(() => {
    const h = (e: Event) => {
      const k = (e as CustomEvent).detail?.key as string;
      if (k === key && kvCache.has(key)) setVal(kvCache.get(key) as T);
    };
    window.addEventListener(KV_EVT, h);
    return () => window.removeEventListener(KV_EVT, h);
  }, [key]);

  const save = (v: T) => {
    kvCache.set(key, v);
    setVal(v);
    window.dispatchEvent(new CustomEvent(KV_EVT, { detail: { key } }));
    kvSet('finance', key, v).catch(() => {});
  };
  return [val, save];
}

// ─── Types ────────────────────────────────────────────────────────────────────

type MetricKey = 'called_capital' | 'nav' | 'tvpi' | 'gross_irr' | 'net_irr' | 'dpi' | 'moic';
type CashKey   = 'called_capital' | 'bank_balance' | 'uncalled_capital';

interface MetricDef { key: MetricKey; label: string; type: 'currency' | 'percent' | 'number' }

const METRICS: MetricDef[] = [
  { key: 'called_capital', label: 'Called Capital', type: 'currency' },
  { key: 'nav',            label: 'NAV',            type: 'currency' },
  { key: 'tvpi',           label: 'TVPI',           type: 'number'   },
  { key: 'gross_irr',      label: 'Gross IRR',      type: 'percent'  },
  { key: 'net_irr',        label: 'Net IRR',        type: 'percent'  },
  { key: 'dpi',            label: 'DPI',            type: 'number'   },
  { key: 'moic',           label: 'MOIC',           type: 'number'   },
];

type MetricValues = Record<MetricKey, number | null>;
type CashValues   = Record<CashKey,   number | null>;

// Currency values are stored in ₹Cr — the SAME unit as the rest of the app (lib/money,
// PortfolioFundView, FundLedger). Previously these were raw rupees displayed via /1e7,
// which made the same metric read 1e7× different across screens. Inputs are labelled
// in ₹Cr (see EditableGreenCard) so entry matches storage.
const DEFAULT_METRICS: MetricValues = {
  called_capital: 8.5, nav: 14.2, tvpi: 1.67, gross_irr: 24.5, net_irr: 21.2, dpi: 0.38, moic: 2.1,
};
const DEFAULT_CASH: CashValues = {
  called_capital: 8.5, bank_balance: 1.2, uncalled_capital: 6.5,
};

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmt(val: number | null, type: MetricDef['type']): string {
  if (val === null || val === undefined) return '—';
  if (type === 'currency') return `₹${Number(val).toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`;
  if (type === 'percent')  return `${Number(val).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
  return Number(val).toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function fmtCr(val: number | null): string {
  if (val === null || val === undefined) return '—';
  return `₹${Number(val).toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`;
}

// ─── Green gradient card ──────────────────────────────────────────────────────

function GreenCard({ label, value, onEdit, compact = false, skeleton = false }:
  { label: string; value: string; onEdit?: () => void; compact?: boolean; skeleton?: boolean }) {
  return (
    <div className="relative group rounded-lg text-white p-5 shadow-md flex-1"
      style={{ background: 'linear-gradient(135deg,#1E293B,#2D4A6B)', minWidth: compact ? 110 : 160 }}>
      <div className="text-[11px] uppercase tracking-widest text-white/70 font-semibold">{label}</div>
      <div className={`mt-2 font-serif font-bold leading-none tabular-nums ${compact ? 'text-lg' : 'text-2xl md:text-[26px]'}`}>
        {skeleton
          ? <span className="inline-block w-16 h-4 bg-white/20 rounded animate-pulse" />
          : value}
      </div>
      {onEdit && (
        <button onClick={onEdit} className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-60 transition">
          <Pencil className="w-3 h-3 text-white" />
        </button>
      )}
    </div>
  );
}

// ─── Editable metric card ─────────────────────────────────────────────────────

function EditableGreenCard({ def, value, onChange }: { def: MetricDef; value: number | null; onChange: (v: number | null) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const commit = () => {
    const n = draft === '' ? null : Number(draft.replace(/,/g, ''));
    onChange(Number.isFinite(n as number) ? (n as number) : null);
    setEditing(false);
  };

  return (
    <div className="relative group rounded-lg text-white p-5 shadow-md flex-1"
      style={{ background: 'linear-gradient(135deg,#1E293B,#2D4A6B)', minWidth: 130 }}>
      <div className="text-[11px] uppercase tracking-widest text-white/70 font-semibold">{def.label}</div>
      {editing ? (
        <div className="mt-2 flex items-center gap-1">
          <input autoFocus type="number" step="any" value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
            className="w-full rounded px-2 py-1 text-sm font-mono text-gray-900 bg-white/90 focus:outline-none" />
        </div>
      ) : (
        <div className="mt-2 font-serif font-bold text-2xl md:text-[26px] leading-none tabular-nums cursor-text"
          onClick={() => { setDraft(value === null ? '' : String(value)); setEditing(true); }}>
          {fmt(value, def.type)}
        </div>
      )}
      {!editing && <Pencil className="w-3 h-3 absolute top-2.5 right-2.5 text-white opacity-0 group-hover:opacity-60 transition" />}
    </div>
  );
}

// ─── Op sign ──────────────────────────────────────────────────────────────────

function Op({ children, compact = false }: { children: string; compact?: boolean }) {
  return (
    <div className="flex items-center justify-center font-bold select-none shrink-0"
      style={{ color: '#2D6A4F', fontSize: compact ? 20 : 28, minWidth: compact ? 14 : 20 }}>
      {children}
    </div>
  );
}

// ─── FundOverview main ────────────────────────────────────────────────────────

export default function FundOverview() {
  const { store, loading } = useApp();
  const [metrics, setMetrics] = useKvState<MetricValues>('fin_metrics', DEFAULT_METRICS);
  const [cash,    setCash]    = useKvState<CashValues>('fin_cash', DEFAULT_CASH);
  const [expAgg] = useKvState<{ fundLife: number; sixMonths: number } | null>('fin_expenses_agg', null);
  const [fund, setFund]       = useState<'fund_1' | 'fund_2'>('fund_1');

  const setMetric = (k: MetricKey, v: number | null) => setMetrics({ ...metrics, [k]: v });
  const setCashVal = (k: CashKey, v: number | null) => setCash({ ...cash, [k]: v });

  // True when KV data hasn't landed yet — show skeletons instead of hardcoded fallbacks
  const isLoading = loading || !store.companies || !store.portfolioSnapshot;

  // Derived investible values — expenses come from ExpensesSection via KV
  // Only use expAgg values once KV has loaded; show skeleton before then
  const sixMonthsExp = expAgg?.sixMonths ?? (isLoading ? null : 1200000);
  const fundLifeExp  = expAgg?.fundLife  ?? (isLoading ? null : 8500000);

  const currentInvestible = sixMonthsExp === null ? null
    : (cash.called_capital ?? 0) + (cash.bank_balance ?? 0) - sixMonthsExp;
  const fundLevelInvestible = fundLifeExp === null ? null
    : (cash.called_capital ?? 0) + (cash.bank_balance ?? 0) + (cash.uncalled_capital ?? 0) - fundLifeExp;

  const cashMetrics: Array<{ key: CashKey; label: string }> = [
    { key: 'called_capital',   label: 'Called Capital' },
    { key: 'bank_balance',     label: 'Bank Balance' },
    { key: 'uncalled_capital', label: 'Uncalled Capital' },
  ];

  return (
    <div className="flex flex-col min-h-full">
      {/* Page header */}
      <div className="border-b px-6 md:px-10 py-6 bg-white/50 flex items-start justify-between"
        style={{ borderColor: '#E2E8F0' }}>
        <div>
          <h1 className="text-2xl md:text-3xl font-serif uppercase tracking-wide text-gray-900">Fund Overview</h1>
          <p className="text-xs text-gray-400 mt-1 italic">Amounts in INR Cr · Click any value to edit</p>
        </div>
        {/* Fund selector */}
        <div className="inline-flex items-center rounded-md border border-gray-300 p-0.5 bg-white">
          {(['fund_1', 'fund_2'] as const).map(f => (
            <button key={f} onClick={() => setFund(f)}
              className="px-3 py-1.5 text-xs font-medium rounded transition-colors"
              style={fund === f ? { backgroundColor: '#1E293B', color: '#fff' } : { color: '#2D6A4F' }}>
              {f === 'fund_1' ? 'Fund 1' : 'Fund 2'}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 md:px-10 py-8 space-y-10 flex-1">

        {/* ── Fund Metrics Row ──────────────────────────────────────────────── */}
        <section className="space-y-3">
          <div className="flex items-baseline gap-2">
            <p className="text-[11px] uppercase tracking-widest text-gray-500 font-semibold">Fund Metrics</p>
            <span className="text-[11px] text-gray-400">(Amounts in INR Cr)</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            {METRICS.map(def => (
              <EditableGreenCard key={def.key} def={def} value={metrics[def.key]} onChange={v => setMetric(def.key, v)} />
            ))}
          </div>
        </section>

        {/* ── Cash Flows ───────────────────────────────────────────────────── */}
        <section className="space-y-3">
          <p className="text-[11px] uppercase tracking-widest text-gray-500 font-semibold">Cash Flows</p>

          {/* Row 1: Current investible */}
          <div className="flex flex-wrap items-stretch gap-2">
            {cashMetrics.slice(0, 2).map(({ key, label }) => (
              <EditableCashCard key={key} label={label} value={cash[key]}
                onChange={v => setCashVal(key, v)} />
            ))}
            <Op>−</Op>
            <GreenCard label="Expenses (Next 6 Months)"
              value={fmtCr(sixMonthsExp)}
              skeleton={sixMonthsExp === null} />
            <Op>=</Op>
            <GreenCard label="Current Investible Funds"
              value={fmtCr(currentInvestible)}
              skeleton={currentInvestible === null} />
          </div>

          {/* Row 2: Fund-life investible */}
          <div className="flex flex-wrap items-stretch gap-2">
            {cashMetrics.map(({ key, label }) => (
              <EditableCashCard key={key} label={label} value={cash[key]}
                onChange={v => setCashVal(key, v)} compact />
            ))}
            <Op compact>−</Op>
            <GreenCard label="Expenses (Fund Life)"
              value={fmtCr(fundLifeExp)}
              skeleton={fundLifeExp === null}
              compact />
            <Op compact>=</Op>
            <GreenCard label="Investible at Fund Level"
              value={fmtCr(fundLevelInvestible)}
              skeleton={fundLevelInvestible === null}
              compact />
          </div>
        </section>

        {/* ── LP Summary ───────────────────────────────────────────────────── */}
        <section className="space-y-3">
          <p className="text-[11px] uppercase tracking-widest text-gray-500 font-semibold">Limited Partners</p>
          <div className="rounded-lg border bg-white shadow-sm overflow-hidden" style={{ borderColor: '#E2E8F0' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b" style={{ borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' }}>
                  <tr>
                    {['LP Name', 'Commitment', 'Called', 'Distributed', 'NAV'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: '#F8FAFC' }}>
                  {isLoading
                    ? Array.from({ length: 3 }).map((_, i) => (
                        <tr key={i}>
                          {Array.from({ length: 5 }).map((__, j) => (
                            <td key={j} className="px-5 py-3">
                              <span className="inline-block w-24 h-4 bg-gray-200 rounded animate-pulse" />
                            </td>
                          ))}
                        </tr>
                      ))
                    : (store.lps ?? []).map(lp => (
                    <tr key={lp.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-800">{lp.name}</td>
                      <td className="px-5 py-3 text-gray-600">{lp.commitment}</td>
                      <td className="px-5 py-3 text-gray-600">{lp.called}</td>
                      <td className="px-5 py-3 font-medium" style={{ color: '#2D6A4F' }}>{lp.distributed}</td>
                      <td className="px-5 py-3 font-semibold text-gray-900">{lp.nav}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── Portfolio Snapshot ───────────────────────────────────────────── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-widest text-gray-500 font-semibold">Portfolio Snapshot</p>
          </div>
          <div className="rounded-lg border bg-white shadow-sm overflow-hidden" style={{ borderColor: '#E2E8F0' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b" style={{ borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' }}>
                  <tr>
                    {['Company', 'Stage', 'Revenue', 'Valuation', 'Ownership %', 'MOIC', 'IRR %', 'Status'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: '#F8FAFC' }}>
                  {isLoading
                    ? Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}>
                          {Array.from({ length: 8 }).map((__, j) => (
                            <td key={j} className="px-4 py-3">
                              <span className="inline-block w-20 h-4 bg-gray-200 rounded animate-pulse" />
                            </td>
                          ))}
                        </tr>
                      ))
                    : (store.companies ?? []).filter(c => c.status !== 'Exited').map(c => (
                    <tr key={c.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-4 py-3 font-semibold text-gray-800">{c.name}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: '#DCFCE7', color: '#166534' }}>{c.stage}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{c.revenue || '—'}</td>
                      <td className="px-4 py-3 text-gray-700 font-medium">{c.currentValuation || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{c.ownershipPct > 0 ? `${c.ownershipPct}%` : '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {c.moic > 2 ? <TrendingUp className="w-3.5 h-3.5 text-green-600" /> :
                           c.moic > 0 && c.moic < 1 ? <TrendingDown className="w-3.5 h-3.5 text-red-500" /> :
                           <Minus className="w-3.5 h-3.5 text-gray-400" />}
                          <span className="font-semibold text-gray-800">{c.moic > 0 ? `${c.moic}x` : '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{c.irr > 0 ? `${c.irr}%` : '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          c.status === 'Active' ? 'bg-green-50 text-green-700' :
                          c.status === 'Watch'  ? 'bg-amber-50 text-amber-700' :
                          'bg-gray-100 text-gray-500'}`}>{c.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

// ─── Editable cash card (inline) ─────────────────────────────────────────────

function EditableCashCard({ label, value, onChange, compact = false }:
  { label: string; value: number | null; onChange: (v: number | null) => void; compact?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const commit = () => {
    const n = draft === '' ? null : Number(draft.replace(/,/g, ''));
    onChange(Number.isFinite(n as number) ? (n as number) : null);
    setEditing(false);
  };

  return (
    <div className="relative group rounded-lg text-white shadow-md flex-1"
      style={{ background: 'linear-gradient(135deg,#1E293B,#2D4A6B)', padding: compact ? '12px' : '20px', minWidth: compact ? 110 : 160 }}>
      <div className={`uppercase tracking-widest font-semibold text-white/70 ${compact ? 'text-[9px]' : 'text-[11px]'}`}>{label}</div>
      {editing ? (
        <div className="mt-1.5 flex items-center gap-1">
          <input autoFocus type="number" step="any" value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
            className="w-full rounded px-2 py-1 text-xs font-mono text-gray-900 bg-white/90 focus:outline-none" />
          <button onClick={commit} className="p-1 bg-white/20 rounded"><Check className="w-3 h-3" /></button>
          <button onClick={() => setEditing(false)} className="p-1 bg-white/20 rounded"><X className="w-3 h-3" /></button>
        </div>
      ) : (
        <div className={`font-serif font-bold leading-none tabular-nums cursor-text ${compact ? 'mt-1.5 text-base' : 'mt-2 text-2xl md:text-[26px]'}`}
          onClick={() => { setDraft(value === null ? '' : String(value)); setEditing(true); }}>
          {value === null ? '—' : `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`}
        </div>
      )}
      {!editing && <Pencil className="w-3 h-3 absolute top-2 right-2 text-white opacity-0 group-hover:opacity-60 transition" />}
    </div>
  );
}
