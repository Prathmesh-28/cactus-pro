import { useApp } from '../../context/AppContext';
import type { TabName, RolePermissions } from '../../data/types';

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

      <p className="text-xs text-gray-400">
        Changes take effect immediately. Switch roles in the header to preview.
      </p>
    </div>
  );
}
