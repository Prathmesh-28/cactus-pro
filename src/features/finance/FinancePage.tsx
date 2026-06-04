import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import AccessRestricted from '../../components/layout/AccessRestricted';
import { LayoutDashboard, Receipt, CalendarCheck, PhoneCall, TrendingUp, Mail, Target, BookOpen } from 'lucide-react';
import ExportMenu from '../../components/ui/ExportMenu';
import { exportFinancePDF, exportFinanceExcel } from '../../lib/export';
import { cn } from '../../lib/utils';
import { FundProvider } from './lib/fund-context';
import { Toaster } from 'sonner';
import FundOverviewPage from './FundOverviewPage';
import ExpensesPage from './ExpensesPage';
import CompliancesPage from './CompliancesPage';
import CapitalCallTracker from './CapitalCallTracker';
import ValuationLog from './ValuationLog';
import LpCommHub from './LpCommHub';
import FundClosingTracker from './FundClosingTracker';
import FundLedger from './FundLedger';

type FinanceTab = 'overview' | 'expenses' | 'compliances' | 'capital_calls' | 'valuations' | 'lp_comms' | 'fund_closing' | 'fund_ledger';

const NAV: { key: FinanceTab; label: string; Icon: React.ElementType }[] = [
  { key: 'overview',      label: 'Fund Overview',   Icon: LayoutDashboard },
  { key: 'expenses',      label: 'Expenses',         Icon: Receipt },
  { key: 'compliances',   label: 'Compliances',      Icon: CalendarCheck },
  { key: 'capital_calls', label: 'Capital Calls',    Icon: PhoneCall },
  { key: 'valuations',    label: 'Valuation Log',    Icon: TrendingUp },
  { key: 'lp_comms',      label: 'LP Comms',         Icon: Mail },
  { key: 'fund_closing',  label: 'Fund Closing',     Icon: Target },
  { key: 'fund_ledger',  label: 'Fund Ledger',      Icon: BookOpen },
];

function FinanceExportMenu() {
  const { store } = useApp();
  return (
    <ExportMenu
      size="sm"
      variant="default"
      label="Export Finance"
      options={[
        { label: 'Finance Summary — PDF',   format: 'pdf',   onExport: () => exportFinancePDF(store)   },
        { label: 'Finance Summary — Excel', format: 'excel', onExport: () => exportFinanceExcel(store) },
      ]}
    />
  );
}

export default function FinancePage() {
  const { canAccess } = useApp();
  const [activeTab, setActiveTab] = useState<FinanceTab>('overview');

  if (!canAccess('finance')) return <AccessRestricted tab="finance" />;

  return (
    <FundProvider>
      {/* Finance dashboard CSS variables injected inline so they don't bleed into cactus-pro */}
      <style>{`
        .fin-shell {
          --background: #F0F7E6;
          --foreground: #1A1A1A;
          --card: #ffffff;
          --card-foreground: #1A1A1A;
          --primary: #5A9E1B;
          --primary-foreground: #ffffff;
          --muted: #e8f5d0;
          --muted-foreground: #5a7a3a;
          --accent: #5A9E1B;
          --accent-foreground: #ffffff;
          --border: #D4EDAA;
          --input: #D4EDAA;
          --ring: #5A9E1B;
          --sidebar: #8DC63F;
          --sidebar-foreground: #ffffff;
          --sidebar-accent: rgba(255,255,255,0.25);
          --sidebar-border: #D4EDAA;
          --gradient-primary: linear-gradient(135deg, #3B6D11, #3B6D11);
          --shadow-card: 0 1px 2px 0 rgb(59 109 17 / 0.06), 0 4px 16px -4px rgb(59 109 17 / 0.10);
          background: var(--background);
          color: var(--foreground);
          font-family: "DM Sans", system-ui, sans-serif;
        }
        .fin-shell .font-serif { font-family: "Times New Roman", Times, serif; }
        .fin-shell .text-muted-foreground { color: var(--muted-foreground); }
        .fin-shell .bg-card { background: var(--card); }
        .fin-shell .border-border { border-color: var(--border); }
        .fin-shell .bg-background { background: var(--background); }
        .fin-shell .text-primary-foreground { color: var(--primary-foreground); }
        .fin-shell .bg-\\[image\\:var\\(--gradient-primary\\)\\] { background-image: var(--gradient-primary); }
        .fin-shell .shadow-\\[var\\(--shadow-card\\)\\] { box-shadow: var(--shadow-card); }
      `}</style>

      <div className="fin-shell flex min-h-[calc(100vh-64px)]">
        <Toaster position="bottom-right" />

        {/* Sidebar */}
        <aside className="hidden md:flex w-56 shrink-0 flex-col border-r"
          style={{ backgroundColor: 'var(--sidebar)', borderColor: 'var(--sidebar-border)' }}>
          <div className="px-5 py-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.2)' }}>
            <p className="font-heading text-base leading-tight font-semibold" style={{ color: 'var(--sidebar-foreground)' }}>Finance</p>
            <p className="text-[10px] uppercase tracking-widest mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Fund Operations</p>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1">
            {NAV.map(({ key, label, Icon }) => (
              <button key={key} onClick={() => setActiveTab(key)}
                className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors text-left',
                  activeTab === key ? 'font-medium' : 'hover:bg-white/10')}
                style={{
                  color: 'var(--sidebar-foreground)',
                  backgroundColor: activeTab === key ? 'var(--sidebar-accent)' : 'transparent',
                  opacity: activeTab === key ? 1 : 0.8,
                }}>
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Export button in sidebar footer */}
        <div className="hidden md:block px-3 pb-4 mt-auto">
          <FinanceExportMenu />
        </div>

        {/* Mobile bottom nav */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex border-t"
          style={{ backgroundColor: 'var(--sidebar)', borderColor: 'var(--sidebar-border)' }}>
          {NAV.map(({ key, label, Icon }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={cn('flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] transition-colors')}
              style={{
                color: 'rgba(255,255,255,' + (activeTab === key ? '1' : '0.7') + ')',
                backgroundColor: activeTab === key ? 'rgba(255,255,255,0.2)' : 'transparent',
                fontWeight: activeTab === key ? '600' : '400',
              }}>
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden pb-16 md:pb-0">
          {activeTab === 'overview'      && <FundOverviewPage />}
          {activeTab === 'expenses'      && <ExpensesPage />}
          {activeTab === 'compliances'   && <CompliancesPage />}
          {activeTab === 'capital_calls' && <div className="p-6"><CapitalCallTracker /></div>}
          {activeTab === 'valuations'    && <div className="p-6"><ValuationLog /></div>}
          {activeTab === 'lp_comms'      && <div className="p-6"><LpCommHub /></div>}
          {activeTab === 'fund_closing'  && <div className="p-6"><FundClosingTracker /></div>}
          {activeTab === 'fund_ledger'   && <div className="p-6"><FundLedger /></div>}
        </div>
      </div>
    </FundProvider>
  );
}
