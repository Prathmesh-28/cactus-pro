import { useState, useMemo } from 'react';
import {
  ChevronDown, ChevronUp, ChevronRight, Building2,
  TrendingUp, TrendingDown, Minus, Users, BarChart2,
  FileText, Layers, Award, ChevronsUpDown,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { PortfolioCompany } from '../../data/types';
import SectorPill from '../../components/ui/SectorPill';
import StatusBadge from '../../components/ui/StatusBadge';

interface Props {
  companies: PortfolioCompany[];
  onSelectCompany: (c: PortfolioCompany) => void;
}

function Chip({ label, value, positive }: { label: string; value: string | number; positive?: boolean | null }) {
  const color =
    positive === true ? 'text-emerald-700 bg-emerald-50 border-emerald-100' :
    positive === false ? 'text-red-600 bg-red-50 border-red-100' :
    'text-gray-600 bg-gray-50 border-gray-100';
  return (
    <div className={`flex flex-col items-center px-3 py-2 rounded-lg border text-center min-w-[80px] ${color}`}>
      <span className="text-[10px] font-medium opacity-70 uppercase tracking-wide leading-tight">{label}</span>
      <span className="text-sm font-bold leading-tight mt-0.5">{value}</span>
    </div>
  );
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
      <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

export default function OperationalMetrics({ companies, onSelectCompany }: Props) {
  const { store } = useApp();
  const { firm } = store;
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [allExpanded, setAllExpanded] = useState(false);

  const maxRevenue = useMemo(() => {
    const vals = companies.map(c => {
      const n = parseFloat(c.revenue.replace(/[^0-9.]/g, ''));
      return isNaN(n) ? 0 : n;
    });
    return Math.max(...vals, 1);
  }, [companies]);

  const maxEmployees = useMemo(() => Math.max(...companies.map(c => c.employees), 1), [companies]);

  const toggle = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedIds(new Set(companies.map(c => c.id)));
    setAllExpanded(true);
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
    setAllExpanded(false);
  };

  const isExpanded = (id: string) => expandedIds.has(id);

  const getLatestFinancials = (c: PortfolioCompany) => c.financialHistory[0] ?? null;

  const moicColor = (moic: number) => moic >= 3 ? 'text-emerald-600' : moic >= 2 ? 'text-blue-600' : 'text-gray-500';
  const irrColor = (irr: number) => irr >= 30 ? 'text-emerald-600' : irr >= 20 ? 'text-blue-600' : 'text-gray-500';

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: firm.primaryColor }}>
            <BarChart2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-gray-900 text-base">Operational Metrics</h2>
            <p className="text-xs text-gray-400">Per-company financial & operational deep-dive · {companies.length} companies</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={allExpanded ? collapseAll : expandAll}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors hover:bg-gray-100"
            style={{ borderColor: firm.primaryColor + '40', color: firm.primaryColor }}
          >
            <ChevronsUpDown className="w-3.5 h-3.5" />
            {allExpanded ? 'Collapse All' : 'Expand All'}
          </button>
        </div>
      </div>

      {/* Column headers */}
      <div className="hidden lg:grid grid-cols-[2fr_1.2fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr_40px] gap-0 bg-gray-50 border-b border-gray-100 px-5 py-2.5">
        {['Company', 'Sector / Stage', 'Investment', 'Valuation', 'MOIC', 'IRR', 'Revenue', 'Employees', ''].map((h, i) => (
          <div key={i} className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</div>
        ))}
      </div>

      {/* Rows */}
      <div className="divide-y divide-gray-100">
        {companies.map((c) => {
          const expanded = isExpanded(c.id);
          const latest = getLatestFinancials(c);
          const revenueNum = parseFloat(c.revenue.replace(/[^0-9.]/g, ''));

          return (
            <div key={c.id} className={`transition-colors ${expanded ? 'bg-gray-50/60' : 'hover:bg-gray-50/40'}`}>
              {/* Main row */}
              <div
                className="grid grid-cols-1 lg:grid-cols-[2fr_1.2fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr_40px] gap-3 lg:gap-0 items-center px-5 py-3.5 cursor-pointer"
                onClick={() => toggle(c.id)}
              >
                {/* Company */}
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl border flex-shrink-0 flex items-center justify-center ${expanded ? 'border-gray-300 bg-white shadow-sm' : 'border-gray-100 bg-gray-50'}`}>
                    {c.logoUrl
                      ? <img src={c.logoUrl} alt={c.name} className="w-7 h-7 object-contain" />
                      : <Building2 className="w-4 h-4 text-gray-300" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`font-semibold text-sm text-gray-900 ${c.status === 'Exited' ? 'line-through opacity-60' : ''}`}>{c.name}</span>
                      {c.tracxnTag && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ backgroundColor: firm.lightColor, color: firm.primaryColor }}>{c.tracxnTag}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 truncate">{c.ceoName}</p>
                  </div>
                </div>

                {/* Sector / Stage */}
                <div className="flex flex-wrap items-center gap-1.5 lg:pr-2">
                  <SectorPill sectorId={c.sectorId} size="sm" />
                  <StatusBadge status={c.status} />
                  <span className="text-xs text-gray-400 hidden xl:inline">{c.stage}</span>
                </div>

                {/* Investment */}
                <div className="lg:pr-2">
                  <p className="text-sm font-semibold text-gray-800">{c.cactusInvestment}</p>
                  <p className="text-xs text-gray-400">{c.ownershipPct}% stake</p>
                </div>

                {/* Valuation */}
                <div className="lg:pr-2">
                  <p className="text-sm font-medium text-gray-700">{c.currentValuation}</p>
                </div>

                {/* MOIC */}
                <div>
                  <span className={`text-sm font-bold ${moicColor(c.moic)}`}>{c.moic}x</span>
                </div>

                {/* IRR */}
                <div>
                  <div className="flex items-center gap-1">
                    {c.irr >= 25
                      ? <TrendingUp className="w-3 h-3 text-emerald-500" />
                      : c.irr < 15
                      ? <TrendingDown className="w-3 h-3 text-red-400" />
                      : <Minus className="w-3 h-3 text-gray-400" />}
                    <span className={`text-sm font-bold ${irrColor(c.irr)}`}>{c.irr}%</span>
                  </div>
                </div>

                {/* Revenue */}
                <div>
                  <p className="text-sm font-medium text-gray-700">{c.revenue}</p>
                  {!isNaN(revenueNum) && revenueNum > 0 && (
                    <MiniBar value={revenueNum} max={maxRevenue} color={firm.accentColor} />
                  )}
                </div>

                {/* Employees */}
                <div>
                  <p className="text-sm text-gray-700">{c.employees > 0 ? c.employees.toLocaleString() : '—'}</p>
                  {c.employees > 0 && (
                    <MiniBar value={c.employees} max={maxEmployees} color={firm.primaryColor} />
                  )}
                </div>

                {/* Expand toggle */}
                <div className="flex justify-end">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${expanded ? 'text-white' : 'text-gray-400 hover:text-gray-600'}`}
                    style={expanded ? { backgroundColor: firm.primaryColor } : {}}>
                    {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </div>
                </div>
              </div>

              {/* ── Expanded detail panel ─────────────────────────────────────── */}
              {expanded && (
                <div className="px-5 pb-5 space-y-5 border-t border-dashed border-gray-200 pt-4 ml-0">

                  {/* Quick chips row */}
                  <div className="flex flex-wrap gap-2">
                    <Chip label="MOIC" value={`${c.moic}x`} positive={c.moic >= 2} />
                    <Chip label="IRR" value={`${c.irr}%`} positive={c.irr >= 25} />
                    <Chip label="Ownership" value={`${c.ownershipPct}%`} />
                    <Chip label="Employees" value={c.employees > 0 ? c.employees : '—'} />
                    <Chip label="Revenue CAGR 1yr" value={c.revenueGrowthCagr1yr || '—'} positive={c.revenueGrowthCagr1yr ? true : null} />
                    <Chip label="Revenue CAGR 3yr" value={c.revenueGrowthCagr3yr || '—'} positive={c.revenueGrowthCagr3yr && c.revenueGrowthCagr3yr !== '—' ? true : null} />
                    {c.tracxnScore > 0 && <Chip label="Tracxn Score" value={c.tracxnScore} />}
                    <Chip label="Total Funding" value={c.totalFunding} />
                    {c.patents.length > 0 && <Chip label="Patents" value={c.patents.length} positive={true} />}
                    {c.fundingRounds.length > 0 && <Chip label="Rounds" value={c.fundingRounds.length} />}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                    {/* Financials history */}
                    {latest && (
                      <div className="md:col-span-2">
                        <div className="flex items-center gap-1.5 mb-2">
                          <BarChart2 className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Latest Financials ({latest.year})</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            { label: 'Revenue', value: latest.revenue, pos: true },
                            { label: 'Net Profit', value: latest.netProfit, pos: !latest.netProfit.startsWith('-') },
                            { label: 'EBITDA', value: latest.ebitda, pos: !latest.ebitda.startsWith('-') },
                            { label: 'EBITDA Margin', value: latest.ebitdaMargin, pos: !latest.ebitdaMargin.startsWith('-') },
                            { label: 'Total Assets', value: latest.totalAssets, pos: null },
                            { label: 'Total Debt', value: latest.totalDebt, pos: null },
                          ].map(m => (
                            <div key={m.label} className="bg-white border border-gray-100 rounded-lg p-2.5">
                              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">{m.label}</p>
                              <p className={`text-sm font-bold mt-0.5 ${m.pos === true ? 'text-emerald-700' : m.pos === false ? 'text-red-500' : 'text-gray-800'}`}>{m.value}</p>
                            </div>
                          ))}
                        </div>

                        {/* Historical trend mini-table */}
                        {c.financialHistory.length > 1 && (
                          <div className="mt-3 overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-gray-100">
                                  {['Year', 'Revenue', 'Net Profit', 'EBITDA Margin'].map(h => (
                                    <th key={h} className="pb-1.5 text-left text-[10px] text-gray-400 font-semibold uppercase tracking-wide pr-4">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50">
                                {c.financialHistory.map((row, i) => (
                                  <tr key={i}>
                                    <td className="py-1.5 pr-4 font-semibold text-gray-700">{row.year}</td>
                                    <td className="py-1.5 pr-4 text-emerald-700 font-medium">{row.revenue}</td>
                                    <td className={`py-1.5 pr-4 font-medium ${row.netProfit.startsWith('-') ? 'text-red-500' : 'text-emerald-600'}`}>{row.netProfit}</td>
                                    <td className={`py-1.5 ${row.ebitdaMargin.startsWith('-') ? 'text-red-400' : 'text-gray-600'}`}>{row.ebitdaMargin}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Right column: funding + people + patents summary */}
                    <div className="space-y-3">

                      {/* Latest funding round */}
                      {c.fundingRounds.length > 0 && (
                        <div>
                          <div className="flex items-center gap-1.5 mb-2">
                            <TrendingUp className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Latest Round</span>
                          </div>
                          <div className="bg-white border border-gray-100 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: firm.lightColor, color: firm.primaryColor }}>{c.fundingRounds[0].roundName}</span>
                              <span className="text-[10px] text-gray-400">{c.fundingRounds[0].date}</span>
                            </div>
                            <p className="text-base font-heading font-bold text-gray-900">{c.fundingRounds[0].amount}</p>
                            {c.fundingRounds[0].postMoneyValuation && c.fundingRounds[0].postMoneyValuation !== '—' && (
                              <p className="text-xs text-gray-400 mt-0.5">Post-money: {c.fundingRounds[0].postMoneyValuation}</p>
                            )}
                            <div className="mt-2 flex flex-wrap gap-1">
                              {c.fundingRounds[0].leadInvestors.map(inv => (
                                <span key={inv} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{inv}</span>
                              ))}
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1.5">{c.fundingRounds.length} total rounds · {c.totalFunding} raised</p>
                          </div>
                        </div>
                      )}

                      {/* Cap table snapshot */}
                      {c.capTable.length > 0 && (
                        <div>
                          <div className="flex items-center gap-1.5 mb-2">
                            <Layers className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cap Table Snapshot</span>
                          </div>
                          <div className="bg-white border border-gray-100 rounded-lg p-3 space-y-1.5">
                            {c.capTable.slice(0, 4).map((e, i) => (
                              <div key={i} className="flex items-center justify-between gap-2">
                                <span className={`text-xs truncate ${e.investor.includes('Cactus') ? 'font-semibold' : 'text-gray-600'}`} style={e.investor.includes('Cactus') ? { color: firm.primaryColor } : {}}>
                                  {e.investor.includes('Cactus') ? '★ ' : ''}{e.investor}
                                </span>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <div className="w-12 bg-gray-100 rounded-full h-1">
                                    <div className="h-1 rounded-full" style={{ width: `${Math.min(e.holdingPct * 2, 100)}%`, backgroundColor: e.investor.includes('Cactus') ? firm.primaryColor : firm.accentColor }} />
                                  </div>
                                  <span className="text-xs font-bold text-gray-700 w-8 text-right">{e.holdingPct}%</span>
                                </div>
                              </div>
                            ))}
                            {c.capTable.length > 4 && (
                              <p className="text-[10px] text-gray-400 pt-1">+{c.capTable.length - 4} more investors</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Key people + patents row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    {/* Key people */}
                    {c.keyPeople.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <Users className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Key People</span>
                        </div>
                        <div className="space-y-2">
                          {c.keyPeople.slice(0, 3).map((p, i) => (
                            <div key={i} className="flex items-start gap-2.5 bg-white border border-gray-100 rounded-lg p-2.5">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0" style={{ backgroundColor: firm.accentColor }}>
                                {p.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-gray-800">{p.name}</p>
                                <p className="text-[10px] font-medium" style={{ color: firm.primaryColor }}>{p.title}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-2">{p.background}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Patents + coverage */}
                    <div className="space-y-3">
                      {c.patents.length > 0 && (
                        <div>
                          <div className="flex items-center gap-1.5 mb-2">
                            <Award className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Patents ({c.patents.length})</span>
                          </div>
                          <div className="space-y-1.5">
                            {c.patents.slice(0, 3).map((p, i) => (
                              <div key={i} className="flex items-start gap-2 bg-white border border-gray-100 rounded-lg px-2.5 py-2">
                                <span className={`mt-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${p.status === 'Granted' ? 'bg-emerald-50 text-emerald-700' : p.status === 'Published' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>{p.status}</span>
                                <p className="text-[10px] text-gray-600 leading-snug line-clamp-2">{p.title}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {c.coverageAreas.length > 0 && (
                        <div>
                          <div className="flex items-center gap-1.5 mb-2">
                            <FileText className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Coverage</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {c.coverageAreas.slice(0, 5).map(a => (
                              <span key={a} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{a}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* IPO plans if present */}
                  {c.ipoPlans && (
                    <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 flex items-start gap-2">
                      <TrendingUp className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-amber-800">IPO Plans</p>
                        <p className="text-xs text-amber-700 mt-0.5">{c.ipoPlans}</p>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); onSelectCompany(c); }}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg text-white shadow-sm"
                      style={{ backgroundColor: firm.primaryColor }}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      Full Profile
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggle(c.id); }}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                      Collapse
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {companies.length === 0 && (
        <div className="py-16 text-center text-gray-400">
          <Building2 className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No companies match your filters.</p>
        </div>
      )}
    </div>
  );
}
