import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  Activity, CheckCircle, AlertTriangle, XCircle, HelpCircle,
  ChevronLeft, ChevronRight, X, Download,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { currentQuarter, lastQuarters, normalizeQuarter } from '../../lib/quarter';
import type { CompanyHealth, HealthSignal, PortfolioCompany } from '../../data/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────
// Quarter parsing/formatting is centralised in lib/quarter so reviews saved from
// Portfolio Admin (which used to emit "FY2026-Q1") match the dashboard's "Q2 2026".

const getCurrentQuarter = () => currentQuarter();
const getLast4Quarters = (current: string) => lastQuarters(current, 4);

function signalDotClass(signal: HealthSignal): string {
  switch (signal) {
    case 'green': return 'bg-emerald-500';
    case 'amber': return 'bg-amber-400';
    case 'red':   return 'bg-red-500';
    default:      return 'bg-gray-200';
  }
}

function signalLabel(signal: HealthSignal): string {
  switch (signal) {
    case 'green': return 'Green';
    case 'amber': return 'Amber';
    case 'red':   return 'Red';
    default:      return 'Grey';
  }
}

const SIGNAL_OPTIONS: HealthSignal[] = ['green', 'amber', 'red', 'grey'];

const SIGNAL_LABELS: Record<string, string> = {
  revenueGrowth:   'Revenue Growth',
  burn:            'Burn',
  teamRetention:   'Team',
  productProgress: 'Product',
  fundraising:     'Fundraise',
};

type FilterMode = 'all' | 'amber_red' | 'not_reviewed';

// ─── New Request Form State ───────────────────────────────────────────────────

interface HealthFormState {
  revenueGrowth:   HealthSignal;
  burn:            HealthSignal;
  teamRetention:   HealthSignal;
  productProgress: HealthSignal;
  fundraising:     HealthSignal;
  overallSignal:   HealthSignal;
  notes:           string;
  reviewedBy:      string;
}

