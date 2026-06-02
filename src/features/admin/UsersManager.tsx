import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, RefreshCw, Mail, Check, X, ShieldCheck, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { authFetch } from '../../context/AuthContext';

type Role = 'super_admin' | 'portfolio_team' | 'finance_team' | 'investment_team';

interface User {
  id: number; email: string; name: string; role: Role;
  is_active: boolean; last_login: string | null;
  created_at: string; invited_by_name?: string;
}

const ROLE_LABELS: Record<Role, string> = {
  super_admin:    'Super Admin',
  portfolio_team: 'Portfolio Team',
  finance_team:   'Finance Team',
  investment_team:'Investment Team',
};

const ROLE_COLORS: Record<Role, string> = {
  super_admin:    '#1C4B42',
  portfolio_team: '#1D4ED8',
  finance_team:   '#6D28D9',
  investment_team:'#B45309',
};

const ic = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white';

export default function UsersManager() {
  const { store } = useApp();
  const [users,    setUsers]    = useState<User[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [inviting, setInviting] = useState(false);
  const [editId,   setEditId]   = useState<number | null>(null);
  const [form, setForm] = useState({ email: '', name: '', role: 'portfolio_team' as Role });
  const [editForm, setEditForm] = useState({ name: '', role: 'portfolio_team' as Role });
  const [saving,   setSaving]   = useState(false);
  const [msg,      setMsg]      = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const res = await authFetch('/api/users');
      if (!res.ok) throw new Error('Failed to load users');
      setUsers(await res.json());
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const invite = async () => {
    if (!form.email) return;
    setSaving(true); setMsg('');
    try {
      const res = await authFetch('/api/users/invite', {
        method: 'POST', body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg(`Invite sent to ${form.email}`);
      setInviting(false);
      setForm({ email: '', name: '', role: 'portfolio_team' });
      load();
    } catch (e: unknown) { setMsg(e instanceof Error ? e.message : 'Failed'); }
    finally { setSaving(false); }
  };

  const update = async (id: number) => {
    setSaving(true);
    try {
      const res = await authFetch(`/api/users/${id}`, {
        method: 'PUT', body: JSON.stringify(editForm),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setEditId(null); load();
    } catch (e: unknown) { setMsg(e instanceof Error ? e.message : 'Failed'); }
    finally { setSaving(false); }
  };

  const toggle = async (user: User) => {
    if (!confirm(`${user.is_active ? 'Deactivate' : 'Reactivate'} ${user.name || user.email}?`)) return;
    await authFetch(`/api/users/${user.id}`, {
      method: 'PUT', body: JSON.stringify({ is_active: !user.is_active }),
    });
    load();
  };

  const resendInvite = async (id: number) => {
    await authFetch(`/api/users/${id}/resend-invite`, { method: 'POST' });
    setMsg('Invite resent');
  };

  const remove = async (user: User) => {
    if (!confirm(`Permanently delete ${user.name || user.email}? This cannot be undone.`)) return;
    await authFetch(`/api/users/${user.id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{users.length} users · Changes take effect immediately</p>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setInviting(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg text-white"
            style={{ backgroundColor: store.firm.primaryColor }}>
            <Plus className="w-4 h-4" /> Invite User
          </button>
        </div>
      </div>

      {msg && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm border ${msg.includes('ailed') || msg.includes('Error') ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
          {msg.includes('ailed') ? <AlertCircle className="w-4 h-4 shrink-0" /> : <Check className="w-4 h-4 shrink-0" />}
          {msg}
        </div>
      )}

      {/* Invite form */}
      {inviting && (
        <div className="border border-gray-200 rounded-xl p-5 bg-gray-50 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">Invite New User</h3>
            <button onClick={() => setInviting(false)} className="p-1 rounded hover:bg-gray-200 text-gray-400"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Email *</label>
              <input className={ic} type="email" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="name@example.com" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
              <input className={ic} value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
              <select className={ic} value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))}>
                {(Object.entries(ROLE_LABELS) as [Role,string][]).map(([k,v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={invite} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg text-white"
              style={{ backgroundColor: store.firm.primaryColor }}>
              <Mail className="w-4 h-4" /> {saving ? 'Sending…' : 'Send Invite'}
            </button>
            <button onClick={() => setInviting(false)} className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-600">Cancel</button>
          </div>
          <p className="text-xs text-gray-400">An email with a one-time invite link (48h expiry) will be sent. They'll set their own password.</p>
        </div>
      )}

      {/* User list */}
      {loading ? (
        <div className="text-center py-8 text-sm text-gray-400">Loading users…</div>
      ) : error ? (
        <div className="text-center py-8 text-sm text-red-500">{error}</div>
      ) : (
        <div className="space-y-2">
          {users.map(u => (
            <div key={u.id} className={`border rounded-xl bg-white overflow-hidden ${u.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
              {editId === u.id ? (
                <div className="p-4 bg-emerald-50 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                      <input className={ic} value={editForm.name} onChange={e => setEditForm(f=>({...f,name:e.target.value}))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
                      <select className={ic} value={editForm.role} onChange={e => setEditForm(f=>({...f,role:e.target.value as Role}))}>
                        {(Object.entries(ROLE_LABELS) as [Role,string][]).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => update(u.id)} disabled={saving}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg text-white bg-emerald-600">
                      <Check className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button onClick={() => setEditId(null)} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-200 text-gray-600">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 px-4 py-3">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
                    style={{ backgroundColor: ROLE_COLORS[u.role] }}>
                    {(u.name || u.email)[0].toUpperCase()}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-800">{u.name || '—'}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: ROLE_COLORS[u.role]+'18', color: ROLE_COLORS[u.role] }}>
                        {ROLE_LABELS[u.role]}
                      </span>
                      {!u.is_active && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Inactive</span>}
                      {u.is_active && !u.last_login && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">Invite pending</span>}
                      {u.role === 'super_admin' && <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {u.email}
                      {u.last_login && ` · Last login: ${new Date(u.last_login).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}`}
                      {!u.last_login && u.invited_by_name && ` · Invited by ${u.invited_by_name}`}
                    </p>
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {u.is_active && !u.last_login && (
                      <button onClick={() => resendInvite(u.id)} title="Resend invite"
                        className="p-1.5 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600">
                        <Mail className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button onClick={() => { setEditId(u.id); setEditForm({ name: u.name, role: u.role }); }}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => toggle(u)} title={u.is_active ? 'Deactivate' : 'Reactivate'}
                      className={`p-1.5 rounded-lg text-gray-400 ${u.is_active ? 'hover:bg-amber-50 hover:text-amber-600' : 'hover:bg-emerald-50 hover:text-emerald-600'}`}>
                      {u.is_active ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => remove(u)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Role legend */}
      <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Role access levels</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {(Object.entries(ROLE_LABELS) as [Role,string][]).map(([role, label]) => {
            const perms = store.roles.find(r=>r.role===role);
            return (
              <div key={role} className="flex items-start gap-2">
                <span className="px-2 py-0.5 rounded-full font-medium shrink-0"
                  style={{ backgroundColor: ROLE_COLORS[role]+'18', color: ROLE_COLORS[role] }}>
                  {label}
                </span>
                <span className="text-gray-500 leading-tight">
                  {perms?.visibleTabs.join(', ') ?? '—'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
