import { useState, useEffect } from 'react';
import { Plus, Trash2, Download } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExpRow { id: string; [key: string]: string | number }

function genId() { return `r_${Math.random().toString(36).slice(2)}_${Date.now()}`; }

function useLocalTable(storageKey: string, defaultRows: ExpRow[]) {
  const [rows, setRows] = useState<ExpRow[]>(() => {
    try { const s = localStorage.getItem(storageKey); return s ? JSON.parse(s) : defaultRows; } catch { return defaultRows; }
  });
  const save = (next: ExpRow[]) => {
    setRows(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
  };
  return [rows, save] as const;
}

// ─── Projected expense columns ────────────────────────────────────────────────

const FY_COLS = ['FY23','FY24','FY25','FY26','FY27','FY28','FY29','FY30','FY31'];

const DEFAULT_FUND_EXP: ExpRow[] = [
  { id: genId(), category: 'Management Fees',   FY23: 85, FY24: 90, FY25: 95,  FY26: 100, FY27: 105, FY28: 110, FY29: 115, FY30: 120, FY31: 125 },
  { id: genId(), category: 'Legal & Compliance', FY23: 15, FY24: 18, FY25: 20,  FY26: 22,  FY27: 24,  FY28: 26,  FY29: 28,  FY30: 30,  FY31: 32 },
  { id: genId(), category: 'Audit & Tax',        FY23: 10, FY24: 12, FY25: 13,  FY26: 14,  FY27: 15,  FY28: 16,  FY29: 17,  FY30: 18,  FY31: 19 },
  { id: genId(), category: 'Admin & Office',     FY23: 8,  FY24: 9,  FY25: 10,  FY26: 11,  FY27: 12,  FY28: 13,  FY29: 14,  FY30: 15,  FY31: 16 },
];
const DEFAULT_IM_EXP: ExpRow[] = [
  { id: genId(), category: 'Salaries',        FY23: 120, FY24: 132, FY25: 145, FY26: 160, FY27: 175, FY28: 190, FY29: 208, FY30: 228, FY31: 250 },
  { id: genId(), category: 'Travel & Events', FY23: 20,  FY24: 22,  FY25: 25,  FY26: 28,  FY27: 30,  FY28: 33,  FY29: 36,  FY30: 40,  FY31: 44 },
  { id: genId(), category: 'Technology',      FY23: 8,   FY24: 10,  FY25: 12,  FY26: 14,  FY27: 16,  FY28: 18,  FY29: 20,  FY30: 22,  FY31: 25 },
];

// ─── Actual vs Budgeted columns ───────────────────────────────────────────────

const AB_COLS = ['Budgeted','Q1','Var Q1 (%)','Q2','Var Q2 (%)','Q3','Var Q3 (%)','Q4','Var Q4 (%)'];
const DEFAULT_AB: ExpRow[] = [
  { id: genId(), category: 'Salaries',    Budgeted: 145, Q1: 34, 'Var Q1 (%)': 6, Q2: 36, 'Var Q2 (%)': -1, Q3: 37, 'Var Q3 (%)': 2, Q4: 38, 'Var Q4 (%)': 5 },
  { id: genId(), category: 'Management Fees', Budgeted: 95, Q1: 24, 'Var Q1 (%)': 1, Q2: 24, 'Var Q2 (%)': 0, Q3: 24, 'Var Q3 (%)': 0, Q4: 24, 'Var Q4 (%)': 3 },
  { id: genId(), category: 'Legal',       Budgeted: 20,  Q1: 4,  'Var Q1 (%)': -5, Q2: 5, 'Var Q2 (%)': 3, Q3: 6, 'Var Q3 (%)': 12, Q4: 5, 'Var Q4 (%)': 0 },
];

// ─── Editable expense table ───────────────────────────────────────────────────

function ExpTable({ title, storageKey, defaultRows, columns, centerHeaders }:
  { title: string; storageKey: string; defaultRows: ExpRow[]; columns: string[]; centerHeaders?: boolean }) {
  const [rows, setRows] = useLocalTable(storageKey, defaultRows);
  const [editing, setEditing] = useState<{ id: string; col: string } | null>(null);
  const [draft, setDraft] = useState('');

  const commit = () => {
    if (!editing) return;
    const n = Number(draft.replace(/,/g, ''));
    const next = rows.map(r => r.id === editing.id ? { ...r, [editing.col]: Number.isFinite(n) ? n : draft } : r);
    setRows(next);
    setEditing(null);
  };

  const addRow = () => {
    const blank: ExpRow = { id: genId(), category: 'New item' };
    columns.forEach(c => { if (c !== 'category') blank[c] = 0; });
    setRows([...rows, blank]);
  };

  const delRow = (id: string) => setRows(rows.filter(r => r.id !== id));

  const exportCsv = () => {
    const header = ['Category', ...columns].join(',');
    const body = rows.map(r => [`"${r.category}"`, ...columns.map(c => r[c] ?? '')].join(',')).join('\n');
    const blob = new Blob([header + '\n' + body], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${title}.csv`; a.click();
  };

  const totalRow = (() => {
    const t: Record<string, number> = {};
    columns.forEach(c => { t[c] = rows.reduce((s, r) => s + (Number(r[c]) || 0), 0); });
    return t;
  })();

  return (
    <div className="rounded-lg border bg-white shadow-sm overflow-hidden" style={{ borderColor: '#D4EDAA' }}>
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#D4EDAA' }}>
        <h3 className="font-serif text-lg uppercase tracking-wide text-gray-800">{title}</h3>
        <div className="flex items-center gap-2">
          <button onClick={exportCsv} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <button onClick={addRow} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-white"
            style={{ backgroundColor: '#3B6D11' }}>
            <Plus className="w-3.5 h-3.5" /> Add Row
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b text-xs font-semibold text-gray-600" style={{ borderColor: '#D4EDAA', backgroundColor: '#F0F7E6' }}>
            <tr>
              <th className="px-4 py-3 text-left w-40">Category</th>
              {columns.map(c => <th key={c} className={`px-3 py-3 whitespace-nowrap ${centerHeaders ? 'text-center' : 'text-right'}`}>{c}</th>)}
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: '#F0F7E6' }}>
            {rows.map(row => (
              <tr key={row.id} className="hover:bg-[#F0F7E6] transition-colors group">
                <td className="px-4 py-2.5">
                  {editing?.id === row.id && editing?.col === 'category' ? (
                    <input autoFocus className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
                      value={draft} onChange={e => setDraft(e.target.value)}
                      onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') commit(); }} />
                  ) : (
                    <span className="cursor-text text-gray-800 font-medium"
                      onClick={() => { setEditing({ id: row.id, col: 'category' }); setDraft(String(row.category)); }}>
                      {row.category}
                    </span>
                  )}
                </td>
                {columns.map(col => (
                  <td key={col} className="px-3 py-2.5 text-right">
                    {editing?.id === row.id && editing?.col === col ? (
                      <input autoFocus type="number" step="any"
                        className="w-20 border rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-green-500"
                        value={draft} onChange={e => setDraft(e.target.value)}
                        onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(null); }} />
                    ) : (
                      <span className="cursor-text tabular-nums text-gray-700"
                        onClick={() => { setEditing({ id: row.id, col }); setDraft(String(row[col] ?? '')); }}>
                        {col.includes('%') ? `${row[col]}%` : Number(row[col]).toLocaleString('en-IN') || '—'}
                      </span>
                    )}
                  </td>
                ))}
                <td className="px-2 py-2.5">
                  <button onClick={() => delRow(row.id)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {/* Total row */}
            <tr className="font-semibold text-gray-800 border-t-2" style={{ borderColor: '#D4EDAA', backgroundColor: '#F0F7E6' }}>
              <td className="px-4 py-2.5">Total</td>
              {columns.map(c => (
                <td key={c} className="px-3 py-2.5 text-right tabular-nums" style={{ color: '#3B6D11' }}>
                  {c.includes('%') ? '—' : totalRow[c].toLocaleString('en-IN')}
                </td>
              ))}
              <td />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Fund Chart ───────────────────────────────────────────────────────────────

function FundExpChart() {
  const [fundRows] = useLocalTable('fin_fund_exp', DEFAULT_FUND_EXP);
  const [imRows]   = useLocalTable('fin_im_exp',   DEFAULT_IM_EXP);

  const chartData = FY_COLS.map(fy => {
    const fund = fundRows.filter(r => r.category !== '').reduce((s, r) => s + (Number(r[fy]) || 0), 0);
    const im   = imRows.filter(r => r.category !== '').reduce((s, r) => s + (Number(r[fy]) || 0), 0);
    return { year: fy, 'Fund Expenses': fund, 'IM Expenses': im, Total: fund + im };
  });

  return (
    <div className="rounded-lg border bg-white shadow-sm p-6" style={{ borderColor: '#D4EDAA' }}>
      <h3 className="font-serif text-lg uppercase tracking-wide text-gray-800 mb-5">Expense Trend (INR Lakhs)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 4, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#D4EDAA" vertical={false} />
          <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}L`} />
          <Tooltip formatter={(v: any) => [`${Number(v).toLocaleString('en-IN')} L`, '']}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #D4EDAA' }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="Fund Expenses" fill="#5A9E1B" radius={[3,3,0,0]} maxBarSize={32} />
          <Bar dataKey="IM Expenses"   fill="#3B6D11" radius={[3,3,0,0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Expenses page ────────────────────────────────────────────────────────────

export default function ExpensesSection() {
  // Aggregate fund life + 6-month expenses into localStorage for FundOverview to read
  const [fundRows] = useLocalTable('fin_fund_exp', DEFAULT_FUND_EXP);
  const [imRows]   = useLocalTable('fin_im_exp',   DEFAULT_IM_EXP);

  useEffect(() => {
    const fundLife = [...fundRows, ...imRows].reduce((s, r) => {
      return s + FY_COLS.reduce((rs, fy) => rs + (Number(r[fy]) || 0), 0) * 100000;
    }, 0);
    const currentFY = 'FY26';
    const sixMonths = [...fundRows, ...imRows].reduce((s, r) => s + (Number(r[currentFY]) || 0) * 100000 * 0.5, 0);
    try { localStorage.setItem('fin_expenses_agg', JSON.stringify({ fundLife, sixMonths })); } catch {}
  }, [fundRows, imRows]);

  return (
    <div className="flex flex-col min-h-full">
      <div className="border-b px-6 md:px-10 py-6 bg-white/50" style={{ borderColor: '#D4EDAA' }}>
        <h1 className="text-2xl md:text-3xl font-serif uppercase tracking-wide text-gray-900">Expenses</h1>
        <p className="text-xs text-gray-400 mt-1 italic">Click any cell to edit · Amounts in INR Lakhs</p>
      </div>

      <div className="px-6 md:px-10 py-8 space-y-12">

        {/* Projected */}
        <section id="projected" className="space-y-6 scroll-mt-24">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-xl font-serif uppercase tracking-wide text-gray-800">Projected Expenses</h2>
            <span className="text-xs uppercase tracking-widest text-gray-400 font-semibold">(INR Lakhs)</span>
          </div>
          <ExpTable title="Fund Expenses" storageKey="fin_fund_exp" defaultRows={DEFAULT_FUND_EXP} columns={FY_COLS} />
          <ExpTable title="Investment Manager (IM) Expenses" storageKey="fin_im_exp" defaultRows={DEFAULT_IM_EXP} columns={FY_COLS} />
        </section>

        {/* Actual vs Budgeted */}
        <section id="actual-budgeted" className="space-y-6 scroll-mt-24">
          <h2 className="text-xl font-serif uppercase tracking-wide text-gray-800">Actual &amp; Budgeted</h2>
          <ExpTable title="IM Expenses — Actual vs Budget" storageKey="fin_ab_exp" defaultRows={DEFAULT_AB} columns={AB_COLS} centerHeaders />
        </section>

        {/* Fund Chart */}
        <section id="fund-chart" className="scroll-mt-24">
          <h2 className="text-xl font-serif uppercase tracking-wide text-gray-800 mb-5">Fund Chart</h2>
          <FundExpChart />
        </section>

      </div>
    </div>
  );
}