function blankForm(): HealthFormState {
  return {
    revenueGrowth:   'grey',
    burn:            'grey',
    teamRetention:   'grey',
    productProgress: 'grey',
    fundraising:     'grey',
    overallSignal:   'grey',
    notes:           '',
    reviewedBy:      '',
  };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SignalDot({ signal, size = 'sm' }: { signal: HealthSignal; size?: 'sm' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'w-5 h-5' : 'w-3 h-3';
  return (
    <span
      className={`inline-block rounded-full ${sizeClass} ${signalDotClass(signal)} flex-shrink-0`}
      title={signalLabel(signal)}
    />
  );
}

function SignalSelector({
  value,
  onChange,
}: {
  value: HealthSignal;
  onChange: (v: HealthSignal) => void;
}) {
  return (
    <div className="flex gap-2">
      {SIGNAL_OPTIONS.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border transition-all ${
            value === s
              ? 'border-[#1C4B42] ring-2 ring-[#1C4B42] ring-offset-1 opacity-100'
              : 'border-gray-200 opacity-60 hover:opacity-80'
          }`}
        >
          <span className={`w-2.5 h-2.5 rounded-full ${signalDotClass(s)}`} />
          {signalLabel(s)}
        </button>
      ))}
    </div>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

interface EditModalProps {
  company: PortfolioCompany;
  quarter: string;
  existing?: CompanyHealth;
  onSave: (data: HealthFormState) => void;
  onClose: () => void;
}

function EditModal({ company, quarter, existing, onSave, onClose }: EditModalProps) {
  const { store } = useApp();
  const [form, setForm] = useState<HealthFormState>(
    existing
      ? {
          revenueGrowth:   existing.revenueGrowth,
          burn:            existing.burn,
          teamRetention:   existing.teamRetention,
          productProgress: existing.productProgress,
          fundraising:     existing.fundraising,
          overallSignal:   existing.overallSignal,
          notes:           existing.notes,
          reviewedBy:      existing.reviewedBy,
        }
      : blankForm()
  );

  const setSignal = (key: keyof Omit<HealthFormState, 'notes' | 'reviewedBy'>) =>
    (v: HealthSignal) => setForm((f) => ({ ...f, [key]: v }));

  function autoSuggest() {
    const t = store.kpiThresholds;
    const moic = Number(company.moic) || 0;
    const irr  = Number(company.irr) || 0;
    const growthStr = String(company.revenueGrowthCagr1yr || '0').replace('%', '');
    const growth = parseFloat(growthStr) || 0;

    const moicSignal: HealthSignal = moic >= t.moic.good ? 'green' : moic >= t.moic.warning ? 'amber' : moic > 0 ? 'red' : 'grey';
    const irrSignal:  HealthSignal = irr  >= t.irr.good  ? 'green' : irr  >= t.irr.warning  ? 'amber' : irr  > 0 ? 'red' : 'grey';
    const growthSignal: HealthSignal = growth > 30 ? 'green' : growth > 0 ? 'amber' : growth < 0 ? 'red' : 'grey';

    // Derive overall from moic/irr — most objective signals
    const signals = [moicSignal, irrSignal].filter(s => s !== 'grey');
    const overall: HealthSignal = signals.includes('red') ? 'red' : signals.includes('amber') ? 'amber' : signals.length > 0 ? 'green' : 'grey';

    setForm(f => ({
      ...f,
      revenueGrowth: growthSignal,
      overallSignal: overall,
    }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <div>
            <h2 className="font-semibold text-gray-900 text-lg">{company.name}</h2>
            <p className="text-sm text-gray-500">{quarter} · Health Review</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <div className="p-5 space-y-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-700">Health Signals</p>
            <button
              type="button"
              onClick={autoSuggest}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border transition-colors hover:bg-lime-50"
              style={{ borderColor: '#86CA0F', color: '#3A6B00' }}
              title={`Auto-fill from: MOIC ${company.moic}x, IRR ${company.irr}%, Revenue CAGR ${company.revenueGrowthCagr1yr || '—'}`}
            >
              ✦ Auto-suggest from data
            </button>
          </div>
          {(Object.keys(SIGNAL_LABELS) as (keyof typeof SIGNAL_LABELS)[]).map((key) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {SIGNAL_LABELS[key]}
              </label>
              <SignalSelector
                value={form[key as keyof HealthFormState] as HealthSignal}
                onChange={setSignal(key as keyof Omit<HealthFormState, 'notes' | 'reviewedBy'>)}
              />
            </div>
          ))}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Overall Signal
            </label>
            <SignalSelector value={form.overallSignal} onChange={setSignal('overallSignal')} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Any key observations..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C4B42] resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reviewed By</label>
            <input
              type="text"
              value={form.reviewedBy}
              onChange={(e) => setForm((f) => ({ ...f, reviewedBy: e.target.value }))}
              placeholder="Your name"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C4B42]"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 pt-0 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => { onSave(form); onClose(); }}
            className="px-4 py-2 rounded-lg bg-[#1C4B42] text-white text-sm font-medium hover:bg-[#163d35] transition-colors"
          >
            Save Review
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Company Health Card ──────────────────────────────────────────────────────

interface HealthCardProps {
  company: PortfolioCompany;
  health?: CompanyHealth;
  onClick: () => void;
}

function HealthCard({ company, health, onClick }: HealthCardProps) {
  const signals: Array<{ key: string; label: string; value: HealthSignal }> = [
    { key: 'revenueGrowth',   label: 'Revenue',   value: health?.revenueGrowth   ?? 'grey' },
    { key: 'burn',            label: 'Burn',       value: health?.burn            ?? 'grey' },
    { key: 'teamRetention',   label: 'Team',       value: health?.teamRetention   ?? 'grey' },
    { key: 'productProgress', label: 'Product',    value: health?.productProgress ?? 'grey' },
    { key: 'fundraising',     label: 'Fundraise',  value: health?.fundraising     ?? 'grey' },
  ];

  const initials = company.name
    .split(' ')
    .slice(0, 2)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase();

  return (
    <button
      onClick={onClick}
      className="text-left bg-white rounded-xl border border-gray-100 p-4 hover:border-[#1C4B42]/40 hover:shadow-md transition-all group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {company.logoUrl ? (
            <img
              src={company.logoUrl}
              alt={company.name}
              className="w-9 h-9 rounded-lg object-contain border border-gray-100"
            />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-[#1C4B42] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {initials}
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-gray-900 group-hover:text-[#1C4B42] transition-colors line-clamp-1">
              {company.name}
            </p>
            <span className="inline-block text-xs bg-gray-100 text-gray-600 rounded px-1.5 py-0.5 mt-0.5">
              {company.stage}
            </span>
          </div>
        </div>
        {/* Overall Signal */}
        <div className="flex items-center gap-1.5">
          <SignalDot signal={health?.overallSignal ?? 'grey'} size="lg" />
        </div>
      </div>

      {/* 5 Signal Dots */}
      {health ? (
        <div className="flex items-center gap-3 mt-2">
          {signals.map((s) => (
            <div key={s.key} className="flex flex-col items-center gap-1">
              <SignalDot signal={s.value} />
              <span className="text-[10px] text-gray-400">{s.label}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-1.5 mt-2">
          <HelpCircle size={13} className="text-gray-300" />
          <span className="text-xs text-gray-400 italic">Not reviewed</span>
        </div>
      )}
    </button>
  );
}

// ─── Trend Chart ─────────────────────────────────────────────────────────────

interface TrendChartProps {
  quarters: string[];
  healthRecords: CompanyHealth[];
  companyCount: number;
}

function TrendChart({ quarters, healthRecords, companyCount }: TrendChartProps) {
  const data = quarters.map((q) => {
    const records = healthRecords.filter((h) => normalizeQuarter(h.quarter) === q);
    const green = records.filter((h) => h.overallSignal === 'green').length;
    const amber = records.filter((h) => h.overallSignal === 'amber').length;
    const red   = records.filter((h) => h.overallSignal === 'red').length;
    const notReviewed = companyCount - records.length;
    return { quarter: q, Green: green, Amber: amber, Red: red, 'Not Reviewed': notReviewed };
  });

  const formatter = (value: number | string, name: string): [string | number, string] =>
    [value, name];

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Activity size={16} className="text-[#1C4B42]" />
        Portfolio Health Trend — Last 4 Quarters
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="quarter" tick={{ fontSize: 12, fill: '#6B7280' }} />
          <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} allowDecimals={false} />
          <Tooltip formatter={formatter as never} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="Green"        stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
          <Bar dataKey="Amber"        stackId="a" fill="#fbbf24" />
          <Bar dataKey="Red"          stackId="a" fill="#ef4444" />
          <Bar dataKey="Not Reviewed" stackId="a" fill="#e5e7eb" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function HealthDashboard() {
  const { store, addCompanyHealth, updateCompanyHealth } = useApp();

  const [quarter, setQuarter]         = useState(getCurrentQuarter());
  const [filter, setFilter]           = useState<FilterMode>('all');
  const [editCompany, setEditCompany] = useState<PortfolioCompany | null>(null);
  const [reviewQueue, setReviewQueue] = useState<PortfolioCompany[]>([]);
  const [reviewIdx, setReviewIdx]     = useState(0);

  const companies  = store.companies ?? [];
  const allHealth  = store.companyHealth ?? [];
  const quarters   = useMemo(() => getLast4Quarters(quarter), [quarter]);

  // Health for current quarter
  const healthMap = useMemo(() => {
    const map = new Map<string, CompanyHealth>();
    allHealth
      .filter((h) => normalizeQuarter(h.quarter) === normalizeQuarter(quarter))
      .forEach((h) => map.set(h.companyId, h));
    return map;
  }, [allHealth, quarter]);

  // Summary counts
  const greenCount      = companies.filter((c) => healthMap.get(c.id)?.overallSignal === 'green').length;
  const amberCount      = companies.filter((c) => healthMap.get(c.id)?.overallSignal === 'amber').length;
  const redCount        = companies.filter((c) => healthMap.get(c.id)?.overallSignal === 'red').length;
  const notReviewedCount = companies.filter((c) => !healthMap.has(c.id)).length;

  // Filtered companies
  const filteredCompanies = useMemo(() => {
    switch (filter) {
      case 'amber_red':
        return companies.filter((c) => {
          const sig = healthMap.get(c.id)?.overallSignal;
          return sig === 'amber' || sig === 'red';
        });
      case 'not_reviewed':
        return companies.filter((c) => !healthMap.has(c.id));
      default:
        return companies;
    }
  }, [companies, healthMap, filter]);

  // Quarter navigation
  function shiftQuarter(direction: 1 | -1) {
    const match = quarter.match(/Q(\d) (\d{4})/);
    if (!match) return;
    let q = parseInt(match[1]) + direction;
    let y = parseInt(match[2]);
    if (q > 4) { q = 1; y += 1; }
    if (q < 1) { q = 4; y -= 1; }
    setQuarter(`Q${q} ${y}`);
  }

  // Save handler
  function handleSave(company: PortfolioCompany, formData: HealthFormState) {
    const existing = healthMap.get(company.id);
    const now = new Date().toISOString();
    if (existing) {
      updateCompanyHealth({
        ...existing,
        ...formData,
        reviewedAt: now,
      });
    } else {
      addCompanyHealth({
        id: `ch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        companyId: company.id,
        quarter,
        ...formData,
        reviewedAt: now,
      });
    }
  }

  // Review All logic
  function startReviewAll() {
    const unreviewed = companies.filter((c) => !healthMap.has(c.id));
    if (unreviewed.length === 0) return;
    setReviewQueue(unreviewed);
    setReviewIdx(0);
    setEditCompany(unreviewed[0]);
  }

  function handleReviewAllSave(formData: HealthFormState) {
    if (!reviewQueue[reviewIdx]) return;
    handleSave(reviewQueue[reviewIdx], formData);
    const next = reviewIdx + 1;
    if (next < reviewQueue.length) {
      setReviewIdx(next);
      setEditCompany(reviewQueue[next]);
    } else {
      setEditCompany(null);
      setReviewQueue([]);
      setReviewIdx(0);
    }
  }

  const isReviewAll = reviewQueue.length > 0;

  return (
    <div className="p-6 space-y-6 bg-[#F6FAF7] min-h-screen">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1C4B42]">Portfolio Health Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Signal-based quarterly review for each portfolio company</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => startReviewAll()}
            disabled={notReviewedCount === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#86CA0F] text-[#1C4B42] text-sm font-semibold hover:bg-[#79b80e] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <CheckCircle size={15} />
            Review All ({notReviewedCount})
          </button>
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <Download size={15} />
            Export
          </button>
        </div>
      </div>

      {/* Quarter Selector */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => shiftQuarter(-1)}
          className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
        >
          <ChevronLeft size={16} className="text-gray-600" />
        </button>
        <span className="px-4 py-1.5 rounded-lg bg-[#1C4B42] text-white text-sm font-semibold min-w-[100px] text-center">
          {quarter}
        </span>
        <button
          onClick={() => shiftQuarter(1)}
          className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
        >
          <ChevronRight size={16} className="text-gray-600" />
        </button>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Green',        count: greenCount,        icon: CheckCircle,    color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
          { label: 'Amber',        count: amberCount,        icon: AlertTriangle,  color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-100'   },
          { label: 'Red',          count: redCount,          icon: XCircle,        color: 'text-red-600',     bg: 'bg-red-50',     border: 'border-red-100'     },
          { label: 'Not Reviewed', count: notReviewedCount,  icon: HelpCircle,     color: 'text-gray-500',    bg: 'bg-gray-50',    border: 'border-gray-100'    },
        ].map(({ label, count, icon: Icon, color, bg, border }) => (
          <div key={label} className={`flex items-center gap-3 p-3.5 rounded-xl border ${bg} ${border}`}>
            <Icon size={20} className={color} />
            <div>
              <p className="text-xl font-bold text-gray-900">{count}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(
          [
            { key: 'all',          label: 'All' },
            { key: 'amber_red',    label: 'Amber + Red' },
            { key: 'not_reviewed', label: 'Not Reviewed' },
          ] as { key: FilterMode; label: string }[]
        ).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === key
                ? 'bg-[#1C4B42] text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Company Grid */}
      {filteredCompanies.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Activity size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No companies match this filter</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCompanies.map((company) => (
            <HealthCard
              key={company.id}
              company={company}
              health={healthMap.get(company.id)}
              onClick={() => { setReviewQueue([]); setEditCompany(company); }}
            />
          ))}
        </div>
      )}

      {/* Trend Chart */}
      <TrendChart
        quarters={quarters}
        healthRecords={allHealth}
        companyCount={companies.length}
      />

      {/* Edit / Review Modal */}
      {editCompany && (
        <EditModal
          company={editCompany}
          quarter={quarter}
          existing={healthMap.get(editCompany.id)}
          onSave={(formData) => {
            if (isReviewAll) {
              handleReviewAllSave(formData);
            } else {
              handleSave(editCompany, formData);
            }
          }}
          onClose={() => {
            setEditCompany(null);
            if (isReviewAll) {
              setReviewQueue([]);
              setReviewIdx(0);
            }
          }}
        />
      )}

      {/* Review All progress indicator */}
      {isReviewAll && editCompany && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1C4B42] text-white text-xs px-4 py-2 rounded-full shadow-lg z-50">
          Reviewing {reviewIdx + 1} of {reviewQueue.length} — {editCompany.name}
        </div>
      )}
    </div>
  );
}
