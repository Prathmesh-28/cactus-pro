import { useState } from 'react';
import { Check, Pencil, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { PortfolioSnapshotRow } from '../../data/types';

const ic = 'border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-300 bg-white w-full';

function fmtCr(n: number | null) {
  if (n === null || n === undefined) return '—';
  return `₹${(n / 1e7).toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`;
}

export default function PortfolioSnapshotManager() {
  const { store, updatePortfolioSnapshot } = useApp();
  const [rows, setRows] = useState<PortfolioSnapshotRow[]>(store.portfolioSnapshot ?? []);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<PortfolioSnapshotRow>>({});
  const [saved, setSaved] = useState(false);

  const save = () => { updatePortfolioSnapshot(rows); setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const startEdit = (row: PortfolioSnapshotRow) => { setEditId(row.companyId ?? ""); setDraft({ ...row }); };
  const commitEdit = () => {
    setRows(r => r.map(x => x.companyId === editId ? { ...x, ...draft } as PortfolioSnapshotRow : x));
    setEditId(null); setDraft({});
  };

  const companyName = (id: string) => store.companies.find(c => c.id === id)?.name ?? id;
  const companyLogo = (id: string) => store.companies.find(c => c.id === id)?.logoUrl ?? '';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Edit the investment data shown in Finance → Fund Overview → Portfolio Snapshot.</p>
          <p className="text-xs text-gray-400 mt-0.5">Click any row to edit. Amounts in INR (raw numbers — e.g. 300000000 = ₹30 Cr).</p>
        </div>
        <button onClick={save} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg text-white bg-emerald-600">
          <Check className="w-4 h-4" /> {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[800px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Company', 'Date Invested', 'Current Stake (INR)', 'Equity Value (INR)', 'Inv. Value (INR)', 'MOIC', 'IRR %', ''].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map(row => (
                editId === row.companyId ? (
                  <tr key={row.companyId} className="bg-emerald-50">
                    <td className="px-3 py-2 font-medium text-gray-800">{companyName(row.companyId ?? "")}</td>
                    <td className="px-3 py-2"><input className={ic} value={draft.dateOfFirstInvestment ?? ''} onChange={e => setDraft(d => ({ ...d, dateOfFirstInvestment: e.target.value }))} placeholder="DD.MM.YY" /></td>
                    <td className="px-3 py-2"><input type="number" className={ic} value={draft.currentStake ?? ''} onChange={e => setDraft(d => ({ ...d, currentStake: e.target.value ? Number(e.target.value) : null }))} /></td>
                    <td className="px-3 py-2"><input type="number" className={ic} value={draft.currentEquityValue ?? ''} onChange={e => setDraft(d => ({ ...d, currentEquityValue: e.target.value ? Number(e.target.value) : null }))} /></td>
                    <td className="px-3 py-2"><input type="number" className={ic} value={draft.valueOfInvestment ?? ''} onChange={e => setDraft(d => ({ ...d, valueOfInvestment: e.target.value ? Number(e.target.value) : null }))} /></td>
                    <td className="px-3 py-2"><input type="number" step="0.1" className={ic} value={draft.moic ?? ''} onChange={e => setDraft(d => ({ ...d, moic: parseFloat(e.target.value) || 0 }))} /></td>
                    <td className="px-3 py-2"><input type="number" step="0.1" className={ic} value={draft.irr ?? ''} onChange={e => setDraft(d => ({ ...d, irr: parseFloat(e.target.value) || 0 }))} /></td>
                    <td className="px-3 py-2 flex items-center gap-1">
                      <button onClick={commitEdit} className="p-1 rounded bg-emerald-500 text-white"><Check className="w-3 h-3" /></button>
                      <button onClick={() => { setEditId(null); setDraft({}); }} className="p-1 rounded bg-gray-200 text-gray-600"><X className="w-3 h-3" /></button>
                    </td>
                  </tr>
                ) : (
                  <tr key={row.companyId} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        {companyLogo(row.companyId ?? "") && (
                          <img src={companyLogo(row.companyId ?? "")} alt="" className="w-6 h-6 object-contain rounded" />
                        )}
                        <span className="font-semibold text-gray-800">{companyName(row.companyId ?? "")}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-gray-600">{row.dateOfFirstInvestment}</td>
                    <td className="px-3 py-2.5 font-medium text-gray-800">{fmtCr(row.currentStake)}</td>
                    <td className="px-3 py-2.5 text-gray-500">{fmtCr(row.currentEquityValue)}</td>
                    <td className="px-3 py-2.5 text-gray-500">{fmtCr(row.valueOfInvestment)}</td>
                    <td className="px-3 py-2.5 font-bold" style={{ color: row.moic >= 3 ? '#3B6D11' : row.moic >= 2 ? '#B45309' : '#DC2626' }}>
                      {row.moic}x
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{
                          backgroundColor: row.irr >= 30 ? '#D4EDAA' : row.irr >= 20 ? '#FEF9C3' : '#FEE2E2',
                          color: row.irr >= 30 ? '#3B6D11' : row.irr >= 20 ? '#854D0E' : '#991B1B',
                        }}>
                        {row.irr}%
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <button onClick={() => startEdit(row)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-gray-100 text-gray-400 transition-opacity">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-gray-400">
        To add a new company to the snapshot, first create it in <strong>Portfolio Companies</strong>, then it will appear here automatically on the next reset. Reach out if you need to add rows manually.
      </p>
    </div>
  );
}
