import { useEffect, useState } from 'react';
import { RefreshCw, Activity } from 'lucide-react';
import { fetchAuditLog, type AuditEntry } from '../../lib/api';

const ACTION_COLORS: Record<string, string> = {
  login:        'bg-blue-100 text-blue-700',
  logout:       'bg-gray-100 text-gray-600',
  invite:       'bg-purple-100 text-purple-700',
  update_role:  'bg-amber-100 text-amber-700',
  deactivate:   'bg-red-100 text-red-700',
  reactivate:   'bg-green-100 text-green-700',
  password_set: 'bg-emerald-100 text-emerald-700',
};

function badge(action: string) {
  const cls = ACTION_COLORS[action] ?? 'bg-gray-100 text-gray-600';
  return <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${cls}`}>{action.replace(/_/g,' ')}</span>;
}

export default function ChangelogView() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setEntries(await fetchAuditLog());
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-gray-500" />
          <p className="text-sm font-semibold text-gray-700">Activity Log</p>
          <span className="text-xs text-gray-400">Last 200 events</span>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {loading && <div className="text-center py-8 text-sm text-gray-400">Loading…</div>}
      {!loading && entries.length === 0 && (
        <div className="text-center py-8 text-sm text-gray-400">No activity recorded yet.</div>
      )}
      {!loading && entries.length > 0 && (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Time','User','Action','Resource'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left font-semibold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map(e => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap tabular-nums">
                    {new Date(e.created_at).toLocaleString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-gray-700 max-w-[180px] truncate">{e.user_email}</td>
                  <td className="px-4 py-2.5">{badge(e.action)}</td>
                  <td className="px-4 py-2.5 text-gray-500 max-w-[200px] truncate">{e.resource ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
