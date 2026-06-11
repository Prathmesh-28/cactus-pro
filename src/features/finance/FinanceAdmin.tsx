import { useState, lazy, Suspense } from 'react';
import { Info, RefreshCw, Users } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { defaultConfig } from '../../data/defaultConfig';
import type { FinanceSubTab } from '../../data/types';

const TeamSyncPanel = lazy(() => import('../../components/ui/TeamSyncPanel'));

const PRIMARY = '#1C4B42';
const BG = '#F6FAF7';

// ─── Finance sub-tab metadata ─────────────────────────────────────────────────
const FINANCE_SUB_TABS: { key: FinanceSubTab; label: string; desc: string }[] = [
  { key: 'overview',          label: 'Fund Overview',        desc: 'Capital called, NAV, TVPI, IRR summary' },
  { key: 'expenses',          label: 'Expenses',             desc: 'Management fees, admin costs, fund expenses' },
  { key: 'compliances',       label: 'Compliances',          desc: 'Regulatory filing calendar and status' },
  { key: 'capital_calls',     label: 'Capital Calls',        desc: 'LP capital call and distribution events' },
  { key: 'valuations',        label: 'Valuation Log',        desc: 'Quarterly valuation marks per company' },
  { key: 'lp_comms',          label: 'LP Comms',             desc: 'LP communication hub and message history' },
  { key: 'lp_reconciliation', label: 'LP Reconciliation',    desc: 'LP commitment vs called vs returned reconciliation' },
  { key: 'fund_closing',      label: 'Fund Closing',         desc: 'LP commitments and fund closing tracker' },
  { key: 'fund_ledger',       label: 'Fund Ledger',          desc: 'Full investment ledger with MOIC / IRR' },
  { key: 'economics',         label: 'Fund Economics',       desc: 'Waterfall, carry, fee calculations' },
];

