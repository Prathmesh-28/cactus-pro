import { useState } from 'react';
import { Trash2, BookOpen, Wrench, MessageSquare, Activity, AlertTriangle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { WorkspaceTeam } from '../../data/types';

const TEAM_LABELS: Record<WorkspaceTeam, string> = {
  all: 'Everyone', portfolio: 'Portfolio', investment: 'Investment', finance: 'Finance',
};
const TEAM_COLORS: Record<WorkspaceTeam, string> = {
  all: '#6B7280', portfolio: '#1C4B42', investment: '#B45309', finance: '#185FA5',
};
function Badge({ team }: { team?: WorkspaceTeam }) {
  const t = team ?? 'all';
  return <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: TEAM_COLORS[t] + '18', color: TEAM_COLORS[t] }}>{TEAM_LABELS[t]}</span>;
}
function fmt(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

type Sub = 'resources' | 'gaps' | 'notes' | 'activity';

/** Admin → Team Workspace — super-admin governance: view & delete any item across
 *  all teams, bulk-clear by team or entirely, and review the activity log. */
export default function WorkspaceManager() {
  const { store, deleteResource, deleteGap, deleteTeamNote, clearWorkspace } = useApp();
  const [sub, setSub] = useState<Sub>('resources');

  const resources = store.resources ?? [];
  const gaps = store.gaps ?? [];
  const notes = store.teamNotes ?? [];
  const activity = store.workspaceActivity ?? [];

  const countByTeam = (arr: { team?: WorkspaceTeam }[], t: WorkspaceTeam) => arr.filter(x => (x.team ?? 'all') === t).length;

  const clearTeam = (t: WorkspaceTeam) => {
    if (window.confirm(`Delete ALL ${TEAM_LABELS[t]} resources, gaps and notes? This cannot be undone.`)) clearWorkspace(t);
  };
  const clearAll = () => {
    if (window.confirm('Delete EVERY resource, gap and note in the Team Workspace? This cannot be undone.')) clearWorkspace();
  };

  const SUBS: { key: Sub; label: string; Icon: React.ElementType; count: number }[] = [
    { key: 'resources', label: 'Resources', Icon: BookOpen, count: resources.length },
    { key: 'gaps', label: 'Gaps', Icon: Wrench, count: gaps.length },
    { key: 'notes', label: 'Notes', Icon: MessageSquare, count: notes.length },
    { key: 'activity', label: 'Activity Log', Icon: Activity, count: activity.length },
  ];

  return (
    <div className="space-y-5">
      {/* Summary + bulk actions */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-800">Workspace contents</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {resources.length} resources · {gaps.length} gaps · {notes.length} notes — across all teams.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(['portfolio', 'investment', 'finance'] as WorkspaceTeam[]).map(t => (
              <button key={t} onClick={() => clearTeam(t)}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200">
                Clear {TEAM_LABELS[t]} ({countByTeam(resources, t) + countByTeam(gaps, t) + countByTeam(notes, t)})
              </button>
            ))}
            <button onClick={clearAll} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700">
              <AlertTriangle className="w-3.5 h-3.5" /> Clear everything
            </button>
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {SUBS.map(({ key, label, Icon, count }) => (
          <button key={key} onClick={() => setSub(key)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${sub === key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            <Icon className="w-4 h-4" />{label}<span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-500">{count}</span>
          </button>
        ))}
      </div>

      {/* Lists */}
      {sub === 'resources' && (
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          {resources.length === 0 ? <p className="p-6 text-center text-sm text-gray-400">No resources.</p> :
            resources.map(r => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2"><p className="text-sm font-medium text-gray-800 truncate">{r.name}</p><Badge team={r.team} /></div>
                  <p className="text-xs text-gray-400 truncate">{r.addedBy || '—'} · {fmt(r.addedAt)} · {r.url}</p>
                </div>
                <button onClick={() => deleteResource(r.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
        </div>
      )}

      {sub === 'gaps' && (
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          {gaps.length === 0 ? <p className="p-6 text-center text-sm text-gray-400">No gaps.</p> :
            gaps.map(g => (
              <div key={g.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2"><p className="text-sm font-medium text-gray-800 truncate">{g.title}</p><Badge team={g.team} /></div>
                  <p className="text-xs text-gray-400 truncate">{g.status} · {g.priority} · {g.companyName || 'no company'} · {g.assignedTo || 'unassigned'}</p>
                </div>
                <button onClick={() => deleteGap(g.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
        </div>
      )}

      {sub === 'notes' && (
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          {notes.length === 0 ? <p className="p-6 text-center text-sm text-gray-400">No notes.</p> :
            notes.map(n => (
              <div key={n.id} className="flex items-start gap-3 px-4 py-2.5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2"><p className="text-xs font-medium text-gray-600">{n.author || 'Team'}</p><Badge team={n.team} /><span className="text-[10px] text-gray-400">{fmt(n.createdAt)}</span></div>
                  <p className="text-sm text-gray-700 mt-0.5 line-clamp-2">{n.content}</p>
                </div>
                <button onClick={() => deleteTeamNote(n.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
        </div>
      )}

      {sub === 'activity' && (
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          {activity.length === 0 ? <p className="p-6 text-center text-sm text-gray-400">No activity recorded yet.</p> :
            activity.map(a => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${a.action === 'deleted' ? 'bg-red-50 text-red-600' : a.action === 'added' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{a.action}</span>
                <span className="text-gray-400 text-xs w-14">{a.entity}</span>
                <span className="flex-1 truncate text-gray-700">{a.title}</span>
                <Badge team={a.team} />
                <span className="text-xs text-gray-400 w-28 text-right truncate">{a.actor}</span>
                <span className="text-xs text-gray-300 w-32 text-right">{new Date(a.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
