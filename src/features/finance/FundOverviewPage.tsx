import { FundMetricsRows } from './components/fund-metrics-rows';
import { PerformanceTable } from './components/performance-table';
import { useFund } from './lib/fund-context';
import { useApp } from '../../context/AppContext';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

// Portfolio snapshot data comes from Admin → Portfolio Snapshot

function fmtCr(n: number | null): string {
  if (n === null || n === undefined) return '—';
  return `₹${(n / 1e7).toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`;
}

function CompanyAvatar({ name, logoUrl }: { name: string; logoUrl: string }) {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  if (logoUrl) {
    return <img src={logoUrl} alt={name} className="w-8 h-8 object-contain" />;
  }
  return (
    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
      style={{ background: 'linear-gradient(135deg,#3B6D11,#5A9E1B)' }}>
      {initials}
    </div>
  );
}

export default function FundOverviewPage() {
  const { fund, setFund } = useFund();
  const { store } = useApp();

  const snapshotData = store.portfolioSnapshot ?? [];
  const snapshot = snapshotData.map(row => ({
    company: store.companies.find(c => c.id === row.companyId),
    csv: row,
  })).filter((x): x is { company: NonNullable<typeof x.company>; csv: typeof x.csv } => x.company !== undefined);

  return (
    <div className="flex flex-col min-h-full" style={{ background: 'var(--background)' }}>
      {/* Header */}
      <div className="border-b px-6 md:px-10 py-6 flex items-start justify-between"
        style={{ borderColor: 'var(--border)', backgroundColor: 'rgba(255,255,255,0.5)' }}>
        <div>
          <h1 className="text-2xl md:text-3xl font-serif uppercase tracking-wide" style={{ color: 'var(--foreground)' }}>
            Fund Overview
          </h1>
          <p className="text-xs italic mt-1" style={{ color: 'var(--muted-foreground)' }}>
            Last updated: {new Date().toLocaleDateString('en-IN')} · Click any value to edit · Amounts in INR Cr
          </p>
        </div>
        {/* Fund selector */}
        <div className="inline-flex items-center rounded-md border p-0.5"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}>
          {(store.financeConfig?.funds ?? [{ key: 'fund_1', label: 'Fund 1' }, { key: 'fund_2', label: 'Fund 2' }]).map(f => (
            <button key={f.key} onClick={() => setFund(f.key as 'fund_1' | 'fund_2')}
              className="px-3 py-1.5 text-xs font-medium rounded transition-colors"
              style={fund === f.key
                ? { backgroundColor: '#3B6D11', color: '#fff' }
                : { color: '#3B6D11', backgroundColor: 'transparent' }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-6 md:px-10 py-8 space-y-10 flex-1">
        <FundMetricsRows />

        {/* Portfolio Snapshot — from CSV */}
        <section className="space-y-3">
          <div className="flex items-baseline gap-2">
            <p className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: 'var(--muted-foreground)' }}>
              Portfolio Snapshot
            </p>
            <span className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>(Amounts in INR Cr)</span>
          </div>

          <div className="rounded-lg border overflow-hidden shadow-[var(--shadow-card)]"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]">
                <thead className="border-b text-[11px] font-semibold uppercase tracking-wider"
                  style={{ borderColor: 'var(--border)', backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}>
                  <tr>
                    <th className="px-4 py-3 text-left">Portfolio Company</th>
                    <th className="px-4 py-3 text-left">Date of First Investment</th>
                    <th className="px-4 py-3 text-right">Current Stake</th>
                    <th className="px-4 py-3 text-right">Current Equity Value</th>
                    <th className="px-4 py-3 text-right">Value of Investment</th>
                    <th className="px-4 py-3 text-right">MOIC (x)</th>
                    <th className="px-4 py-3 text-right">IRR (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                  {snapshot.map(({ company, csv }, i) => (
                    <tr key={company.id}
                      className="transition-colors hover:bg-[var(--muted)]"
                      style={{ backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(212,237,170,0.15)' }}>

                      {/* Company */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 overflow-hidden"
                            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--muted)' }}>
                            <CompanyAvatar name={company.name} logoUrl={company.logoUrl} />
                          </div>
                          <div>
                            <p className="font-semibold text-sm leading-tight" style={{ color: 'var(--foreground)' }}>
                              {company.name}
                            </p>
                            <p className="text-[11px] mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                              {company.stage}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-sm tabular-nums" style={{ color: 'var(--foreground)' }}>
                        {csv.dateOfFirstInvestment}
                      </td>

                      {/* Current Stake */}
                      <td className="px-4 py-3 text-right font-medium tabular-nums" style={{ color: 'var(--foreground)' }}>
                        {fmtCr(csv.currentStake)}
                      </td>

                      {/* Equity Value */}
                      <td className="px-4 py-3 text-right tabular-nums" style={{ color: 'var(--muted-foreground)' }}>
                        {fmtCr(csv.currentEquityValue)}
                      </td>

                      {/* Investment Value */}
                      <td className="px-4 py-3 text-right tabular-nums" style={{ color: 'var(--muted-foreground)' }}>
                        {fmtCr(csv.valueOfInvestment)}
                      </td>

                      {/* MOIC */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {csv.moic >= (store.kpiThresholds?.moic.good ?? 3)
                            ? <TrendingUp className="w-3.5 h-3.5" style={{ color: '#3B6D11' }} />
                            : csv.moic < (store.kpiThresholds?.moic.warning ?? 2)
                            ? <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                            : <Minus className="w-3.5 h-3.5 text-gray-400" />}
                          <span className="font-bold text-sm tabular-nums" style={{ color: 'var(--foreground)' }}>
                            {csv.moic}x
                          </span>
                        </div>
                      </td>

                      {/* IRR */}
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold tabular-nums"
                          style={{
                            backgroundColor: csv.irr >= 30 ? '#D4EDAA' : csv.irr >= 20 ? '#FEF9C3' : '#FEE2E2',
                            color: csv.irr >= 30 ? '#3B6D11' : csv.irr >= 20 ? '#854D0E' : '#991B1B',
                          }}>
                          {csv.irr}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* Totals row */}
                <tfoot className="border-t-2" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--muted)' }}>
                  <tr>
                    <td className="px-4 py-3 font-semibold text-sm" style={{ color: 'var(--foreground)' }}>
                      Total / Average
                    </td>
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3 text-right font-bold tabular-nums" style={{ color: '#3B6D11' }}>
                      {fmtCr(snapshotData.reduce((s, r) => s + (r.currentStake ?? 0), 0))}
                    </td>
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3 text-right font-bold tabular-nums" style={{ color: '#3B6D11' }}>
                      {snapshotData.length > 0 ? (snapshotData.reduce((s, r) => s + r.moic, 0) / snapshotData.length).toFixed(1) : '—'}x avg
                    </td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums" style={{ color: '#3B6D11' }}>
                      {snapshotData.length > 0 ? Math.round(snapshotData.reduce((s, r) => s + r.irr, 0) / snapshotData.length) : '—'}% avg
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </section>

        {/* Excel-uploadable performance table */}
        <PerformanceTable />
      </div>
    </div>
  );
}
