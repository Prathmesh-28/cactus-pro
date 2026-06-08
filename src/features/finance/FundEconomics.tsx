import { useMemo, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
  BarChart, Bar, Cell,
} from 'recharts';
import { TrendingUp, Layers, Coins, PiggyBank, Percent, Info } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { deriveFund } from '../../lib/fundDerive';
import { fundMultiples, xirr, europeanWaterfall, jCurve } from '../../lib/fundEconomics';
import { parseCr, formatCr, formatMultiple, formatPct } from '../../lib/money';

const EMERALD = '#2D6A4F';
const SLATE = '#64748B';

function Metric({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-bold mt-1 ${accent ? 'text-emerald-700' : 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function FundEconomics() {
  const { store } = useApp();
  const { fundInvestments, lpCommitments } = store;

  const funds = useMemo(() => {
    const set = new Set(fundInvestments.map((i) => i.fund).filter(Boolean));
    return ['All Funds', ...Array.from(set)];
  }, [fundInvestments]);
  const [fund, setFund] = useState('All Funds');

  const derived = useMemo(
    () => deriveFund(fundInvestments, fund === 'All Funds' ? undefined : fund),
    [fundInvestments, fund],
  );

  const committed = useMemo(() => {
    const rows = fund === 'All Funds' ? lpCommitments : lpCommitments.filter((l) => l.fund === fund);
    const total = rows.reduce((s, l) => s + parseCr(l.signedAmount), 0);
    return total > 0 ? total : null;
  }, [lpCommitments, fund]);

  const multiples = fundMultiples({ paidIn: derived.paidIn, distributions: derived.distributions, nav: derived.nav });
  const netIrr = xirr(derived.cashflows);

  // Vintage = years from earliest cashflow to today (for the carry pref compounding default).
  const vintageYears = useMemo(() => {
    const dates = derived.cashflows.map((c) => new Date(c.date).getTime()).filter((t) => !isNaN(t));
    if (!dates.length) return 1;
    const span = (Date.now() - Math.min(...dates)) / (365 * 24 * 3600 * 1000);
    return Math.max(1, Math.round(span));
  }, [derived.cashflows]);

  const jCurveData = useMemo(() => jCurve(derived.cashflows), [derived.cashflows]);

  // ── Carry waterfall (interactive) ──
  const [contributed, setContributed] = useState<number | null>(null);
  const [totalValue, setTotalValue] = useState<number | null>(null);
  const [hurdle, setHurdle] = useState(8);
  const [years, setYears] = useState<number | null>(null);
  const [carry, setCarry] = useState(20);
  const [catchUp, setCatchUp] = useState(true);

  const wfContributed = contributed ?? derived.paidIn;
  const wfTotalValue = totalValue ?? multiples.totalValue;
  const wfYears = years ?? vintageYears;
  const waterfall = europeanWaterfall({
    contributed: wfContributed,
    totalValue: wfTotalValue,
    hurdleRate: hurdle / 100,
    years: wfYears,
    carryPct: carry / 100,
    gpCatchUp: catchUp,
  });

  const waterfallBars = [
    { name: 'Return of Capital', value: waterfall.returnOfCapital, fill: '#94A3B8', who: 'LP' },
    { name: 'Preferred Return', value: waterfall.preferredReturn, fill: '#38BDF8', who: 'LP' },
    { name: 'GP Catch-up', value: waterfall.gpCatchUp, fill: '#F59E0B', who: 'GP' },
    { name: 'Carry — LP', value: waterfall.carrySplit.lp, fill: '#2D6A4F', who: 'LP' },
    { name: 'Carry — GP', value: waterfall.carrySplit.gp, fill: '#B45309', who: 'GP' },
  ].filter((b) => b.value > 0.001);

  if (fundInvestments.length === 0) {
    return (
      <div className="p-8 text-center text-gray-400 text-sm">
        No fund investments recorded yet. Add them in the Fund Ledger to see economics.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-700" /> Fund Economics
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            LP/GP performance, J-curve and carried-interest waterfall — derived live from the Fund Ledger.
          </p>
        </div>
        <select
          value={fund}
          onChange={(e) => setFund(e.target.value)}
          className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white"
        >
          {funds.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      {/* Headline metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="Committed" value={committed != null ? formatCr(committed) : '—'} sub={committed == null ? 'No LP commitments logged' : undefined} />
        <Metric label="Deployed (Paid-In)" value={formatCr(derived.paidIn)} sub={`${derived.counts.active} active · ${derived.counts.exited} exited`} />
        <Metric label="Distributions" value={formatCr(derived.distributions)} />
        <Metric label="NAV (Residual)" value={formatCr(derived.nav)} />
        <Metric label="DPI" value={formatMultiple(multiples.dpi)} sub="Realised" />
        <Metric label="RVPI" value={formatMultiple(multiples.rvpi)} sub="Unrealised" />
        <Metric label="TVPI" value={formatMultiple(multiples.tvpi)} sub="Total value" accent />
        <Metric label="Net IRR" value={Number.isNaN(netIrr) ? '—' : formatPct(netIrr)} sub={`~${vintageYears}y vintage`} accent />
      </div>

      {/* J-curve */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-3">
          <Layers className="w-4 h-4 text-gray-500" /> J-Curve — Cumulative Net Cashflow
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={jCurveData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="jcurve" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={EMERALD} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={EMERALD} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: SLATE }} />
              <YAxis tick={{ fontSize: 11, fill: SLATE }} tickFormatter={(v) => `₹${v}`} />
              <Tooltip formatter={((v: number) => [formatCr(v), 'Cumulative']) as never} />
              <ReferenceLine y={0} stroke="#CBD5E1" />
              <Area type="monotone" dataKey="cumulative" stroke={EMERALD} strokeWidth={2} fill="url(#jcurve)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[11px] text-gray-400 mt-2 flex items-center gap-1">
          <Info className="w-3 h-3" /> Final point includes today's residual NAV as an unrealised mark.
        </p>
      </div>

      {/* Carry waterfall */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-4">
          <Coins className="w-4 h-4 text-gray-500" /> Carried-Interest Waterfall (European, whole-fund)
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
          <label className="text-xs text-gray-600">Contributed (₹Cr)
            <input type="number" value={wfContributed} onChange={(e) => setContributed(parseFloat(e.target.value) || 0)}
              className="mt-1 w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm" />
          </label>
          <label className="text-xs text-gray-600">Total Value (₹Cr)
            <input type="number" value={wfTotalValue} onChange={(e) => setTotalValue(parseFloat(e.target.value) || 0)}
              className="mt-1 w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm" />
          </label>
          <label className="text-xs text-gray-600">Hurdle (%/yr)
            <input type="number" value={hurdle} onChange={(e) => setHurdle(parseFloat(e.target.value) || 0)}
              className="mt-1 w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm" />
          </label>
          <label className="text-xs text-gray-600">Years
            <input type="number" value={wfYears} onChange={(e) => setYears(parseFloat(e.target.value) || 0)}
              className="mt-1 w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm" />
          </label>
          <label className="text-xs text-gray-600">Carry (%)
            <input type="number" value={carry} onChange={(e) => setCarry(parseFloat(e.target.value) || 0)}
              className="mt-1 w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm" />
          </label>
          <label className="text-xs text-gray-600 flex flex-col">100% Catch-up
            <button type="button" onClick={() => setCatchUp((v) => !v)}
              className={`mt-1 px-2 py-1.5 rounded-md text-sm font-medium border ${catchUp ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-300'}`}>
              {catchUp ? 'On' : 'Off'}
            </button>
          </label>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={waterfallBars} layout="vertical" margin={{ left: 30, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: SLATE }} tickFormatter={(v) => `₹${v}`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: SLATE }} width={110} />
                <Tooltip formatter={((v: number) => formatCr(v)) as never} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {waterfallBars.map((b, i) => <Cell key={i} fill={b.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 self-center">
            <div className="flex justify-between text-sm border-b border-gray-100 pb-2">
              <span className="text-gray-500">Total profit</span>
              <span className="font-semibold text-gray-900">{formatCr(waterfall.profit)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 flex items-center gap-1"><PiggyBank className="w-3.5 h-3.5" /> LP receives</span>
              <span className="font-semibold text-emerald-700">{formatCr(waterfall.lpTotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 flex items-center gap-1"><Percent className="w-3.5 h-3.5" /> GP carry + catch-up</span>
              <span className="font-semibold text-amber-700">{formatCr(waterfall.gpTotal)}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-gray-100 pt-2">
              <span className="text-gray-500">GP share of total value</span>
              <span className="font-semibold text-gray-900">{formatPct(waterfall.gpSharePct)}</span>
            </div>
            <p className="text-[11px] text-gray-400 pt-2">
              GP nets {formatPct(wfTotalValue > wfContributed ? waterfall.gpTotal / waterfall.profit : 0)} of profit
              at a {carry}% carry over a {wfYears}-year hold.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
