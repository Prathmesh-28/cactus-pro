import { FundMetricsRows } from './components/fund-metrics-rows';
import { PerformanceTable } from './components/performance-table';
import { useFund } from './lib/fund-context';

export default function FundOverviewPage() {
  const { fund, setFund } = useFund();

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
          {(['fund_1', 'fund_2'] as const).map(f => (
            <button key={f} onClick={() => setFund(f)}
              className="px-3 py-1.5 text-xs font-medium rounded transition-colors"
              style={fund === f
                ? { backgroundColor: '#3B6D11', color: '#fff' }
                : { color: '#3B6D11', backgroundColor: 'transparent' }}>
              {f === 'fund_1' ? 'Fund 1' : 'Fund 2'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-6 md:px-10 py-8 space-y-10 flex-1">
        <FundMetricsRows />
        <PerformanceTable />
      </div>
    </div>
  );
}
