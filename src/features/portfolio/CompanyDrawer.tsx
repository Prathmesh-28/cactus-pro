import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  X, ExternalLink, Building2, Quote, TrendingUp, ChevronDown, ChevronUp,
  Users, BarChart2, Layers, Award, FileText, GitBranch, Target, Search,
  Mail, MapPin, Filter, Upload, Trash2, Download, Paperclip, CalendarDays,
} from 'lucide-react';
import CompanyCalendar from '../../components/ui/CompanyCalendar';
import {
  fetchNote, saveNote,
  fetchFiles, uploadFile, deleteFile, fileDownloadUrl,
  type CompanyFile,
} from '../../lib/api';
import {
  ResponsiveContainer, ComposedChart, BarChart, AreaChart, PieChart,
  Bar, Area, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, Line,
} from 'recharts';
import { useApp } from '../../context/AppContext';
import { parseCr } from '../../lib/money';
import type { CompanyGap, CompanyGapType } from '../../data/types';
import type { PortfolioCompany } from '../../data/types';
import { defaultConfig } from '../../data/defaultConfig';
import SectorPill from '../../components/ui/SectorPill';
import StatusBadge from '../../components/ui/StatusBadge';
import AvatarChip from '../../components/ui/AvatarChip';
import ExportMenu from '../../components/ui/ExportMenu';
import { exportCompanyPDF, exportCompanyExcel } from '../../lib/export';
import RoundModeler from './RoundModeler';

interface Props {
  company: PortfolioCompany | null;
  onClose: () => void;
}

type DrawerTab = 'overview' | 'financials' | 'funding' | 'captable' | 'patents' | 'people' | 'calendar' | 'docs' | 'gaps';

const TABS: { key: DrawerTab; label: string; Icon: React.ElementType }[] = [
  { key: 'overview',   label: 'Overview',   Icon: Building2 },
  { key: 'financials', label: 'Financials', Icon: BarChart2 },
  { key: 'funding',    label: 'Funding',    Icon: TrendingUp },
  { key: 'captable',   label: 'Cap Table',  Icon: Layers },
  { key: 'patents',    label: 'Patents',    Icon: FileText },
  { key: 'people',     label: 'People',     Icon: Users },
  { key: 'calendar',   label: 'Calendar',   Icon: CalendarDays },
  { key: 'docs',       label: 'Docs',       Icon: Paperclip },
  { key: 'gaps',       label: 'Gaps',       Icon: Target },
];

// ─── Chart helpers ────────────────────────────────────────────────────────────

function parsePct(val: string): number {
  return parseFloat(val?.replace('%', '')) || 0;
}

function shortYear(y: string): string {
  const m = y.match(/(\d{2})$/);
  return m ? `FY${m[1]}` : y.slice(0, 4);
}

function shortDate(d: string): string {
  const m = d.match(/^(\w{3})\s+\d+,\s+(\d{4})$/);
  if (m) return `${m[1]} '${m[2].slice(2)}`;
  return d.slice(0, 6);
}

const PIE_COLORS = ['#2D6A4F', '#52B788', '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#6B7280'];

const CHART_LABEL = 'text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5';
const AXIS_TICK = { fontSize: 10, fill: '#9CA3AF' };
const GRID_PROPS = { strokeDasharray: '3 3', stroke: '#E5E7EB', vertical: false as const };
const TOOLTIP_STYLE = { contentStyle: { fontSize: 11, borderRadius: 8, border: '1px solid #E5E7EB' } };

// ─── Always-visible charts ────────────────────────────────────────────────────

