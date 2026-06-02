import { useState } from 'react';
import { Pencil, Trash2, Plus, X, Check, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { generateId } from '../../lib/utils';
import type { Announcement, AnnouncementPriority, RoleName } from '../../data/types';

const EMPTY: Omit<Announcement, 'id' | 'createdAt'> = {
  title: '',
  body: '',
  targetRoles: ['super_admin'],
  priority: 'info',
  expiryDate: '',
};

const PRIORITY_CONFIG: Record<AnnouncementPriority, { label: string; color: string; Icon: React.ElementType }> = {
  info: { label: 'Info', color: 'text-blue-600 bg-blue-50', Icon: Info },
  warning: { label: 'Warning', color: 'text-amber-600 bg-amber-50', Icon: AlertTriangle },
  urgent: { label: 'Urgent', color: 'text-red-600 bg-red-50', Icon: AlertCircle },
};

const ALL_ROLES: { value: RoleName; label: string }[] = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'portfolio_team', label: 'Portfolio Team' },
  { value: 'finance_team', label: 'Finance Team' },
  { value: 'investment_team', label: 'Investment Team' },
];

export default function AnnouncementManager() {
  const { store, addAnnouncement, updateAnnouncement, deleteAnnouncement } = useApp();
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Omit<Announcement, 'id' | 'createdAt'>>(EMPTY);

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cactus-accent/30 bg-white';

  const startCreate = () => { setForm(EMPTY); setCreating(true); setEditing(null); };
  const startEdit = (a: Announcement) => {
    setEditing(a);
    setForm({ title: a.title, body: a.body, targetRoles: a.targetRoles, priority: a.priority, expiryDate: a.expiryDate });
    setCreating(false);
  };
  const cancel = () => { setEditing(null); setCreating(false); };

  const save = () => {
    if (!form.title.trim()) return;
    if (creating) addAnnouncement({ id: generateId(), createdAt: new Date().toISOString().slice(0, 10), ...form });
    else if (editing) updateAnnouncement({ ...editing, ...form });
    cancel();
  };

  const toggleRole = (role: RoleName) => {
    setForm((f) => ({
      ...f,
      targetRoles: f.targetRoles.includes(role)
        ? f.targetRoles.filter((r) => r !== role)
        : [...f.targetRoles, role],
    }));
  };

  const AnnForm = () => (
    <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
          <input className={inputCls} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Body</label>
          <textarea className={inputCls} rows={3} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
          <select className={inputCls} value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as AnnouncementPriority }))}>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Expiry Date</label>
          <input className={inputCls} type="date" value={form.expiryDate} onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))} />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-2">Target Roles</label>
          <div className="flex flex-wrap gap-2">
            {ALL_ROLES.map((r) => (
              <label key={r.value} className="flex items-center gap-1.5 cursor-pointer text-sm text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-1.5">
                <input type="checkbox" checked={form.targetRoles.includes(r.value)} onChange={() => toggleRole(r.value)} className="rounded" />
                {r.label}
              </label>
            ))}
          </div>
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={save} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg text-white" style={{ backgroundColor: store.firm.primaryColor }}>
          <Check className="w-4 h-4" /> Save
        </button>
        <button onClick={cancel} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-600">
          <X className="w-4 h-4" /> Cancel
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{store.announcements.length} announcements</p>
        <button onClick={startCreate} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg text-white" style={{ backgroundColor: store.firm.primaryColor }}>
          <Plus className="w-4 h-4" /> Add Announcement
        </button>
      </div>

      {creating && <AnnForm />}

      <div className="space-y-3">
        {store.announcements.map((a) => {
          const pc = PRIORITY_CONFIG[a.priority];
          return (
            <div key={a.id}>
              {editing?.id === a.id ? (
                <AnnForm />
              ) : (
                <div className="flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-xl">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${pc.color} flex-shrink-0 mt-0.5`}>
                    <pc.Icon className="w-3 h-3" />
                    {pc.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{a.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{a.body}</p>
                    <div className="flex gap-2 mt-1.5 flex-wrap">
                      {a.targetRoles.map((r) => (
                        <span key={r} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{r}</span>
                      ))}
                      <span className="text-xs text-gray-400">Expires: {a.expiryDate}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => startEdit(a)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => deleteAnnouncement(a.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
