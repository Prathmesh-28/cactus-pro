import { useState, useMemo } from 'react';
import {
  Plus, Edit2, Trash2, ChevronDown, ChevronUp, X, TrendingUp,
  DollarSign, BarChart2, CheckCircle, ArrowRight, Info,
  Save, AlertTriangle, Check,
} from 'lucide-react';
import ExportMenu from '../../components/ui/ExportMenu';
import { exportFundLedgerPDF, exportFundLedgerExcel } from '../../lib/export';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useApp } from '../../context/AppContext';
import type { FundInvestment, FundFollowOn } from '../../data/types';
import { generateId } from '../../lib/utils';

// ─── Constants ────────────────────────────────────────────────────────────────
const PRIMARY   = '#1C4B42';
const ACCENT    = '#86CA0F';
const BG        = '#F6FAF7';
const FUNDS     = ['Fund 1', 'Fund 2'] as const;
const STAGES    = ['Pre-Seed', 'Seed', 'Pre-Series A', 'Series A', 'Series B', 'Series C', 'Growth'];
const INSTRUMENTS = ['Equity', 'SAFE', 'Convertible Note', 'Preference Shares'];
const STATUSES  = ['Active', 'Watch', 'Exited', 'Written Off'] as const;
const LEAD_OPTS = ['Lead', 'Follow', 'Co-lead'] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function n(val: string | number | undefined): number {
  if (val === undefined || val === '') return 0;
  return parseFloat(String(val)) || 0;
}
function fmt(val: string | number | undefined, decimals = 2): string {
  const num = n(val);
  if (num === 0) return '—';
  return num.toFixed(decimals);
}
function fmtCr(val: string | number | undefined): string {
  const num = n(val);
  if (num === 0) return '—';
  return `₹${num.toFixed(2)}Cr`;
}
function fmtPct(val: string | number | undefined): string {
  const num = n(val);
  if (num === 0) return '—';
  return `${num.toFixed(1)}%`;
}
function fmtMoic(val: string | number | undefined): string {
  const num = n(val);
  if (num === 0) return '—';
  return `${num.toFixed(2)}x`;
}

function moicColor(moic: number): string {
  if (moic >= 3) return 'text-green-600 font-semibold';
  if (moic >= 2) return 'text-amber-600 font-semibold';
  if (moic < 1)  return 'text-red-700 font-bold';
  return 'text-red-500 font-semibold';
}
function irrColor(irr: number): string {
  if (irr >= 25) return 'text-green-600 font-semibold';
  if (irr >= 15) return 'text-amber-600 font-semibold';
  return 'text-red-500 font-semibold';
}
function statusBadge(status: string): string {
  switch (status) {
    case 'Active':      return 'bg-green-100 text-green-800';
    case 'Watch':       return 'bg-amber-100 text-amber-800';
    case 'Exited':      return 'bg-blue-100 text-blue-800';
    case 'Written Off': return 'bg-red-100 text-red-800';
    default:            return 'bg-gray-100 text-gray-600';
  }
}

// ─── Blank FundInvestment factory ─────────────────────────────────────────────
function blankInvestment(): FundInvestment {
  return {
    id: '',
    fund: 'Fund 1',
    companyId: '',
    investmentDate: '',
    stageAtEntry: 'Seed',
    preMoneyAtEntry: '',
    postMoneyAtEntry: '',
    firstCheque: '',
    ownershipAtEntry: '',
    instrument: 'Equity',
    followOns: [],
    totalInvested: '',
    currentOwnership: '',
    currentFMV: '',
    currentValuation: '',
    moic: '',
    irr: '',
    dpi: '',
    unrealizedValue: '',
    realizedValue: '',
    latestFY: 'FY2025',
    revenue: '',
    revenueGrowthYoY: '',
    arr: '',
    mrr: '',
    grossMargin: '',
    ebitdaMargin: '',
    monthlyBurn: '',
    cash: '',
    runway: '',
    headcount: 0,
    nrr: '',
    status: 'Active',
    boardSeat: false,
    leadOrFollow: 'Follow',
    nextRoundExpected: '',
    nextRoundSize: '',
    notes: '',
    updatedAt: new Date().toISOString(),
  };
}