function ChartsSection({ company, primaryColor, accentColor }: {
  company: PortfolioCompany; primaryColor: string; accentColor: string;
}) {
  const fmtCr = (v: number) => `₹${Math.abs(v).toFixed(2)} Cr`;

  const chartData = [...company.financialHistory].reverse().map(row => ({
    year: shortYear(row.year),
    revenue: parseCr(row.revenue),
    ebitda: parseCr(row.ebitda),
    netProfit: parseCr(row.netProfit),
    margin: parsePct(row.ebitdaMargin),
    employees: row.employees > 0 ? row.employees : 0,
    totalAssets: parseCr(row.totalAssets),
    totalDebt: parseCr(row.totalDebt),
  }));

  const valuationData = [...company.fundingRounds]
    .filter(r => parseCr(r.postMoneyValuation) > 0)
    .reverse()
    .map(r => ({
      label: shortDate(r.date),
      valuation: parseCr(r.postMoneyValuation),
      raised: parseCr(r.amount),
    }));

  const hasFinancials = chartData.length > 0;
  const hasValuation = valuationData.length >= 2;
  const hasEmployees = chartData.some(d => d.employees > 0);
  const hasCap = company.capTable.length > 0;
  const hasDebt = chartData.some(d => d.totalDebt > 0.01);
  const showMarginLine = chartData.every(d => Math.abs(d.margin) <= 200);

  const pieData = company.capTable.map((e, i) => ({
    name: e.investor.replace(/\s*\(.*?\)/, '').trim(),
    value: e.holdingPct,
    color: PIE_COLORS[i % PIE_COLORS.length],
  }));

  if (!hasFinancials && !hasCap && !hasValuation) return null;

  return (
    <div className="bg-gray-50/50 border-b border-gray-100 px-5 py-4 space-y-5">

      {/* ── Chart 1: Revenue & EBITDA ────────────────────────────────────────── */}
      {hasFinancials && (
        <div>
          <p className={CHART_LABEL}>Revenue &amp; EBITDA <span className="normal-case font-normal">(₹ Cr)</span></p>
          <ResponsiveContainer width="100%" height={180}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 40, left: 0, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="year" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis yAxisId="l" tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}`} width={44} />
              <YAxis yAxisId="r" orientation="right" tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} width={36} />
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(val: any, name: any) =>
                  name === 'Margin %' ? [`${val.toFixed(1)}%`, name] : [fmtCr(val), name]
                }
              />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
              <Bar yAxisId="l" dataKey="revenue" name="Revenue" fill={primaryColor} radius={[3,3,0,0]} maxBarSize={28} />
              <Bar yAxisId="l" dataKey="ebitda" name="EBITDA" fill={accentColor + 'CC'} radius={[3,3,0,0]} maxBarSize={28} />
              {showMarginLine && (
                <Line yAxisId="r" type="monotone" dataKey="margin" name="Margin %" stroke="#EF4444" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Chart 2: Valuation over funding rounds ───────────────────────────── */}
      {hasValuation && (
        <div>
          <p className={CHART_LABEL}>Valuation over rounds <span className="normal-case font-normal">(₹ Cr)</span></p>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={valuationData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}`} width={44} />
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(val: any) => [fmtCr(val), 'Valuation']}
              />
              <Area
                type="monotone" dataKey="valuation" name="Valuation"
                stroke={primaryColor} strokeWidth={2.5}
                fill={primaryColor} fillOpacity={0.12}
                dot={{ r: 4, fill: primaryColor, strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Row 3: Net Profit + Employee count ──────────────────────────────── */}
      {hasFinancials && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className={CHART_LABEL}>Net Profit <span className="normal-case font-normal">(₹ Cr)</span></p>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="year" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={36} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v: any) => [fmtCr(v), 'Net Profit']} />
                <Bar dataKey="netProfit" name="Net Profit" radius={[3,3,0,0]} maxBarSize={24}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.netProfit >= 0 ? '#10B981' : '#EF4444'} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {hasEmployees ? (
            <div>
              <p className={CHART_LABEL}>Headcount</p>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={chartData.filter(d => d.employees > 0)} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis dataKey="year" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={30} />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v: any) => [v, 'Employees']} />
                  <Bar dataKey="employees" name="Employees" fill="#3B82F6" radius={[3,3,0,0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center text-xs text-gray-300 italic">No headcount data</div>
          )}
        </div>
      )}

      {/* ── Row 4: Assets vs Debt + Cap Table ───────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">

        {/* Assets vs Debt (or just Assets if no debt) */}
        {hasFinancials && (
          <div>
            <p className={CHART_LABEL}>
              {hasDebt ? 'Assets vs Debt' : 'Total Assets'}
              <span className="normal-case font-normal"> (₹ Cr)</span>
            </p>
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="year" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={38} tickFormatter={v => `₹${v}`} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v: any, n: any) => [fmtCr(v), n]} />
                {hasDebt && <Legend wrapperStyle={{ fontSize: 10 }} />}
                <Bar dataKey="totalAssets" name="Assets" fill="#3B82F6" radius={[3,3,0,0]} maxBarSize={20} />
                {hasDebt && (
                  <Bar dataKey="totalDebt" name="Debt" fill="#F97316" radius={[3,3,0,0]} maxBarSize={20} />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Cap Table donut */}
        {hasCap && (
          <div>
            <p className={CHART_LABEL}>Cap Table</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-shrink-0">
                <ResponsiveContainer width={100} height={100}>
                  <PieChart>
                    <Pie
                      data={pieData} cx="50%" cy="50%"
                      innerRadius={28} outerRadius={48}
                      paddingAngle={2} dataKey="value"
                      startAngle={90} endAngle={-270}
                    >
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip {...TOOLTIP_STYLE} formatter={(v: any) => [`${v.toFixed(1)}%`]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-0.5 min-w-0">
                {pieData.slice(0, 6).map((e, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: e.color }} />
                    <span className="text-gray-500 truncate text-[10px]">{e.name}</span>
                    <span className="ml-auto font-semibold text-gray-700 text-[10px] flex-shrink-0 pl-1">{e.value}%</span>
                  </div>
                ))}
                {pieData.length > 6 && <p className="text-[10px] text-gray-400 pl-2.5">+{pieData.length - 6} more</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Shared section wrapper ───────────────────────────────────────────────────

function Section({ title, icon: Icon, children, defaultOpen = true }: {
  title: string; icon?: React.ElementType; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-gray-500" />}
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{title}</span>
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}

function KV({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-gray-900 leading-tight">{value}</p>
    </div>
  );
}

// ─── Main drawer ──────────────────────────────────────────────────────────────

export default function CompanyDrawer({ company, onClose }: Props) {
  const { store, updateCompany, canAddNotes } = useApp();
  const [activeTab, setActiveTab] = useState<DrawerTab>('overview');
  const [notes, setNotes] = useState('');
  const [notesDirty, setNotesDirty] = useState(false);
  const [notesSaving, setNotesSaving] = useState(false);
  const [files, setFiles] = useState<CompanyFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Gap form state lifted here so it survives store-triggered re-renders
  const gapBlank = (): Omit<CompanyGap, 'id'> => ({ name: '', type: 'Strategy', issue: '', resolution: '', impact: '', resolvedAt: '' });
  const [gapShowForm, setGapShowForm] = useState(false);
  const [gapEditId, setGapEditId] = useState<string | null>(null);
  const [gapForm, setGapForm] = useState<Omit<CompanyGap, 'id'>>(gapBlank());

  useEffect(() => {
    if (!company) return;
    setNotesDirty(false);
    setActiveTab('overview');
    // Load notes and files from backend
    fetchNote(company.id).then(setNotes);
    fetchFiles(company.id).then(setFiles);
  }, [company?.id]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!company) return null;

  const handleSaveNotes = async () => {
    setNotesSaving(true);
    await saveNote(company.id, notes);
    setNotesDirty(false);
    setNotesSaving(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ALLOWED = ['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation','image/png','image/jpeg','image/jpg','text/plain'];
    if (file.size > 50 * 1024 * 1024) {
      alert('File too large — maximum 50 MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (!ALLOWED.includes(file.type)) {
      alert('File type not supported. Allowed: PDF, Word, Excel, PowerPoint, PNG, JPG, TXT.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setUploading(true);
    const uploaded = await uploadFile(company.id, file);
    if (uploaded) setFiles(prev => [uploaded, ...prev]);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteFile = async (fileId: number) => {
    await deleteFile(fileId);
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const fmtSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const primaryColor = store.firm.primaryColor;
  const accentColor = store.firm.accentColor;
  const lightColor = store.firm.lightColor;

  // ── Tab: Overview ──────────────────────────────────────────────────────────
  const _overviewSector = store.sectors.find(s => s.id === company.sectorId);
  const _sectorName = _overviewSector?.name ?? 'Advanced Manufacturing';
  const _sectorKpis = company.sectorKpis?.length
    ? company.sectorKpis
    : (defaultConfig.companies.find(c => c.id === company.id)?.sectorKpis ?? []);

  function fmtKpi(val: number | null | undefined, unit: string): string {
    if (val === null || val === undefined) return '—';
    if (unit === '%') return `${val}%`;
    if (unit === '₹Cr') return `₹${val}Cr`;
    if (unit === '×') return `${val}×`;
    if (unit === '₹') return `₹${Number(val).toLocaleString('en-IN')}`;
    return String(val);
  }

  const OverviewTab = () => (
    <div className="space-y-4">
      <Section title="Key Metrics" icon={BarChart2}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: 'Cactus Investment', value: company.cactusInvestment },
            { label: 'Current Valuation', value: company.currentValuation },
            { label: 'MOIC', value: `${company.moic}x` },
            { label: 'IRR', value: `${company.irr}%` },
            { label: 'Revenue', value: company.revenue },
            { label: 'EBITDA', value: company.ebitda },
            { label: 'Employees', value: company.employees },
            { label: 'Ownership', value: `${company.ownershipPct}%` },
          ].map(m => <KV key={m.label} label={m.label} value={m.value} />)}
        </div>
      </Section>

      {company.longDescription && (
        <Section title="About" icon={Building2}>
          <p className="text-sm text-gray-600 leading-relaxed">{company.longDescription}</p>
          {company.coverageAreas.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {company.coverageAreas.map(a => (
                <span key={a} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{a}</span>
              ))}
            </div>
          )}
        </Section>
      )}

      <Section title="Company Details" icon={GitBranch}>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {[
            { label: 'Founded', value: company.foundedYear },
            { label: 'HQ', value: `${company.hqCity}, ${company.country}` },
            { label: 'CEO / Founder', value: company.ceoName },
            { label: 'Total Funding', value: company.totalFunding },
            { label: 'Stage', value: company.stage },
            { label: 'Status', value: company.status },
          ].filter(x => x.value).map(x => (
            <div key={x.label}>
              <span className="text-gray-400 text-xs">{x.label}</span>
              <p className="text-gray-800 font-medium text-sm">{String(x.value)}</p>
            </div>
          ))}
          {company.legalEntityName && (
            <div className="col-span-2">
              <span className="text-gray-400 text-xs">Legal Entity</span>
              <p className="text-gray-800 font-medium text-sm">{company.legalEntityName}</p>
              {company.cin && <p className="text-gray-400 text-xs font-mono">{company.cin}</p>}
            </div>
          )}
        </div>
        {company.ipoPlans && (
          <div className="mt-3 p-3 rounded-lg border border-amber-200 bg-amber-50">
            <p className="text-xs font-semibold text-amber-700 mb-0.5">IPO Plans</p>
            <p className="text-xs text-amber-700">{company.ipoPlans}</p>
          </div>
        )}
      </Section>

      {(company.revenueGrowthCagr1yr || company.revenueGrowthCagr3yr) && (
        <Section title="Growth" icon={TrendingUp}>
          <div className="grid grid-cols-2 gap-2">
            <KV label="Revenue CAGR (1yr)" value={company.revenueGrowthCagr1yr} />
            <KV label="Revenue CAGR (3yr)" value={company.revenueGrowthCagr3yr} />
            {company.tracxnScore > 0 && (
              <KV label="Tracxn Score" value={`${company.tracxnScore} — ${company.tracxnTag || 'Tracked'}`} />
            )}
          </div>
        </Section>
      )}

      {/* ── Sector KPIs ── */}
      {_sectorKpis.length > 0 && (
        <Section title={`${_sectorName} KPIs`} icon={TrendingUp}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-1.5 pr-3 text-gray-500 font-semibold">Metric</th>
                  <th className="text-right py-1.5 px-2 text-gray-400 font-semibold">FY23</th>
                  <th className="text-right py-1.5 px-2 text-gray-400 font-semibold">FY24</th>
                  <th className="text-right py-1.5 px-2 text-gray-800 font-semibold">FY25</th>
                  <th className="text-right py-1.5 px-2 text-blue-500 font-semibold">FY26E</th>
                  <th className="text-right py-1.5 pl-2 text-blue-500 font-semibold">FY27E</th>
                </tr>
              </thead>
              <tbody>
                {_sectorKpis.map((kpi, i) => (
                  <tr key={i} className={i % 2 === 0 ? '' : 'bg-gray-50'}>
                    <td className="py-1.5 pr-3 text-gray-700 font-medium">{kpi.label}</td>
                    <td className="text-right py-1.5 px-2 text-gray-400">{fmtKpi(kpi.fy23, kpi.unit)}</td>
                    <td className="text-right py-1.5 px-2 text-gray-500">{fmtKpi(kpi.fy24, kpi.unit)}</td>
                    <td className="text-right py-1.5 px-2 text-gray-900 font-semibold">{fmtKpi(kpi.fy25, kpi.unit)}</td>
                    <td className="text-right py-1.5 px-2 text-blue-500 italic">{fmtKpi(kpi.fy26e, kpi.unit)}</td>
                    <td className="text-right py-1.5 pl-2 text-blue-500 italic">{fmtKpi(kpi.fy27e, kpi.unit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {company.boardMemberIds.length > 0 && (
        <Section title="Cactus Board Members" icon={Users}>
          <div className="flex flex-wrap gap-2">
            {company.boardMemberIds.map(id => <AvatarChip key={id} personId={id} />)}
          </div>
        </Section>
      )}

      {company.competitors.length > 0 && (
        <Section title="Key Competitors" icon={Target} defaultOpen={false}>
          <div className="flex flex-wrap gap-1.5">
            {company.competitors.map(c => (
              <span key={c} className="text-xs px-2.5 py-1 rounded-full border border-gray-200 text-gray-600 bg-white">{c}</span>
            ))}
          </div>
        </Section>
      )}

      {company.testimonialQuote && (
        <Section title="Testimonial" icon={Quote} defaultOpen={false}>
          <blockquote className="border-l-4 pl-4 py-1" style={{ borderColor: accentColor }}>
            <Quote className="w-4 h-4 mb-2" style={{ color: accentColor }} />
            <p className="text-sm text-gray-600 italic leading-relaxed">{company.testimonialQuote}</p>
            <footer className="mt-2 text-xs text-gray-500">
              — {company.testimonialAuthorName}, {company.testimonialAuthorTitle}
            </footer>
          </blockquote>
        </Section>
      )}

      {/* ── Charts (Revenue, Valuation, Net Profit, Headcount, Assets, Cap Table) ── */}
      <ChartsSection company={company} primaryColor={primaryColor} accentColor={accentColor} />

      <Section title="Internal Notes" icon={FileText}>
        {canAddNotes() ? (
          <>
            <textarea
              value={notes}
              onChange={e => { setNotes(e.target.value); setNotesDirty(true); }}
              rows={4}
              placeholder="Add internal notes (saved to cloud)..."
              className="w-full border border-gray-200 rounded-lg p-3 text-sm text-gray-700 focus:outline-none focus:ring-2 resize-none"
            />
            {notesDirty && (
              <button
                onClick={handleSaveNotes}
                disabled={notesSaving}
                className="mt-2 px-4 py-1.5 text-xs font-medium rounded-lg text-white disabled:opacity-60"
                style={{ backgroundColor: primaryColor }}
              >
                {notesSaving ? 'Saving…' : 'Save Notes'}
              </button>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-500 italic">{notes || 'No internal notes.'}</p>
        )}
      </Section>
    </div>
  );

  // ── Tab: Financials ────────────────────────────────────────────────────────
  const FinancialsTab = () => {
    // Fund 1 + Fund 2 investments for this company
    const fundEntries = useMemo(() =>
      (store.portfolioFundView ?? []).filter(i => i.companyId === company.id),
    [store.portfolioFundView, company.id]);

    const [yearStyle, setYearStyle]       = useState<'FY' | 'CY'>('FY');
    const [selectedYear, setSelectedYear] = useState<string>('all');

    function fyToCyLabel(p: { fiscalYear: string; quarter?: string; periodType: string }): string {
      if (p.periodType === 'annual') return `${p.fiscalYear}-Annual (≈CY)`;
      const fyYear = parseInt(p.fiscalYear.replace('FY', ''));
      const map: Record<string, { cyYear: number; cyQ: string }> = {
        Q1: { cyYear: fyYear - 1, cyQ: 'Q2' },
        Q2: { cyYear: fyYear - 1, cyQ: 'Q3' },
        Q3: { cyYear: fyYear - 1, cyQ: 'Q4' },
        Q4: { cyYear: fyYear,     cyQ: 'Q1' },
      };
      const m = p.quarter ? map[p.quarter] : null;
      return m ? `${m.cyYear}-${m.cyQ}` : p.fiscalYear;
    }

    const fyPeriods = useMemo(() =>
      (store.financialPeriods ?? [])
        .filter(p => p.companyId === company.id && p.yearStyle === 'FY')
        .sort((a, b) => a.periodLabel.localeCompare(b.periodLabel)),
    [store.financialPeriods, company.id]);

    const cyNativePeriods = useMemo(() =>
      (store.financialPeriods ?? [])
        .filter(p => p.companyId === company.id && p.yearStyle === 'CY')
        .sort((a, b) => a.periodLabel.localeCompare(b.periodLabel)),
    [store.financialPeriods, company.id]);

    const allPeriods = useMemo(() => {
      if (yearStyle === 'FY') return fyPeriods;
      const fromFY = fyPeriods.map(p => ({
        ...p,
        periodLabel: fyToCyLabel(p),
        fiscalYear: p.periodType === 'annual' ? p.fiscalYear : String(
          parseInt(p.fiscalYear.replace('FY','')) + (['Q4'].includes(p.quarter ?? '') ? 0 : -1)
        ),
      }));
      return [...fromFY, ...cyNativePeriods].sort((a, b) => a.periodLabel.localeCompare(b.periodLabel));
    }, [yearStyle, fyPeriods, cyNativePeriods]);

    const availableYears = useMemo(() => {
      const yrs = [...new Set(allPeriods.map(p => p.fiscalYear))].sort();
      return ['all', ...yrs];
    }, [allPeriods]);

    const periods = useMemo(() =>
      selectedYear === 'all' ? allPeriods : allPeriods.filter(p => p.fiscalYear === selectedYear),
    [allPeriods, selectedYear]);

    const annuals = useMemo(() => periods.filter(p => p.periodType === 'annual'), [periods]);

    const yoy = useCallback((curr: string, prev: string): string => {
      const c = parseFloat(curr), p = parseFloat(prev);
      if (!p || !c) return '—';
      return `${((c - p) / Math.abs(p) * 100).toFixed(1)}%`;
    }, []);

    const fmt = (v: string | number, suffix = '') =>
      v && v !== '' && v !== '0' ? `${v}${suffix}` : '—';

    return (
    <div className="space-y-6">

      {/* ── Cactus Fund Investment Summary ──────────────────────────────── */}
      {fundEntries.length > 0 && (
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Cactus Fund Investment Performance</h4>
          <div className="grid grid-cols-1 gap-3">
            {fundEntries.map((inv, idx) => (
              <div key={inv.id} className="rounded-xl border p-4 space-y-3" style={{ borderColor: idx === 0 ? primaryColor + '40' : '#F59E0B40', backgroundColor: idx === 0 ? lightColor + '60' : '#FFFBEB' }}>
                {/* Fund header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full text-white" style={{ backgroundColor: idx === 0 ? primaryColor : '#D97706' }}>{inv.fund}</span>
                    <span className="text-xs text-gray-500">{inv.investmentDate} · {inv.stageAtEntry}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{inv.leadOrFollow}</span>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${inv.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : inv.status === 'Watch' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{inv.status}</span>
                </div>

                {/* Key metrics grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: 'First Cheque', value: `₹${inv.firstCheque} Cr`, sub: inv.ownershipAtEntry + ' entry' },
                    { label: 'Total Invested', value: `₹${inv.totalInvested} Cr`, sub: `${inv.followOns?.length ?? 0} follow-ons` },
                    { label: 'Current FMV', value: `₹${inv.currentFMV} Cr`, sub: inv.currentOwnership + ' stake', hi: true },
                    { label: 'Company Valuation', value: `₹${inv.currentValuation} Cr`, sub: 'Current' },
                    { label: 'MOIC', value: `${inv.moic}x`, sub: 'Multiple on invested', hi: true },
                    { label: 'IRR', value: `${inv.irr}%`, sub: 'Annualized return' },
                    { label: 'DPI', value: inv.dpi || '0x', sub: 'Distributions/Paid-in' },
                    { label: 'Board Seat', value: inv.boardSeat ? '✓ Yes' : '— No', sub: inv.leadOrFollow },
                  ].map(s => (
                    <div key={s.label} className="bg-white rounded-lg p-2.5 shadow-sm">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">{s.label}</p>
                      <p className="text-sm font-bold mt-0.5" style={{ color: s.hi ? primaryColor : '#111827' }}>{s.value}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{s.sub}</p>
                    </div>
                  ))}
                </div>

                {/* Investment Rounds table with per-tranche metrics */}
                {(() => {
                  const totalInv = parseFloat(inv.totalInvested || '0');
                  const totalFMV = parseFloat(inv.currentFMV || '0');

                  function trancheMetrics(amount: number, dateStr: string) {
                    const currentVal = totalInv > 0 ? (amount / totalInv) * totalFMV : 0;
                    const moic = amount > 0 ? currentVal / amount : 0;
                    const days = (Date.now() - new Date(dateStr).getTime()) / 86400000;
                    const irr = moic > 0 && days > 30 ? (Math.pow(moic, 365 / days) - 1) * 100 : 0;
                    return { currentVal, moic, irr };
                  }

                  const firstAmt = parseFloat(inv.firstCheque || '0');
                  const firstM = trancheMetrics(firstAmt, inv.investmentDate);

                  const thCls = 'text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wide py-1.5 pr-2 whitespace-nowrap';
                  const tdCls = 'text-right text-xs py-2 pr-2 whitespace-nowrap';

                  return (
                    <div className="bg-white rounded-lg p-3 border border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 mb-2">Investment Rounds</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-gray-100">
                              <th className="text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide py-1.5 pr-2 whitespace-nowrap">Date</th>
                              <th className="text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide py-1.5 pr-2 whitespace-nowrap">Round</th>
                              <th className="text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wide py-1.5 pr-2 whitespace-nowrap">Stake</th>
                              <th className={thCls}>Invested</th>
                              <th className={thCls}>Current Value</th>
                              <th className={thCls}>Gain / Loss</th>
                              <th className={thCls}>MOIC</th>
                              <th className={thCls}>IRR</th>
                            </tr>
                          </thead>
                          <tbody>
                            {/* First cheque */}
                            <tr className="border-b border-gray-50">
                              <td className="text-left text-xs py-2 pr-2 text-gray-500">{inv.investmentDate}</td>
                              <td className="text-left text-xs py-2 pr-2 font-medium text-gray-700">{inv.stageAtEntry} — First Cheque</td>
                              <td className="text-right text-xs py-2 pr-2 text-gray-400">{inv.ownershipAtEntry}</td>
                              <td className={`${tdCls} font-bold`} style={{ color: primaryColor }}>₹{inv.firstCheque} Cr</td>
                              <td className={`${tdCls} font-semibold`} style={{ color: firstM.currentVal >= firstAmt ? primaryColor : '#EF4444' }}>
                                ₹{firstM.currentVal.toFixed(2)} Cr
                              </td>
                              <td className={`${tdCls} ${firstM.currentVal >= firstAmt ? 'text-emerald-600' : 'text-red-500'}`}>
                                {firstM.currentVal >= firstAmt ? '+' : ''}₹{(firstM.currentVal - firstAmt).toFixed(2)} Cr
                              </td>
                              <td className={`${tdCls} font-bold ${firstM.moic >= 2 ? 'text-emerald-600' : firstM.moic >= 1 ? 'text-amber-600' : 'text-red-500'}`}>
                                {firstM.moic > 0 ? `${firstM.moic.toFixed(2)}x` : '—'}
                              </td>
                              <td className={`${tdCls} font-bold ${firstM.irr >= 20 ? 'text-emerald-600' : firstM.irr >= 10 ? 'text-amber-600' : 'text-red-500'}`}>
                                {firstM.irr !== 0 ? `${firstM.irr.toFixed(1)}%` : '—'}
                              </td>
                            </tr>
                            {/* Follow-ons */}
                            {(inv.followOns ?? []).map(fo => {
                              const foAmt = parseFloat(fo.amount || '0');
                              const foM = trancheMetrics(foAmt, fo.date);
                              return (
                                <tr key={fo.id} className="border-b border-gray-50">
                                  <td className="text-left text-xs py-2 pr-2 text-gray-500">{fo.date}</td>
                                  <td className="text-left text-xs py-2 pr-2 font-medium text-gray-700">{fo.round}</td>
                                  <td className="text-right text-xs py-2 pr-2 text-gray-400">{fo.ownershipPost}</td>
                                  <td className={`${tdCls} font-bold text-amber-600`}>₹{fo.amount} Cr</td>
                                  <td className={`${tdCls} font-semibold`} style={{ color: foM.currentVal >= foAmt ? primaryColor : '#EF4444' }}>
                                    ₹{foM.currentVal.toFixed(2)} Cr
                                  </td>
                                  <td className={`${tdCls} ${foM.currentVal >= foAmt ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {foM.currentVal >= foAmt ? '+' : ''}₹{(foM.currentVal - foAmt).toFixed(2)} Cr
                                  </td>
                                  <td className={`${tdCls} font-bold ${foM.moic >= 2 ? 'text-emerald-600' : foM.moic >= 1 ? 'text-amber-600' : 'text-red-500'}`}>
                                    {foM.moic > 0 ? `${foM.moic.toFixed(2)}x` : '—'}
                                  </td>
                                  <td className={`${tdCls} font-bold ${foM.irr >= 20 ? 'text-emerald-600' : foM.irr >= 10 ? 'text-amber-600' : 'text-red-500'}`}>
                                    {foM.irr !== 0 ? `${foM.irr.toFixed(1)}%` : '—'}
                                  </td>
                                </tr>
                              );
                            })}
                            {/* Total row */}
                            <tr className="border-t-2 border-gray-200 font-semibold bg-gray-50">
                              <td className="text-left text-xs py-2 pr-2 text-gray-600">Total</td>
                              <td className="text-left text-xs py-2 pr-2 text-gray-600">All Rounds</td>
                              <td className="text-right text-xs py-2 pr-2 text-gray-600">{inv.currentOwnership}</td>
                              <td className={`${tdCls} font-bold`} style={{ color: primaryColor }}>₹{inv.totalInvested} Cr</td>
                              <td className={`${tdCls} font-bold`} style={{ color: primaryColor }}>₹{inv.currentFMV} Cr</td>
                              <td className={`${tdCls} ${totalFMV >= totalInv ? 'text-emerald-600' : 'text-red-500'}`}>
                                {totalFMV >= totalInv ? '+' : ''}₹{(totalFMV - totalInv).toFixed(2)} Cr
                              </td>
                              <td className={`${tdCls} font-bold`} style={{ color: primaryColor }}>{inv.moic}x</td>
                              <td className={`${tdCls} font-bold`} style={{ color: primaryColor }}>{inv.irr}%</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}

                {/* Latest operating metrics */}
                {(inv.revenue || inv.arr || inv.irr) && (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                      { label: 'Revenue', value: inv.revenue ? `₹${inv.revenue} Cr` : '—' },
                      { label: 'ARR', value: inv.arr ? `₹${inv.arr} Cr` : '—' },
                      { label: 'MRR', value: inv.mrr ? `₹${inv.mrr} Cr` : '—' },
                      { label: 'Rev Growth', value: inv.revenueGrowthYoY ? `${inv.revenueGrowthYoY}%` : '—' },
                      { label: 'Gross Margin', value: inv.grossMargin ? `${inv.grossMargin}%` : '—' },
                    ].map(s => (
                      <div key={s.label} className="bg-white rounded-lg p-2 shadow-sm text-center">
                        <p className="text-[10px] text-gray-400">{s.label}</p>
                        <p className="text-xs font-bold text-gray-800 mt-0.5">{s.value}</p>
                      </div>
                    ))}
                  </div>
                )}

                {inv.notes && <p className="text-xs text-gray-500 italic border-l-2 pl-2" style={{ borderColor: primaryColor }}>{inv.notes}</p>}
              </div>
            ))}
          </div>

          {/* Combined if multiple funds */}
          {fundEntries.length > 1 && (() => {
            const tot = fundEntries.reduce((s, i) => s + parseFloat(i.totalInvested || '0'), 0);
            const fmv = fundEntries.reduce((s, i) => s + parseFloat(i.currentFMV || '0'), 0);
            return (
              <div className="mt-3 rounded-xl border border-gray-200 p-3 bg-gray-50 flex items-center justify-between text-sm">
                <span className="text-gray-500 font-medium">Combined (Fund 1 + Fund 2)</span>
                <div className="flex items-center gap-6">
                  <span>Total Invested: <strong>₹{tot.toFixed(2)} Cr</strong></span>
                  <span>Total FMV: <strong style={{ color: primaryColor }}>₹{fmv.toFixed(2)} Cr</strong></span>
                  <span>Blended MOIC: <strong style={{ color: primaryColor }}>{tot > 0 ? (fmv/tot).toFixed(2) + 'x' : '—'}</strong></span>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Financial History (Tracxn data) ──────────────────────────────── */}
      {company.financialHistory.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Year', 'Revenue', 'Net Profit', 'EBITDA', 'EBITDA Margin', 'Total Assets', 'Total Debt', 'Employees'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {company.financialHistory.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-3 py-2.5 font-semibold text-gray-800 whitespace-nowrap">{row.year}</td>
                  <td className="px-3 py-2.5 text-emerald-700 font-medium whitespace-nowrap">{row.revenue}</td>
                  <td className={`px-3 py-2.5 font-medium whitespace-nowrap ${row.netProfit.startsWith('-') ? 'text-red-500' : 'text-emerald-600'}`}>{row.netProfit}</td>
                  <td className={`px-3 py-2.5 font-medium whitespace-nowrap ${row.ebitda.startsWith('-') ? 'text-red-500' : 'text-gray-700'}`}>{row.ebitda}</td>
                  <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{row.ebitdaMargin}</td>
                  <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{row.totalAssets}</td>
                  <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{row.totalDebt}</td>
                  <td className="px-3 py-2.5 text-gray-600">{row.employees > 0 ? row.employees : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center py-8">No financial history available.</p>
      )}

      {/* ── FY / CY Financial Metrics ─────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <h4 className="text-sm font-bold text-gray-900">Financial Metrics — Quarter by Quarter</h4>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
              {(['FY','CY'] as const).map(ys => (
                <button key={ys} onClick={() => { setYearStyle(ys); setSelectedYear('all'); }}
                  className="px-3 py-1.5 font-medium transition-colors"
                  style={yearStyle === ys ? { backgroundColor: primaryColor, color: '#fff' } : { color: '#6b7280' }}>
                  {ys === 'FY' ? 'Indian FY (Apr-Mar)' : 'Calendar Year (auto-converted from FY)'}
                </button>
              ))}
            </div>
            <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none">
              {availableYears.map(y => (
                <option key={y} value={y}>{y === 'all' ? 'All Years' : y}</option>
              ))}
            </select>
          </div>
        </div>

        {periods.length === 0 ? (
          <div className="text-center py-8 rounded-xl border-2 border-dashed border-gray-100">
            <p className="text-sm text-gray-400">No data for {company.name} yet.</p>
            <p className="text-xs text-gray-300 mt-1">Enter as FY (Indian Apr-Mar) — CY view auto-converts. Add via Portfolio Admin → Financial Periods or Master Sheet sync.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
            <table className="w-full text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-gray-100" style={{ backgroundColor: primaryColor }}>
                  <th className="px-3 py-2.5 text-left text-white font-semibold sticky left-0 z-10" style={{ backgroundColor: primaryColor }}>Period</th>
                  <th className="px-3 py-2.5 text-center text-white font-semibold">Type</th>
                  <th className="px-3 py-2.5 text-center text-white font-semibold">Revenue (₹Cr)</th>
                  <th className="px-3 py-2.5 text-center text-white font-semibold">Rev Growth YoY</th>
                  <th className="px-3 py-2.5 text-center text-white font-semibold">ARR (₹Cr)</th>
                  <th className="px-3 py-2.5 text-center text-white font-semibold">MRR (₹Cr)</th>
                  <th className="px-3 py-2.5 text-center text-white font-semibold">NRR %</th>
                  <th className="px-3 py-2.5 text-center text-white font-semibold">Gross Margin %</th>
                  <th className="px-3 py-2.5 text-center text-white font-semibold">EBITDA %</th>
                  <th className="px-3 py-2.5 text-center text-white font-semibold">Burn (₹Cr/mo)</th>
                  <th className="px-3 py-2.5 text-center text-white font-semibold">Cash (₹Cr)</th>
                  <th className="px-3 py-2.5 text-center text-white font-semibold">Runway (mo)</th>
                  <th className="px-3 py-2.5 text-center text-white font-semibold">Headcount</th>
                  <th className="px-3 py-2.5 text-center text-white font-semibold">FMV (₹Cr)</th>
                  <th className="px-3 py-2.5 text-center text-white font-semibold">MOIC</th>
                  <th className="px-3 py-2.5 text-center text-white font-semibold">IRR %</th>
                  <th className="px-3 py-2.5 text-center text-white font-semibold">Valuation (₹Cr)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {periods.map((p, idx) => {
                  const isAnnual = p.periodType === 'annual';
                  const prevAnnual = annuals[annuals.indexOf(p) - 1];
                  const revYoY  = isAnnual && prevAnnual ? yoy(p.revenue, prevAnnual.revenue) : p.revenueGrowthYoY || '—';
                  return (
                    <tr key={p.id}
                      className={`${isAnnual ? 'font-semibold' : ''} ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/30 transition-colors`}>
                      <td className="px-3 py-2 sticky left-0 bg-inherit border-r border-gray-100 font-mono text-xs" style={{ color: primaryColor }}>{p.periodLabel}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${isAnnual ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                          {isAnnual ? 'Annual' : p.quarter}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center font-medium text-gray-800">{fmt(p.revenue)}</td>
                      <td className="px-3 py-2 text-center">
                        {revYoY !== '—' ? (
                          <span className={`text-xs font-medium ${parseFloat(revYoY) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {parseFloat(revYoY) >= 0 ? '▲' : '▼'} {revYoY}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-2 text-center text-gray-700">{fmt(p.arr)}</td>
                      <td className="px-3 py-2 text-center text-gray-700">{fmt(p.mrr)}</td>
                      <td className="px-3 py-2 text-center">
                        {p.nrr ? (
                          <span className={`text-xs font-medium ${parseFloat(p.nrr) >= 100 ? 'text-emerald-600' : 'text-amber-600'}`}>{p.nrr}%</span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-2 text-center text-gray-700">{fmt(p.grossMarginPct, '%')}</td>
                      <td className="px-3 py-2 text-center text-gray-700">{fmt(p.ebitdaMarginPct, '%')}</td>
                      <td className="px-3 py-2 text-center text-gray-700">{fmt(p.monthlyBurn)}</td>
                      <td className="px-3 py-2 text-center text-gray-700">{fmt(p.cash)}</td>
                      <td className="px-3 py-2 text-center">
                        {p.runway ? (
                          <span className={`text-xs font-medium ${parseFloat(p.runway) < 6 ? 'text-red-500 font-bold' : 'text-gray-700'}`}>{p.runway}</span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-2 text-center text-gray-700">{p.headcount || '—'}</td>
                      <td className="px-3 py-2 text-center font-medium" style={{ color: primaryColor }}>{fmt(p.currentValuation)}</td>
                      <td className="px-3 py-2 text-center">
                        {p.moic ? (
                          <span className={`text-xs font-bold ${parseFloat(p.moic) >= 3 ? 'text-emerald-600' : parseFloat(p.moic) >= 2 ? 'text-amber-600' : 'text-red-500'}`}>
                            {p.moic}x
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-2 text-center font-medium text-blue-600">{fmt(p.irr, '%')}</td>
                      <td className="px-3 py-2 text-center text-gray-700">{fmt(p.currentValuation)}</td>
                    </tr>
                  );
                })}
              </tbody>
              {annuals.length >= 2 && (
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50">
                    <td className="px-3 py-2.5 text-xs font-bold text-gray-600 sticky left-0 bg-gray-50" colSpan={2}>YoY Growth</td>
                    <td className="px-3 py-2.5 text-center text-xs font-semibold text-emerald-700">{yoy(annuals[annuals.length-1].revenue, annuals[annuals.length-2].revenue)}</td>
                    <td /><td className="px-3 py-2.5 text-center text-xs font-semibold text-emerald-700">{yoy(annuals[annuals.length-1].arr, annuals[annuals.length-2].arr)}</td>
                    <td className="px-3 py-2.5 text-center text-xs font-semibold text-emerald-700">{yoy(annuals[annuals.length-1].mrr, annuals[annuals.length-2].mrr)}</td>
                    <td colSpan={7} />
                    <td className="px-3 py-2.5 text-center text-xs font-semibold text-blue-600">{yoy(annuals[annuals.length-1].moic, annuals[annuals.length-2].moic)}</td>
                    <td className="px-3 py-2.5 text-center text-xs font-semibold text-blue-600">{yoy(annuals[annuals.length-1].irr, annuals[annuals.length-2].irr)}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
        <div className="mt-3 flex items-center gap-4 text-[10px] text-gray-400">
          {yearStyle === 'FY' ? (
            <><span>FY Q1 = Apr–Jun</span><span>Q2 = Jul–Sep</span><span>Q3 = Oct–Dec</span><span>Q4 = Jan–Mar</span></>
          ) : (
            <><span>CY Q1 = Jan–Mar</span><span>Q2 = Apr–Jun</span><span>Q3 = Jul–Sep</span><span>Q4 = Oct–Dec</span></>
          )}
          <span className="ml-auto">Bold rows = Annual. Color: MOIC ≥3x 🟢 ≥2x 🟡 &lt;2x 🔴</span>
        </div>
      </div>
    </div>
    );
  };

  // ── Tab: Funding ───────────────────────────────────────────────────────────
  // ── Funding Tab — comprehensive: Cactus investment + FY/CY quarterly metrics ──
  const FundingTab = () => {
    const invEntries = useMemo(() =>
      (store.portfolioFundView ?? []).filter(i => i.companyId === company.id),
    [store.portfolioFundView, company.id]);

    return (
      <div className="space-y-6">

        {/* ── Cactus Investment Summary ─────────────────────────────────── */}
        {invEntries.length > 0 ? (
          <div className="space-y-4">
            {/* Combined total if invested across multiple funds */}
            {invEntries.length > 1 && (
              <div className="rounded-xl p-4 border" style={{ backgroundColor: lightColor + '80', borderColor: primaryColor + '40' }}>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Combined Across All Funds</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  {[
                    { label: 'Total Invested', value: `₹${invEntries.reduce((s, i) => s + parseFloat(i.totalInvested || '0'), 0).toFixed(2)} Cr` },
                    { label: 'Total FMV', value: `₹${invEntries.reduce((s, i) => s + parseFloat(i.currentFMV || '0'), 0).toFixed(2)} Cr`, hi: true },
                    { label: 'Blended MOIC', value: (() => {
                      const tot = invEntries.reduce((s, i) => s + parseFloat(i.totalInvested || '0'), 0);
                      const fmv = invEntries.reduce((s, i) => s + parseFloat(i.currentFMV || '0'), 0);
                      return tot > 0 ? `${(fmv / tot).toFixed(2)}x` : '—';
                    })(), hi: true },
                    { label: 'Funds', value: invEntries.map(i => i.fund).join(' + ') },
                  ].map(s => (
                    <div key={s.label} className="bg-white rounded-lg p-2 shadow-sm">
                      <p className="text-[10px] text-gray-400 uppercase">{s.label}</p>
                      <p className="text-sm font-bold mt-0.5" style={{ color: s.hi ? primaryColor : '#111' }}>{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Each fund entry */}
            {invEntries.map((inv, entryIdx) => (
              <div key={inv.id} className="rounded-xl border-2 p-5 space-y-4" style={{ borderColor: primaryColor + '30', backgroundColor: entryIdx === 0 ? lightColor + '60' : '#FFF7ED' }}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Cactus Investment</p>
                    <h3 className="text-lg font-bold text-gray-900 mt-0.5">{inv.fund}</h3>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full font-semibold text-white" style={{ backgroundColor: entryIdx === 0 ? primaryColor : '#D97706' }}>
                    {inv.leadOrFollow}
                  </span>
                </div>

                {/* Investment journey timeline */}
                <div className="relative pl-4">
                  <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-gray-200 rounded" />
                  {/* First cheque */}
                  <div className="relative mb-4">
                    <div className="absolute -left-4 w-2 h-2 rounded-full mt-1.5" style={{ backgroundColor: primaryColor }} />
                    <div className="bg-white rounded-lg border border-gray-100 p-3 shadow-sm">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <p className="text-xs text-gray-400">{inv.investmentDate}</p>
                          <p className="text-sm font-semibold text-gray-900">{inv.stageAtEntry} — First Cheque</p>
                          <p className="text-xs text-gray-500 mt-0.5">Pre-money: ₹{inv.preMoneyAtEntry} Cr · Post: ₹{inv.postMoneyAtEntry} Cr · {inv.instrument}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold" style={{ color: primaryColor }}>₹{inv.firstCheque} Cr</p>
                          <p className="text-xs text-gray-400">{inv.ownershipAtEntry} at entry</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Follow-ons */}
                  {inv.followOns.map((fo, i) => (
                    <div key={fo.id} className="relative mb-4">
                      <div className="absolute -left-4 w-2 h-2 rounded-full mt-1.5" style={{ backgroundColor: accentColor }} />
                      <div className="bg-white rounded-lg border border-gray-100 p-3 shadow-sm">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div>
                            <p className="text-xs text-gray-400">{fo.date}</p>
                            <p className="text-sm font-semibold text-gray-900">{fo.round} — Follow-on #{i + 1}</p>
                            <p className="text-xs text-gray-500 mt-0.5">Pre: ₹{fo.preMoneyVal} Cr · Post: ₹{fo.postMoneyVal} Cr · Lead: {fo.leadInvestor}</p>
                            {fo.notes && <p className="text-xs text-gray-400 italic mt-0.5">{fo.notes}</p>}
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-amber-600">₹{fo.amount} Cr</p>
                            <p className="text-xs text-gray-400">{fo.ownershipPost} post-round</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {/* Current position */}
                  <div className="relative">
                    <div className="absolute -left-4 w-2 h-2 rounded-full mt-1.5 bg-emerald-500" />
                    <div className="bg-emerald-50 rounded-lg border border-emerald-100 p-3">
                      <p className="text-xs text-emerald-600 font-semibold mb-2">Current Position — {inv.fund}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                        {[
                          { label: 'Total Invested', value: `₹${inv.totalInvested} Cr` },
                          { label: 'Current FMV', value: `₹${inv.currentFMV} Cr`, hi: true },
                          { label: 'MOIC', value: `${inv.moic}x`, hi: true },
                          { label: 'IRR', value: `${inv.irr}%` },
                          { label: 'Ownership', value: inv.currentOwnership },
                          { label: 'Company Val', value: `₹${inv.currentValuation} Cr` },
                          { label: 'DPI', value: inv.dpi },
                          { label: 'Board Seat', value: inv.boardSeat ? '✓ Yes' : '— No' },
                        ].map(s => (
                          <div key={s.label} className="bg-white rounded-lg p-2 shadow-sm">
                            <p className="text-[10px] text-gray-400 uppercase">{s.label}</p>
                            <p className="text-xs font-bold mt-0.5" style={{ color: s.hi ? primaryColor : '#111' }}>{s.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Fallback: show raw funding rounds if no portfolioFundView entry */
          company.fundingRounds.length > 0 ? (
            <div className="space-y-3">
              {company.fundingRounds.map((r, i) => (
                <div key={i} className="border border-gray-100 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: lightColor, color: primaryColor }}>{r.roundName}</span>
                    <span className="text-xs text-gray-400">{r.date}</span>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{r.amount}</p>
                  {r.postMoneyValuation && <p className="text-xs text-gray-500">Post-money: {r.postMoneyValuation}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-6">No Cactus investment data found for this company.</p>
          )
        )}

      </div>
    );
  };

  // ── Tab: Cap Table ─────────────────────────────────────────────────────────
  const CapTableTab = () => (
    <div className="space-y-3">
      {company.capTable.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Investor', 'Category', 'Holding %', 'Investment', 'Shares'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {company.capTable.map((e, i) => (
                <tr key={i} className={`hover:bg-gray-50 ${e.investor.includes('Cactus') ? 'bg-green-50' : ''}`}>
                  <td className="px-3 py-2.5 font-medium text-gray-800">{e.investor}</td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{e.category}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-100 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full" style={{ width: `${Math.min(e.holdingPct * 2, 100)}%`, backgroundColor: primaryColor }} />
                      </div>
                      <span className="font-semibold text-gray-800">{e.holdingPct}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-gray-600">{e.investment}</td>
                  <td className="px-3 py-2.5 text-gray-500">{e.shares}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center py-8">No cap table data available.</p>
      )}
      {company.capTable.length > 0 && <RoundModeler company={company} primaryColor={primaryColor} />}
    </div>
  );

  // ── Tab: Patents ───────────────────────────────────────────────────────────
  const PatentsTab = () => (
    <div className="space-y-3">
      {company.patents.length > 0 ? company.patents.map((p, i) => (
        <div key={i} className="border border-gray-100 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Award className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: accentColor }} />
            <div>
              <p className="text-sm font-semibold text-gray-800 leading-snug">{p.title}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.status === 'Granted' ? 'bg-emerald-50 text-emerald-700' : p.status === 'Published' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{p.status}</span>
                <span className="text-xs text-gray-400">{p.filingLocation}</span>
                <span className="text-xs text-gray-400">Filed: {p.applicationDate}</span>
                {p.grantDate !== '—' && <span className="text-xs text-gray-400">Granted: {p.grantDate}</span>}
              </div>
            </div>
          </div>
        </div>
      )) : (
        <p className="text-sm text-gray-400 text-center py-8">No patents recorded.</p>
      )}
    </div>
  );

  // ── Tab: People ────────────────────────────────────────────────────────────
  const PeopleTab = () => {
    const [search, setSearch] = useState('');
    const [emailFilter, setEmailFilter] = useState<string>('all');
    const [countryFilter, setCountryFilter] = useState<string>('all');

    const team = company.teamMembers ?? [];

    const countries = useMemo(() => {
      const set = new Set(team.map(e => e.country).filter(Boolean));
      return Array.from(set).sort();
    }, [team]);

    const filtered = useMemo(() => {
      const q = search.toLowerCase();
      return team.filter(e => {
        if (emailFilter !== 'all' && e.emailStatus !== emailFilter) return false;
        if (countryFilter !== 'all' && e.country !== countryFilter) return false;
        if (q && !e.name.toLowerCase().includes(q) && !e.title.toLowerCase().includes(q)) return false;
        return true;
      });
    }, [team, search, emailFilter, countryFilter]);

    const statusColor = (s: string) => {
      if (s === 'verified') return 'bg-emerald-50 text-emerald-700';
      if (s === 'extrapolated') return 'bg-amber-50 text-amber-700';
      return 'bg-gray-100 text-gray-500';
    };

    return (
      <div className="space-y-4">
        {/* Key leadership */}
        {company.keyPeople.length > 0 && (
          <Section title="Leadership" icon={Users}>
            <div className="space-y-3">
              {company.keyPeople.map((p, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ backgroundColor: accentColor }}>
                    {p.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{p.name}</p>
                    <p className="text-xs font-medium mb-0.5" style={{ color: primaryColor }}>{p.title}</p>
                    <p className="text-xs text-gray-500 leading-relaxed">{p.background}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Team directory */}
        {team.length > 0 && (
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Team Directory</span>
              <span className="ml-auto text-xs text-gray-400">{filtered.length} / {team.length}</span>
            </div>

            {/* Filters */}
            <div className="p-3 border-b border-gray-100 space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search name or title…"
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={emailFilter}
                  onChange={e => setEmailFilter(e.target.value)}
                  className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-300"
                >
                  <option value="all">All email statuses</option>
                  <option value="verified">Verified</option>
                  <option value="extrapolated">Extrapolated</option>
                  <option value="unavailable">Unavailable</option>
                </select>
                <select
                  value={countryFilter}
                  onChange={e => setCountryFilter(e.target.value)}
                  className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-300"
                >
                  <option value="all">All countries</option>
                  {countries.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Results */}
            <div className="divide-y divide-gray-50 max-h-[420px] overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No results match filters.</p>
              ) : filtered.map(emp => (
                <div key={emp.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: primaryColor + 'CC' }}>
                    {emp.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-semibold text-gray-800">{emp.name}</p>
                      {emp.emailStatus && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColor(emp.emailStatus)}`}>
                          {emp.emailStatus}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 truncate">{emp.title}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {(emp.city || emp.country) && (
                        <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                          <MapPin className="w-2.5 h-2.5" />
                          {[emp.city, emp.country].filter(Boolean).join(', ')}
                        </span>
                      )}
                      {emp.email && (
                        <a href={`mailto:${emp.email}`} className="flex items-center gap-0.5 text-[10px] text-blue-500 hover:underline">
                          <Mail className="w-2.5 h-2.5" />
                          {emp.email}
                        </a>
                      )}
                      {emp.linkedInUrl && (
                        <a href={emp.linkedInUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:underline">
                          LinkedIn
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {team.length === 0 && company.keyPeople.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">No people data available.</p>
        )}
      </div>
    );
  };

  // ── Tab: Docs ──────────────────────────────────────────────────────────────
  const DocsTab = () => (
    <div className="space-y-4">
      {/* Upload */}
      {canAddNotes() && (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center">
          <Paperclip className="w-6 h-6 text-gray-300 mx-auto mb-2" />
          <p className="text-xs text-gray-400 mb-3">Upload PDFs, Word docs, spreadsheets, images (max 20 MB)</p>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt" />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 text-xs font-medium rounded-lg text-white flex items-center gap-1.5 mx-auto disabled:opacity-60"
            style={{ backgroundColor: primaryColor }}
          >
            <Upload className="w-3.5 h-3.5" />
            {uploading ? 'Uploading…' : 'Choose File'}
          </button>
        </div>
      )}

      {/* File list */}
      {files.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">No documents uploaded yet.</p>
      ) : (
        <div className="space-y-2">
          {files.map(f => (
            <div key={f.id} className="flex items-center gap-3 border border-gray-100 rounded-xl px-4 py-3 hover:bg-gray-50">
              <FileText className="w-8 h-8 text-gray-300 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">{f.original_name}</p>
                <p className="text-[10px] text-gray-400">
                  {fmtSize(f.file_size)} · {new Date(f.uploaded_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={fileDownloadUrl(f.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                  title="View / Download"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>
                {canAddNotes() && (
                  <button
                    onClick={() => handleDeleteFile(f.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ── Tab: Calendar ──────────────────────────────────────────────────────────
  const CalendarTab = () => (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <CalendarDays className="w-4 h-4" style={{ color: primaryColor }} />
        <p className="text-sm font-semibold text-gray-700">Compliance Deadlines — {company.name}</p>
      </div>
      <CompanyCalendar
        companyId={company.id}
        companyName={company.name}
        compact
      />
    </div>
  );

  // ── Tab: Gaps ──────────────────────────────────────────────────────────────
  const GAP_TYPES: CompanyGapType[] = ['Strategy', 'Organisation Design', 'International Expansion', 'Governance'];
  const GAP_TYPE_COLORS: Record<CompanyGapType, string> = {
    'Strategy':                'bg-blue-50 text-blue-700',
    'Organisation Design':     'bg-purple-50 text-purple-700',
    'International Expansion': 'bg-amber-50 text-amber-700',
    'Governance':              'bg-emerald-50 text-emerald-700',
  };

  const GapsTab = () => {
    // Use lifted state (gapShowForm, gapEditId, gapForm) so it survives store re-renders
    // Read gaps from live store so updates are immediately reflected
    const liveCompany = store.companies.find(c => c.id === company.id) ?? company;
    const gaps = liveCompany.companyGaps ?? [];

    const saveGap = () => {
      if (!gapForm.name.trim()) return;
      const updated = gapEditId
        ? gaps.map(g => g.id === gapEditId ? { ...gapForm, id: gapEditId } : g)
        : [...gaps, { ...gapForm, id: crypto.randomUUID() }];
      updateCompany({ ...liveCompany, companyGaps: updated });
      setGapShowForm(false);
      setGapEditId(null);
      setGapForm(gapBlank());
    };

    const deleteGap = (id: string) => {
      updateCompany({ ...liveCompany, companyGaps: gaps.filter(g => g.id !== id) });
    };

    const openEdit = (g: CompanyGap) => {
      setGapForm({ name: g.name, type: g.type, issue: g.issue, resolution: g.resolution, impact: g.impact, resolvedAt: g.resolvedAt });
      setGapEditId(g.id);
      setGapShowForm(true);
    };

    const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-0';
    const labelCls = 'block text-xs font-semibold text-gray-500 mb-1';

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">{gaps.length} gap{gaps.length !== 1 ? 's' : ''} recorded</p>
          <button
            onClick={() => { setGapForm(gapBlank()); setGapEditId(null); setGapShowForm(true); }}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white"
            style={{ backgroundColor: primaryColor }}
          >
            <span className="text-base leading-none">+</span> Add Gap
          </button>
        </div>

        {/* Add / Edit form */}
        {gapShowForm && (
          <div className="border rounded-xl p-4 space-y-3 bg-gray-50" style={{ borderColor: primaryColor + '40' }}>
            <p className="text-xs font-bold text-gray-700">{gapEditId ? 'Edit Gap' : 'New Gap'}</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Gap Name *</label>
                <input className={inputCls} placeholder="e.g. CFO Hire" value={gapForm.name} onChange={e => setGapForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Gap Type</label>
                <select className={inputCls} value={gapForm.type} onChange={e => setGapForm(f => ({ ...f, type: e.target.value as CompanyGapType }))}>
                  {GAP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls}>What was the issue?</label>
              <textarea rows={2} className={inputCls} placeholder="Describe the problem…" value={gapForm.issue} onChange={e => setGapForm(f => ({ ...f, issue: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>How was the problem solved?</label>
              <textarea rows={2} className={inputCls} placeholder="Steps taken to resolve…" value={gapForm.resolution} onChange={e => setGapForm(f => ({ ...f, resolution: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>What impact has it created?</label>
              <textarea rows={2} className={inputCls} placeholder="Outcome and measurable impact…" value={gapForm.impact} onChange={e => setGapForm(f => ({ ...f, impact: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Resolved Date (optional)</label>
              <input type="date" className={inputCls} value={gapForm.resolvedAt} onChange={e => setGapForm(f => ({ ...f, resolvedAt: e.target.value }))} />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setGapShowForm(false); setGapEditId(null); }} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100">Cancel</button>
              <button onClick={saveGap} className="text-xs px-4 py-1.5 rounded-lg text-white font-semibold" style={{ backgroundColor: primaryColor }}>{gapEditId ? 'Save Changes' : 'Add Gap'}</button>
            </div>
          </div>
        )}

        {/* Gaps table */}
        {gaps.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Gap Name', 'Type', 'Issue', 'How Solved', 'Impact', 'Resolved', ''].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {gaps.map(g => (
                  <tr key={g.id} className="hover:bg-gray-50 align-top">
                    <td className="px-3 py-2.5 font-semibold text-gray-800 whitespace-nowrap">{g.name}</td>
                    <td className="px-3 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${GAP_TYPE_COLORS[g.type]}`}>{g.type}</span>
                    </td>
                    <td className="px-3 py-2.5 text-gray-600 max-w-[140px]"><p className="line-clamp-2">{g.issue || '—'}</p></td>
                    <td className="px-3 py-2.5 text-gray-600 max-w-[140px]"><p className="line-clamp-2">{g.resolution || '—'}</p></td>
                    <td className="px-3 py-2.5 text-gray-600 max-w-[140px]"><p className="line-clamp-2">{g.impact || '—'}</p></td>
                    <td className="px-3 py-2.5 text-gray-400 whitespace-nowrap">{g.resolvedAt || '—'}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => openEdit(g)} className="text-gray-400 hover:text-gray-700 p-1 rounded"><GitBranch className="w-3 h-3" /></button>
                        <button onClick={() => deleteGap(g.id)} className="text-gray-300 hover:text-red-500 p-1 rounded"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          !gapShowForm && <p className="text-sm text-gray-400 text-center py-8">No gaps recorded. Click "Add Gap" to get started.</p>
        )}
      </div>
    );
  };

  const TAB_CONTENT: Record<DrawerTab, React.ReactNode> = {
    overview:   <OverviewTab />,
    financials: <FinancialsTab />,
    funding:    <FundingTab />,
    captable:   <CapTableTab />,
    patents:    <PatentsTab />,
    people:     <PeopleTab />,
    calendar:   <CalendarTab />,
    docs:       <DocsTab />,
    gaps:       <GapsTab />,
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white z-50 shadow-2xl flex flex-col overflow-hidden">

        {/* ── Company header (always visible, never scrolls away) ────────────── */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100 flex-shrink-0" style={{ backgroundColor: lightColor + '70' }}>
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-white border border-gray-200 flex items-center justify-center flex-shrink-0 shadow-sm">
              {company.logoUrl
                ? <img src={company.logoUrl} alt={company.name} className="w-10 h-10 object-contain" />
                : <Building2 className="w-6 h-6 text-gray-300" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-heading font-bold text-xl text-gray-900">{company.name}</h2>
                {company.tracxnTag && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: primaryColor, color: '#fff' }}>
                    {company.tracxnTag}
                  </span>
                )}
                {company.tracxnScore > 0 && <span className="text-xs text-gray-400">Score: {company.tracxnScore}</span>}
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <SectorPill sectorId={company.sectorId} size="sm" />
                <StatusBadge status={company.status} />
                <span className="text-xs text-gray-400">{company.stage}</span>
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 flex-wrap">
                {company.hqCity && <span>{company.hqCity}, {company.country}</span>}
                {company.foundedYear > 0 && <span>Est. {company.foundedYear}</span>}
                {company.websiteUrl && (
                  <a href={company.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-0.5 hover:text-gray-800">
                    <ExternalLink className="w-3 h-3" /> Website
                  </a>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-2 flex-shrink-0">
            <ExportMenu
              size="sm"
              label="Export"
              options={[
                { label: 'Company Report — PDF',   format: 'pdf',   onExport: () => exportCompanyPDF(company, store)   },
                { label: 'Company Report — Excel', format: 'excel', onExport: () => exportCompanyExcel(company, store) },
              ]}
            />
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Tab bar (sticky, never scrolls away) ──────────────────────────── */}
        <div className="flex border-b border-gray-100 overflow-x-auto flex-shrink-0 bg-white">
          {TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === key ? '' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
              style={activeTab === key ? { borderBottomColor: primaryColor, backgroundColor: primaryColor + '10', color: primaryColor } : {}}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* ── Single scrollable column: tab content only (charts inside Overview) ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5">
            {TAB_CONTENT[activeTab]}
          </div>
        </div>

      </div>
    </>
  );
}
