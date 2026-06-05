import { useState, lazy, Suspense, useCallback } from 'react';
import {
  LayoutDashboard, TrendingUp, BarChart2, Layers, Activity,
  Edit2, X, Plus, Check, RefreshCw,
  Info,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { generateId } from '../../lib/utils';
const TeamSyncPanel = lazy(() => import('../../components/ui/TeamSyncPanel'));
import type {
  PortfolioCompany, CompanyFinancialPeriod, FundInvestment,
  CompanyHealth, HealthSignal, YearStyle, FYQuarter, PortfolioSubTab,
} from '../../data/types';

// ─── Colors ───────────────────────────────────────────────────────────────────
const PRIMARY   = '#1C4B42';
// const ACCENT = '#86CA0F'; // reserved for future use
const BG        = '#F6FAF7';

// ─── Tab definitions ──────────────────────────────────────────────────────────
type TabId = 'sync' | 'metrics' | 'periods' | 'fund' | 'health' | 'viewer';

interface Tab { id: TabId; label: string; icon: React.ReactNode }

const TABS: Tab[] = [
  { id: 'sync',    label: 'Data Sync',         icon: <RefreshCw size={15} /> },
  { id: 'metrics', label: 'Company Metrics',   icon: <TrendingUp size={15} /> },
  { id: 'periods', label: 'Financial Periods', icon: <BarChart2 size={15} /> },
  { id: 'fund',    label: 'Fund View',         icon: <Layers size={15} /> },
  { id: 'health',  label: 'Company Health',    icon: <Activity size={15} /> },
  { id: 'viewer', label: 'Viewer Settings',    icon: <LayoutDashboard size={15} /> },
];

// ─── Helper: current quarter string ──────────────────────────────────────────
function currentQuarter(): string {
  const now = new Date();
  const m   = now.getMonth() + 1; // 1-indexed
  const y   = now.getFullYear();
  const q   = m <= 3 ? 'Q4' : m <= 6 ? 'Q1' : m <= 9 ? 'Q2' : 'Q3';
  // Indian FY: Q1=Apr-Jun (year N), Q2=Jul-Sep (N), Q3=Oct-Dec (N), Q4=Jan-Mar (N+1)
  const fy = m <= 3 ? y : y + 1;
  return `FY${fy}-${q}`;
}

// ─── Health signal badge ──────────────────────────────────────────────────────
const SIGNAL_COLORS: Record<HealthSignal, string> = {
  green: 'bg-green-100 text-green-700 border border-green-300',
  amber: 'bg-amber-100 text-amber-700 border border-amber-300',
  red:   'bg-red-100 text-red-700 border border-red-300',
  grey:  'bg-gray-100 text-gray-500 border border-gray-300',
};

function SignalBadge({ signal }: { signal: HealthSignal }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${SIGNAL_COLORS[signal]}`}>
      {signal}
    </span>
  );
}

function SignalSelect({
  value, onChange,
}: { value: HealthSignal; onChange: (v: HealthSignal) => void }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as HealthSignal)}
      className="border border-gray-200 rounded px-2 py-1 text-xs bg-white"
    >
      <option value="green">Green</option>
      <option value="amber">Amber</option>
      <option value="red">Red</option>
      <option value="grey">Grey</option>
    </select>
  );
}

// ─── Inline editable cell ─────────────────────────────────────────────────────
function EditableCell({
  value, onSave, type = 'text', className = '',
}: {
  value: string | number;
  onSave: (v: string) => void;
  type?: 'text' | 'number';
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(String(value));

  const commit = () => { onSave(draft); setEditing(false); };
  const cancel = () => { setDraft(String(value)); setEditing(false); };

  if (editing) {
    return (
      <div className="flex items-center gap-1 min-w-[80px]">
        <input
          autoFocus
          type={type}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel(); }}
          className="border border-blue-400 rounded px-1.5 py-0.5 text-xs w-full outline-none"
        />
        <button onClick={commit}  className="text-green-600 hover:text-green-700"><Check size={12} /></button>
        <button onClick={cancel}  className="text-gray-400 hover:text-gray-600"><X size={12} /></button>
      </div>
    );
  }

  return (
    <span
      className={`cursor-pointer hover:bg-blue-50 rounded px-1 py-0.5 group inline-flex items-center gap-1 ${className}`}
      onClick={() => { setDraft(String(value)); setEditing(true); }}
    >
      {value === '' || value === 0 ? <span className="text-gray-300 text-xs">—</span> : value}
      <Edit2 size={10} className="opacity-0 group-hover:opacity-40" />
    </span>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// VIEWER SETTINGS TAB
// ═══════════════════════════════════════════════════════════════════════════════

const PORTFOLIO_SUB_TABS: { key: PortfolioSubTab; label: string; desc: string }[] = [
  { key: 'companies',  label: 'Companies',         desc: 'Portfolio company cards, search, and filters' },
  { key: 'founders',   label: 'Founder Directory', desc: 'Contact list of all portfolio founders' },
  { key: 'health',     label: 'Health Dashboard',  desc: 'Traffic-light health signals per company' },
  { key: 'news',       label: 'News Feed',          desc: 'News monitoring and press coverage' },
  { key: 'research',   label: 'Research Library',  desc: 'Sector research documents and market maps' },
  { key: 'portal',     label: 'Founder Portal',    desc: 'Founder portal access management' },
  { key: 'fund_view',  label: 'Fund View',          desc: 'Investment ledger — MOIC, IRR, returns' },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ViewerSettingsTab({ updateRole }: { updateRole: (r: any) => void }) {
  const { store } = useApp();
  const viewerRole = store.roles.find(r => r.role === 'portfolio_viewer');

  if (!viewerRole) return (
    <div className="text-center py-8 text-gray-400 text-sm">
      Portfolio Viewer role not found. Contact Super Admin.
    </div>
  );

  const visible = viewerRole.visiblePortfolioTabs ?? [];

  const toggle = (tab: PortfolioSubTab) => {
    const next = visible.includes(tab)
      ? visible.filter((t: PortfolioSubTab) => t !== tab)
      : [...visible, tab];
    updateRole({ ...viewerRole, visiblePortfolioTabs: next });
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
        <p className="text-sm font-bold text-blue-800 mb-1">Portfolio Viewer Role</p>
        <p className="text-xs text-blue-600">
          Portfolio Viewers have <strong>read-only access</strong> to the sections you enable below.
          They cannot edit any data, cannot access Finance/Investment/Operations/Admin tabs.
          "Companies" is always visible and cannot be hidden.
        </p>
      </div>

      <div className="space-y-2">
        {PORTFOLIO_SUB_TABS.map(tab => {
          const isOn     = tab.key === 'companies' || visible.includes(tab.key);
          const isLocked = tab.key === 'companies';
          return (
            <div key={tab.key}
              className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${
                isOn ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-100'
              }`}>
              <div>
                <p className="text-sm font-semibold text-gray-800">{tab.label}</p>
                <p className="text-xs text-gray-500">{tab.desc}</p>
              </div>
              <div className="flex items-center gap-2">
                {isLocked && <span className="text-[10px] text-gray-400 italic">always on</span>}
                <button
                  disabled={isLocked}
                  onClick={() => !isLocked && toggle(tab.key)}
                  className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                    isOn ? 'bg-[#1C4B42]' : 'bg-gray-200'
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    isOn ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live viewer navigation preview */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Viewer Navigation Preview</p>
          <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Live — updates as you toggle</span>
        </div>
        <p className="text-xs text-gray-400">Exactly what a Portfolio Viewer sees in their top tab bar.</p>
        {/* Mock browser chrome */}
        <div className="rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <div className="bg-gray-800 px-3 py-2 flex items-center gap-2">
            <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-400"/><div className="w-2.5 h-2.5 rounded-full bg-amber-400"/><div className="w-2.5 h-2.5 rounded-full bg-green-400"/></div>
            <div className="flex-1 bg-gray-700 rounded px-2 py-0.5 text-[10px] text-gray-400">cactus-pro.vercel.app/dashboard</div>
          </div>
          <div className="bg-white border-b border-gray-100 px-3 py-2 flex gap-1 overflow-x-auto">
            {[{ key: 'companies', label: 'Companies' }, ...PORTFOLIO_SUB_TABS.filter(t => t.key !== 'companies' && visible.includes(t.key))].map((tab, i) => (
              <span key={tab.key} className={`px-3 py-1.5 rounded-t-md text-xs font-medium whitespace-nowrap border-b-2 ${
                i === 0 ? 'border-emerald-600 text-emerald-700 bg-emerald-50' : 'border-transparent text-gray-600'}`}>
                {tab.label}
              </span>
            ))}
            <span className="px-3 py-1.5 rounded-t-md text-xs font-medium whitespace-nowrap border-b-2 border-transparent text-gray-200 line-through">Portfolio Admin</span>
          </div>
          <div className="bg-gray-50 px-4 py-6 text-center text-xs text-gray-300 italic">— viewer sees portfolio content here —</div>
        </div>
        <p className="text-[10px] text-gray-400 italic">The strikethrough "Portfolio Admin" tab is invisible to viewers — shown here for reference only.</p>
      </div>

      <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-xs text-gray-500 space-y-1">
        <p className="font-semibold text-gray-600">How to invite a Portfolio Viewer:</p>
        <ol className="list-decimal list-inside space-y-0.5">
          <li>Go to <strong>Admin → Users & Access</strong></li>
          <li>Click "Invite User" → enter their email</li>
          <li>Set Role to <strong>Portfolio Viewer</strong></li>
          <li>They receive an invite link → can only see the sections enabled above</li>
        </ol>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 2: Company Metrics
// ═══════════════════════════════════════════════════════════════════════════════
function CompanyMetricsTab() {
  const { store, updateCompany } = useApp();
  const companies = store.companies ?? [];

  const patch = (c: PortfolioCompany, key: keyof PortfolioCompany, raw: string) => {
    const numKeys: Array<keyof PortfolioCompany> = ['ownershipPct', 'moic', 'irr'];
    const updated = { ...c, [key]: numKeys.includes(key) ? parseFloat(raw) || 0 : raw, notes: c.notes };
    updateCompany(updated);
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm border-separate border-spacing-0">
        <thead>
          <tr style={{ backgroundColor: PRIMARY }}>
            {['Company', 'Revenue (₹Cr)', 'Valuation (₹Cr)', 'MOIC', 'IRR (%)', 'Ownership %', 'Status', 'Last Updated'].map(h => (
              <th key={h} className="px-3 py-2 text-left text-xs text-white font-semibold whitespace-nowrap first:rounded-tl last:rounded-tr">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {companies.map((c, i) => {
            const isEven = i % 2 === 0;
            return (
              <tr key={c.id} className={isEven ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-3 py-2 font-medium text-gray-800 whitespace-nowrap">{c.name}</td>
                <td className="px-3 py-2">
                  <EditableCell value={c.revenue} onSave={v => patch(c, 'revenue', v)} />
                </td>
                <td className="px-3 py-2">
                  <EditableCell value={c.currentValuation} onSave={v => patch(c, 'currentValuation', v)} />
                </td>
                <td className="px-3 py-2">
                  <EditableCell value={c.moic} onSave={v => patch(c, 'moic', v)} type="number" />
                </td>
                <td className="px-3 py-2">
                  <EditableCell value={c.irr} onSave={v => patch(c, 'irr', v)} type="number" />
                </td>
                <td className="px-3 py-2">
                  <EditableCell value={c.ownershipPct} onSave={v => patch(c, 'ownershipPct', v)} type="number" />
                </td>
                <td className="px-3 py-2">
                  <select
                    value={c.status}
                    onChange={e => patch(c, 'status', e.target.value)}
                    className="border border-gray-200 rounded px-1.5 py-0.5 text-xs bg-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Watch">Watch</option>
                    <option value="Exited">Exited</option>
                  </select>
                </td>
                <td className="px-3 py-2 text-xs text-gray-400 whitespace-nowrap">
                  {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {companies.length === 0 && (
        <p className="text-center py-12 text-gray-400 text-sm">No portfolio companies found.</p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 3: Financial Periods
// ═══════════════════════════════════════════════════════════════════════════════

const EMPTY_PERIOD = (companyId: string): CompanyFinancialPeriod => ({
  id: '',
  companyId,
  yearStyle: 'FY',
  fiscalYear: 'FY2025',
  periodType: 'quarterly',
  quarter: 'Q1',
  periodLabel: 'FY2025-Q1',
  revenue: '',
  arr: '',
  mrr: '',
  gmv: '',
  grossMarginPct: '',
  ebitdaMarginPct: '',
  netMarginPct: '',
  revenueGrowthYoY: '',
  arrGrowthYoY: '',
  nrr: '',
  churnPct: '',
  currentValuation: '',
  moic: '',
  irr: '',
  methodology: '',
  headcount: 0,
  monthlyBurn: '',
  cash: '',
  runway: '',
  cac: '',
  ltv: '',
  ltvCacRatio: '',
  notes: '',
  source: 'Manual',
  updatedBy: 'Portfolio Team',
  updatedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
});

function buildLabel(p: Pick<CompanyFinancialPeriod, 'yearStyle' | 'fiscalYear' | 'periodType' | 'quarter'>): string {
  const base = p.periodType === 'annual'
    ? `${p.fiscalYear}-Annual`
    : `${p.fiscalYear}-${p.quarter ?? 'Q1'}`;
  return base;
}

interface PeriodModalProps {
  period: CompanyFinancialPeriod;
  onClose: () => void;
  onSave: (p: CompanyFinancialPeriod) => void;
}

function PeriodModal({ period, onClose, onSave }: PeriodModalProps) {
  const [form, setForm] = useState<CompanyFinancialPeriod>({ ...period });

  const set = <K extends keyof CompanyFinancialPeriod>(key: K, val: CompanyFinancialPeriod[K]) => {
    setForm(prev => {
      const next = { ...prev, [key]: val };
      next.periodLabel = buildLabel(next);
      return next;
    });
  };

  const field = (label: string, key: keyof CompanyFinancialPeriod, type: 'text' | 'number' = 'text') => (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-500 font-medium">{label}</label>
      <input
        type={type}
        value={String(form[key] ?? '')}
        onChange={e => set(key, (type === 'number' ? (parseFloat(e.target.value) || 0) : e.target.value) as CompanyFinancialPeriod[typeof key])}
        className="border border-gray-200 rounded px-2.5 py-1.5 text-sm outline-none focus:border-blue-400"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ backgroundColor: BG }}>
          <h2 className="font-semibold text-gray-800">
            {period.id ? 'Edit Financial Period' : 'Add Financial Period'}
          </h2>
          <button onClick={onClose}><X size={18} className="text-gray-500" /></button>
        </div>
        <div className="overflow-y-auto p-5 grid grid-cols-3 gap-4">
          {/* Period identity */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium">Year Style</label>
            <select
              value={form.yearStyle}
              onChange={e => set('yearStyle', e.target.value as YearStyle)}
              className="border border-gray-200 rounded px-2.5 py-1.5 text-sm"
            >
              <option value="FY">FY (Indian Apr-Mar)</option>
              <option value="CY">CY (Jan-Dec)</option>
            </select>
          </div>
          {field('Fiscal Year', 'fiscalYear')}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium">Period Type</label>
            <select
              value={form.periodType}
              onChange={e => set('periodType', e.target.value as 'quarterly' | 'annual')}
              className="border border-gray-200 rounded px-2.5 py-1.5 text-sm"
            >
              <option value="quarterly">Quarterly</option>
              <option value="annual">Annual</option>
            </select>
          </div>
          {form.periodType === 'quarterly' && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">Quarter</label>
              <select
                value={form.quarter ?? 'Q1'}
                onChange={e => set('quarter', e.target.value as FYQuarter)}
                className="border border-gray-200 rounded px-2.5 py-1.5 text-sm"
              >
                <option value="Q1">Q1</option>
                <option value="Q2">Q2</option>
                <option value="Q3">Q3</option>
                <option value="Q4">Q4</option>
              </select>
            </div>
          )}
          <div className="flex flex-col gap-1 col-span-2">
            <label className="text-xs text-gray-500 font-medium">Period Label (auto)</label>
            <input
              readOnly
              value={form.periodLabel}
              className="border border-gray-100 rounded px-2.5 py-1.5 text-sm bg-gray-50 text-gray-500"
            />
          </div>

          {/* Revenue */}
          <div className="col-span-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mt-2">Revenue</div>
          {field('Revenue (₹Cr)', 'revenue')}
          {field('ARR (₹Cr)', 'arr')}
          {field('MRR (₹Cr)', 'mrr')}
          {field('GMV (₹Cr)', 'gmv')}
          {field('Revenue Growth YoY (%)', 'revenueGrowthYoY')}
          {field('ARR Growth YoY (%)', 'arrGrowthYoY')}

          {/* Profitability */}
          <div className="col-span-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mt-2">Profitability</div>
          {field('Gross Margin (%)', 'grossMarginPct')}
          {field('EBITDA Margin (%)', 'ebitdaMarginPct')}
          {field('Net Margin (%)', 'netMarginPct')}
          {field('NRR (%)', 'nrr')}
          {field('Churn (%)', 'churnPct')}

          {/* Returns */}
          <div className="col-span-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mt-2">Returns</div>
          {field('Valuation (₹Cr)', 'currentValuation')}
          {field('MOIC (x)', 'moic')}
          {field('IRR (%)', 'irr')}
          {field('Methodology', 'methodology')}

          {/* Operations */}
          <div className="col-span-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mt-2">Operations</div>
          {field('Headcount', 'headcount', 'number')}
          {field('Monthly Burn (₹Cr)', 'monthlyBurn')}
          {field('Cash (₹Cr)', 'cash')}
          {field('Runway (months)', 'runway')}

          {/* Unit economics */}
          <div className="col-span-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mt-2">Unit Economics</div>
          {field('CAC (₹)', 'cac')}
          {field('LTV (₹)', 'ltv')}
          {field('LTV/CAC Ratio', 'ltvCacRatio')}

          {/* Meta */}
          <div className="col-span-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mt-2">Meta</div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium">Source</label>
            <select
              value={form.source}
              onChange={e => set('source', e.target.value)}
              className="border border-gray-200 rounded px-2.5 py-1.5 text-sm"
            >
              <option value="Manual">Manual</option>
              <option value="Excel Sync">Excel Sync</option>
              <option value="GNews">GNews</option>
            </select>
          </div>
          <div className="col-span-2 flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={2}
              className="border border-gray-200 rounded px-2.5 py-1.5 text-sm resize-none outline-none focus:border-blue-400"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t bg-gray-50">
          <button onClick={onClose} className="px-4 py-1.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg bg-white">
            Cancel
          </button>
          <button
            onClick={() => { onSave({ ...form, updatedAt: new Date().toISOString() }); onClose(); }}
            className="px-5 py-1.5 text-sm text-white rounded-lg font-medium"
            style={{ backgroundColor: PRIMARY }}
          >
            Save Period
          </button>

        </div>
      </div>
    </div>
  );
}

function FinancialPeriodsTab() {
  const { store, upsertFinancialPeriod } = useApp();
  const companies  = store.companies  ?? [];
  const allPeriods = store.financialPeriods ?? [];

  const [companyId, setCompanyId]     = useState(companies[0]?.id ?? '');
  const [yearStyle, setYearStyle]     = useState<YearStyle | ''>('');
  const [fiscalYear, setFiscalYear]   = useState('');
  const [editingPeriod, setEditing]   = useState<CompanyFinancialPeriod | null>(null);
  const [showModal, setShowModal]     = useState(false);

  const filtered = allPeriods.filter(p => {
    if (companyId && p.companyId !== companyId) return false;
    if (yearStyle && p.yearStyle !== yearStyle) return false;
    if (fiscalYear && p.fiscalYear !== fiscalYear) return false;
    return true;
  });

  const fyOptions = Array.from(new Set(allPeriods.map(p => p.fiscalYear))).sort().reverse();

  const openAdd = () => {
    const base = EMPTY_PERIOD(companyId || companies[0]?.id || '');
    base.id = generateId();
    setEditing(base);
    setShowModal(true);
  };

  const openEdit = (p: CompanyFinancialPeriod) => { setEditing(p); setShowModal(true); };

  const handleSave = (p: CompanyFinancialPeriod) => { upsertFinancialPeriod(p); };

  const cols = ['Period', 'Revenue', 'ARR', 'Gross Margin', 'EBITDA Margin', 'Burn', 'Cash', 'MOIC', 'IRR', 'Source', 'Updated', ''];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">Company</label>
          <select
            value={companyId}
            onChange={e => setCompanyId(e.target.value)}
            className="border border-gray-200 rounded px-2.5 py-1.5 text-sm min-w-[180px]"
          >
            <option value="">All Companies</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">Year Style</label>
          <select
            value={yearStyle}
            onChange={e => setYearStyle(e.target.value as YearStyle | '')}
            className="border border-gray-200 rounded px-2.5 py-1.5 text-sm"
          >
            <option value="">All</option>
            <option value="FY">FY</option>
            <option value="CY">CY</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">Fiscal Year</label>
          <select
            value={fiscalYear}
            onChange={e => setFiscalYear(e.target.value)}
            className="border border-gray-200 rounded px-2.5 py-1.5 text-sm"
          >
            <option value="">All</option>
            {fyOptions.map(fy => <option key={fy} value={fy}>{fy}</option>)}
          </select>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-4 py-1.5 text-sm text-white rounded-lg font-medium ml-auto"
          style={{ backgroundColor: PRIMARY }}
        >
          <Plus size={14} /> Add Period
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-100">
        <table className="min-w-full text-sm border-separate border-spacing-0">
          <thead>
            <tr style={{ backgroundColor: PRIMARY }}>
              {cols.map(h => (
                <th key={h} className="px-3 py-2 text-left text-xs text-white font-semibold whitespace-nowrap first:rounded-tl last:rounded-tr">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => {
              const co = companies.find(c => c.id === p.companyId);
              return (
                <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className="font-medium text-gray-700">{p.periodLabel}</span>
                    {co && <span className="ml-1.5 text-xs text-gray-400">({co.name})</span>}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <EditableCell value={p.revenue} onSave={v => upsertFinancialPeriod({ ...p, revenue: v, updatedAt: new Date().toISOString() })} />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <EditableCell value={p.arr} onSave={v => upsertFinancialPeriod({ ...p, arr: v, updatedAt: new Date().toISOString() })} />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <EditableCell value={p.grossMarginPct} onSave={v => upsertFinancialPeriod({ ...p, grossMarginPct: v, updatedAt: new Date().toISOString() })} />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <EditableCell value={p.ebitdaMarginPct} onSave={v => upsertFinancialPeriod({ ...p, ebitdaMarginPct: v, updatedAt: new Date().toISOString() })} />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <EditableCell value={p.monthlyBurn} onSave={v => upsertFinancialPeriod({ ...p, monthlyBurn: v, updatedAt: new Date().toISOString() })} />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <EditableCell value={p.cash} onSave={v => upsertFinancialPeriod({ ...p, cash: v, updatedAt: new Date().toISOString() })} />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <EditableCell value={p.moic} onSave={v => upsertFinancialPeriod({ ...p, moic: v, updatedAt: new Date().toISOString() })} />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <EditableCell value={p.irr} onSave={v => upsertFinancialPeriod({ ...p, irr: v, updatedAt: new Date().toISOString() })} />
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-500">{p.source}</td>
                  <td className="px-3 py-2 text-xs text-gray-400 whitespace-nowrap">
                    {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td className="px-3 py-2">
                    <button onClick={() => openEdit(p)} className="text-blue-500 hover:text-blue-700">
                      <Edit2 size={13} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-center py-10 text-gray-400 text-sm">No financial periods match the selected filters.</p>
        )}
      </div>

      {showModal && editingPeriod && (
        <PeriodModal
          period={editingPeriod}
          onClose={() => setShowModal(false)}
          onSave={p => { handleSave(p); setShowModal(false); }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 4: Fund View
// ═══════════════════════════════════════════════════════════════════════════════

interface FundViewEditState {
  currentFMV: string;
  moic: string;
  irr: string;
  currentValuation: string;
  currentOwnership: string;
  notes: string;
}

function FundViewModal({
  inv,
  companyName,
  onClose,
  onSave,
}: {
  inv: FundInvestment;
  companyName: string;
  onClose: () => void;
  onSave: (updated: FundInvestment) => void;
}) {
  const [form, setForm] = useState<FundViewEditState>({
    currentFMV:       inv.currentFMV,
    moic:             inv.moic,
    irr:              inv.irr,
    currentValuation: inv.currentValuation,
    currentOwnership: inv.currentOwnership,
    notes:            inv.notes,
  });

  const f = (label: string, key: keyof FundViewEditState) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-500 font-medium">{label}</label>
      <input
        type="text"
        value={form[key]}
        onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
        className="border border-gray-200 rounded px-2.5 py-1.5 text-sm outline-none focus:border-blue-400"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ backgroundColor: BG }}>
          <h2 className="font-semibold text-gray-800">Edit Fund View — {companyName}</h2>
          <button onClick={onClose}><X size={18} className="text-gray-500" /></button>
        </div>
        <div className="p-5 grid grid-cols-2 gap-4">
          {f('Current FMV (₹Cr)', 'currentFMV')}
          {f('MOIC (x)', 'moic')}
          {f('IRR (%)', 'irr')}
          {f('Company Valuation (₹Cr)', 'currentValuation')}
          {f('Ownership (%)', 'currentOwnership')}
          <div className="col-span-2 flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="border border-gray-200 rounded px-2.5 py-1.5 text-sm resize-none outline-none focus:border-blue-400"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t bg-gray-50">
          <button onClick={onClose} className="px-4 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg bg-white">
            Cancel
          </button>
          <button
            onClick={() => { onSave({ ...inv, ...form, updatedAt: new Date().toISOString() }); onClose(); }}
            className="px-5 py-1.5 text-sm text-white rounded-lg font-medium"
            style={{ backgroundColor: PRIMARY }}
          >
            Save
          </button>

        </div>
      </div>
    </div>
  );
}

function FundViewTab() {
  const { store, updatePortfolioFundView } = useApp();
  const companies  = store.companies  ?? [];
  const fundView   = store.portfolioFundView ?? [];
  const [editing, setEditing] = useState<FundInvestment | null>(null);

  const getCompanyName = (id: string) => companies.find(c => c.id === id)?.name ?? id;

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-gray-100">
        <table className="min-w-full text-sm border-separate border-spacing-0">
          <thead>
            <tr style={{ backgroundColor: PRIMARY }}>
              {['Fund', 'Company', 'Total Invested', 'FMV', 'MOIC', 'IRR', 'Status', ''].map(h => (
                <th key={h} className="px-3 py-2 text-left text-xs text-white font-semibold whitespace-nowrap first:rounded-tl last:rounded-tr">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fundView.map((inv, i) => (
              <tr key={inv.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-3 py-2 text-xs text-gray-500">{inv.fund}</td>
                <td className="px-3 py-2 font-medium text-gray-800 whitespace-nowrap">{getCompanyName(inv.companyId)}</td>
                <td className="px-3 py-2 text-gray-700">₹{inv.totalInvested}Cr</td>
                <td className="px-3 py-2 text-gray-700">₹{inv.currentFMV}Cr</td>
                <td className="px-3 py-2">
                  <span className="font-medium" style={{ color: PRIMARY }}>{inv.moic}x</span>
                </td>
                <td className="px-3 py-2 text-gray-700">{inv.irr}%</td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    inv.status === 'Active'     ? 'bg-green-100 text-green-700'  :
                    inv.status === 'Watch'      ? 'bg-amber-100 text-amber-700'  :
                    inv.status === 'Exited'     ? 'bg-blue-100 text-blue-700'    :
                    'bg-red-100 text-red-700'
                  }`}>{inv.status}</span>
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => setEditing(inv)}
                    className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 font-medium"
                  >
                    <Edit2 size={12} /> Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {fundView.length === 0 && (
          <p className="text-center py-10 text-gray-400 text-sm">
            No fund view records yet. Fund view is seeded from Fund Investments on first load.
          </p>
        )}
      </div>

      {editing && (
        <FundViewModal
          inv={editing}
          companyName={getCompanyName(editing.companyId)}
          onClose={() => setEditing(null)}
          onSave={updated => { updatePortfolioFundView(updated); setEditing(null); }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 5: Company Health
// ═══════════════════════════════════════════════════════════════════════════════

const HEALTH_SIGNALS: HealthSignal[] = ['green', 'amber', 'red', 'grey'];

const BLANK_HEALTH = (companyId: string): CompanyHealth => ({
  id: '',
  companyId,
  quarter: currentQuarter(),
  revenueGrowth:   'grey',
  burn:            'grey',
  teamRetention:   'grey',
  productProgress: 'grey',
  fundraising:     'grey',
  overallSignal:   'grey',
  notes:           '',
  reviewedBy:      'Portfolio Team',
  reviewedAt:      new Date().toISOString(),
});

function HealthReviewForm({
  companyName,
  existing,
  onSave,
  onCancel,
}: {
  companyName: string;
  existing: CompanyHealth;
  onSave: (h: CompanyHealth) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<CompanyHealth>({ ...existing });

  const sig = (label: string, key: keyof Pick<CompanyHealth, 'revenueGrowth' | 'burn' | 'teamRetention' | 'productProgress' | 'fundraising' | 'overallSignal'>) => (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-700 w-40">{label}</span>
      <SignalSelect value={form[key]} onChange={v => setForm(prev => ({ ...prev, [key]: v }))} />
    </div>
  );

  const markAll = (signal: HealthSignal) => {
    setForm(prev => ({
      ...prev,
      revenueGrowth: signal, burn: signal, teamRetention: signal,
      productProgress: signal, fundraising: signal, overallSignal: signal,
    }));
  };

  return (
    <div className="border border-gray-100 rounded-xl p-5 bg-white shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800">{companyName} — {form.quarter}</h3>
        <div className="flex gap-2">
          {HEALTH_SIGNALS.map(s => (
            <button
              key={s}
              onClick={() => markAll(s)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize border ${SIGNAL_COLORS[s]}`}
            >
              All {s}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-4">
        {sig('Revenue Growth', 'revenueGrowth')}
        {sig('Burn Rate', 'burn')}
        {sig('Team Retention', 'teamRetention')}
        {sig('Product Progress', 'productProgress')}
        {sig('Fundraising', 'fundraising')}
        {sig('Overall Signal', 'overallSignal')}
      </div>
      <div className="mb-4">
        <label className="text-xs text-gray-500 font-medium">Notes</label>
        <textarea
          value={form.notes}
          onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
          rows={3}
          placeholder="Observations, risks, opportunities…"
          className="mt-1 w-full border border-gray-200 rounded px-3 py-2 text-sm resize-none outline-none focus:border-blue-400"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-4 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg bg-white">
          Cancel
        </button>
        <button
          onClick={() => onSave({ ...form, reviewedAt: new Date().toISOString() })}
          className="px-5 py-1.5 text-sm text-white rounded-lg font-medium"
          style={{ backgroundColor: PRIMARY }}
        >
          Save Health Review
        </button>
      </div>
    </div>
  );
}

function CompanyHealthTab() {
  const { store, addCompanyHealth, updateCompanyHealth } = useApp();
  const companies = store.companies ?? [];
  const allHealth = store.companyHealth ?? [];

  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [reviewingId, setReviewingId]             = useState<string | null>(null);

  const quarter = currentQuarter();

  const getLatest = useCallback((companyId: string): CompanyHealth | undefined => {
    return allHealth
      .filter(h => h.companyId === companyId)
      .sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt))[0];
  }, [allHealth]);

  const hasCurrentQuarter = (companyId: string) =>
    allHealth.some(h => h.companyId === companyId && h.quarter === quarter);

  const handleSave = (h: CompanyHealth) => {
    if (h.id && allHealth.find(x => x.id === h.id)) {
      updateCompanyHealth(h);
    } else {
      addCompanyHealth({ ...h, id: generateId() });
    }
    setReviewingId(null);
  };

  const displayedCompanies = selectedCompanyId
    ? companies.filter(c => c.id === selectedCompanyId)
    : companies;

  return (
    <div className="space-y-4">
      {/* Company filter */}
      <div className="flex items-center gap-3">
        <select
          value={selectedCompanyId ?? ''}
          onChange={e => setSelectedCompanyId(e.target.value || null)}
          className="border border-gray-200 rounded px-2.5 py-1.5 text-sm min-w-[220px]"
        >
          <option value="">All Companies</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <span className="text-xs text-gray-400">Current quarter: <strong>{quarter}</strong></span>
      </div>

      {/* Company cards */}
      <div className="space-y-3">
        {displayedCompanies.map(c => {
          const latest  = getLatest(c.id);
          const hasCQ   = hasCurrentQuarter(c.id);
          const isOpen  = reviewingId === c.id;

          return (
            <div key={c.id}>
              {isOpen ? (
                <HealthReviewForm
                  companyName={c.name}
                  existing={hasCQ && latest ? latest : { ...BLANK_HEALTH(c.id), id: '' }}
                  onSave={handleSave}
                  onCancel={() => setReviewingId(null)}
                />
              ) : (
                <div className="border border-gray-100 rounded-xl p-4 bg-white flex items-center gap-4 shadow-sm">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-800">{c.name}</span>
                      <span className="text-xs text-gray-400">{c.stage}</span>
                    </div>
                    {latest ? (
                      <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                        <span>Last reviewed: <strong>{latest.quarter}</strong></span>
                        <span>·</span>
                        <span>Revenue <SignalBadge signal={latest.revenueGrowth} /></span>
                        <span>Burn <SignalBadge signal={latest.burn} /></span>
                        <span>Team <SignalBadge signal={latest.teamRetention} /></span>
                        <span>Product <SignalBadge signal={latest.productProgress} /></span>
                        <span>Overall <SignalBadge signal={latest.overallSignal} /></span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">No health review on record.</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!hasCQ && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
                        Not reviewed
                      </span>
                    )}
                    <button
                      onClick={() => setReviewingId(c.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white rounded-lg font-medium"
                      style={{ backgroundColor: hasCQ ? '#374151' : PRIMARY }}
                    >
                      {hasCQ ? <><Edit2 size={11} /> Update</> : <><Plus size={11} /> Review</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT: PortfolioAdmin
// ═══════════════════════════════════════════════════════════════════════════════

export default function PortfolioAdmin() {
  const { updateRole, canEditPortfolio, currentRole } = useApp();
  const [activeTab, setActiveTab] = useState<TabId>('sync');

  // Portfolio Viewer and any role that cannot edit portfolio must never see this
  if (!canEditPortfolio() && currentRole !== 'super_admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 text-center px-6">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
          <Info size={22} className="text-gray-400" />
        </div>
        <p className="text-base font-semibold text-gray-700">Access Restricted</p>
        <p className="text-sm text-gray-400 max-w-xs">Portfolio Admin is only accessible to Portfolio Team and Super Admin.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: BG }}>
      {/* Privacy Banner */}
      <div className="mx-4 mt-4 rounded-xl px-5 py-3 flex items-start gap-3" style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
        <Info size={16} className="mt-0.5 shrink-0 text-blue-500" />
        <div>
          <p className="text-sm font-semibold text-blue-800">
            Portfolio Admin — your private workspace.
          </p>
          <p className="text-xs text-blue-600 mt-0.5">
            Changes sync to your team's PostgreSQL namespace only. Finance and Investment teams cannot see this data.
            <span className="ml-2 text-blue-500">Super Admin can view all team data from the Admin panel.</span>
          </p>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="px-4 mt-5">
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-100 w-fit">
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={
                  active
                    ? { backgroundColor: PRIMARY, color: '#fff' }
                    : { color: '#6B7280' }
                }
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-4 space-y-4">

        {/* ── Per-tab guide banners ──────────────────────────────────────────── */}
        {activeTab === 'sync' && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
            <p className="text-sm font-bold text-emerald-800">📂 Data Sync — How it works for Portfolio Team</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  step: '1. Download template',
                  detail: 'Scroll down → CSV Templates section → click "Export Data" next to Financial Periods, Portfolio Updates, or Company Health. File downloads with your current data already filled in.',
                  color: '#1C4B42',
                },
                {
                  step: '2. Edit in Excel / Sheets',
                  detail: 'Add new rows at the bottom. Update existing values. Column headers must stay exactly as they are — these are the mapping keys.',
                  color: '#0891B2',
                },
                {
                  step: '3. Upload to SharePoint + Sync',
                  detail: 'Save file to your SharePoint/OneDrive folder → Share → "Anyone with link" → copy URL → paste in "Add SharePoint Source" above → Preview → Save → Sync Now.',
                  color: '#7C3AED',
                },
              ].map(s => (
                <div key={s.step} className="bg-white rounded-lg p-3 border border-emerald-100">
                  <p className="text-xs font-bold mb-1" style={{ color: s.color }}>{s.step}</p>
                  <p className="text-xs text-gray-600 leading-relaxed">{s.detail}</p>
                </div>
              ))}
            </div>
            <div className="rounded-lg bg-white border border-emerald-100 p-3 text-xs space-y-1">
              <p className="font-semibold text-gray-700">What each CSV maps to in the portal:</p>
              {[
                { csv: 'FY Revenue & Ops',  maps: 'Portfolio → Company → Funding tab → FY/CY quarterly table. Shows Revenue, ARR, MOIC, IRR, Burn, Runway per quarter.', key: 'financial_periods' },
                { csv: 'Portfolio Updates',  maps: 'Operations → Portfolio Updates tab. Monthly founder check-ins.', key: 'portfolio_updates' },
                { csv: 'Company Health',     maps: 'Portfolio → Health Dashboard tab. Traffic-light signals per company per quarter.', key: 'health_dashboard' },
                { csv: 'Founder Contacts',   maps: 'Portfolio → Founder Directory tab. All founder contact info.', key: 'founder_contacts' },
              ].map(r => (
                <div key={r.csv} className="flex items-start gap-2 py-1 border-t border-gray-50">
                  <code className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded shrink-0 font-mono">{r.csv}</code>
                  <span className="text-gray-600">{r.maps}</span>
                  <code className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded shrink-0 ml-auto">{r.key}</code>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'metrics' && (
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-sm font-bold text-blue-800 mb-2">📊 Company Metrics — What this tab does</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-blue-700">
              <div>
                <p className="font-semibold mb-1">What you can edit here:</p>
                <ul className="space-y-1 list-disc list-inside text-blue-600">
                  <li>Revenue (₹Cr) — current FY25 revenue</li>
                  <li>Current Valuation (₹Cr) — latest FMV mark</li>
                  <li>MOIC — multiple on invested capital</li>
                  <li>IRR % — annualised return</li>
                  <li>Ownership % — current Cactus stake</li>
                  <li>Status — Active / Watch / Exited</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold mb-1">Where these values appear in the portal:</p>
                <ul className="space-y-1 list-disc list-inside text-blue-600">
                  <li>Portfolio → Companies tab → each company card</li>
                  <li>Portfolio → Fund View → MOIC/IRR columns</li>
                  <li>Homepage → KPI strip (Total AUM, Avg MOIC)</li>
                  <li>Finance → Portfolio Snapshot table</li>
                  <li>Company Drawer → Overview tab → Key Metrics</li>
                </ul>
              </div>
            </div>
            <div className="mt-3 bg-white rounded-lg p-3 text-xs text-gray-600 border border-blue-100">
              <strong>To sync from SharePoint:</strong> Download the "Portfolio Team Data" template from Data Sync tab →
              fill the sheet named <code className="bg-gray-100 px-1 rounded">FY Revenue & Ops</code> with company metrics →
              upload to SharePoint → paste URL in Data Sync → Sync Now.
              The <code className="bg-gray-100 px-1 rounded">Company Name</code> column is the key — it must match exactly.
            </div>
          </div>
        )}

        {activeTab === 'periods' && (
          <div className="rounded-xl border border-purple-100 bg-purple-50 p-4 space-y-3">
            <p className="text-sm font-bold text-purple-800">📈 Financial Periods — What this tab does</p>
            <div className="text-xs text-purple-700 space-y-2">
              <p>This is the most important data table. Every row = one company + one time period (quarter or annual).</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white rounded-lg p-3 border border-purple-100">
                  <p className="font-bold text-purple-800 mb-1">Composite Key (do NOT change these 4 columns)</p>
                  <ul className="space-y-0.5 list-disc list-inside text-purple-600">
                    <li><strong>Company ID</strong> — e.g. c3 for Lohum</li>
                    <li><strong>Year Style</strong> — FY or CY</li>
                    <li><strong>Fiscal Year</strong> — FY2025 or 2025</li>
                    <li><strong>Quarter</strong> — Q1/Q2/Q3/Q4 or blank for Annual</li>
                  </ul>
                  <p className="mt-2 text-[10px] text-purple-500">These 4 together identify the row. If you add a row with the same key, it updates instead of duplicating.</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-purple-100">
                  <p className="font-bold text-purple-800 mb-1">Where this data appears in the portal</p>
                  <ul className="space-y-0.5 list-disc list-inside text-purple-600">
                    <li>Click any company → <strong>Funding tab</strong> → quarterly table</li>
                    <li>FY/CY toggle auto-converts (enter once as FY)</li>
                    <li>Portfolio → <strong>Fund View</strong> → revenue history</li>
                    <li>Finance → <strong>Valuation Log</strong> → MOIC/IRR marks</li>
                    <li>Master Sheet export → pre-fills with this data</li>
                  </ul>
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-purple-100 text-gray-600">
                <p className="font-semibold mb-1">SharePoint sync for Financial Periods:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Go to <strong>Data Sync tab</strong> → click "Export Data" next to "Financial Periods (FY/CY Quarterly)"</li>
                  <li>Opens Excel with all 200+ rows pre-filled (FY23–FY30 for all 13 companies)</li>
                  <li>Add new rows at the bottom or update existing values</li>
                  <li>Upload to SharePoint → Share → copy link</li>
                  <li>Data Sync → "Add SharePoint Source" → select "Portfolio Team Data" → paste URL → Preview → Save</li>
                  <li>The sheet named <code className="bg-gray-100 px-1 rounded">FY Revenue & Ops</code> maps to kvKey <code className="bg-gray-100 px-1 rounded">financial_periods</code></li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'fund' && (
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 space-y-3">
            <p className="text-sm font-bold text-amber-800">💰 Fund View — What this tab does</p>
            <div className="text-xs text-amber-700 space-y-2">
              <p>This is the Portfolio team's <strong>independent copy</strong> of the fund investment ledger. It is NOT linked to the Finance team's copy — both teams manage their own version.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white rounded-lg p-3 border border-amber-100">
                  <p className="font-bold text-amber-800 mb-1">What each row represents</p>
                  <ul className="space-y-0.5 list-disc list-inside text-amber-700">
                    <li>One Cactus investment per company per fund</li>
                    <li>A company can appear twice (Fund 1 + Fund 2)</li>
                    <li>Each row has: first cheque, all follow-ons, current FMV, MOIC, IRR</li>
                    <li>Edit to update valuations as new marks are set</li>
                  </ul>
                </div>
                <div className="bg-white rounded-lg p-3 border border-amber-100">
                  <p className="font-bold text-amber-800 mb-1">Where it appears in the portal</p>
                  <ul className="space-y-0.5 list-disc list-inside text-amber-700">
                    <li>Portfolio → <strong>Fund View tab</strong> → full investment ledger</li>
                    <li>Company Drawer → <strong>Financials tab</strong> → Fund 1/Fund 2 section</li>
                    <li>Company Drawer → <strong>Funding tab</strong> → investment timeline</li>
                    <li>Portfolio → Fund View → Fund Overview (Called Capital, NAV, TVPI, IRR)</li>
                  </ul>
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-amber-100 text-gray-600">
                <p className="font-semibold mb-1">To update from SharePoint:</p>
                <p>There is no separate CSV template for Fund View — edit directly in this tab using the Edit button per row.
                For bulk updates to FMV/MOIC/IRR, use <strong>Financial Periods tab</strong> (FY Revenue & Ops sheet) which
                has the valuation marks per quarter, then run <strong>Sync</strong> from the header.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'health' && (
          <div className="rounded-xl border border-red-100 bg-red-50 p-4">
            <p className="text-sm font-bold text-red-800 mb-2">🟢🟡🔴 Company Health — What this tab does</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-red-700">
              <div>
                <p className="font-semibold mb-1">What you set here (per company, per quarter):</p>
                <ul className="space-y-1 list-disc list-inside text-red-600">
                  <li><strong>Revenue Growth</strong> — green/amber/red/grey</li>
                  <li><strong>Burn</strong> — is burn sustainable?</li>
                  <li><strong>Team Retention</strong> — key hires/departures</li>
                  <li><strong>Product Progress</strong> — roadmap on track?</li>
                  <li><strong>Fundraising</strong> — next round visibility</li>
                  <li><strong>Overall Signal</strong> — one click summary</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold mb-1">Where it appears:</p>
                <ul className="space-y-1 list-disc list-inside text-red-600">
                  <li>Portfolio → <strong>Health Dashboard tab</strong> — grid of all companies with colour dots</li>
                  <li>4-quarter trend chart showing portfolio health over time</li>
                  <li>Filter: "Show Amber+Red only" for watch-list view</li>
                  <li>Master Sheet export → Company Health sheet</li>
                </ul>
                <div className="mt-2 bg-white rounded-lg p-2 border border-red-100">
                  <p className="font-semibold text-gray-700 mb-1">Sync from SharePoint:</p>
                  <p className="text-gray-500">Download "Company Health" template from Data Sync → fill signals → upload to SharePoint → sync. Sheet name must be <code className="bg-gray-100 px-1 rounded">Company Health</code> → maps to <code className="bg-gray-100 px-1 rounded">health_dashboard</code>.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          {activeTab === 'sync' && (
            <Suspense fallback={<div className="p-8 text-center text-gray-400 text-sm">Loading sync panel…</div>}><TeamSyncPanel team="portfolio" /></Suspense>
          )}
          {activeTab === 'metrics' && (
            <div>
              <div className="flex items-center gap-2 mb-5">
                <LayoutDashboard size={17} style={{ color: PRIMARY }} />
                <h2 className="text-base font-semibold text-gray-800">Company Metrics</h2>
                <span className="text-xs text-gray-400 ml-1">Click any cell to edit inline · Changes save immediately.</span>
              </div>
              <CompanyMetricsTab />
            </div>
          )}
          {activeTab === 'periods' && (
            <div>
              <div className="flex items-center gap-2 mb-5">
                <BarChart2 size={17} style={{ color: PRIMARY }} />
                <h2 className="text-base font-semibold text-gray-800">Financial Periods</h2>
                <span className="text-xs text-gray-400 ml-1">Quarterly and annual financial data per company.</span>
              </div>
              <FinancialPeriodsTab />
            </div>
          )}
          {activeTab === 'fund' && (
            <div>
              <div className="flex items-center gap-2 mb-5">
                <Layers size={17} style={{ color: PRIMARY }} />
                <h2 className="text-base font-semibold text-gray-800">Fund View</h2>
                <span className="text-xs text-gray-400 ml-1">Portfolio team's independent copy of fund investment data.</span>
              </div>
              <FundViewTab />
            </div>
          )}
          {activeTab === 'health' && (
            <div>
              <div className="flex items-center gap-2 mb-5">
                <Activity size={17} style={{ color: PRIMARY }} />
                <h2 className="text-base font-semibold text-gray-800">Company Health</h2>
                <span className="text-xs text-gray-400 ml-1">Quarterly health signal reviews per company.</span>
              </div>
              <CompanyHealthTab />
            </div>
          )}

          {activeTab === 'viewer' && (
            <ViewerSettingsTab updateRole={updateRole} />
          )}
        </div>
      </div>
    </div>
  );
}