function blankFollowOn(): FundFollowOn {
  return {
    id: generateId(),
    date: '',
    round: '',
    amount: '',
    preMoneyVal: '',
    postMoneyVal: '',
    ownershipPost: '',
    leadInvestor: '',
    notes: '',
  };
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  color?: string;
}
function StatCard({ label, value, sub, icon, color = PRIMARY }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-start gap-3 min-w-0">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}18` }}
      >
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 mb-0.5 truncate">{label}</p>
        <p className="text-lg font-bold text-gray-900 leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Fund Summary Card ────────────────────────────────────────────────────────
interface FundSummaryCardProps {
  fund: string;
  investments: FundInvestment[];
}
function FundSummaryCard({ fund, investments }: FundSummaryCardProps) {
  const totalInvested = investments.reduce((s, i) => s + n(i.totalInvested), 0);
  const totalFMV      = investments.reduce((s, i) => s + n(i.currentFMV), 0);
  const totalRealized = investments.reduce((s, i) => s + n(i.realizedValue), 0);
  const fundMoic      = totalInvested > 0 ? totalFMV / totalInvested : 0;
  const avgIrr        = investments.length
    ? investments.reduce((s, i) => s + n(i.irr), 0) / investments.length
    : 0;
  const dpi = totalInvested > 0 ? totalRealized / totalInvested : 0;
  const rvpi = totalInvested > 0 ? (totalFMV - totalRealized) / totalInvested : 0;
  const tvpi = dpi + rvpi;

  const rows: Array<[string, string]> = [
    ['Investments', String(investments.length)],
    ['Total Deployed', fmtCr(totalInvested)],
    ['Total FMV', fmtCr(totalFMV)],
    ['Fund MOIC', fmtMoic(fundMoic)],
    ['Avg IRR', fmtPct(avgIrr)],
    ['DPI', fmt(dpi)],
    ['TVPI', fmt(tvpi)],
    ['Distributions', fmtCr(totalRealized)],
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-6 rounded-full" style={{ background: fund === 'Fund 1' ? PRIMARY : ACCENT }} />
        <h3 className="font-bold text-gray-900">{fund}</h3>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {rows.map(([label, value]) => (
          <div key={label} className="bg-gray-50 rounded-lg px-3 py-2">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-sm font-semibold text-gray-800">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Follow-on Drawer ─────────────────────────────────────────────────────────
interface DrawerProps {
  inv: FundInvestment;
  companyName: string;
  periods: Array<{ periodLabel: string; revenue: string; revenueGrowthYoY: string }>;
  onClose: () => void;
}
function FollowOnDrawer({ inv, companyName, periods, onClose }: DrawerProps) {
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-2xl bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ background: PRIMARY }}>
          <div>
            <p className="text-xs text-white/70 uppercase tracking-wide">Investment Detail</p>
            <h2 className="text-lg font-bold text-white">{companyName}</h2>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white p-1">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Timeline */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Investment Timeline</h3>
            <div className="relative">
              {/* Initial */}
              <div className="flex gap-4 mb-4">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full mt-1" style={{ background: PRIMARY }} />
                  {inv.followOns.length > 0 && <div className="w-0.5 flex-1 bg-gray-200 mt-1" />}
                </div>
                <div className="flex-1 bg-gray-50 rounded-lg p-3 mb-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-600 uppercase">Initial Investment</span>
                    <span className="text-xs text-gray-400">{inv.investmentDate}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div><span className="text-gray-500">Cheque</span><br /><b>{fmtCr(inv.firstCheque)}</b></div>
                    <div><span className="text-gray-500">Pre-Money</span><br /><b>{fmtCr(inv.preMoneyAtEntry)}</b></div>
                    <div><span className="text-gray-500">Post-Money</span><br /><b>{fmtCr(inv.postMoneyAtEntry)}</b></div>
                    <div><span className="text-gray-500">Ownership</span><br /><b>{fmtPct(inv.ownershipAtEntry)}</b></div>
                    <div><span className="text-gray-500">Stage</span><br /><b>{inv.stageAtEntry}</b></div>
                    <div><span className="text-gray-500">Instrument</span><br /><b>{inv.instrument}</b></div>
                  </div>
                </div>
              </div>

              {/* Follow-ons */}
              {inv.followOns.map((fo, idx) => (
                <div key={fo.id} className="flex gap-4 mb-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full mt-1" style={{ background: ACCENT }} />
                    {idx < inv.followOns.length - 1 && <div className="w-0.5 flex-1 bg-gray-200 mt-1" />}
                  </div>
                  <div className="flex-1 bg-green-50 rounded-lg p-3 mb-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-green-700 uppercase">Follow-on — {fo.round}</span>
                      <span className="text-xs text-gray-400">{fo.date}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div><span className="text-gray-500">Amount</span><br /><b>{fmtCr(fo.amount)}</b></div>
                      <div><span className="text-gray-500">Pre-Money</span><br /><b>{fmtCr(fo.preMoneyVal)}</b></div>
                      <div><span className="text-gray-500">Post-Money</span><br /><b>{fmtCr(fo.postMoneyVal)}</b></div>
                      <div><span className="text-gray-500">Ownership After</span><br /><b>{fmtPct(fo.ownershipPost)}</b></div>
                      <div><span className="text-gray-500">Lead Investor</span><br /><b>{fo.leadInvestor || '—'}</b></div>
                      {fo.notes && <div className="col-span-2"><span className="text-gray-500">Notes</span><br /><i className="text-gray-600">{fo.notes}</i></div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Current Status */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Current Status</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                ['Total Invested', fmtCr(inv.totalInvested)],
                ['Current FMV', fmtCr(inv.currentFMV)],
                ['Valuation', fmtCr(inv.currentValuation)],
                ['MOIC', fmtMoic(inv.moic)],
                ['IRR', fmtPct(inv.irr)],
                ['DPI', fmt(inv.dpi)],
                ['Ownership', fmtPct(inv.currentOwnership)],
                ['Realized', fmtCr(inv.realizedValue)],
                ['Unrealized', fmtCr(inv.unrealizedValue)],
              ].map(([label, val]) => (
                <div key={label} className="bg-gray-50 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-sm font-semibold text-gray-800">{val}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Operating Metrics */}
          {periods.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Revenue History</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-1 text-gray-500">Period</th>
                      <th className="text-right py-1 text-gray-500">Revenue (₹Cr)</th>
                      <th className="text-right py-1 text-gray-500">Growth YoY</th>
                    </tr>
                  </thead>
                  <tbody>
                    {periods.slice(-8).map((p, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="py-1.5 text-gray-700">{p.periodLabel}</td>
                        <td className="py-1.5 text-right font-medium">{fmtCr(p.revenue)}</td>
                        <td className="py-1.5 text-right">{fmtPct(p.revenueGrowthYoY)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Notes */}
          {inv.notes && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">Notes</h3>
              <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{inv.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Investment Modal ─────────────────────────────────────────────────────────
interface ModalProps {
  initial: FundInvestment;
  companies: Array<{ id: string; name: string; logoUrl: string }>;
  onSave: (inv: FundInvestment) => void;
  onClose: () => void;
}

function InvestmentModal({ initial, companies, onSave, onClose }: ModalProps) {
  const [form, setForm] = useState<FundInvestment>({ ...initial });

  const set = (field: keyof FundInvestment, val: unknown) => {
    setForm(prev => {
      const next = { ...prev, [field]: val };
      // Auto-calc MOIC
      const fmv = n(field === 'currentFMV' ? (val as string) : next.currentFMV);
      const inv = n(field === 'totalInvested' ? (val as string) : next.totalInvested);
      if (fmv > 0 && inv > 0) {
        next.moic = (fmv / inv).toFixed(3);
      }
      return next;
    });
  };

  const setFo = (idx: number, field: keyof FundFollowOn, val: string) => {
    setForm(prev => {
      const fos = prev.followOns.map((fo, i) => i === idx ? { ...fo, [field]: val } : fo);
      return { ...prev, followOns: fos };
    });
  };
  const addFo = () => setForm(prev => ({ ...prev, followOns: [...prev.followOns, blankFollowOn()] }));
  const removeFo = (idx: number) => setForm(prev => ({
    ...prev,
    followOns: prev.followOns.filter((_, i) => i !== idx),
  }));

  const autoMoic = n(form.currentFMV) > 0 && n(form.totalInvested) > 0
    ? (n(form.currentFMV) / n(form.totalInvested)).toFixed(2) + 'x'
    : null;

  const handleSave = () => {
    onSave({ ...form, updatedAt: new Date().toISOString() });
  };

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C4B42]/30 bg-white';
  const labelCls = 'block text-xs font-medium text-gray-600 mb-1';

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b rounded-t-2xl" style={{ background: PRIMARY }}>
          <h2 className="text-lg font-bold text-white">
            {form.id ? 'Edit Investment' : 'Add Investment'}
          </h2>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Fund & Company */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Fund *</label>
              <select className={inputCls} value={form.fund} onChange={(e) => set('fund', e.target.value)}>
                {FUNDS.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Company *</label>
              <select className={inputCls} value={form.companyId} onChange={(e) => set('companyId', e.target.value)}>
                <option value="">— Select Company —</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {/* Initial Investment */}
          <fieldset className="border border-gray-200 rounded-xl p-4">
            <legend className="text-xs font-semibold uppercase text-gray-500 px-2">Initial Investment</legend>
            <div className="grid grid-cols-3 gap-3 mt-2">
              <div>
                <label className={labelCls}>Investment Date</label>
                <input type="date" className={inputCls} value={form.investmentDate} onChange={(e) => set('investmentDate', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Stage at Entry</label>
                <select className={inputCls} value={form.stageAtEntry} onChange={(e) => set('stageAtEntry', e.target.value)}>
                  {STAGES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Instrument</label>
                <select className={inputCls} value={form.instrument} onChange={(e) => set('instrument', e.target.value)}>
                  {INSTRUMENTS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Pre-Money (₹Cr)</label>
                <input className={inputCls} placeholder="0.00" value={form.preMoneyAtEntry} onChange={(e) => set('preMoneyAtEntry', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Post-Money (₹Cr)</label>
                <input className={inputCls} placeholder="0.00" value={form.postMoneyAtEntry} onChange={(e) => set('postMoneyAtEntry', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>First Cheque (₹Cr)</label>
                <input className={inputCls} placeholder="0.00" value={form.firstCheque} onChange={(e) => set('firstCheque', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Ownership at Entry (%)</label>
                <input className={inputCls} placeholder="0.00" value={form.ownershipAtEntry} onChange={(e) => set('ownershipAtEntry', e.target.value)} />
              </div>
            </div>
          </fieldset>

          {/* Follow-on Rounds */}
          <fieldset className="border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <legend className="text-xs font-semibold uppercase text-gray-500 px-0">Follow-on Rounds</legend>
              <button
                type="button"
                onClick={addFo}
                className="text-xs text-white px-3 py-1 rounded-lg flex items-center gap-1"
                style={{ background: ACCENT }}
              >
                <Plus size={12} /> Add Round
              </button>
            </div>
            {form.followOns.length === 0 && (
              <p className="text-xs text-gray-400 italic">No follow-on rounds yet.</p>
            )}
            {form.followOns.map((fo, idx) => (
              <div key={fo.id} className="border border-gray-100 rounded-lg p-3 mb-3 relative bg-green-50/30">
                <button
                  type="button"
                  onClick={() => removeFo(idx)}
                  className="absolute top-2 right-2 text-red-400 hover:text-red-600"
                >
                  <X size={14} />
                </button>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className={labelCls}>Date</label>
                    <input type="date" className={inputCls} value={fo.date} onChange={(e) => setFo(idx, 'date', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Round Name</label>
                    <input className={inputCls} placeholder="Series A" value={fo.round} onChange={(e) => setFo(idx, 'round', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Amount (₹Cr)</label>
                    <input className={inputCls} placeholder="0.00" value={fo.amount} onChange={(e) => setFo(idx, 'amount', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Pre-Money (₹Cr)</label>
                    <input className={inputCls} placeholder="0.00" value={fo.preMoneyVal} onChange={(e) => setFo(idx, 'preMoneyVal', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Post-Money (₹Cr)</label>
                    <input className={inputCls} placeholder="0.00" value={fo.postMoneyVal} onChange={(e) => setFo(idx, 'postMoneyVal', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Ownership After (%)</label>
                    <input className={inputCls} placeholder="0.00" value={fo.ownershipPost} onChange={(e) => setFo(idx, 'ownershipPost', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Lead Investor</label>
                    <input className={inputCls} placeholder="Investor name" value={fo.leadInvestor} onChange={(e) => setFo(idx, 'leadInvestor', e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <label className={labelCls}>Notes</label>
                    <input className={inputCls} value={fo.notes} onChange={(e) => setFo(idx, 'notes', e.target.value)} />
                  </div>
                </div>
              </div>
            ))}
          </fieldset>

          {/* Current Valuations & Returns */}
          <fieldset className="border border-gray-200 rounded-xl p-4">
            <legend className="text-xs font-semibold uppercase text-gray-500 px-2">Valuations & Returns</legend>
            <div className="grid grid-cols-3 gap-3 mt-2">
              <div>
                <label className={labelCls}>Total Invested (₹Cr)</label>
                <input className={inputCls} placeholder="0.00" value={form.totalInvested} onChange={(e) => set('totalInvested', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Current Ownership (%)</label>
                <input className={inputCls} placeholder="0.00" value={form.currentOwnership} onChange={(e) => set('currentOwnership', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Current FMV (₹Cr)</label>
                <input className={inputCls} placeholder="0.00" value={form.currentFMV} onChange={(e) => set('currentFMV', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Company Valuation (₹Cr)</label>
                <input className={inputCls} placeholder="0.00" value={form.currentValuation} onChange={(e) => set('currentValuation', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>
                  MOIC
                  {autoMoic && <span className="ml-1 text-green-600">(auto: {autoMoic})</span>}
                </label>
                <input className={inputCls} placeholder="0.00" value={form.moic} onChange={(e) => set('moic', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>IRR (%) — enter manually</label>
                <input className={inputCls} placeholder="0.0" value={form.irr} onChange={(e) => set('irr', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>DPI</label>
                <input className={inputCls} placeholder="0.00" value={form.dpi} onChange={(e) => set('dpi', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Realized Value (₹Cr)</label>
                <input className={inputCls} placeholder="0.00" value={form.realizedValue} onChange={(e) => set('realizedValue', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Unrealized Value (₹Cr)</label>
                <input className={inputCls} placeholder="0.00" value={form.unrealizedValue} onChange={(e) => set('unrealizedValue', e.target.value)} />
              </div>
            </div>
          </fieldset>

          {/* Operating Metrics */}
          <fieldset className="border border-gray-200 rounded-xl p-4">
            <legend className="text-xs font-semibold uppercase text-gray-500 px-2">Operating Metrics</legend>
            <div className="grid grid-cols-3 gap-3 mt-2">
              <div>
                <label className={labelCls}>Latest FY</label>
                <input className={inputCls} placeholder="FY2025" value={form.latestFY} onChange={(e) => set('latestFY', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Revenue (₹Cr)</label>
                <input className={inputCls} placeholder="0.00" value={form.revenue} onChange={(e) => set('revenue', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Revenue Growth YoY (%)</label>
                <input className={inputCls} placeholder="0.0" value={form.revenueGrowthYoY} onChange={(e) => set('revenueGrowthYoY', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>ARR (₹Cr)</label>
                <input className={inputCls} placeholder="0.00" value={form.arr} onChange={(e) => set('arr', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>MRR (₹Cr)</label>
                <input className={inputCls} placeholder="0.00" value={form.mrr} onChange={(e) => set('mrr', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Gross Margin (%)</label>
                <input className={inputCls} placeholder="0.0" value={form.grossMargin} onChange={(e) => set('grossMargin', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>EBITDA Margin (%)</label>
                <input className={inputCls} placeholder="0.0" value={form.ebitdaMargin} onChange={(e) => set('ebitdaMargin', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Monthly Burn (₹Cr)</label>
                <input className={inputCls} placeholder="0.00" value={form.monthlyBurn} onChange={(e) => set('monthlyBurn', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Cash (₹Cr)</label>
                <input className={inputCls} placeholder="0.00" value={form.cash} onChange={(e) => set('cash', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Runway (months)</label>
                <input className={inputCls} placeholder="0" value={form.runway} onChange={(e) => set('runway', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Headcount</label>
                <input type="number" className={inputCls} placeholder="0" value={form.headcount || ''} onChange={(e) => set('headcount', parseInt(e.target.value) || 0)} />
              </div>
              <div>
                <label className={labelCls}>NRR (%)</label>
                <input className={inputCls} placeholder="0.0" value={form.nrr} onChange={(e) => set('nrr', e.target.value)} />
              </div>
            </div>
          </fieldset>

          {/* Status & Admin */}
          <fieldset className="border border-gray-200 rounded-xl p-4">
            <legend className="text-xs font-semibold uppercase text-gray-500 px-2">Status & Administration</legend>
            <div className="grid grid-cols-3 gap-3 mt-2">
              <div>
                <label className={labelCls}>Status</label>
                <select className={inputCls} value={form.status} onChange={(e) => set('status', e.target.value as FundInvestment['status'])}>
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Lead / Follow</label>
                <select className={inputCls} value={form.leadOrFollow} onChange={(e) => set('leadOrFollow', e.target.value as FundInvestment['leadOrFollow'])}>
                  {LEAD_OPTS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.boardSeat}
                    onChange={(e) => set('boardSeat', e.target.checked)}
                    className="w-4 h-4 rounded accent-[#1C4B42]"
                  />
                  <span className="text-sm text-gray-700">Board Seat</span>
                </label>
              </div>
              <div>
                <label className={labelCls}>Next Round Expected</label>
                <input className={inputCls} placeholder="Q3 2026" value={form.nextRoundExpected} onChange={(e) => set('nextRoundExpected', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Next Round Size (₹Cr)</label>
                <input className={inputCls} placeholder="0.00" value={form.nextRoundSize} onChange={(e) => set('nextRoundSize', e.target.value)} />
              </div>
              {form.status === 'Exited' && (
                <>
                  <div>
                    <label className={labelCls}>Exit Date</label>
                    <input type="date" className={inputCls} value={form.exitDate ?? ''} onChange={(e) => set('exitDate', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Exit Proceeds (₹Cr)</label>
                    <input className={inputCls} value={form.exitProceeds ?? ''} onChange={(e) => set('exitProceeds', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Exit Type</label>
                    <select className={inputCls} value={form.exitType ?? ''} onChange={(e) => set('exitType', e.target.value as FundInvestment['exitType'])}>
                      <option value="">—</option>
                      {['IPO', 'M&A', 'Secondary', 'Buyback'].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </>
              )}
              <div className="col-span-3">
                <label className={labelCls}>Notes</label>
                <textarea
                  rows={2}
                  className={inputCls}
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                />
              </div>
            </div>
          </fieldset>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 text-sm text-white rounded-lg flex items-center gap-2"
            style={{ background: PRIMARY }}
          >
            <Save size={14} /> Save Investment
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PortfolioFundView() {
  const {
    store,
    addFundInvestment,
    updateFundInvestment,
    deleteFundInvestment,
  } = useApp();

  const investments: FundInvestment[] = store.portfolioFundView ?? [];
  const companies = store.companies ?? [];
  const periods = store.financialPeriods ?? [];

  const [selectedFund, setSelectedFund] = useState<'All' | 'Fund 1' | 'Fund 2'>('All');
  const [expandedId, setExpandedId]     = useState<string | null>(null);
  const [modalData, setModalData]       = useState<FundInvestment | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Filtered & sorted investments
  const filtered = useMemo(() => {
    const list = selectedFund === 'All' ? investments : investments.filter(i => i.fund === selectedFund);
    return [...list].sort((a, b) => {
      if (a.fund !== b.fund) return a.fund.localeCompare(b.fund);
      return a.investmentDate.localeCompare(b.investmentDate);
    });
  }, [investments, selectedFund]);

  // ── Fund Overview calculations (from portfolioFundView) ──────────────────
  const totalAUM       = investments.reduce((s, i) => s + n(i.currentFMV), 0);
  const totalInvested  = investments.reduce((s, i) => s + n(i.totalInvested), 0);
  const blendedMoic    = totalInvested > 0 ? totalAUM / totalInvested : 0;
  const blendedIrr     = investments.length
    ? investments.reduce((s, i) => s + n(i.irr) * n(i.totalInvested), 0) / (totalInvested || 1)
    : 0;
  void investments; // const _activeCount = investments.filter(i => i.status === 'Active').length;
  
  const distributions  = investments.reduce((s, i) => s + n(i.realizedValue), 0);

  // ── Fund Overview metrics (mirrors Finance tab Fund Overview) ──────────────
  const calledCapital  = totalInvested;               // Total capital deployed
  const nav            = totalAUM;                    // Unrealized fair market value
  const tvpi           = totalInvested > 0 ? (nav + distributions) / totalInvested : 0;
  const grossIrr       = blendedIrr;
  const netIrr         = Math.max(0, blendedIrr - 2); // Gross IRR - 2% mgmt fee (approx)
  const dpi            = totalInvested > 0 ? distributions / totalInvested : 0;
  const moic           = blendedMoic;
  const totalLpCommitment = (store.lps ?? []).reduce((s, lp) => {
    const v = parseFloat(lp.commitment?.replace(/[^0-9.]/g, '') ?? '0');
    return s + v;
  }, 0);
  const uncalledCapital = Math.max(0, totalLpCommitment - calledCapital);
  // Cash flow from store.cashFlow
  const latestCF = store.cashFlow?.slice(-1)[0];

  // Chart data
  const chartData = useMemo(() => {
    return companies
      .filter(c => investments.some(i => i.companyId === c.id))
      .map(c => {
        const inv = investments.filter(i => i.companyId === c.id);
        return {
          name: c.name.length > 12 ? c.name.slice(0, 11) + '…' : c.name,
          totalInvested: inv.reduce((s, i) => s + n(i.totalInvested), 0),
          unrealizedValue: inv.reduce((s, i) => s + n(i.unrealizedValue), 0),
          realized: inv.reduce((s, i) => s + n(i.realizedValue), 0),
          fund: inv[0]?.fund ?? 'Fund 1',
        };
      });
  }, [investments, companies]);

  const getCompany = (id: string) => companies.find(c => c.id === id);
  const getPeriods = (companyId: string) =>
    periods
      .filter(p => p.companyId === companyId)
      .sort((a, b) => a.periodLabel.localeCompare(b.periodLabel));

  const handleSave = (inv: FundInvestment) => {
    if (inv.id) {
      updateFundInvestment(inv);
    } else {
      addFundInvestment({ ...inv, id: generateId() });
    }
    setModalData(null);
  };

  const handleDelete = (id: string) => {
    deleteFundInvestment(id);
    setDeleteConfirm(null);
  };

  const thCls = 'px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap';
  const tdCls = 'px-3 py-2 text-xs text-gray-700 whitespace-nowrap';

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <div className="max-w-screen-2xl mx-auto px-4 py-6 space-y-6">

        {/* Page Title */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: PRIMARY }}>Portfolio Investment View</h1>
            <p className="text-sm text-gray-500 mt-0.5">Complete record of all Cactus fund investments, follow-ons, and performance</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Export — PDF & Excel with fund filter */}
            <ExportMenu
              label="Export"
              options={[
                {
                  label: 'All Funds — PDF',
                  format: 'pdf',
                  onExport: () => exportFundLedgerPDF(investments, companies, store.firm?.name ?? 'Cactus Partners', 'All Funds'),
                },
                {
                  label: 'Fund 1 — PDF',
                  format: 'pdf',
                  onExport: () => exportFundLedgerPDF(investments, companies, store.firm?.name ?? 'Cactus Partners', 'Fund 1'),
                },
                {
                  label: 'Fund 2 — PDF',
                  format: 'pdf',
                  onExport: () => exportFundLedgerPDF(investments, companies, store.firm?.name ?? 'Cactus Partners', 'Fund 2'),
                },
                {
                  label: 'All Funds — Excel',
                  format: 'excel',
                  onExport: () => exportFundLedgerExcel(investments, companies, store.firm?.name ?? 'Cactus Partners', 'All Funds'),
                },
                {
                  label: 'Fund 1 — Excel',
                  format: 'excel',
                  onExport: () => exportFundLedgerExcel(investments, companies, store.firm?.name ?? 'Cactus Partners', 'Fund 1'),
                },
                {
                  label: 'Fund 2 — Excel',
                  format: 'excel',
                  onExport: () => exportFundLedgerExcel(investments, companies, store.firm?.name ?? 'Cactus Partners', 'Fund 2'),
                },
              ]}
            />
            <button
              onClick={() => setModalData(blankInvestment())}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-lg shadow"
              style={{ background: PRIMARY }}
            >
              <Plus size={16} /> Add Investment
            </button>
          </div>
        </div>

        {/* ── Fund Overview — mirrors Finance tab ──────────────────────────── */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden" style={{ borderColor: '#D4EDAA' }}>
          <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: '#D4EDAA', backgroundColor: '#F0F7E6' }}>
            <div>
              <h2 className="text-base font-bold" style={{ color: PRIMARY }}>Fund Overview</h2>
              <p className="text-xs text-gray-500 mt-0.5">Amounts in INR Cr · Calculated from Portfolio team's fund view data</p>
            </div>
          </div>
          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Fund Metrics */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Fund Metrics</p>
              <div className="space-y-2">
                {[
                  { label: 'Called Capital',  value: fmtCr(calledCapital),      note: 'Total capital deployed across all investments' },
                  { label: 'NAV',             value: fmtCr(nav),               note: 'Net Asset Value — current FMV of all holdings', hi: true },
                  { label: 'TVPI',            value: tvpi.toFixed(2) + 'x',    note: '(NAV + Distributions) / Called Capital', hi: true },
                  { label: 'Gross IRR',       value: fmtPct(grossIrr),         note: 'Weighted average IRR (before fees)' },
                  { label: 'Net IRR',         value: fmtPct(netIrr),           note: 'Gross IRR less estimated 2% management fee' },
                  { label: 'DPI',             value: dpi.toFixed(2) + 'x',     note: 'Distributions / Paid-In (cash returned to LPs)' },
                  { label: 'MOIC',            value: fmtMoic(moic),            note: 'NAV / Called Capital', hi: true },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-700">{row.label}</p>
                      <p className="text-[10px] text-gray-400">{row.note}</p>
                    </div>
                    <p className="text-sm font-bold" style={{ color: row.hi ? PRIMARY : '#374151' }}>{row.value}</p>
                  </div>
                ))}
              </div>
            </div>
            {/* Cash Flows */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Cash Flows</p>
              <div className="space-y-2">
                {[
                  { label: 'Called Capital (Receivable)', value: fmtCr(calledCapital) },
                  { label: 'Bank Balance',                value: latestCF ? `₹${latestCF.nav} Cr` : '—' },
                  { label: 'Expenses for Next 6 Months',  value: '—', note: 'Update via Finance → Expenses' },
                  { label: 'Committed Investments',       value: fmtCr(totalInvested) },
                  { label: 'Current Investible Funds',    value: fmtCr(Math.max(0, uncalledCapital - totalInvested)) },
                  { label: 'Uncalled Capital',            value: fmtCr(uncalledCapital) },
                  { label: 'Total Distributions',         value: fmtCr(distributions) },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-700">{row.label}</p>
                      {row.note && <p className="text-[10px] text-gray-400">{row.note}</p>}
                    </div>
                    <p className="text-sm font-semibold text-gray-800">{row.value}</p>
                  </div>
                ))}
              </div>
              {/* Fund breakdown by fund */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">By Fund</p>
                {FUNDS.map(fund => {
                  const fundInvs = investments.filter(i => i.fund === fund);
                  if (!fundInvs.length) return null;
                  const fi = fundInvs.reduce((s, i) => s + n(i.totalInvested), 0);
                  const fv = fundInvs.reduce((s, i) => s + n(i.currentFMV), 0);
                  return (
                    <div key={fund} className="flex items-center justify-between py-1.5">
                      <span className="text-xs font-medium text-gray-600">{fund}</span>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-gray-500">Invested: <strong>{fmtCr(fi)}</strong></span>
                        <span className="text-gray-500">FMV: <strong style={{ color: PRIMARY }}>{fmtCr(fv)}</strong></span>
                        <span className="text-gray-500">MOIC: <strong style={{ color: ACCENT }}>{fi > 0 ? (fv/fi).toFixed(2) + 'x' : '—'}</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Top Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <StatCard label="Total AUM" value={fmtCr(totalAUM)} icon={<DollarSign size={18} />} />
          <StatCard label="Called Capital" value={fmtCr(calledCapital)} icon={<TrendingUp size={18} />} />
          <StatCard label="MOIC" value={fmtMoic(moic)} icon={<BarChart2 size={18} />} color={ACCENT} />
          <StatCard label="Gross IRR" value={fmtPct(grossIrr)} icon={<TrendingUp size={18} />} color={ACCENT} />
          <StatCard label="TVPI" value={tvpi.toFixed(2) + 'x'} icon={<BarChart2 size={18} />} />
          <StatCard label="DPI" value={dpi.toFixed(2) + 'x'} icon={<CheckCircle size={18} />} />
          <StatCard label="Distributions" value={fmtCr(distributions)} icon={<ArrowRight size={18} />} />
        </div>

        {/* Fund Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FUNDS.map(f => (
            <FundSummaryCard
              key={f}
              fund={f}
              investments={investments.filter(i => i.fund === f)}
            />
          ))}
        </div>

        {/* Fund Selector Tabs */}
        <div className="flex items-center gap-2 bg-white rounded-xl p-1.5 shadow-sm border border-gray-100 w-fit">
          {(['All', 'Fund 1', 'Fund 2'] as const).map(f => (
            <button
              key={f}
              onClick={() => setSelectedFund(f)}
              className="px-4 py-1.5 text-sm rounded-lg font-medium transition-all"
              style={
                selectedFund === f
                  ? { background: PRIMARY, color: 'white' }
                  : { color: '#666' }
              }
            >
              {f}
              <span className="ml-1.5 text-xs opacity-70">
                ({f === 'All' ? investments.length : investments.filter(i => i.fund === f).length})
              </span>
            </button>
          ))}
        </div>

        {/* Main Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100" style={{ background: `${PRIMARY}08` }}>
                  <th className={thCls}>#</th>
                  <th className={thCls}>Company</th>
                  <th className={thCls}>Fund</th>
                  <th className={thCls}>Inv. Date</th>
                  <th className={thCls}>Stage</th>
                  <th className={thCls}>1st Cheque</th>
                  <th className={thCls}>F/O</th>
                  <th className={thCls}>Total Inv.</th>
                  <th className={thCls}>Own.%</th>
                  <th className={thCls}>FMV</th>
                  <th className={thCls}>Valuation</th>
                  <th className={thCls}>MOIC</th>
                  <th className={thCls}>IRR</th>
                  <th className={thCls}>DPI</th>
                  <th className={thCls}>Rev FY25</th>
                  <th className={thCls}>Rev Gr%</th>
                  <th className={thCls}>ARR</th>
                  <th className={thCls}>GM%</th>
                  <th className={thCls}>Burn/mo</th>
                  <th className={thCls}>Runway</th>
                  <th className={thCls}>HC</th>
                  <th className={thCls}>NRR%</th>
                  <th className={thCls}>L/F</th>
                  <th className={thCls}>Board</th>
                  <th className={thCls}>Status</th>
                  <th className={thCls}>Next Rd</th>
                  <th className={thCls}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={27} className="py-12 text-center text-gray-400 text-sm">
                      <Info size={32} className="mx-auto mb-2 opacity-40" />
                      No investments recorded yet. Click "Add Investment" to get started.
                    </td>
                  </tr>
                )}
                {filtered.map((inv, idx) => {
                  const co = getCompany(inv.companyId);
                  const moicNum = n(inv.moic);
                  const irrNum  = n(inv.irr);
                  const runwayNum = n(inv.runway);
                  const nrrNum  = n(inv.nrr);
                  const isExpanded = expandedId === inv.id;

                  return (
                    <>
                      <tr
                        key={inv.id}
                        className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors"
                      >
                        <td className={tdCls + ' text-gray-400'}>{idx + 1}</td>

                        {/* Company */}
                        <td className={tdCls}>
                          <div className="flex items-center gap-2 min-w-[120px]">
                            {co?.logoUrl ? (
                              <img src={co.logoUrl} alt={co.name} className="w-6 h-6 rounded object-contain border border-gray-100" />
                            ) : (
                              <div className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold" style={{ background: PRIMARY }}>
                                {(co?.name ?? '?')[0]}
                              </div>
                            )}
                            <span className="font-medium text-gray-800 truncate max-w-[100px]">{co?.name ?? '—'}</span>
                          </div>
                        </td>

                        <td className={tdCls}>
                          <span className="px-2 py-0.5 rounded text-xs font-medium" style={
                            inv.fund === 'Fund 1'
                              ? { background: `${PRIMARY}15`, color: PRIMARY }
                              : { background: `${ACCENT}20`, color: '#5a8a00' }
                          }>
                            {inv.fund}
                          </span>
                        </td>

                        <td className={tdCls}>{inv.investmentDate || '—'}</td>
                        <td className={tdCls}>{inv.stageAtEntry}</td>
                        <td className={tdCls}>{n(inv.firstCheque) > 0 ? `₹${fmt(inv.firstCheque)}` : '—'}</td>

                        {/* Follow-on count badge */}
                        <td className={tdCls}>
                          {inv.followOns.length > 0 ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold text-white" style={{ background: ACCENT }}>
                              {inv.followOns.length}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>

                        <td className={tdCls + ' font-semibold text-gray-900'}>
                          {n(inv.totalInvested) > 0 ? `₹${fmt(inv.totalInvested)}` : '—'}
                        </td>

                        <td className={tdCls}>{fmtPct(inv.currentOwnership)}</td>

                        <td className={tdCls + ' font-semibold'} style={{ color: '#16a34a' }}>
                          {n(inv.currentFMV) > 0 ? `₹${fmt(inv.currentFMV)}` : '—'}
                        </td>

                        <td className={tdCls}>
                          {n(inv.currentValuation) > 0 ? `₹${fmt(inv.currentValuation)}` : '—'}
                        </td>

                        <td className={tdCls}>
                          <span className={moicNum > 0 ? moicColor(moicNum) : 'text-gray-400'}>
                            {moicNum > 0 ? `${moicNum.toFixed(2)}x` : '—'}
                          </span>
                        </td>

                        <td className={tdCls}>
                          <span className={irrNum > 0 ? irrColor(irrNum) : 'text-gray-400'}>
                            {irrNum > 0 ? `${irrNum.toFixed(1)}%` : '—'}
                          </span>
                        </td>

                        <td className={tdCls}>{n(inv.dpi) > 0 ? fmt(inv.dpi) : '—'}</td>
                        <td className={tdCls}>{n(inv.revenue) > 0 ? `₹${fmt(inv.revenue)}` : '—'}</td>
                        <td className={tdCls}>{n(inv.revenueGrowthYoY) > 0 ? `${fmt(inv.revenueGrowthYoY, 1)}%` : '—'}</td>
                        <td className={tdCls}>{n(inv.arr) > 0 ? `₹${fmt(inv.arr)}` : '—'}</td>
                        <td className={tdCls}>{n(inv.grossMargin) > 0 ? `${fmt(inv.grossMargin, 1)}%` : '—'}</td>
                        <td className={tdCls}>{n(inv.monthlyBurn) > 0 ? `₹${fmt(inv.monthlyBurn)}` : '—'}</td>

                        {/* Runway — red if < 6 months */}
                        <td className={tdCls}>
                          {runwayNum > 0 ? (
                            <span className={runwayNum < 6 ? 'text-red-600 font-semibold' : 'text-gray-700'}>
                              {runwayNum}mo
                            </span>
                          ) : '—'}
                        </td>

                        <td className={tdCls}>{inv.headcount > 0 ? inv.headcount : '—'}</td>

                        {/* NRR — green if > 100 */}
                        <td className={tdCls}>
                          {nrrNum > 0 ? (
                            <span className={nrrNum > 100 ? 'text-green-600 font-semibold' : 'text-gray-600'}>
                              {nrrNum.toFixed(0)}%
                            </span>
                          ) : '—'}
                        </td>

                        <td className={tdCls}>
                          <span className={`px-1.5 py-0.5 rounded text-xs ${
                            inv.leadOrFollow === 'Lead' ? 'bg-purple-100 text-purple-700'
                            : inv.leadOrFollow === 'Co-lead' ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-600'
                          }`}>
                            {inv.leadOrFollow}
                          </span>
                        </td>

                        <td className={tdCls + ' text-center'}>
                          {inv.boardSeat
                            ? <Check size={14} className="text-green-600 mx-auto" />
                            : <span className="text-gray-300">—</span>
                          }
                        </td>

                        <td className={tdCls}>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(inv.status)}`}>
                            {inv.status}
                          </span>
                        </td>

                        <td className={tdCls}>{inv.nextRoundExpected || '—'}</td>

                        {/* Actions */}
                        <td className={tdCls}>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : inv.id)}
                              className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                              title="View Detail"
                            >
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                            <button
                              onClick={() => setModalData(inv)}
                              className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600"
                              title="Edit"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(inv.id)}
                              className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-red-600"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Inline expanded row (mini detail) */}
                      {isExpanded && (
                        <tr key={`${inv.id}-exp`} className="bg-gray-50/80">
                          <td colSpan={27} className="px-4 py-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Quick Detail — {co?.name}</span>
                              <button
                                className="text-xs underline"
                                style={{ color: PRIMARY }}
                                onClick={() => {
                                  const coPerio = getPeriods(inv.companyId);
                                  setExpandedId(null);
                                  // Open full drawer
                                  setTimeout(() => setExpandedId(`drawer-${inv.id}`), 0);
                                  void coPerio; // referenced below
                                }}
                              >
                                Open Full Drawer →
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                              <span><b>Instrument:</b> {inv.instrument}</span>
                              <span><b>Follow-ons:</b> {inv.followOns.length}</span>
                              <span><b>Realized:</b> {fmtCr(inv.realizedValue)}</span>
                              <span><b>Unrealized:</b> {fmtCr(inv.unrealizedValue)}</span>
                              <span><b>Cash:</b> {fmtCr(inv.cash)}</span>
                              <span><b>Next Round Size:</b> {inv.nextRoundSize ? fmtCr(inv.nextRoundSize) : '—'}</span>
                              {inv.notes && <span><b>Notes:</b> {inv.notes}</span>}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filtered.length > 0 && (
            <div className="px-4 py-2 border-t text-xs text-gray-400">
              Showing {filtered.length} investment{filtered.length !== 1 ? 's' : ''}
              {selectedFund !== 'All' ? ` in ${selectedFund}` : ' across all funds'}
            </div>
          )}
        </div>

        {/* Recharts — Investment Chart */}
        {chartData.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-base font-bold mb-1" style={{ color: PRIMARY }}>Portfolio Breakdown by Company</h2>
            <p className="text-xs text-gray-500 mb-4">Total Invested vs Unrealized vs Realized (₹Cr)</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 4, right: 20, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: '#888' }}
                  angle={-30}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fontSize: 10, fill: '#888' }} tickFormatter={(v: number) => `₹${v}`} />
                <Tooltip
                  formatter={((value: number, name: string) => [`₹${value.toFixed(2)}Cr`, name]) as never}
                  contentStyle={{ fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="totalInvested" name="Total Invested" fill={PRIMARY} radius={[2, 2, 0, 0]} />
                <Bar dataKey="unrealizedValue" name="Unrealized Value" fill="#4ade80" radius={[2, 2, 0, 0]} />
                <Bar dataKey="realized" name="Realized" fill={ACCENT} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Empty state for chart */}
        {chartData.length === 0 && investments.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center text-gray-400">
            <BarChart2 size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Add investments to see the portfolio chart.</p>
          </div>
        )}
      </div>

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle size={22} className="text-red-500" />
              <h3 className="font-bold text-gray-900">Confirm Delete</h3>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              This will permanently delete this investment record. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Follow-on Drawer */}
      {expandedId?.startsWith('drawer-') && (() => {
        const invId = expandedId.replace('drawer-', '');
        const inv = investments.find(i => i.id === invId);
        if (!inv) return null;
        const co = getCompany(inv.companyId);
        const compPeriods = getPeriods(inv.companyId).map(p => ({
          periodLabel: p.periodLabel,
          revenue: p.revenue,
          revenueGrowthYoY: p.revenueGrowthYoY,
        }));
        return (
          <FollowOnDrawer
            inv={inv}
            companyName={co?.name ?? '—'}
            periods={compPeriods}
            onClose={() => setExpandedId(null)}
          />
        );
      })()}

      {/* Add/Edit Modal */}
      {modalData && (
        <InvestmentModal
          initial={modalData}
          companies={companies.map(c => ({ id: c.id, name: c.name, logoUrl: c.logoUrl }))}
          onSave={handleSave}
          onClose={() => setModalData(null)}
        />
      )}
    </div>
  );
}
