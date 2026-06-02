import { useState } from 'react';
import { Pencil, Trash2, Plus, X, Check, User } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { generateId } from '../../lib/utils';
import type { Person } from '../../data/types';

const EMPTY: Omit<Person, 'id'> = {
  name: '',
  title: '',
  bio: '',
  photoUrl: '',
  email: '',
  linkedInUrl: '',
  isPartner: false,
  isVisibleOnWebsite: true,
};

export default function PeopleManager() {
  const { store, addPerson, updatePerson, deletePerson } = useApp();
  const [editing, setEditing] = useState<Person | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Omit<Person, 'id'>>(EMPTY);

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cactus-accent/30 bg-white';

  const startCreate = () => { setForm(EMPTY); setCreating(true); setEditing(null); };
  const startEdit = (p: Person) => { setEditing(p); setForm({ name: p.name, title: p.title, bio: p.bio, photoUrl: p.photoUrl, email: p.email, linkedInUrl: p.linkedInUrl, isPartner: p.isPartner, isVisibleOnWebsite: p.isVisibleOnWebsite }); setCreating(false); };
  const cancel = () => { setEditing(null); setCreating(false); };

  const save = () => {
    if (!form.name.trim()) return;
    if (creating) addPerson({ id: generateId(), ...form });
    else if (editing) updatePerson({ ...editing, ...form });
    cancel();
  };

  const PersonForm = () => (
    <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
          <input className={inputCls} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Title / Role</label>
          <input className={inputCls} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
          <input className={inputCls} type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Photo URL</label>
          <input className={inputCls} value={form.photoUrl} onChange={(e) => setForm((f) => ({ ...f, photoUrl: e.target.value }))} placeholder="https://..." />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">LinkedIn URL</label>
          <input className={inputCls} value={form.linkedInUrl} onChange={(e) => setForm((f) => ({ ...f, linkedInUrl: e.target.value }))} />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Bio</label>
          <textarea className={inputCls} rows={3} value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} />
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
            <input type="checkbox" checked={form.isPartner} onChange={(e) => setForm((f) => ({ ...f, isPartner: e.target.checked }))} className="rounded" />
            Is Partner
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
            <input type="checkbox" checked={form.isVisibleOnWebsite} onChange={(e) => setForm((f) => ({ ...f, isVisibleOnWebsite: e.target.checked }))} className="rounded" />
            Visible on Website
          </label>
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
        <p className="text-sm text-gray-500">{store.people.length} team members</p>
        <button onClick={startCreate} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg text-white" style={{ backgroundColor: store.firm.primaryColor }}>
          <Plus className="w-4 h-4" /> Add Person
        </button>
      </div>

      {creating && <PersonForm />}

      <div className="space-y-3">
        {store.people.map((p) => (
          <div key={p.id}>
            {editing?.id === p.id ? (
              <PersonForm />
            ) : (
              <div className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {p.photoUrl ? (
                    <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.title}</p>
                  <div className="flex gap-2 mt-0.5">
                    {p.isPartner && <span className="text-xs bg-cactus-light text-cactus-primary px-2 py-0.5 rounded-full" style={{ backgroundColor: store.firm.lightColor, color: store.firm.primaryColor }}>Partner</span>}
                    {!p.isVisibleOnWebsite && <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">Hidden</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => startEdit(p)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => deletePerson(p.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