// ─── Viewer Settings Tab ──────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ViewerSettingsTab({ updateRole }: { updateRole: (r: any) => void }) {
  const { store } = useApp();
  // Fall back to defaultConfig if the role hasn't been migrated into the store yet
  const viewerRole = store.roles.find(r => r.role === 'finance_viewer')
    ?? defaultConfig.roles.find(r => r.role === 'finance_viewer')!;

  const visible = viewerRole.visibleFinanceTabs ?? [];

  const toggle = (tab: FinanceSubTab) => {
    const next = visible.includes(tab)
      ? visible.filter((t: FinanceSubTab) => t !== tab)
      : [...visible, tab];
    updateRole({ ...viewerRole, visibleFinanceTabs: next });
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
        <p className="text-sm font-bold text-blue-800 mb-1">Finance Viewer Role</p>
        <p className="text-xs text-blue-600">
          Finance Viewers have <strong>read-only access</strong> to the sections you enable below.
          They cannot edit any data, cannot access Portfolio/Investment/Operations/Admin tabs.
          &ldquo;Fund Overview&rdquo; is always visible and cannot be hidden.
        </p>
      </div>

      <div className="space-y-2">
        {FINANCE_SUB_TABS.map(tab => {
          const isOn     = tab.key === 'overview' || visible.includes(tab.key);
          const isLocked = tab.key === 'overview';
          return (
            <div
              key={tab.key}
              className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${
                isOn ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-100'
              }`}
            >
              <div>
                <p className="text-sm font-semibold text-gray-800">{tab.label}</p>
                <p className="text-xs text-gray-500">{tab.desc}</p>
              </div>
              <div className="flex items-center gap-2">
                {isLocked && <span className="text-[10px] text-gray-400 italic">always on</span>}
                <button
                  disabled={isLocked}
                  onClick={() => !isLocked && toggle(tab.key)}
                  className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                    isOn ? 'bg-[#1C4B42]' : 'bg-gray-200'
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    isOn ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live navigation preview */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Viewer Navigation Preview</p>
          <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Live — updates as you toggle</span>
        </div>
        <p className="text-xs text-gray-400">Exactly what a Finance Viewer sees in the Finance tab.</p>
        <div className="rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <div className="bg-gray-800 px-3 py-2 flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
            </div>
            <div className="flex-1 bg-gray-700 rounded px-2 py-0.5 text-[10px] text-gray-400">
              cactus-pro.vercel.app/dashboard
            </div>
          </div>
          <div className="bg-white border-b border-gray-100 px-3 py-2 flex gap-1 overflow-x-auto">
            {[
              { key: 'overview', label: 'Fund Overview' },
              ...FINANCE_SUB_TABS.filter(t => t.key !== 'overview' && visible.includes(t.key)),
            ].map((tab, i) => (
              <span
                key={tab.key}
                className={`px-3 py-1.5 rounded-t-md text-xs font-medium whitespace-nowrap border-b-2 ${
                  i === 0
                    ? 'border-emerald-600 text-emerald-700 bg-emerald-50'
                    : 'border-transparent text-gray-600'
                }`}
              >
                {tab.label}
              </span>
            ))}
            <span className="px-3 py-1.5 rounded-t-md text-xs font-medium whitespace-nowrap border-b-2 border-transparent text-gray-200 line-through">
              Finance Admin
            </span>
          </div>
          <div className="bg-gray-50 px-4 py-6 text-center text-xs text-gray-300 italic">
            — viewer sees finance content here —
          </div>
        </div>
        <p className="text-[10px] text-gray-400 italic">
          The strikethrough &ldquo;Finance Admin&rdquo; tab is invisible to viewers — shown here for reference only.
        </p>
      </div>

      <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-xs text-gray-500 space-y-1">
        <p className="font-semibold text-gray-600">How to invite a Finance Viewer:</p>
        <ol className="list-decimal list-inside space-y-0.5">
          <li>Go to <strong>Admin → Users &amp; Access</strong></li>
          <li>Click &ldquo;Invite User&rdquo; → enter their email</li>
          <li>Set Role to <strong>Finance Viewer</strong></li>
          <li>They receive an invite link → can only see the sections enabled above</li>
        </ol>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT: FinanceAdmin
// ═══════════════════════════════════════════════════════════════════════════════

type TabId = 'sync' | 'viewer';

interface Tab { id: TabId; label: string; icon: React.ReactNode }

const TABS: Tab[] = [
  { id: 'sync',   label: 'Data Sync',       icon: <RefreshCw size={15} /> },
  { id: 'viewer', label: 'Viewer Settings', icon: <Users size={15} /> },
];

export default function FinanceAdmin() {
  const { canEditFinance, currentRole, updateRole } = useApp();
  const [activeTab, setActiveTab] = useState<TabId>('sync');

  if (!canEditFinance() && currentRole !== 'super_admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 text-center px-6">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
          <Info size={22} className="text-gray-400" />
        </div>
        <p className="text-base font-semibold text-gray-700">Access Restricted</p>
        <p className="text-sm text-gray-400 max-w-xs">
          Finance Admin is only accessible to Finance Team and Super Admin.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: BG }}>
      {/* Banner */}
      <div className="mx-4 mt-4 rounded-xl px-5 py-3 flex items-start gap-3" style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
        <Info size={16} className="mt-0.5 shrink-0 text-blue-500" />
        <div>
          <p className="text-sm font-semibold text-blue-800">Finance Admin — your private workspace.</p>
          <p className="text-xs text-blue-600 mt-0.5">
            Super Admin and Finance Admin share full edit access to all finance tab data.
            <span className="ml-2 text-blue-500">
              Portfolio and Investment teams have separate namespaces and cannot see finance data.
            </span>
          </p>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="px-4 mt-5">
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-100 w-fit">
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={active ? { backgroundColor: PRIMARY, color: '#fff' } : { color: '#6B7280' }}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-4 space-y-4">
        {activeTab === 'sync' && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
            <p className="text-sm font-bold text-emerald-800">Data Sync — two ways to update finance data</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  step: 'Option A — Direct edit (instant)',
                  detail: 'Use the Finance tab controls directly — all tables, forms and modals are editable in place. Changes save to the finance KV namespace immediately.',
                  color: '#7C3AED',
                },
                {
                  step: 'Option B — SharePoint Auto-Sync',
                  detail: 'Upload your filled sheet to SharePoint/OneDrive → share with "Anyone with link" → paste URL in the panel below → Save → Sync Now.',
                  color: PRIMARY,
                },
              ].map(s => (
                <div key={s.step} className="bg-white rounded-lg p-3 border border-emerald-100">
                  <p className="text-xs font-bold mb-1" style={{ color: s.color }}>{s.step}</p>
                  <p className="text-xs text-gray-600 leading-relaxed">{s.detail}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-emerald-700">
              Both Super Admin and Finance Admin see the same data — changes sync to the shared finance namespace.
            </p>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          {activeTab === 'sync' && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <RefreshCw size={16} style={{ color: PRIMARY }} />
                <h3 className="text-sm font-semibold text-gray-800">SharePoint / OneDrive Auto-Sync</h3>
                <span className="text-xs text-gray-400">Link a live sheet → sync on demand</span>
              </div>
              <Suspense fallback={<div className="p-8 text-center text-gray-400 text-sm">Loading sync panel…</div>}>
                <TeamSyncPanel team="finance" />
              </Suspense>
            </div>
          )}

          {activeTab === 'viewer' && (
            <div>
              <div className="flex items-center gap-2 mb-5">
                <Users size={17} style={{ color: PRIMARY }} />
                <h2 className="text-base font-semibold text-gray-800">Finance Viewer Settings</h2>
                <span className="text-xs text-gray-400 ml-1">Control which finance sections viewers can access.</span>
              </div>
              <ViewerSettingsTab updateRole={updateRole} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
