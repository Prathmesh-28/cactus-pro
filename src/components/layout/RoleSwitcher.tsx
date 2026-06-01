import { useApp } from '../../context/AppContext';
import type { RoleName } from '../../data/types';

export default function RoleSwitcher() {
  const { store, currentRole, setCurrentRole } = useApp();

  return (
    <select
      value={currentRole}
      onChange={(e) => setCurrentRole(e.target.value as RoleName)}
      className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-cactus-accent/40 cursor-pointer"
      title="Switch role (demo)"
    >
      {store.roles.map((r) => (
        <option key={r.role} value={r.role}>
          {r.displayName}
        </option>
      ))}
    </select>
  );
}
