import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import AccessRestricted from '../../components/layout/AccessRestricted';
import FirmSettings from './FirmSettings';
import CompanyManager from './CompanyManager';
import PeopleManager from './PeopleManager';
import SectorManager from './SectorManager';
import MetricsManager from './MetricsManager';
import PermissionsManager from './PermissionsManager';
import AnnouncementManager from './AnnouncementManager';
import SyncManager from './SyncManager';
import UsersManager from './UsersManager';
import InvestmentSettings from './InvestmentSettings';
import HomepageEditor from './HomepageEditor';
import KpiThresholds from './KpiThresholds';
import FinanceConfigManager from './FinanceConfigManager';
import TaxonomyManager from './TaxonomyManager';
import PortfolioSnapshotManager from './PortfolioSnapshotManager';
import LpManager from './LpManager';
import NavigationManager from './NavigationManager';
import RecruitmentConfigManager from './RecruitmentConfigManager';
import OperationsConfigManager from './OperationsConfigManager';
import MasterSheetManager from './MasterSheetDownloader';
import ChangelogView from './ChangelogView';
import ToolkitManager from './ToolkitManager';
import {
  Settings,
  Building2,
  Users,
  Tag,
  BarChart2,
  ShieldCheck,
  Bell,
  RotateCcw,
  RefreshCw,
  TrendingUp,
  Globe,
  Gauge,
  Landmark,
  Tags,
  TableProperties,
  UserCog,
  Wallet,
  Navigation,
  UserCheck,
  Sliders,
  FileSpreadsheet,
  Activity,
  Wrench,
} from 'lucide-react';
import { cn } from '../../lib/utils';

type AdminTab =
  | 'firm' | 'companies' | 'people' | 'sectors' | 'metrics'
  | 'permissions' | 'announcements' | 'sync' | 'investment_settings'
  | 'homepage' | 'kpi_thresholds' | 'finance_config' | 'taxonomy'
  | 'portfolio_snapshot' | 'users'
  | 'lps' | 'navigation' | 'recruitment_config' | 'operations_config'
  | 'master_sheet' | 'changelog' | 'toolkit_links';

const TABS: { key: AdminTab; label: string; Icon: React.ElementType; group?: string }[] = [
  // ── Platform ──────────────────────────────────────────────────────────────
  { key: 'firm',               label: 'Firm Settings',       Icon: Settings,         group: 'Platform' },
  { key: 'users',              label: 'Users & Access',       Icon: UserCog,          group: 'Platform' },
  { key: 'permissions',        label: 'Roles & Permissions',  Icon: ShieldCheck,      group: 'Platform' },
  { key: 'navigation',         label: 'Navigation',           Icon: Navigation,       group: 'Platform' },
  { key: 'announcements',      label: 'Announcements',        Icon: Bell,             group: 'Platform' },
  { key: 'homepage',           label: 'Homepage',             Icon: Globe,            group: 'Platform' },
  { key: 'sync',               label: 'Data Sync',            Icon: RefreshCw,        group: 'Platform' },
  // ── Portfolio ─────────────────────────────────────────────────────────────
  { key: 'companies',          label: 'Portfolio Companies',  Icon: Building2,        group: 'Portfolio' },
  { key: 'people',             label: 'People & Team',        Icon: Users,            group: 'Portfolio' },
  { key: 'sectors',            label: 'Sectors',              Icon: Tag,              group: 'Portfolio' },
  { key: 'metrics',            label: 'Fund Metrics',         Icon: BarChart2,        group: 'Portfolio' },
  { key: 'kpi_thresholds',     label: 'KPI Thresholds',       Icon: Gauge,            group: 'Portfolio' },
  { key: 'taxonomy',           label: 'Taxonomy',             Icon: Tags,             group: 'Portfolio' },
  { key: 'portfolio_snapshot', label: 'Portfolio Snapshot',   Icon: TableProperties,  group: 'Portfolio' },
  // ── Finance ───────────────────────────────────────────────────────────────
  { key: 'finance_config',     label: 'Finance Config',       Icon: Landmark,         group: 'Finance' },
  { key: 'lps',                label: 'LP Investors',         Icon: Wallet,           group: 'Finance' },
  { key: 'master_sheet',       label: 'Master Sheet',         Icon: FileSpreadsheet,  group: 'Finance' },
  // ── Investment ────────────────────────────────────────────────────────────
  { key: 'investment_settings', label: 'Deal Stages',         Icon: TrendingUp,       group: 'Investment' },
  // ── Operations ────────────────────────────────────────────────────────────
  { key: 'operations_config',  label: 'Operations Config',    Icon: Sliders,          group: 'Operations' },
  { key: 'recruitment_config', label: 'Recruitment Config',   Icon: UserCheck,        group: 'Operations' },
  { key: 'changelog',          label: 'Activity Log',          Icon: Activity,         group: 'Platform' },
  { key: 'toolkit_links',      label: 'VC Toolkit Links',      Icon: Wrench,           group: 'Platform' },
];

