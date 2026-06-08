import { useMemo, useState } from 'react';
import { Calculator, ArrowRight } from 'lucide-react';
import type { PortfolioCompany } from '../../data/types';
import { modelRound, holdersFromPct, totalShares, type Holder } from '../../lib/capTable';
import { parseCr, formatCr, formatPct } from '../../lib/money';

interface Props {
  company: PortfolioCompany;
  primaryColor?: string;
}

function parseShares(s: string): number {
  if (!s) return 0;
  const n = parseFloat(s.replace(/[^\d.]/g, ''));
  return isNaN(n) ? 0 : n;
}

/** Per-company priced-round dilution modeller built on src/lib/capTable.ts. */
export default function RoundModeler({ company, primaryColor = '#1C4B42' }: Props) {
  // Build holders from the cap table — prefer real share counts, else derive from %.
  const holders: Holder[] = useMemo(() => {
    const withShares = company.capTable.map((e) => ({ name: e.investor, shares: parseShares(e.shares) }));
    if (totalShares(withShares) > 0) return withShares;
    return holdersFromPct(company.capTable.map((e) => ({ name: e.investor, pct: e.holdingPct })));
  }, [company.capTable]);

  const defaultPre = useMemo(() => parseCr(company.currentValuation), [company.currentValuation]);
  const [preMoney, setPreMoney] = useState<number>(defaultPre || 100);
  const [newMoney, setNewMoney] = useState<number>(Math.max(1, Math.round((defaultPre || 100) * 0.15)));
  const [poolPct, setPoolPct] = useState<number>(0);
  const [investorName, setInvestorName] = useState('New Round');

  const result = useMemo(() => {
    try {
      if (holders.length === 0) return null;
      return modelRound(holders, {
        preMoney,
        newMoney,
        optionPoolTargetPct: poolPct / 100,
        investorName,
      });
    } catch {
      return null;
    }
  }, [holders, preMoney, newMoney, poolPct, investorName]);

  if (holders.length === 0) {
    return <p className="text-xs text-gray-400">Add cap table holders to model a round.</p>;
  }

  const beforePct = new Map(result?.before.map((r) => [r.name, r.pct]));

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
      <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-3">
        <Calculator className="w-4 h-4 text-gray-500" /> Model a New Round
      </h4>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <label className="text-xs text-gray-600">Pre-money (₹Cr)
          <input type="number" value={preMoney} onChange={(e) => setPreMoney(parseFloat(e.target.value) || 0)}
            className="mt-1 w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm bg-white" />
        </label>
        <label className="text-xs text-gray-600">New money (₹Cr)
          <input type="number" value={newMoney} onChange={(e) => setNewMoney(parseFloat(e.target.value) || 0)}
            className="mt-1 w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm bg-white" />
        </label>
        <label className="text-xs text-gray-600">New ESOP pool (%)
          <input type="number" value={poolPct} onChange={(e) => setPoolPct(parseFloat(e.target.value) || 0)}
            className="mt-1 w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm bg-white" />
        </label>
        <label className="text-xs text-gray-600">Investor label
          <input type="text" value={investorName} onChange={(e) => setInvestorName(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm bg-white" />
        </label>
      </div>

      {!result ? (
        <p className="text-xs text-red-500">Invalid inputs — pre-money must be positive and the ESOP pool not too large.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4 text-center">
            <div className="bg-white border border-gray-200 rounded-lg p-2">
              <p className="text-[10px] uppercase text-gray-400">Post-money</p>
              <p className="text-sm font-bold text-gray-900">{formatCr(result.postMoney)}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-2">
              <p className="text-[10px] uppercase text-gray-400">New investor</p>
              <p className="text-sm font-bold text-gray-900">{formatPct(result.investorShares / result.postShares)}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-2">
              <p className="text-[10px] uppercase text-gray-400">Price / share</p>
              <p className="text-sm font-bold text-gray-900">₹{(result.pricePerShare * 1e7).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-200">
                  {['Holder', 'Before', 'After', 'Δ'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {result.after.map((r, i) => {
                  const before = beforePct.get(r.name);
                  const delta = before != null ? (r.pct - before) * 100 : null;
                  const isCactus = r.name.includes('Cactus');
                  return (
                    <tr key={i} className={isCactus ? 'bg-green-50' : 'bg-white'}>
                      <td className="px-3 py-2 font-medium text-gray-800">{r.name}</td>
                      <td className="px-3 py-2 text-gray-500">{before != null ? formatPct(before) : '—'}</td>
                      <td className="px-3 py-2 font-semibold" style={{ color: isCactus ? primaryColor : '#111827' }}>{formatPct(r.pct)}</td>
                      <td className={`px-3 py-2 text-xs font-medium ${delta == null ? 'text-emerald-600' : delta < -0.05 ? 'text-red-600' : 'text-gray-400'}`}>
                        {delta == null ? <span className="flex items-center gap-0.5"><ArrowRight className="w-3 h-3" />new</span>
                          : delta < -0.05 ? `${delta.toFixed(1)} pts` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
