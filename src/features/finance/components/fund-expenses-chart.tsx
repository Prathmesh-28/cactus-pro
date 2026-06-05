import { useMemo, useState, useCallback, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { kvGet } from "../../../lib/api";

interface ExpRow { id: string; [key: string]: string | number }

const FY_COLS = ["FY23","FY24","FY25","FY26","FY27","FY28","FY29","FY30","FY31"];
const FY_KEYS = FY_COLS.map(f => f.toLowerCase());

const PALETTE = [
  "#1E293B","#2D6A4F","#1D4ED8","#7C3AED","#DB2777",
  "#D97706","#059669","#DC2626","#0891B2","#16A34A","#EA580C","#6D28D9",
];

const EVT = 'fin-exp-changed';

function useExpenseRows(key: string): ExpRow[] {
  const [rows, setRows] = useState<ExpRow[]>([]);
  const refresh = useCallback(async () => {
    const v = await kvGet('finance', key);
    if (Array.isArray(v)) setRows(v as ExpRow[]);
  }, [key]);
  useEffect(() => { void refresh(); }, [key]); // eslint-disable-line
  useEffect(() => {
    const h = (e: Event) => {
      const k = (e as CustomEvent).detail?.key as string;
      if (k === key) void refresh();
    };
    window.addEventListener(EVT, h);
    return () => window.removeEventListener(EVT, h);
  }, [key, refresh]);
  return rows;
}

export function FundExpensesChart() {
  const rows = useExpenseRows('fin_fund_exp');
  const [selected, setSelected] = useState<string | null>(null);

  const { chartData, categories } = useMemo(() => {
    const cats = rows
      .map(r => String(r.category || r['Category'] || 'Uncategorized'))
      .filter((c, i, a) => a.indexOf(c) === i);
    const chartData = FY_COLS.map((fy, idx) => {
      const fyKey = FY_KEYS[idx];
      const point: Record<string, number | string> = { fy };
      for (const r of rows) {
        const cat = String(r.category || r['Category'] || 'Uncategorized');
        const val = Number(r[fy] ?? r[fyKey] ?? 0);
        point[cat] = (Number(point[cat] ?? 0)) + val;
      }
      return point;
    });
    return { chartData, categories: cats };
  }, [rows]);

  const displayCats = selected ? [selected] : categories;

  return (
    <div className="rounded-lg border bg-white shadow-sm p-5" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-widest" style={{ color: 'var(--muted-foreground)' }}>
          Fund Chart — Expenses over Years
        </h3>
        {categories.length > 0 && (
          <select
            value={selected ?? ''}
            onChange={e => setSelected(e.target.value || null)}
            className="text-xs border rounded-lg px-3 py-1.5 focus:outline-none bg-white"
            style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
          >
            <option value="">All expense types</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>
      {categories.length === 0 ? (
        <div className="h-64 grid place-items-center text-sm" style={{ color: 'var(--muted-foreground)' }}>
          No fund expense data yet. Add rows in Finance → Expenses → Fund Expenses.
        </div>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="fy" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `₹${Number(v).toLocaleString('en-IN')} Cr`} />
              <Tooltip
                formatter={(v: unknown) => [`₹${Number(v).toLocaleString('en-IN')} Cr`]}
                contentStyle={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {displayCats.map((cat, i) => (
                <Line key={cat} type="monotone" dataKey={cat}
                  stroke={PALETTE[i % PALETTE.length]} strokeWidth={2}
                  dot={{ r: 3 }} activeDot={{ r: 5 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
