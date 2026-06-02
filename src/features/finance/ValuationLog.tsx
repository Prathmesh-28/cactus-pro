import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Minus, Plus, X, ChevronDown, ChevronUp,
  BarChart2, TableIcon,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { generateId } from '../../lib/utils';
import type { ValuationMark } from '../../data/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const METHODOLOGIES = [
  'Last Round',
  'Revenue Multiple',
  'DCF',
  'Comparable',
  'Write-down',
  'Write-off',
] as const;

type Methodology = (typeof METHODOLOGIES)[number];

/** Generate the last 8 quarters ending at the current quarter */
function generateLast8Quarters(): string[] {
  const quarters: string[] = [];
  // Current date: 2026-06-03 → Q2 2026
  let year = 2026;
  let q = 2;
  for (let i = 0; i < 8; i++) {
    quarters.unshift(`Q${q} ${year}`);
    q -= 1;
    if (q < 1) { q = 4; year -= 1; }
  }
  return quarters;
}

const ALL_QUARTERS = generateLast8Quarters();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseFmv(fmv: string): number {
  // Accepts "₹500 Cr", "500 Cr", "500", "500000000"
  const cleaned = fmv.replace(/[₹,\s]/g, '').toLowerCase();
  if (cleaned.endsWith('cr')) {
    return parseFloat(cleaned.replace('cr', '')) * 1e7;
  }
  return parseFloat(cleaned) || 0;
}

function formatCr(val: number): string {
  if (val === 0) return '—';
  const cr = val / 1e7;
  return `₹${cr.toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`;
}

// fmvFromString used via parseFmv directly
const _fmvFromString = (s: string): number => parseFmv(s);
void _fmvFromString;

// ─── Sub-components ───────────────────────────────────────────────────────────

function TrendIcon({ current, prev }: { current: number; prev: number | null }) {
  if (prev === null || prev === 0) return <Minus size={14} className="text-gray-400" />;
  if (current > prev)
    return <TrendingUp size={14} className="text-emerald-500" />;
  if (current < prev)
    return <TrendingDown size={14} className="text-red-500" />;
  return <Minus size={14} className="text-gray-400" />;
}

interface CellEditorProps {
  value: string;
  onSave: (v: string) => void;
  onCancel: () => void;
}

function CellEditor({ value, onSave, onCancel }: CellEditorProps) {
  const [v, setV] = useState(value);
  return (
    <div className="flex gap-1 items-center" onClick={e => e.stopPropagation()}>
      <input
        autoFocus
        className="w-24 text-xs border border-emerald-400 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        value={v}
        onChange={e => setV(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') onSave(v);
          if (e.key === 'Escape') onCancel();
        }}
      />
      <button
        onClick={() => onSave(v)}
        className="p-0.5 rounded hover:bg-emerald-100 text-emerald-600"
      >
        <TrendingUp size={11} />
      </button>
      <button
        onClick={onCancel}
        className="p-0.5 rounded hover:bg-red-100 text-red-500"
      >
        <X size={11} />
      </button>
    </div>
  );
}

// ─── Add Mark Form ────────────────────────────────────────────────────────────

interface AddMarkFormProps {
  companies: { id: string; name: string }[];
  quarters: string[];
  onAdd: (m: ValuationMark) => void;
  onClose: () => void;
}

