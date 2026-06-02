import { useState, useEffect, useMemo, useRef } from 'react';
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
import type { PortfolioCompany } from '../../data/types';
import SectorPill from '../../components/ui/SectorPill';
import StatusBadge from '../../components/ui/StatusBadge';
import AvatarChip from '../../components/ui/AvatarChip';
import ExportMenu from '../../components/ui/ExportMenu';
import { exportCompanyPDF, exportCompanyExcel } from '../../lib/export';

interface Props {
  company: PortfolioCompany | null;
  onClose: () => void;
}

type DrawerTab = 'overview' | 'financials' | 'funding' | 'captable' | 'patents' | 'people' | 'calendar' | 'docs';

const TABS: { key: DrawerTab; label: string; Icon: React.ElementType }[] = [
  { key: 'overview',   label: 'Overview',   Icon: Building2 },
  { key: 'financials', label: 'Financials', Icon: BarChart2 },
  { key: 'funding',    label: 'Funding',    Icon: TrendingUp },
  { key: 'captable',   label: 'Cap Table',  Icon: Layers },
  { key: 'patents',    label: 'Patents',    Icon: FileText },
  { key: 'people',     label: 'People',     Icon: Users },
  { key: 'calendar',   label: 'Calendar',   Icon: CalendarDays },
  { key: 'docs',       label: 'Docs',       Icon: Paperclip },
];

// ─── Chart helpers ────────────────────────────────────────────────────────────

function parseCr(val: string): number {
  if (!val || val === '—') return 0;
  const stripped = val.replace(/\(.*?\)/g, '').trim();
  const clean = stripped.replace(/[₹,\s]/g, '');
  const neg = clean.startsWith('-');
  const abs = clean.replace(/^-/, '');
  if (abs.includes('Cr')) return (neg ? -1 : 1) * (parseFloat(abs) || 0);
  if (abs.includes('L')) return (neg ? -1 : 1) * ((parseFloat(abs) || 0) / 100);
  return parseFloat(clean) || 0;
}

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
  const { store, canAddNotes } = useApp();
  const [activeTab, setActiveTab] = useState<DrawerTab>('overview');
  const [notes, setNotes] = useState('');
  const [notesDirty, setNotesDirty] = useState(false);
  const [notesSaving, setNotesSaving] = useState(false);
  const [files, setFiles] = useState<CompanyFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!company) return;
    setNotesDirty(false);
    setActiveTab('overview');
    // Load notes and files from backend
    fetchNote(company.id).then(setNotes);
    fetchFiles(company.id).then(setFiles);
  }, [company?.id]);

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
  const FinancialsTab = () => (
    <div className="space-y-4">
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
    </div>
  );

  // ── Tab: Funding ───────────────────────────────────────────────────────────
  const FundingTab = () => (
    <div className="space-y-3">
      {company.fundingRounds.length > 0 ? company.fundingRounds.map((r, i) => (
        <div key={i} className="border border-gray-100 rounded-xl p-4 hover:bg-gray-50">
          <div className="flex items-start gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: lightColor, color: primaryColor }}>{r.roundName}</span>
                <span className="text-xs text-gray-400">{r.date}</span>
              </div>
              <p className="text-lg font-heading font-bold text-gray-900">{r.amount}</p>
              {r.postMoneyValuation && r.postMoneyValuation !== '—' && (
                <p className="text-xs text-gray-500 mt-0.5">Post-money: {r.postMoneyValuation}</p>
              )}
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xs text-gray-400 mb-1.5">Lead Investors</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {r.leadInvestors.map(inv => (
                <span key={inv} className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ backgroundColor: lightColor, color: primaryColor }}>{inv}</span>
              ))}
            </div>
            {r.allInvestors.length > r.leadInvestors.length && (
              <>
                <p className="text-xs text-gray-400 mb-1.5">All Investors</p>
                <div className="flex flex-wrap gap-1.5">
                  {r.allInvestors.map(inv => (
                    <span key={inv} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{inv}</span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )) : (
        <p className="text-sm text-gray-400 text-center py-8">No funding rounds recorded.</p>
      )}
    </div>
  );

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

  const TAB_CONTENT: Record<DrawerTab, React.ReactNode> = {
    overview:   <OverviewTab />,
    financials: <FinancialsTab />,
    funding:    <FundingTab />,
    captable:   <CapTableTab />,
    patents:    <PatentsTab />,
    people:     <PeopleTab />,
    calendar:   <CalendarTab />,
    docs:       <DocsTab />,
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
