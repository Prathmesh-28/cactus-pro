import { useApp } from '../../context/AppContext';
import type { TabName, RolePermissions, PortfolioSubTab } from '../../data/types';

const PORTFOLIO_SUB_TABS: { key: PortfolioSubTab; label: string }[] = [
  { key: 'companies',  label: 'Companies' },
  { key: 'founders',   label: 'Founder Directory' },
  { key: 'health',     label: 'Health Dashboard' },
  { key: 'news',       label: 'News Feed' },
  { key: 'research',   label: 'Research Library' },
  { key: 'portal',     label: 'Founder Portal' },
  { key: 'fund_view',  label: 'Fund View' },
];

const ALL_TABS: TabName[] = ['portfolio', 'finance', 'investment', 'operations', 'toolkit', 'workspace', 'admin'];

const TAB_LABELS: Record<TabName, string> = {
  portfolio:  'Portfolio',
  finance:    'Finance',
  investment: 'Investment',
  operations: 'Operations',
  toolkit:    'VC Toolkit',
  workspace:  'Workspace',
  admin:      'Admin',
};

export default function PermissionsManager() {
  const { store, updateRole } = useApp();

  const toggleTab = (
    role: RolePermissions,
    tab: TabName,
    field: 'visibleTabs' | 'accessibleTabs'
  ) => {
    const current = role[field];
    const next = current.includes(tab)
      ? current.filter((t) => t !== tab)
      : [...current, tab];
    updateRole({ ...role, [field]: next });
  };

  const toggleBool = (role: RolePermissions, field: 'canExport' | 'canAddNotes' | 'canEditPortfolio') => {
    updateRole({ ...role, [field]: !role[field] });
  };

  return (
    <div className="space-y-4 overflow-x-auto">
      <p className="text-sm text-gray-500">
        Configure which tabs each role can see and access.
      </p>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left px-4 py-3 font-semibold text-gray-700 w-36">Role</th>
            {ALL_TABS.map((tab) => (
              <th key={tab} className="text-center px-3 py-3 font-medium text-gray-600" colSpan={2}>
                {TAB_LABELS[tab]}
              </th>
            ))}
            <th className="text-center px-3 py-3 font-medium text-gray-600">Export</th>
            <th className="text-center px-3 py-3 font-medium text-gray-600">Notes</th>
            <th className="text-center px-3 py-3 font-medium text-purple-600" title="Portfolio Admin">Portfolio Admin</th>
          </tr>
          <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-400">
            <th />
            {ALL_TABS.map((tab) => (
              <>
                <th key={`${tab}-v`} className="text-center px-2 py-1">Visible</th>
                <th key={`${tab}-a`} className="text-center px-2 py-1">Access</th>
              </>
            ))}
            <th />
            <th />
          </tr>
        </thead>
        <tbody>
          {store.roles.map((role) => (
            <tr key={role.role} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="px-4 py-3">
                <p className="font-medium text-gray-800">{role.displayName}</p>
                <p className="text-xs text-gray-400 font-mono">{role.role}</p>
              </td>
              {ALL_TABS.map((tab) => (
                <>
                  <td key={`${tab}-v`} className="text-center px-3 py-3">
                    <input
                      type="checkbox"
                      checked={role.visibleTabs.includes(tab)}
                      onChange={() => toggleTab(role, tab, 'visibleTabs')}
                      className="rounded cursor-pointer"
                    />
                  </td>
                  <td key={`${tab}-a`} className="text-center px-3 py-3">
                    <input
                      type="checkbox"
                      checked={role.accessibleTabs.includes(tab)}
                      onChange={() => toggleTab(role, tab, 'accessibleTabs')}
                      className="rounded cursor-pointer"
                    />
                  </td>
                </>
              ))}
              <td className="text-center px-3 py-3">
                <input
                  type="checkbox"
                  checked={role.canExport}
                  onChange={() => toggleBool(role, 'canExport')}
                  className="rounded cursor-pointer"
                />
              </td>
              <td className="text-center px-3 py-3">
                <input
                  type="checkbox"
                  checked={role.canAddNotes}
                  onChange={() => toggleBool(role, 'canAddNotes')}
                  className="rounded cursor-pointer"
                />
              </td>
              <td className="text-center px-3 py-3">
                <input
                  type="checkbox"
                  checked={!!role.canEditPortfolio}
                  onChange={() => toggleBool(role, 'canEditPortfolio')}
                  className="rounded cursor-pointer accent-purple-600"
                  title="Portfolio Admin — can edit company data, financial periods, fund view, health dashboard"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 text-xs text-purple-700 space-y-1">
        <p className="font-semibold">Portfolio Admin permission explained:</p>
        <p>When enabled, the role can: edit company valuations / MOIC / IRR, add/edit financial periods (quarterly data), edit the fund view investment ledger, update health dashboard signals, manage founder contacts, and access Portfolio Admin tab.</p>
        <p>Super Admin always has full access regardless of this toggle.</p>
      </div>

      {/* ── Portfolio Viewer — sub-tab visibility controls ────────────────────── */}
      {(() => {
        const viewerRole = store.roles.find(r => r.role === 'portfolio_viewer');
        if (!viewerRole) return null;
        const visible = viewerRole.visiblePortfolioTabs ?? [];

        const toggleSubTab = (tab: PortfolioSubTab) => {
          const next = visible.includes(tab)
            ? visible.filter(t => t !== tab)
            : [...visible, tab];
          updateRole({ ...viewerRole, visiblePortfolioTabs: next });
        };

        return (
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 space-y-3">
            <div>
              <p className="text-sm font-bold text-blue-800">Portfolio Viewer — Visible Sections</p>
              <p className="text-xs text-blue-600 mt-0.5">
                Control exactly which Portfolio tabs a <strong>Portfolio Viewer</strong> can see.
                They can never edit — only view allowed sections. "Companies" is always visible.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PORTFOLIO_SUB_TABS.map(tab => {
                const isChecked = tab.key === 'companies' || visible.includes(tab.key);
                const isLocked  = tab.key === 'companies'; // always on
                return (
                  <label
                    key={tab.key}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors text-xs font-medium ${
                      isChecked
                        ? 'bg-blue-100 border-blue-300 text-blue-800'
                        : 'bg-white border-gray-200 text-gray-500'
                    } ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={isLocked}
                      onChange={() => !isLocked && toggleSubTab(tab.key)}
                      className="rounded accent-blue-600"
                    />
                    {tab.label}
                    {isLocked && <span className="text-[9px] text-blue-400">always on</span>}
                  </label>
                );
              })}
            </div>
            <p className="text-[10px] text-blue-400">
              Changes apply immediately. Switch to "Portfolio Viewer" role in the header to preview what they see.
            </p>
          </div>
        );
      })()}

      <p className="text-xs text-gray-400">
        Changes take effect immediately. Switch roles in the header to preview.
      </p>
    </div>
  );
}