// ─── Impact notes — shown as a banner under each panel heading ───────────────
const TAB_META: Record<AdminTab, { affects: string[]; note?: string }> = {
  firm: {
    affects: ['Header logo & name', 'Footer contact details', 'All brand colours & buttons sitewide', 'Email shown on homepage'],
    note: 'Colour changes apply instantly everywhere — no page refresh needed.',
  },
  companies: {
    affects: ['Portfolio tab — company cards & filters', 'CompanyDrawer — all tabs (Overview, Financials, Funding…)', 'Finance → Fund Overview → Portfolio Snapshot', 'Homepage — featured companies section'],
    note: 'Logos, valuations, and financials update immediately across all views.',
  },
  people: {
    affects: ['Homepage → Team section', 'Admin → Company editor (Board Members checkboxes)', 'CompanyDrawer → Overview (Cactus Board Members)'],
  },
  sectors: {
    affects: ['Portfolio tab — sector filter pills & colour badges', 'Company cards & CompanyDrawer header', 'Homepage → Sectors We Back section'],
    note: 'Sector colour changes update every pill across the site.',
  },
  metrics: {
    affects: ['Homepage → KPI stat cards (top row)', 'Portfolio tab — summary strip'],
    note: 'Toggle "Visible" to show or hide individual cards without deleting them.',
  },
  permissions: {
    affects: ['Which tabs each role can see and access', 'Whether a role can export data or write internal notes'],
    note: 'Changes take effect the next time a user switches roles.',
  },
  announcements: {
    affects: ['Homepage & Portfolio — announcement banners shown to targeted roles'],
    note: 'Set an expiry date so banners disappear automatically.',
  },
  sync: {
    affects: ['Finance → all editable tables (Fund Metrics, Expenses, Performance)', 'Data is pulled from your SharePoint/OneDrive Excel on demand'],
    note: 'Click "Sync Now" any time to pull the latest data. Tables update immediately.',
  },
  investment_settings: {
    affects: ['Investment tab — Kanban column headers and badge colours', 'Deal form → Stage dropdown options'],
    note: 'Add, rename or reorder stages. New stages appear as empty columns instantly.',
  },
  homepage: {
    affects: ['Homepage — hero title, subtitle, badge, CTA button', 'Homepage — navigation links', 'Homepage — value pillars section (Founder First, India at Core…)'],
    note: 'All text changes are live immediately — no redeploy needed.',
  },
  kpi_thresholds: {
    affects: ['Portfolio cards — MOIC/IRR colour badges (green/amber/red)', 'Finance → Portfolio Snapshot — MOIC trend icons and IRR badges', 'Operational Metrics view — performance colour bands'],
    note: 'Example: set "good MOIC" to 2.5x instead of 3x to change what shows green.',
  },
  finance_config: {
    affects: ['Finance → Fund Overview — fund selector (Fund 1 / Fund 2 buttons)', 'Finance → Expenses — column headers (FY23, FY24…)', 'Finance → Fund Overview — metric card labels and number format'],
    note: 'Add a Fund 3 or rename Fund 1 to "Cactus Fund I" — the selector updates instantly.',
  },
  taxonomy: {
    affects: ['Admin → Company editor — Stage dropdown (Seed, Series A…)', 'Admin → Company editor — Status dropdown (Active, Watch, Exited)', 'Portfolio filters — Stage and Status filter options'],
    note: 'Removing a stage does not delete companies with that stage — it just hides the option from new entries.',
  },
  users: {
    affects: ['Who can log in', 'Role-based tab access', 'All protected API endpoints', 'Audit log'],
    note: 'Deactivating a user immediately revokes all their sessions. Role changes apply on their next page load.',
  },
  portfolio_snapshot: {
    affects: ['Finance → Fund Overview → Portfolio Snapshot table', 'Finance → Fund Overview → Totals/Averages footer row'],
    note: 'Click any row to edit that company\'s investment data. Logos come from Portfolio Companies → Logo.',
  },
  lps: {
    affects: ['Finance → Fund Overview → LP table', 'Finance → LP Comms → target LP selector', 'Finance → Capital Calls → LP receipt list', 'Finance → Fund Closing → LP pipeline'],
    note: 'Add, edit or remove LP investors. Changes reflect across all Finance features immediately.',
  },
  navigation: {
    affects: ['Main header nav — which tabs are shown', 'Tab display labels', 'Tab order in the header'],
    note: 'Changes take effect on next page load. Admin tab cannot be hidden.',
  },
  recruitment_config: {
    affects: ['Operations → Recruitment → Job form (departments)', 'Operations → Recruitment → Candidate form (sources)', 'Operations → Recruitment → Onboarding (default task list)', 'Operations → Recruitment → Offer Letter (template text)'],
    note: 'Onboarding template changes apply to new hires only — existing checklists are unaffected.',
  },
  operations_config: {
    affects: ['Operations → Meeting Notes → type filter and badges', 'Operations → Tasks → priority labels and colors', 'Operations → Intros → status labels and colors'],
    note: 'Existing records keep their type/status keys — only the display labels change.',
  },
  master_sheet: {
    affects: [
      'Portfolio Companies — currentValuation, moic, irr, revenue fields',
      'Finance → Fund Overview → Portfolio Snapshot — valuation and MOIC columns',
      'Portfolio cards — MOIC badges and current valuation display',
    ],
    note: 'Download the pre-populated template, fill in updated numbers in Excel, then re-upload to sync data back into the portal.',
  },
  changelog: { affects: ['Read-only — shows last 200 login/invite/role-change events'] },
  toolkit_links: { affects: ['VC Toolkit page — external URLs per tool, Built/To build status'] },
};