function AddMarkForm({ companies, quarters, onAdd, onClose }: AddMarkFormProps) {
  const [form, setForm] = useState({
    companyId: companies[0]?.id ?? '',
    quarter: quarters[quarters.length - 1],
    fmv: '',
    methodology: 'Last Round' as Methodology,
    moicAtMark: '',
    notes: '',
    markedBy: '',
  });

  const set = (k: keyof typeof form, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.companyId || !form.fmv || !form.quarter) return;
    onAdd({
      id: generateId(),
      companyId: form.companyId,
      quarter: form.quarter,
      fmv: form.fmv,
      methodology: form.methodology,
      moicAtMark: parseFloat(form.moicAtMark) || 0,
      notes: form.notes,
      markedBy: form.markedBy,
      markedAt: new Date().toISOString(),
    });
    onClose();
  };

  const inputCls =
    'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white';
  const labelCls = 'block text-xs font-medium text-gray-600 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-4 flex items-center justify-between">
          <h2 className="text-white font-semibold text-base">Add Valuation Mark</h2>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 gap-4">
          {/* Company */}
          <div className="col-span-2">
            <label className={labelCls}>Company *</label>
            <select
              required
              className={inputCls}
              value={form.companyId}
              onChange={e => set('companyId', e.target.value)}
            >
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Quarter */}
          <div>
            <label className={labelCls}>Quarter *</label>
            <select
              required
              className={inputCls}
              value={form.quarter}
              onChange={e => set('quarter', e.target.value)}
            >
              {quarters.map(q => (
                <option key={q} value={q}>{q}</option>
              ))}
            </select>
          </div>

          {/* FMV */}
          <div>
            <label className={labelCls}>FMV *</label>
            <input
              required
              placeholder="e.g. ₹500 Cr"
              className={inputCls}
              value={form.fmv}
              onChange={e => set('fmv', e.target.value)}
            />
          </div>

          {/* Methodology */}
          <div>
            <label className={labelCls}>Methodology</label>
            <select
              className={inputCls}
              value={form.methodology}
              onChange={e => set('methodology', e.target.value as Methodology)}
            >
              {METHODOLOGIES.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* MOIC */}
          <div>
            <label className={labelCls}>MOIC at Mark</label>
            <input
              type="number"
              step="0.01"
              placeholder="e.g. 2.50"
              className={inputCls}
              value={form.moicAtMark}
              onChange={e => set('moicAtMark', e.target.value)}
            />
          </div>

          {/* Marked By */}
          <div>
            <label className={labelCls}>Marked By</label>
            <input
              placeholder="Name"
              className={inputCls}
              value={form.markedBy}
              onChange={e => set('markedBy', e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="col-span-2">
            <label className={labelCls}>Notes</label>
            <textarea
              rows={2}
              placeholder="Additional notes…"
              className={inputCls + ' resize-none'}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="col-span-2 flex gap-3 justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Save Mark
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── History Chart Modal ──────────────────────────────────────────────────────

interface HistoryChartProps {
  companyName: string;
  logoUrl: string;
  marks: ValuationMark[];
  onClose: () => void;
}

function HistoryChart({ companyName, logoUrl, marks, onClose }: HistoryChartProps) {
  const sorted = [...marks].sort((a, b) => {
    // Sort by quarter string chronologically
    const parseQ = (q: string) => {
      const [qPart, yearPart] = q.split(' ');
      return parseInt(yearPart) * 4 + parseInt(qPart.replace('Q', ''));
    };
    return parseQ(a.quarter) - parseQ(b.quarter);
  });

  const data = sorted.map(m => ({
    quarter: m.quarter,
    fmv: parseFmv(m.fmv) / 1e7,
    methodology: m.methodology,
    moic: m.moicAtMark,
  }));

  const maxFmv = Math.max(...data.map(d => d.fmv), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 to-emerald-500 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logoUrl && (
              <img src={logoUrl} alt={companyName} className="h-8 w-8 rounded-full object-contain bg-white p-0.5" />
            )}
            <div>
              <h2 className="text-white font-semibold text-base">{companyName}</h2>
              <p className="text-emerald-100 text-xs">FMV History — Quarterly Marks</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          {data.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">No valuation marks recorded yet.</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0fdf4" />
                  <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: '#6b7280' }} />
                  <YAxis
                    tickFormatter={v => `₹${v}Cr`}
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    domain={[0, Math.ceil(maxFmv * 1.15)]}
                  />
                  <Tooltip
                    formatter={((value: number | string, name: string) => [
                      name === 'fmv' ? `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr` : value,
                      name === 'fmv' ? 'FMV' : name,
                    ]) as never}
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: '1px solid #d1fae5',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    }}
                  />
                  <Bar dataKey="fmv" radius={[4, 4, 0, 0]}>
                    {data.map((entry, index) => {
                      const prev = index > 0 ? data[index - 1].fmv : null;
                      const color =
                        prev === null
                          ? '#10b981'
                          : entry.fmv > prev
                          ? '#10b981'
                          : entry.fmv < prev
                          ? '#ef4444'
                          : '#6b7280';
                      return <Cell key={entry.quarter} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Mark detail table */}
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-100">
                      <th className="pb-2 text-left font-medium">Quarter</th>
                      <th className="pb-2 text-right font-medium">FMV</th>
                      <th className="pb-2 text-right font-medium">MOIC</th>
                      <th className="pb-2 text-left font-medium pl-3">Methodology</th>
                      <th className="pb-2 text-left font-medium pl-3">Marked By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((m, i) => {
                      const prevMark = i > 0 ? sorted[i - 1] : null;
                      const curr = parseFmv(m.fmv);
                      const prev = prevMark ? parseFmv(prevMark.fmv) : null;
                      const isUp = prev !== null && curr > prev;
                      const isDown = prev !== null && curr < prev;
                      return (
                        <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          <td className="py-1.5 font-medium text-gray-700">{m.quarter}</td>
                          <td className="py-1.5 text-right">
                            <span className={isUp ? 'text-emerald-600 font-medium' : isDown ? 'text-red-500 font-medium' : 'text-gray-700'}>
                              {formatCr(curr)}
                            </span>
                          </td>
                          <td className="py-1.5 text-right text-gray-600">{m.moicAtMark > 0 ? `${m.moicAtMark.toFixed(2)}x` : '—'}</td>
                          <td className="py-1.5 pl-3 text-gray-500">{m.methodology || '—'}</td>
                          <td className="py-1.5 pl-3 text-gray-500">{m.markedBy || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ValuationLog() {
  const { store, addValuationMark, updateValuationMark } = useApp();
  const { companies, valuationMarks } = store;

  const activeCompanies = companies.filter(c => c.status !== 'Exited');

  // UI state
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCell, setEditingCell] = useState<{ companyId: string; quarter: string } | null>(null);
  const [historyCompanyId, setHistoryCompanyId] = useState<string | null>(null);
  const [currentQuarter, setCurrentQuarter] = useState(ALL_QUARTERS[ALL_QUARTERS.length - 1]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Derive visible quarters (last 8, ending at currentQuarter)
  const visibleQuarters = useMemo(() => {
    const idx = ALL_QUARTERS.indexOf(currentQuarter);
    if (idx === -1) return ALL_QUARTERS;
    return ALL_QUARTERS.slice(Math.max(0, idx - 7), idx + 1);
  }, [currentQuarter]);

  // Build lookup: companyId → quarter → mark
  const markLookup = useMemo(() => {
    const map: Record<string, Record<string, ValuationMark>> = {};
    for (const m of valuationMarks) {
      if (!map[m.companyId]) map[m.companyId] = {};
      map[m.companyId][m.quarter] = m;
    }
    return map;
  }, [valuationMarks]);

  // For a given company + quarter, get the previous mark's FMV
  const getPrevFmv = (companyId: string, quarterIdx: number): number | null => {
    for (let i = quarterIdx - 1; i >= 0; i--) {
      const q = visibleQuarters[i];
      const m = markLookup[companyId]?.[q];
      if (m) return parseFmv(m.fmv);
    }
    return null;
  };

  // Summary: total portfolio FMV + weighted avg MOIC for current quarter
  const summary = useMemo(() => {
    let totalFmv = 0;
    let weightedMoic = 0;
    let totalWeight = 0;
    for (const c of activeCompanies) {
      const mark = markLookup[c.id]?.[currentQuarter];
      if (mark) {
        const fmv = parseFmv(mark.fmv);
        totalFmv += fmv;
        if (mark.moicAtMark > 0) {
          weightedMoic += mark.moicAtMark * fmv;
          totalWeight += fmv;
        }
      }
    }
    return {
      totalFmv,
      weightedMoic: totalWeight > 0 ? weightedMoic / totalWeight : 0,
    };
  }, [activeCompanies, markLookup, currentQuarter]);

  // Latest mark for a company (most recent quarter with data)
  const getLatestMark = (companyId: string): ValuationMark | null => {
    const marks = valuationMarks
      .filter(m => m.companyId === companyId)
      .sort((a, b) => {
        const parseQ = (q: string) => {
          const [qP, yP] = q.split(' ');
          return parseInt(yP) * 4 + parseInt(qP.replace('Q', ''));
        };
        return parseQ(b.quarter) - parseQ(a.quarter);
      });
    return marks[0] ?? null;
  };

  // Inline cell save handler
  const handleCellSave = (companyId: string, quarter: string, newFmv: string) => {
    const existing = markLookup[companyId]?.[quarter];
    if (existing) {
      updateValuationMark({ ...existing, fmv: newFmv });
    } else {
      addValuationMark({
        id: generateId(),
        companyId,
        quarter,
        fmv: newFmv,
        methodology: 'Last Round',
        moicAtMark: 0,
        notes: '',
        markedBy: '',
        markedAt: new Date().toISOString(),
      });
    }
    setEditingCell(null);
  };

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const historyCompany = historyCompanyId
    ? companies.find(c => c.id === historyCompanyId) ?? null
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart2 size={22} className="text-emerald-600" />
            Valuation Log
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Quarterly FMV marks across the portfolio — click any cell to edit inline
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Quarter selector */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Current Quarter</label>
            <select
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
              value={currentQuarter}
              onChange={e => setCurrentQuarter(e.target.value)}
            >
              {ALL_QUARTERS.map(q => (
                <option key={q} value={q}>{q}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm"
          >
            <Plus size={15} />
            Add Mark
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-500 rounded-xl p-4 text-white col-span-2 sm:col-span-1 shadow-md">
          <p className="text-emerald-100 text-xs font-medium mb-1">Total Portfolio FMV</p>
          <p className="text-2xl font-bold">{formatCr(summary.totalFmv)}</p>
          <p className="text-emerald-200 text-xs mt-1">{currentQuarter}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
          <p className="text-gray-500 text-xs font-medium mb-1">Weighted Avg MOIC</p>
          <p className="text-2xl font-bold text-gray-800">
            {summary.weightedMoic > 0 ? `${summary.weightedMoic.toFixed(2)}x` : '—'}
          </p>
          <p className="text-gray-400 text-xs mt-1">at {currentQuarter}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
          <p className="text-gray-500 text-xs font-medium mb-1">Companies Marked</p>
          <p className="text-2xl font-bold text-gray-800">
            {activeCompanies.filter(c => markLookup[c.id]?.[currentQuarter]).length}
            <span className="text-sm font-normal text-gray-400"> / {activeCompanies.length}</span>
          </p>
          <p className="text-gray-400 text-xs mt-1">this quarter</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
          <p className="text-gray-500 text-xs font-medium mb-1">Total Marks</p>
          <p className="text-2xl font-bold text-gray-800">{valuationMarks.length}</p>
          <p className="text-gray-400 text-xs mt-1">all quarters</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="sticky left-0 z-10 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide py-3 px-4 min-w-[200px]">
                  Company
                </th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide py-3 px-3 whitespace-nowrap">
                  Stage
                </th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide py-3 px-3 whitespace-nowrap">
                  Latest FMV
                </th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide py-3 px-3 whitespace-nowrap">
                  MOIC
                </th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide py-3 px-3 whitespace-nowrap">
                  Methodology
                </th>
                {visibleQuarters.map(q => (
                  <th
                    key={q}
                    className={`text-center text-xs font-semibold uppercase tracking-wide py-3 px-3 whitespace-nowrap min-w-[100px] ${
                      q === currentQuarter
                        ? 'text-emerald-700 bg-emerald-50'
                        : 'text-gray-500'
                    }`}
                  >
                    {q}
                  </th>
                ))}
                <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide py-3 px-3 whitespace-nowrap">
                  History
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-50">
              {activeCompanies.map(company => {
                const latestMark = getLatestMark(company.id);
                const isExpanded = expandedRows.has(company.id);

                return (
                  <>
                    <tr
                      key={company.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer group"
                      onClick={() => toggleRow(company.id)}
                    >
                      {/* Company info */}
                      <td className="sticky left-0 z-10 bg-white group-hover:bg-gray-50 transition-colors py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <button
                            onClick={e => { e.stopPropagation(); toggleRow(company.id); }}
                            className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                          {company.logoUrl ? (
                            <img
                              src={company.logoUrl}
                              alt={company.name}
                              className="h-7 w-7 rounded-full object-contain bg-gray-50 border border-gray-100 flex-shrink-0"
                            />
                          ) : (
                            <div className="h-7 w-7 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-emerald-700 text-xs font-bold">{company.name[0]}</span>
                            </div>
                          )}
                          <span className="font-medium text-gray-900 text-sm leading-tight">{company.name}</span>
                        </div>
                      </td>

                      {/* Stage */}
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                          {company.stage}
                        </span>
                      </td>

                      {/* Latest FMV */}
                      <td className="py-3 px-3 text-right font-semibold text-gray-800">
                        {latestMark ? formatCr(parseFmv(latestMark.fmv)) : '—'}
                      </td>

                      {/* MOIC */}
                      <td className="py-3 px-3 text-right">
                        {latestMark && latestMark.moicAtMark > 0 ? (
                          <span className={`font-semibold ${latestMark.moicAtMark >= 2 ? 'text-emerald-600' : latestMark.moicAtMark >= 1 ? 'text-amber-600' : 'text-red-500'}`}>
                            {latestMark.moicAtMark.toFixed(2)}x
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      {/* Methodology */}
                      <td className="py-3 px-3 text-gray-500 text-xs">
                        {latestMark?.methodology || '—'}
                      </td>

                      {/* Quarter cells */}
                      {visibleQuarters.map((q, qIdx) => {
                        const mark = markLookup[company.id]?.[q];
                        const currFmv = mark ? parseFmv(mark.fmv) : 0;
                        const prevFmv = getPrevFmv(company.id, qIdx);
                        const isEditing =
                          editingCell?.companyId === company.id && editingCell?.quarter === q;
                        const isCurrentQ = q === currentQuarter;

                        return (
                          <td
                            key={q}
                            className={`py-3 px-3 text-center align-middle ${isCurrentQ ? 'bg-emerald-50' : ''}`}
                            onClick={e => {
                              e.stopPropagation();
                              setEditingCell({ companyId: company.id, quarter: q });
                            }}
                          >
                            {isEditing ? (
                              <CellEditor
                                value={mark?.fmv ?? ''}
                                onSave={v => handleCellSave(company.id, q, v)}
                                onCancel={() => setEditingCell(null)}
                              />
                            ) : mark ? (
                              <div className="flex flex-col items-center gap-0.5 cursor-text group/cell">
                                <div className="flex items-center gap-1">
                                  <TrendIcon current={currFmv} prev={prevFmv} />
                                  <span
                                    className={`text-xs font-medium ${
                                      prevFmv !== null && currFmv > prevFmv
                                        ? 'text-emerald-600'
                                        : prevFmv !== null && currFmv < prevFmv
                                        ? 'text-red-500'
                                        : 'text-gray-700'
                                    }`}
                                  >
                                    {formatCr(currFmv)}
                                  </span>
                                </div>
                                <span className="text-gray-400 text-[10px] group-hover/cell:text-emerald-500 transition-colors">
                                  click to edit
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-300 text-xs cursor-pointer hover:text-emerald-400 transition-colors">
                                + add
                              </span>
                            )}
                          </td>
                        );
                      })}

                      {/* History button */}
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={e => { e.stopPropagation(); setHistoryCompanyId(company.id); }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                          title="View history chart"
                        >
                          <TableIcon size={14} />
                        </button>
                      </td>
                    </tr>

                    {/* Expanded notes row */}
                    {isExpanded && (
                      <tr key={`${company.id}-expanded`} className="bg-emerald-50/50">
                        <td colSpan={6 + visibleQuarters.length + 1} className="px-6 py-3">
                          <div className="flex flex-wrap gap-6">
                            {visibleQuarters
                              .filter(q => markLookup[company.id]?.[q])
                              .reverse()
                              .slice(0, 4)
                              .map(q => {
                                const m = markLookup[company.id][q];
                                return (
                                  <div key={q} className="bg-white rounded-lg border border-gray-100 p-3 min-w-[160px] shadow-sm">
                                    <p className="text-xs font-semibold text-emerald-700 mb-1">{q}</p>
                                    <p className="text-sm font-bold text-gray-800">{formatCr(parseFmv(m.fmv))}</p>
                                    <p className="text-xs text-gray-500">{m.methodology}</p>
                                    {m.markedBy && (
                                      <p className="text-xs text-gray-400 mt-1">by {m.markedBy}</p>
                                    )}
                                    {m.notes && (
                                      <p className="text-xs text-gray-500 mt-1 italic line-clamp-2">{m.notes}</p>
                                    )}
                                  </div>
                                );
                              })}
                            {valuationMarks.filter(m => m.companyId === company.id).length === 0 && (
                              <p className="text-xs text-gray-400 italic py-2">No marks recorded for this company yet.</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}

              {activeCompanies.length === 0 && (
                <tr>
                  <td colSpan={6 + visibleQuarters.length + 1} className="text-center py-16 text-gray-400">
                    <BarChart2 size={36} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No portfolio companies found.</p>
                  </td>
                </tr>
              )}

              {/* Summary row */}
              {activeCompanies.length > 0 && (
                <tr className="bg-gradient-to-r from-gray-50 to-emerald-50 border-t-2 border-emerald-200 font-semibold">
                  <td className="sticky left-0 z-10 bg-gray-50 py-3 px-4 text-gray-700 text-sm">
                    Portfolio Total
                  </td>
                  <td className="py-3 px-3" />
                  <td className="py-3 px-3 text-right text-emerald-700 font-bold">
                    {formatCr(summary.totalFmv)}
                  </td>
                  <td className="py-3 px-3 text-right text-emerald-700 font-bold">
                    {summary.weightedMoic > 0 ? `${summary.weightedMoic.toFixed(2)}x` : '—'}
                  </td>
                  <td className="py-3 px-3 text-xs text-gray-500 italic">Weighted avg</td>
                  {visibleQuarters.map(q => {
                    const qTotal = activeCompanies.reduce((sum, c) => {
                      const m = markLookup[c.id]?.[q];
                      return sum + (m ? parseFmv(m.fmv) : 0);
                    }, 0);
                    return (
                      <td key={q} className={`py-3 px-3 text-center text-xs font-bold ${q === currentQuarter ? 'text-emerald-700 bg-emerald-100' : 'text-gray-600'}`}>
                        {qTotal > 0 ? formatCr(qTotal) : '—'}
                      </td>
                    );
                  })}
                  <td className="py-3 px-3" />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-500 pb-4">
        <div className="flex items-center gap-1.5">
          <TrendingUp size={13} className="text-emerald-500" />
          <span>FMV increased vs previous mark</span>
        </div>
        <div className="flex items-center gap-1.5">
          <TrendingDown size={13} className="text-red-500" />
          <span>FMV decreased vs previous mark</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Minus size={13} className="text-gray-400" />
          <span>No prior mark / unchanged</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-emerald-100 border border-emerald-300" />
          <span>Current quarter column</span>
        </div>
      </div>

      {/* Modals */}
      {showAddForm && (
        <AddMarkForm
          companies={activeCompanies.map(c => ({ id: c.id, name: c.name }))}
          quarters={ALL_QUARTERS}
          onAdd={m => addValuationMark(m)}
          onClose={() => setShowAddForm(false)}
        />
      )}

      {historyCompany && (
        <HistoryChart
          companyName={historyCompany.name}
          logoUrl={historyCompany.logoUrl}
          marks={valuationMarks.filter(m => m.companyId === historyCompany.id)}
          onClose={() => setHistoryCompanyId(null)}
        />
      )}
    </div>
  );
}
