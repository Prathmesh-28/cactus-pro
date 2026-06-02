import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import MetricCard from '../finance/MetricCard';
import SectorPill from '../../components/ui/SectorPill';
import StatusBadge from '../../components/ui/StatusBadge';
import CompanyDrawer from './CompanyDrawer';
import OperationalMetrics from '../finance/OperationalMetrics';
import CompanyCalendar from '../../components/ui/CompanyCalendar';
import AccessRestricted from '../../components/layout/AccessRestricted';
import {
  Building2, Search, Download, TrendingUp, TrendingDown, Minus,
  ChevronUp, ChevronDown, BarChart2, Layers, LayoutList, CalendarDays,
} from 'lucide-react';
import { exportToCSV } from '../../lib/utils';
import type { PortfolioCompany } from '../../data/types';

type SortKey = keyof Pick<PortfolioCompany, 'name' | 'stage' | 'cactusInvestment' | 'currentValuation' | 'moic' | 'irr' | 'status'>;
type SortDir = 'asc' | 'desc';
type ViewMode = 'table' | 'operational';

export default function PortfolioPage() {
  const { store, canAccess, canExport } = useApp();
  const [selectedCompany, setSelectedCompany] = useState<PortfolioCompany | null>(null);
  const [search, setSearch] = useState('');
  const [activeSector, setActiveSector] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  if (!canAccess('portfolio')) return <AccessRestricted tab="portfolio" />;

  const { firm, fundMetrics, companies, sectors } = store;

  const visibleMetrics = fundMetrics.filter((m) => m.visible);

  const filteredCompanies = useMemo(() => {
    let list = companies;
    if (activeSector !== 'all') list = list.filter((c) => c.sectorId === activeSector);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.ceoName.toLowerCase().includes(q) ||
          sectors.find((s) => s.id === c.sectorId)?.name.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      let av: string | number = a[sortKey] as string | number;
      let bv: string | number = b[sortKey] as string | number;
      if (typeof av === 'string' && typeof bv === 'string') {
        av = av.toLowerCase(); bv = bv.toLowerCase();
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [companies, activeSector, search, sortKey, sortDir, sectors]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k
      ? sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
      : <div className="w-3 h-3" />;

  const handleExport = () => {
    if (!canExport()) return;
    exportToCSV(
      filteredCompanies.map((c) => ({
        Name: c.name,
        Sector: sectors.find((s) => s.id === c.sectorId)?.name ?? '',
        Stage: c.stage,
        Status: c.status,
        'Cactus Investment': c.cactusInvestment,
        'Current Valuation': c.currentValuation,
        MOIC: c.moic,
        'IRR %': c.irr,
        Revenue: c.revenue,
        EBITDA: c.ebitda,
        Employees: c.employees,
        CEO: c.ceoName,
        HQ: c.hqCity,
        'Total Funding': c.totalFunding,
        'Ownership %': c.ownershipPct,
        'Tracxn Score': c.tracxnScore,
        'IPO Plans': c.ipoPlans,
        'Revenue CAGR 1yr': c.revenueGrowthCagr1yr,
        Patents: c.patents.length,
      })),
      'cactus-portfolio'
    );
  };

  return (
    <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-8 space-y-8">

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 1 — PORTFOLIO KEY METRICS
          ══════════════════════════════════════════════════════════════════════ */}
      <section>
        {/* Section header */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: firm.primaryColor }}>
            <Layers className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-gray-900 text-base leading-tight">Portfolio Key Metrics</h2>
            <p className="text-xs text-gray-400">Fund-level summary — {visibleMetrics.length} active metrics</p>
          </div>
        </div>

        {/* Metric cards grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {visibleMetrics.map((m) => (
            <MetricCard key={m.id} metric={m} />
          ))}
        </div>

        {/* Summary row below cards */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: 'Active Portfolio',
              value: companies.filter(c => c.status === 'Active').length,
              sub: `${companies.filter(c => c.status === 'Watch').length} on Watch`,
              color: firm.primaryColor,
            },
            {
              label: 'Total Invested (Cactus)',
              value: '₹285 Cr+',
              sub: 'Across all rounds',
              color: firm.accentColor,
            },
            {
              label: 'Successful Exits',
              value: companies.filter(c => c.status === 'Exited').length,
              sub: `Rubix — ${companies.find(c => c.status === 'Exited')?.moic ?? 0}x MOIC`,
              color: '#059669',
            },
            {
              label: 'Total Patents Filed',
              value: companies.reduce((sum, c) => sum + c.patents.length, 0),
              sub: `${companies.reduce((sum, c) => sum + c.patents.filter(p => p.status === 'Granted').length, 0)} Granted`,
              color: '#7C3AED',
            },
          ].map((item) => (
            <div key={item.label} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
              <p className="text-xs text-gray-500 mb-1">{item.label}</p>
              <p className="text-2xl font-heading font-bold" style={{ color: item.color }}>{item.value}</p>
              <p className="text-xs text-gray-400 mt-1">{item.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          FILTERS + VIEW TOGGLE
          ══════════════════════════════════════════════════════════════════════ */}
      <section className="space-y-3">
        {/* Sector filter bar */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveSector('all')}
            className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
            style={activeSector === 'all'
              ? { backgroundColor: firm.primaryColor, color: '#fff' }
              : { backgroundColor: '#F3F4F6', color: '#374151' }}
          >
            All
          </button>
          {sectors.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSector(s.id)}
              className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors border"
              style={activeSector === s.id
                ? { backgroundColor: s.color, color: '#fff', borderColor: s.color }
                : { backgroundColor: s.color + '15', color: s.color, borderColor: s.color + '30' }}
            >
              {s.name}
            </button>
          ))}
        </div>

        {/* Search + view toggle + export */}
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search companies, CEO, sector..."
              className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 w-64"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === 'table' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <LayoutList className="w-3.5 h-3.5" />
                Table
              </button>
              <button
                onClick={() => setViewMode('operational')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === 'operational' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                Operational
              </button>
            </div>

            {canExport() && (
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 2A — PORTFOLIO TABLE VIEW (default)
          ══════════════════════════════════════════════════════════════════════ */}
      {viewMode === 'table' && (
        <section>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: firm.accentColor }}>
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-gray-900 text-base leading-tight">Portfolio Companies</h2>
              <p className="text-xs text-gray-400">
                {filteredCompanies.length} of {companies.length} companies · Double-click row for full profile
              </p>
            </div>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {([
                    ['name', 'Company'],
                    ['sectorId', 'Sector'],
                    ['stage', 'Stage'],
                    ['cactusInvestment', 'Investment'],
                    ['currentValuation', 'Valuation'],
                    ['moic', 'MOIC'],
                    ['irr', 'IRR'],
                    ['status', 'Status'],
                  ] as [SortKey | 'sectorId', string][]).map(([key, label]) => (
                    <th
                      key={key}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-800 select-none"
                      onClick={() => key !== 'sectorId' && handleSort(key as SortKey)}
                    >
                      <div className="flex items-center gap-1">
                        {label}
                        {key !== 'sectorId' && <SortIcon k={key as SortKey} />}
                      </div>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCompanies.map((c) => (
                  <tr
                    key={c.id}
                    onDoubleClick={() => setSelectedCompany(c)}
                    className={`hover:bg-green-50/60 cursor-pointer transition-colors group ${c.status === 'Exited' ? 'opacity-55' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg border border-gray-100 bg-gray-50 flex items-center justify-center flex-shrink-0 group-hover:border-gray-200 transition-colors">
                          {c.logoUrl
                            ? <img src={c.logoUrl} alt={c.name} className="w-6 h-6 object-contain" />
                            : <Building2 className="w-4 h-4 text-gray-300" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className={`font-semibold text-gray-900 ${c.status === 'Exited' ? 'line-through' : ''}`}>{c.name}</p>
                            {c.tracxnTag && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ backgroundColor: firm.lightColor, color: firm.primaryColor }}>{c.tracxnTag}</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400">{c.hqCity} · {c.foundedYear > 0 ? `Est. ${c.foundedYear}` : ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><SectorPill sectorId={c.sectorId} size="sm" /></td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{c.stage}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-800">{c.cactusInvestment}</p>
                      <p className="text-xs text-gray-400">{c.ownershipPct}%</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{c.currentValuation}</td>
                    <td className="px-4 py-3">
                      <span className={`font-bold text-sm ${c.moic >= 3 ? 'text-emerald-600' : c.moic >= 2 ? 'text-blue-600' : 'text-gray-500'}`}>{c.moic}x</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {c.irr >= 25
                          ? <TrendingUp className="w-3 h-3 text-emerald-500" />
                          : c.irr < 15
                          ? <TrendingDown className="w-3 h-3 text-red-400" />
                          : <Minus className="w-3 h-3 text-gray-400" />}
                        <span className={`font-semibold text-sm ${c.irr >= 25 ? 'text-emerald-600' : 'text-gray-600'}`}>{c.irr}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedCompany(c)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-600 transition-colors"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredCompanies.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-14 text-center text-gray-400">
                      <Building2 className="w-7 h-7 mx-auto mb-2 opacity-30" />
                      No companies match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filteredCompanies.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedCompany(c)}
                className={`bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow ${c.status === 'Exited' ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-center flex-shrink-0">
                    {c.logoUrl
                      ? <img src={c.logoUrl} alt={c.name} className="w-8 h-8 object-contain" />
                      : <Building2 className="w-5 h-5 text-gray-300" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-bold text-gray-900 ${c.status === 'Exited' ? 'line-through' : ''}`}>{c.name}</span>
                      <StatusBadge status={c.status} />
                      {c.tracxnTag && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ backgroundColor: firm.lightColor, color: firm.primaryColor }}>{c.tracxnTag}</span>
                      )}
                    </div>
                    <div className="flex gap-2 mt-1">
                      <SectorPill sectorId={c.sectorId} size="sm" />
                      <span className="text-xs text-gray-400">{c.stage}</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 mt-3">
                  {[
                    { label: 'Investment', value: c.cactusInvestment },
                    { label: 'MOIC', value: `${c.moic}x` },
                    { label: 'IRR', value: `${c.irr}%` },
                    { label: 'Revenue', value: c.revenue },
                  ].map((m) => (
                    <div key={m.label} className="text-center bg-gray-50 rounded-lg p-2">
                      <p className="text-[10px] text-gray-400">{m.label}</p>
                      <p className="text-xs font-bold text-gray-800">{m.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 2B — OPERATIONAL METRICS VIEW
          ══════════════════════════════════════════════════════════════════════ */}
      {viewMode === 'operational' && (
        <section>
          <OperationalMetrics
            companies={filteredCompanies}
            onSelectCompany={setSelectedCompany}
          />
        </section>
      )}

      {/* Company Detail Drawer */}
      <CompanyDrawer company={selectedCompany} onClose={() => setSelectedCompany(null)} />

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 3 — PORTFOLIO COMPLIANCE CALENDAR (all companies)
          ══════════════════════════════════════════════════════════════════════ */}
      <section className="mt-10 border-t border-gray-100 pt-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-green-50">
            <CalendarDays className="w-5 h-5 text-green-700" />
          </div>
          <div>
            <h2 className="font-heading text-lg font-bold text-gray-900">Portfolio Compliance Calendar</h2>
            <p className="text-xs text-gray-500">All deadlines across portfolio companies — click a company to open its individual calendar</p>
          </div>
        </div>
        <CompanyCalendar
          allCompanies={store.companies.map(c => ({ id: c.id, name: c.name }))}
        />
      </section>
    </main>
  );
}