export default function AdminPage() {
  const { store, canAccess, resetToDefaults } = useApp();
  const [activeTab, setActiveTab] = useState<AdminTab>('firm');
  const [confirmReset, setConfirmReset] = useState(false);

  if (!canAccess('admin')) return <AccessRestricted tab="admin" />;

  const PANELS: Record<AdminTab, React.ReactNode> = {
    firm:                 <FirmSettings />,
    companies:            <CompanyManager />,
    people:               <PeopleManager />,
    sectors:              <SectorManager />,
    metrics:              <MetricsManager />,
    permissions:          <PermissionsManager />,
    announcements:        <AnnouncementManager />,
    sync:                 <SyncManager />,
    investment_settings:  <InvestmentSettings />,
    homepage:             <HomepageEditor />,
    kpi_thresholds:       <KpiThresholds />,
    finance_config:       <FinanceConfigManager />,
    taxonomy:             <TaxonomyManager />,
    portfolio_snapshot:   <PortfolioSnapshotManager />,
    users:                <UsersManager />,
    lps:                  <LpManager />,
    navigation:           <NavigationManager />,
    recruitment_config:   <RecruitmentConfigManager />,
    operations_config:    <OperationsConfigManager />,
    master_sheet:         <MasterSheetManager />,
    changelog:            <ChangelogView />,
    toolkit_links:        <ToolkitManager />,
  };

  const activeTabConfig = TABS.find((t) => t.key === activeTab);

  return (
    <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-gray-900 mb-1">Admin Panel</h1>
          <p className="text-sm text-gray-500">
            Manage all content and configuration for {store.firm.name}
          </p>
        </div>
        <div>
          {confirmReset ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Reset all data?</span>
              <button
                onClick={() => { resetToDefaults(); setConfirmReset(false); }}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-500 text-white hover:bg-red-600"
              >
                Yes, reset
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-600"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmReset(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset to Defaults
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <aside className="lg:w-56 flex-shrink-0">
          <nav className="flex lg:flex-col gap-0.5 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
            {(() => {
              const groups = ['Platform', 'Portfolio', 'Finance', 'Investment', 'Operations'];
              return groups.map(group => {
                const groupTabs = TABS.filter(t => t.group === group);
                return (
                  <div key={group} className="mb-1">
                    <p className="hidden lg:block text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-3 py-1 mt-2">{group}</p>
                    {groupTabs.map(({ key, label, Icon }) => (
                      <button
                        key={key}
                        onClick={() => setActiveTab(key)}
                        className={cn(
                          'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap text-left flex-shrink-0',
                          activeTab === key
                            ? 'text-white shadow-sm'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        )}
                        style={activeTab === key ? { backgroundColor: store.firm.primaryColor } : {}}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="hidden sm:inline lg:inline">{label}</span>
                      </button>
                    ))}
                  </div>
                );
              });
            })()}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1 bg-white border border-gray-200 rounded-2xl p-6 min-w-0">
          {/* Panel heading */}
          <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-100">
            {activeTabConfig && (
              <>
                <activeTabConfig.Icon className="w-5 h-5" style={{ color: store.firm.primaryColor }} />
                <h2 className="font-heading font-semibold text-gray-900">{activeTabConfig.label}</h2>
              </>
            )}
          </div>

          {/* Impact banner */}
          {TAB_META[activeTab] && (
            <div className="mb-5 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
                Where changes appear
              </p>
              <ul className="space-y-0.5">
                {TAB_META[activeTab].affects.map((line, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-amber-800">
                    <span className="mt-0.5 shrink-0 text-amber-400">→</span>
                    {line}
                  </li>
                ))}
              </ul>
              {TAB_META[activeTab].note && (
                <p className="text-[11px] text-amber-600 italic border-t border-amber-100 pt-1.5 mt-1">
                  💡 {TAB_META[activeTab].note}
                </p>
              )}
            </div>
          )}

          {PANELS[activeTab]}
        </div>
      </div>
    </main>
  );
}
