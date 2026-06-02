import { Lock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { TabName } from '../../data/types';

interface Props {
  tab: TabName;
}

export default function AccessRestricted({ tab }: Props) {
  const { store, currentRole } = useApp();
  const roleConfig = store.roles.find((r) => r.role === currentRole);
  const displayName = roleConfig?.displayName ?? currentRole;

  const tabLabels: Record<TabName, string> = {
    portfolio:  'Portfolio',
    finance:    'Finance',
    investment: 'Investment Pipeline',
    operations: 'Operations',
    toolkit:    'VC Toolkit',
    workspace:  'Team Workspace',
    admin:      'Admin Panel',
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
      <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
        <Lock className="w-9 h-9 text-gray-400" />
      </div>
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          Access Restricted
        </h2>
        <p className="text-gray-500 text-sm max-w-sm">
          The <span className="font-medium text-gray-700">{tabLabels[tab]}</span>{' '}
          tab is not accessible to the{' '}
          <span className="font-medium text-gray-700">{displayName}</span> role.
        </p>
        <p className="text-gray-400 text-sm mt-2">
          Contact your Super Admin to request access.
        </p>
      </div>
    </div>
  );
}
