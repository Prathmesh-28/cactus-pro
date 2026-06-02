import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import AccessRestricted from '../../components/layout/AccessRestricted';
import { LayoutDashboard, Receipt, CalendarCheck } from 'lucide-react';
import { cn } from '../../lib/utils';
import FundOverview from './FundOverview';
import ExpensesSection from './ExpensesSection';
import CompliancesSection from './CompliancesSection';

type FinanceTab = 'overview' | 'expenses' | 'compliances';

const NAV: { key: FinanceTab; label: string; Icon: React.ElementType }[] = [
  { key: 'overview',    label: 'Fund Overview', Icon: LayoutDashboard },
  { key: 'expenses',   label: 'Expenses',       Icon: Receipt },
  { key: 'compliances',label: 'Compliances',    Icon: CalendarCheck },
];

export default function FinancePage() {
  const { canAccess } = useApp();
  const [activeTab, setActiveTab] = useState<FinanceTab>('overview');

  if (!canAccess('finance')) return <AccessRestricted tab="finance" />;

  return (
    <div className="flex min-h-[calc(100vh-64px)]" style={{ backgroundColor: '#F0F7E6' }}>

      {/* Left sidebar */}
      <aside className="hidden md:flex w-56 shrink-0 flex-col border-r" style={{ backgroundColor: '#8DC63F', borderColor: '#D4EDAA' }}>
        <div className="px-5 py-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.2)' }}>
          <p className="font-heading text-base text-white leading-tight font-semibold">Finance</p>
          <p className="text-[10px] uppercase tracking-widest text-white/60 mt-0.5">Fund Operations</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ key, label, Icon }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors text-left',
                activeTab === key ? 'text-white font-medium' : 'text-white/80 hover:bg-white/10 hover:text-white')}
              style={activeTab === key ? { backgroundColor: 'rgba(255,255,255,0.25)' } : {}}>
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Mobile bottom sub-nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t flex"
        style={{ backgroundColor: '#8DC63F', borderColor: '#D4EDAA' }}>
        {NAV.map(({ key, label, Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={cn('flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] transition-colors',
              activeTab === key ? 'text-white font-semibold' : 'text-white/70')}
            style={activeTab === key ? { backgroundColor: 'rgba(255,255,255,0.2)' } : {}}>
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden pb-16 md:pb-0">
        {activeTab === 'overview'    && <FundOverview />}
        {activeTab === 'expenses'    && <ExpensesSection />}
        {activeTab === 'compliances' && <CompliancesSection />}
      </div>
    </div>
  );
}
