import { useApp } from '../context/AppContext';
import AccessRestricted from '../components/layout/AccessRestricted';
import MetricCard from '../components/ui/MetricCard';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export default function FinancePage() {
  const { store, canAccess } = useApp();

  if (!canAccess('finance')) return <AccessRestricted tab="finance" />;

  const { firm, lps, cashFlow, fundMetrics } = store;

  const financeMetrics = fundMetrics.filter((m) =>
    ['Total AUM', 'Avg. MOIC', 'Avg. IRR', 'Realized Returns'].includes(m.label)
  );

  return (
    <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold text-gray-900 mb-1">Finance</h1>
        <p className="text-sm text-gray-500">Fund-level performance and LP summary</p>
      </div>

      {/* Finance metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {financeMetrics.map((m) => (
          <MetricCard key={m.id} metric={m} />
        ))}
      </div>

      {/* Cash flow chart */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="font-heading font-semibold text-gray-800 mb-4">
          Fund Cash Flow — Contributions vs Distributions vs NAV
        </h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={cashFlow}>
              <defs>
                <linearGradient id="colorContrib" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={firm.primaryColor} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={firm.primaryColor} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorDist" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={firm.accentColor} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={firm.accentColor} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorNav" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}Cr`} />
              <Tooltip
                formatter={(value, name) => [`₹${value}Cr`, name as string]}
                contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
              <Area type="monotone" dataKey="contributions" name="Contributions" stroke={firm.primaryColor} fill="url(#colorContrib)" strokeWidth={2} />
              <Area type="monotone" dataKey="distributions" name="Distributions" stroke={firm.accentColor} fill="url(#colorDist)" strokeWidth={2} />
              <Area type="monotone" dataKey="nav" name="NAV" stroke="#F59E0B" fill="url(#colorNav)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* LP Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-heading font-semibold text-gray-800">Limited Partners</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['LP Name', 'Commitment', 'Called', 'Distributed', 'NAV'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lps.map((lp) => (
                <tr key={lp.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-800">{lp.name}</td>
                  <td className="px-5 py-3 text-gray-600">{lp.commitment}</td>
                  <td className="px-5 py-3 text-gray-600">{lp.called}</td>
                  <td className="px-5 py-3 text-emerald-600 font-medium">{lp.distributed}</td>
                  <td className="px-5 py-3 font-semibold text-gray-900">{lp.nav}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Distributions log */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="font-heading font-semibold text-gray-800 mb-4">Distribution History</h2>
        <div className="space-y-3">
          {cashFlow
            .filter((p) => p.distributions > 0)
            .reverse()
            .map((p, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-600">{p.quarter}</span>
                <span className="text-sm font-semibold text-emerald-600">₹{p.distributions} Cr</span>
              </div>
            ))}
        </div>
      </div>
    </main>
  );
}
