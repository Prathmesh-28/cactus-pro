import { useState } from 'react';
import { Pencil, Trash2, Plus, X, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { generateId } from '../../lib/utils';
import type { Sector } from '../../data/types';

const EMPTY: Omit<Sector, 'id'> = { name: '', color: '#52B788', iconName: 'tag' };

const inputCls = 'border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cactus-accent/30';

export default function SectorManager() {
  const { store, addSector, updateSector, deleteSector } = useApp();
  const [editing, setEditing] = useState<Sector | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Omit<Sector, 'id'>>(EMPTY);

  const startCreate = () => { setForm(EMPTY); setCreating(true); setEditing(null); };
  const startEdit   = (s: Sector) => { setEditing(s); setForm({ name: s.name, color: s.color, iconName: s.iconName }); setCreating(false); };
  const cancel      = () => { setEditing(null); setCreating(false); };

  const save = () => {
    if (!form.name.trim()) return;
    if (creating) addSector({ id: generateId(), ...form });
    else if (editing) updateSector({ ...editing, ...form });
    cancel();
  };

  // Inlined to avoid inner-component remount on every keystroke (kills focus)
  const formRow = (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <input
        autoFocus
        className={inputCls + ' flex-1 min-w-32'}
        placeholder="Sector name"
        value={form.name}
        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel(); }}
      />
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={form.color}
          onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
          className="w-8 h-8 rounded cursor-pointer border border-gray-200"
        />
        <input
          className={inputCls + ' w-24 font-mono'}
          value={form.color}
          onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
        />
      </div>
      <input
        className={inputCls + ' w-32'}
        placeholder="Icon (lucide)"
        value={form.iconName}
        onChange={(e) => setForm((f) => ({ ...f, iconName: e.target.value }))}
      />
      <button onClick={save} className="p-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600">
        <Check className="w-4 h-4" />
      </button>
      <button onClick={cancel} className="p-1.5 rounded-lg bg-gray-200 text-gray-600 hover:bg-gray-300">
        <X className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{store.sectors.length} sectors</p>
        <button
          onClick={startCreate}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg text-white"
          style={{ backgroundColor: store.firm.primaryColor }}
        >
          <Plus className="w-4 h-4" />
          Add Sector
        </button>
      </div>

      {creating && formRow}

      <div className="space-y-2">
        {store.sectors.map((s) => (
          <div key={s.id}>
            {editing?.id === s.id ? formRow : (
              <div className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                <span className="flex-1 text-sm font-medium text-gray-800">{s.name}</span>
                <span className="text-xs text-gray-400 font-mono">{s.color}</span>
                <span className="text-xs text-gray-400">{s.iconName}</span>
                <div className="flex gap-1">
                  <button onClick={() => startEdit(s)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deleteSector(s.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
